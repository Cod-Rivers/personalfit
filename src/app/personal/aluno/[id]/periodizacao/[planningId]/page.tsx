'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { FiArrowLeft, FiWifiOff } from 'react-icons/fi';
import {
    getMacrocycle,
    updateMacrocycle,
    createMesocycle,
    updateMesocycle,
    updatePhaseDate,
    getPlanWorkoutLogs,
    macroToGanttPhases,
    type MacrocycleResponse,
    type MesocycleRequest,
    type MesocycleResponse,
    type PeriodizedWorkoutLogResponse,
    type ExerciseRequest,
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
    pickSavedMesocycle,
} from '@/app/personal/_shared/periodizacao/lib/mesocycleTransforms';
import MesocycleSection from '@/app/personal/_shared/periodizacao/components/MesocycleSection';
import MesocycleFormModal from '@/app/personal/_shared/periodizacao/components/MesocycleFormModal';
import PlanningNextStep from '@/app/personal/_shared/periodizacao/components/PlanningNextStep';
import HelpTooltip from '@/components/atoms/HelpTooltip';
import { getGlossaryTerm } from '@/libs/glossaryContent';
import { useToast } from '@/components/system/Toast';
import PersonalAnamnesisQuickView from '@/components/features/PersonalAnamnesisQuickView';
import PrescriptionSyncBadge from '@/components/features/PrescriptionSyncBadge';
import {
    cachePersonalMacrocycle,
    getCachedPersonalMacrocycle,
    isOfflineError,
} from '@/libs/offline/personalCache';
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
    /** O plano na tela veio do cache local por falta de rede (ver
     * personalCache.ts). É o que permite ao personal abrir a periodização do
     * aluno na academia sem sinal e ajustar série/carga: sem isto a tela
     * morria no erro de rede e a fila offline de prescrição
     * (prescriptionQueue.ts) nunca era alcançada. */
    const [isOfflineData, setIsOfflineData] = useState(false);
    const [ganttEnabled, setGanttEnabled] = useGanttToggle(
        'venafit:gantt:periodizacao',
        false,
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

    /* ── Fetch ──
     * Cada carga bem-sucedida também grava o plano no IndexedDB, para que a
     * próxima abertura sem rede caia na cópia local em vez de morrer num
     * "Network Error". Uma recusa do servidor (403/404) NÃO usa o cache: ali
     * o plano velho esconderia o motivo real. */
    const loadMacrocycle = useCallback(async () => {
        try {
            const data = await getMacrocycle(studentId, planningId);
            setMacro(data);
            setIsOfflineData(false);
            setPageError('');
            void cachePersonalMacrocycle(studentId, data);
        } catch (e) {
            if (isOfflineError(e)) {
                const cached = await getCachedPersonalMacrocycle(
                    studentId,
                    planningId,
                );
                if (cached) {
                    setMacro(cached);
                    setIsOfflineData(true);
                    setPageError('');
                    return;
                }
                setPageError(
                    'Sem conexão e este plano ainda não foi aberto neste aparelho. Abra-o uma vez com internet para poder consultá-lo offline.',
                );
                return;
            }
            setPageError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, [studentId, planningId]);

    useEffect(() => {
        void loadMacrocycle();
    }, [loadMacrocycle]);

    // Rede de volta: recarrega do servidor, para a tela sair da cópia local
    // (e já refletir o que a fila de prescrição acabou de sincronizar).
    useEffect(() => {
        const onOnline = () => void loadMacrocycle();
        window.addEventListener('online', onOnline);
        return () => window.removeEventListener('online', onOnline);
    }, [loadMacrocycle]);

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
        setModalMode('add');
    }, []);

    const openEditModal = useCallback((meso: MesocycleResponse) => {
        setEditingMeso(meso);
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

    /* ── Salvamento por card ──
     * O editor grava a cada bloco concluído, então aqui não há mais "salvar e
     * fechar": só a persistência de UMA fase e a atualização do macrociclo
     * desta tela com o que voltou do servidor. Erros sobem para o modal, que
     * os mostra no rodapé com a opção de tentar de novo. */
    const onPersistMeso = useCallback(
        async (req: MesocycleRequest) => {
            const updated = req.id
                ? await updateMesocycle(studentId, planningId, req.id, req)
                : await createMesocycle(studentId, planningId, req);
            setMacro(updated);
            void cachePersonalMacrocycle(studentId, updated);
            return pickSavedMesocycle(updated, req.id);
        },
        [studentId, planningId],
    );

    /* ── Eco local de uma edição que foi para a fila offline ──
     * Sem isto, a edição era gravada no IndexedDB (prescriptionQueue) e o card
     * mostrava "salvo neste dispositivo" — mas o valor na tela voltava ao
     * antigo assim que o selo sumia, porque o macrociclo em memória só é
     * atualizado pela RESPOSTA do servidor, que offline nunca chega. Para o
     * personal isso era indistinguível de "não salvou".
     *
     * Grava também no cache local, para o valor sobreviver a fechar e reabrir
     * a tela enquanto a fila não sincroniza. */
    const applyQueuedPrescription = useCallback(
        (
            mesocycleId: string,
            trainingId: string,
            exerciseId: string,
            patch: Partial<ExerciseRequest>,
        ) => {
            setMacro((prev) => {
                if (!prev) return prev;
                const next: MacrocycleResponse = {
                    ...prev,
                    mesocycles: (prev.mesocycles ?? []).map((meso) =>
                        meso.id !== mesocycleId
                            ? meso
                            : {
                                  ...meso,
                                  trainings: (meso.trainings ?? []).map((t) =>
                                      t.id !== trainingId
                                          ? t
                                          : {
                                                ...t,
                                                exercises: (
                                                    t.exercises ?? []
                                                ).map((ex) =>
                                                    ex.id !== exerciseId
                                                        ? ex
                                                        : { ...ex, ...patch },
                                                ),
                                            },
                                  ),
                              },
                    ),
                };
                void cachePersonalMacrocycle(studentId, next);
                return next;
            });
        },
        [studentId],
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
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {/* Respostas da Anamnese do personal à mão enquanto monta as séries */}
                        <PersonalAnamnesisQuickView studentId={studentId} className={s.btnBack} />
                        <button className={s.btnBack} onClick={() => router.back()}>
                            <FiArrowLeft /> Voltar
                        </button>
                    </div>
                </div>

                {/* Resumo do plano numa linha de chips. Era um card com quatro
                    métricas empilhadas, que no celular ocupava quase meia tela
                    antes da primeira fase aparecer. */}
                <div className={s.summaryChips}>
                    <span className={statusClass}>
                        {STATUS_LABEL[macro.status] ?? macro.status}
                    </span>
                    <span className={s.summaryChip}>
                        {formatDate(macro.start_date)} →{' '}
                        {formatDate(macro.end_date)}
                    </span>
                    <span className={s.summaryChip}>
                        {macro.mesocycles?.length ?? 0}{' '}
                        {isSimpleMode
                            ? 'semana configurada'
                            : `mesociclo${(macro.mesocycles?.length ?? 0) === 1 ? '' : 's'}`}
                    </span>
                </div>

                {/* Plano servido do cache local. Fica acima do badge de
                    pendências porque é o contexto dele: o personal precisa
                    saber que está editando uma cópia e que as alterações
                    vão numa fila. */}
                {isOfflineData && (
                    <div className={s.offlineNotice}>
                        <FiWifiOff /> Sem conexão — mostrando a última versão
                        deste plano salva no aparelho. Os ajustes de série e
                        carga que você fizer agora ficam guardados aqui e são
                        enviados ao aluno assim que a internet voltar.
                    </div>
                )}

                {/* Edições de série/carga feitas sem rede (ver
                    ExerciseDetailCard) — some sozinho quando não há nada
                    pendente. */}
                <PrescriptionSyncBadge />

                <PlanningNextStep
                    macro={macro}
                    isSimpleMode={isSimpleMode}
                    onAction={(mesocycleId) => {
                        const target = (macro.mesocycles ?? []).find(
                            (m) => m.id === mesocycleId,
                        );
                        if (target) openEditModal(target);
                        else openAddModal();
                    }}
                />

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
                        {!isSimpleMode && (
                            <>
                                {' '}
                                <HelpTooltip
                                    text={getGlossaryTerm('mesociclo').short}
                                    href="/ajuda#glossario-mesociclo"
                                    label="Ajuda sobre mesociclo"
                                />
                            </>
                        )}
                    </h2>
                    {(!isSimpleMode || !simpleMeso) && (
                        <button
                            className={s.btnEdit}
                            onClick={openAddModal}
                            // Remover ou duplicar uma fase reescreve a lista
                            // inteira: abrir o editor no meio disso salvaria
                            // por cima do resultado que ainda está chegando.
                            disabled={saving}
                        >
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
                            onPersistMeso={onPersistMeso}
                            onPrescriptionQueued={applyQueuedPrescription}
                            studentId={studentId}
                            planningId={planningId}
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
                                // Ajuste de série/carga direto no card do
                                // exercício, sem abrir o editor de fase — é o
                                // fluxo de quem está acompanhando o treino.
                                onPersistMeso={onPersistMeso}
                                onPrescriptionQueued={applyQueuedPrescription}
                                studentId={studentId}
                                planningId={planningId}
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
                    onClose={closeModal}
                    onPersist={onPersistMeso}
                    simpleMode={isSimpleMode}
                    dayLabelStyle={dayLabelStyle}
                />
            )}
        </div>
    );
}
