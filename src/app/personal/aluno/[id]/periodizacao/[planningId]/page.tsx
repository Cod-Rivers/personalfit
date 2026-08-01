'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
    getMacrocycle,
    updateMacrocycle,
    updatePhaseDate,
    getPlanWorkoutLogs,
    macroToGanttPhases,
    type MacrocycleResponse,
    type MesocycleRequest,
    type MesocycleResponse,
    type PeriodizedWorkoutLogResponse,
} from '@/libs/planningService';
import { listStudentAppointments } from '@/libs/appointmentService';
import GanttPlanning, {
    type GanttAssessment,
} from '@/components/features/GanttPlanningResponsive';
import { useGanttToggle } from '@/hooks/useGanttToggle';
import { useEditablePhaseDates } from '@/hooks/useEditablePhaseDates';
import {
    STATUS_LABEL,
    formatDate,
    mesoToRequest,
    duplicateMesoRequest,
} from '@/app/personal/_shared/periodizacao/lib/mesocycleTransforms';
import MesocycleSection from '@/app/personal/_shared/periodizacao/components/MesocycleSection';
import MesocycleFormModal from '@/app/personal/_shared/periodizacao/components/MesocycleFormModal';
import { useToast } from '@/components/system/Toast';
import s from '@/app/personal/_shared/periodizacao/builder.module.css';

