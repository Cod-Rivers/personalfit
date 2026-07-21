'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    getTemplate,
    updateTemplate,
    macroToGanttPhases,
    type MacrocycleResponse,
    type MesocycleRequest,
    type MesocycleResponse,
} from '@/libs/planningService';
import GanttPlanning from '@/components/features/GanttPlanning';
import {
    STATUS_LABEL,
    mesoToRequest,
    duplicateMesoRequest,
} from '@/app/personal/_shared/periodizacao/lib/mesocycleTransforms';
import MesocycleSection from '@/app/personal/_shared/periodizacao/components/MesocycleSection';
import MesocycleFormModal from '@/app/personal/_shared/periodizacao/components/MesocycleFormModal';
import s from '@/app/personal/_shared/periodizacao/builder.module.css';

export default function TemplateDetalhePage() {
    const router = useRouter();
    const params = useParams<{ templateId: string }>();
    const { templateId } = params;

    const [macro, setMacro] = useState<MacrocycleResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState('');

    /* Modal state */
    const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
    const [editingMeso, setEditingMeso] = useState<MesocycleResponse | null>(
        null,
    );
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    /* ── Fetch ── */
    useEffect(() => {
        getTemplate(templateId)
            .then(setMacro)
            .catch((e: Error) => setPageError(e.message))
            .finally(() => setLoading(false));
    }, [templateId]);

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
                const updated = await updateTemplate(templateId, {
                    mesocycles: updatedList,
                });
                setMacro(updated);
            } catch (e: unknown) {
                const msg = (
                    e as { response?: { data?: { message?: string } } }
                )?.response?.data?.message;
                alert(msg || 'Erro ao remover mesociclo.');
            } finally {
                setSaving(false);
            }
        },
        [macro, templateId],
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
                const updated = await updateTemplate(templateId, {
                    mesocycles: updatedList,
                });
                setMacro(updated);
            } catch (e: unknown) {
                const msg = (
                    e as { response?: { data?: { message?: string } } }
                )?.response?.data?.message;
                alert(msg || 'Erro ao duplicar mesociclo.');
            } finally {
                setSaving(false);
            }
        },
        [macro, templateId],
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

                const updated = await updateTemplate(templateId, {
                    mesocycles: updatedList,
                });
                setMacro(updated);
                closeModal();
            } catch (e: unknown) {
                const msg = (
                    e as { response?: { data?: { message?: string } } }
                )?.response?.data?.message;
                setSaveError(msg || 'Erro ao salvar mesociclo.');
            } finally {
                setSaving(false);
            }
        },
        [macro, modalMode, editingMeso, templateId, closeModal],
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
    // Templates raramente têm start_date, então o Gantt normalmente fica
    // vazio aqui — sem tratamento especial, macroToGanttPhases já retorna [].
    const ganttPhases = isSimpleMode
        ? []
        : macroToGanttPhases(macro, { preferDuration: true });
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
                            <p className={s.infoLabel}>Visibilidade</p>
                            <p className={s.infoValue}>
                                {macro.is_public ? 'Público' : 'Privado'}
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
                        <GanttPlanning phases={ganttPhases} />
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
                            Nenhum treino configurado ainda. Clique em
                            &quot;+ Configurar treinos da semana&quot; para
                            começar.
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