export default function PeriodizacaoDetalhePage() {
    const router = useRouter();
    const params = useParams<{ id: string; planningId: string }>();
    const searchParams = useSearchParams();
    const { id: studentId, planningId } = params;
    const { showSuccess, showError, ToastSlot } = useToast();

    const [macro, setMacro] = useState<MacrocycleResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState('');
    const [ganttEnabled, setGanttEnabled] = useGanttToggle(
        'venafit:gantt:periodizacao',
    );
    const [workoutLogs, setWorkoutLogs] = useState<
        PeriodizedWorkoutLogResponse[]
    >([]);
    const [assessments, setAssessments] = useState<GanttAssessment[]>([]);

    /* Modal state */
    const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
    const [editingMeso, setEditingMeso] = useState<MesocycleResponse | null>(
        null,
    );
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    /* ── Fetch ── */
    useEffect(() => {
        getMacrocycle(studentId, planningId)
            .then(setMacro)
            .catch((e: Error) => setPageError(e.message))
            .finally(() => setLoading(false));
    }, [studentId, planningId]);

    /* ── Confirmação de macrociclo recém-criado (vem da tela "Novo
     * Macrociclo") ── some da URL logo em seguida pra não reaparecer num
     * refresh manual da página. */
    useEffect(() => {
        if (searchParams.get('created') !== '1') return;
        showSuccess('Macrociclo criado com sucesso!');
        router.replace(
            `/personal/aluno/${studentId}/periodizacao/${planningId}`,
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    /* ── Comparativo plano×realizado + marcos de avaliação física (Gantt) ──
     * Best-effort: sem start_date/end_date não há janela pra buscar; e a
     * Agenda é feature PRO, então listStudentAppointments pode dar 403 pra
     * personal do plano gratuito — nenhum dos dois casos deve travar a tela. */
    useEffect(() => {
        if (!macro?.start_date || !macro?.end_date) {
            setWorkoutLogs([]);
            setAssessments([]);
            return;
        }
        getPlanWorkoutLogs(studentId, planningId)
            .then(setWorkoutLogs)
            .catch(() => setWorkoutLogs([]));
        listStudentAppointments(studentId, macro.start_date, macro.end_date)
            .then((items) =>
                setAssessments(
                    items
                        .filter((a) => a.type === 'avaliacao')
                        .map((a) => ({
                            id: a.id,
                            date: a.start_at.split('T')[0],
                        })),
                ),
            )
            .catch(() => setAssessments([]));
    }, [macro?.start_date, macro?.end_date, studentId, planningId]);

    /* ── Ajuste fino de datas no Gantt (drag) ── */
    const savePhaseDates = useCallback(
        (phaseId: string, start: string, end: string) =>
            updatePhaseDate(studentId, planningId, phaseId, start, end),
        [studentId, planningId],
    );
    const { handlePhaseUpdate, phaseError } = useEditablePhaseDates(
        macro,
        setMacro,
        savePhaseDates,
    );

    /* ── Modal open/close ── */
    const openAddModal = useCallback(() => {
        setEditingMeso(null);
        setSaveError('');
        setModalMode('add');
    }, []);

    const openEditModal = useCallback((meso: MesocycleResponse) => {
        setEditingMeso(meso);
        setSaveError('');
        setModalMode('edit');
    }, []);

    const closeModal = useCallback(() => {
        setModalMode(null);
        setEditingMeso(null);
    }, []);

    /* ── Delete mesociclo ── */
    const deleteMeso = useCallback(
        async (mesoId: string) => {
            if (!macro) return;
            if (
                !confirm(
                    'Remover este mesociclo? Esta ação não pode ser desfeita.',
                )
            )
                return;
            setSaving(true);
            try {
                const updatedList = (macro.mesocycles ?? [])
                    .filter((m) => m.id !== mesoId)
                    .map((m, i) => ({ ...mesoToRequest(m), order: i + 1 }));
                const updated = await updateMacrocycle(studentId, planningId, {
                    mesocycles: updatedList,
                });
                setMacro(updated);
                showSuccess('Mesociclo removido com sucesso!');
            } catch (e: unknown) {
                const msg = (
                    e as { response?: { data?: { message?: string } } }
                )?.response?.data?.message;
                showError(msg || 'Erro ao remover mesociclo.');
            } finally {
                setSaving(false);
            }
        },
        [macro, studentId, planningId, showSuccess, showError],
    );

    /* ── Duplicar mesociclo ── */
    const duplicateMeso = useCallback(
        async (meso: MesocycleResponse) => {
            if (!macro) return;
            setSaving(true);
            try {
                const allMesos = macro.mesocycles ?? [];
                const updatedList = [
                    ...allMesos.map(mesoToRequest),
                    duplicateMesoRequest(meso, allMesos.length + 1),
                ];
                const updated = await updateMacrocycle(studentId, planningId, {
                    mesocycles: updatedList,
                });
                setMacro(updated);
                showSuccess('Mesociclo duplicado com sucesso!');
            } catch (e: unknown) {
                const msg = (
                    e as { response?: { data?: { message?: string } } }
                )?.response?.data?.message;
                showError(msg || 'Erro ao duplicar mesociclo.');
            } finally {
                setSaving(false);
            }
        },
        [macro, studentId, planningId, showSuccess, showError],
    );

    /* ── Save (add ou edit) ── */
    const onSaveMeso = useCallback(
        async (req: MesocycleRequest) => {
            if (!macro) return;
            setSaving(true);
            setSaveError('');
            try {
                const allMesos = macro.mesocycles ?? [];
                const updatedList: MesocycleRequest[] =
                    modalMode === 'add'
                        ? [...allMesos.map(mesoToRequest), req]
                        : allMesos.map((m) =>
                              m.id === editingMeso?.id ? req : mesoToRequest(m),
                          );

                const updated = await updateMacrocycle(studentId, planningId, {
                    mesocycles: updatedList,
                });
                setMacro(updated);
                closeModal();
                showSuccess(
                    macro.planning_mode === 'simple'
                        ? 'Treinos da semana salvos com sucesso!'
                        : modalMode === 'add'
                          ? 'Mesociclo criado com sucesso!'
                          : 'Mesociclo salvo com sucesso!',
                );
            } catch (e: unknown) {
                const msg = (
                    e as { response?: { data?: { message?: string } } }
                )?.response?.data?.message;
                setSaveError(msg || 'Erro ao salvar mesociclo.');
            } finally {
                setSaving(false);
            }
        },
        [
            macro,
            modalMode,
            editingMeso,
            studentId,
            planningId,
            closeModal,
            showSuccess,
        ],
    );

    /* ── Loading / error states ── */
    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border" role="status">
                    <span className="visually-hidden">Carregando...</span>
                </div>
            </div>
        );
    }

    if (pageError) {
        return (
            <div className="container py-4">
                <div className="alert alert-danger">{pageError}</div>
            </div>
        );
    }

    if (!macro) return null;

    const isSimpleMode = macro.planning_mode === 'simple';
    const ganttPhases = isSimpleMode
        ? []
        : macroToGanttPhases(macro, workoutLogs);
    const statusClass =
        macro.status === 'active'
            ? s.badgeActive
            : macro.status === 'completed'
              ? s.badgeCompleted
              : s.badgeDraft;
    const simpleMeso = isSimpleMode ? (macro.mesocycles ?? [])[0] : undefined;
    const dayLabelStyle =
        macro.simple_day_label === 'number' ? 'number' : 'weekday';

    return (
        <div className={s.page}>
            {ToastSlot}
            <div className={s.container}>
                {/* Header */}
                <div className={s.header}>
                    <div>
                        <h1 className={s.headerTitle}>{macro.name}</h1>
                        <p className={s.headerSub}>{macro.goal}</p>
                    </div>
                    <button className={s.btnBack} onClick={() => router.back()}>
                        ← Voltar
                    </button>
                </div>

                {/* Info Card */}
                <div className={s.infoCard}>
                    <div className={s.infoRow}>
                        <div className={s.infoItem}>
                            <p className={s.infoLabel}>Status</p>
                            <p className={s.infoValue}>
                                <span className={statusClass}>
                                    {STATUS_LABEL[macro.status] ?? macro.status}
                                </span>
                            </p>
                        </div>
                        <div className={s.infoItem}>
                            <p className={s.infoLabel}>Início</p>
                            <p className={s.infoValue}>
                                {formatDate(macro.start_date)}
                            </p>
                        </div>
                        <div className={s.infoItem}>
                            <p className={s.infoLabel}>Término</p>
                            <p className={s.infoValue}>
                                {formatDate(macro.end_date)}
                            </p>
                        </div>
                        <div className={s.infoItem}>
                            <p className={s.infoLabel}>Mesociclos</p>
                            <p className={s.infoValue}>
                                {macro.mesocycles?.length ?? 0}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Gantt */}
                {ganttPhases.length > 0 && (
                    <div style={{ marginBottom: 28 }}>
                        <GanttPlanning
                            phases={ganttPhases}
                            enabled={ganttEnabled}
                            onToggle={setGanttEnabled}
                            onPhaseUpdate={handlePhaseUpdate}
                            assessments={assessments}
                            printTitle={`${macro.name} — ${macro.goal}`}
                        />
                        {phaseError && (
                            <div
                                className="alert alert-danger mt-2 mb-0"
                                role="alert"
                            >
                                {phaseError}
                            </div>
                        )}
                    </div>
                )}

                {/* Mesocycles list */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 16,
                        marginTop: 8,
                    }}
                >
                    <h2 style={{ fontSize: '1.1rem', margin: 0 }}>
                        {isSimpleMode ? 'Treinos da Semana' : 'Mesociclos'}
                    </h2>
                    {(!isSimpleMode || !simpleMeso) && (
                        <button className={s.btnEdit} onClick={openAddModal}>
                            {isSimpleMode
                                ? '+ Configurar treinos da semana'
                                : '+ Adicionar Fase'}
                        </button>
                    )}
                </div>

                {isSimpleMode ? (
                    !simpleMeso ? (
                        <p style={{ color: 'var(--text-muted)' }}>
                            Nenhum treino configurado ainda. Clique em &quot;+
                            Configurar treinos da semana&quot; para começar.
                        </p>
                    ) : (
                        <MesocycleSection
                            meso={simpleMeso}
                            onEdit={() => openEditModal(simpleMeso)}
                            onDelete={() => deleteMeso(simpleMeso.id)}
                            simpleMode
                            dayLabelStyle={dayLabelStyle}
                        />
                    )
                ) : (macro.mesocycles?.length ?? 0) === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>
                        Nenhum mesociclo cadastrado.
                    </p>
                ) : (
                    [...(macro.mesocycles ?? [])]
                        .sort((a, b) => a.order - b.order)
                        .map((meso) => (
                            <MesocycleSection
                                key={meso.id}
                                meso={meso}
                                onEdit={() => openEditModal(meso)}
                                onDelete={() => deleteMeso(meso.id)}
                                onDuplicate={() => duplicateMeso(meso)}
                            />
                        ))
                )}
            </div>

            {/* ─── Modal: Add / Edit Mesociclo ─── */}
            {modalMode !== null && (
                <MesocycleFormModal
                    mode={modalMode}
                    meso={editingMeso}
                    order={
                        modalMode === 'add'
                            ? (macro.mesocycles?.length ?? 0) + 1
                            : (editingMeso?.order ?? 1)
                    }
                    saving={saving}
                    saveError={saveError}
                    onClose={closeModal}
                    onSave={onSaveMeso}
                    simpleMode={isSimpleMode}
                    dayLabelStyle={dayLabelStyle}
                />
            )}
        </div>
    );
}
