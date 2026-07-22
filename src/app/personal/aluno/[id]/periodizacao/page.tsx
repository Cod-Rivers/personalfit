'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    getStudentPlannings,
    deleteMacrocycle,
    saveAsTemplate,
    getMyTemplates,
    applyTemplate,
    deleteTemplate,
    updateMacrocycle,
    type MacrocycleResponse,
} from '@/libs/planningService';
import Modal from '@/components/system/Modal';
import s from './periodizacao.module.css';

const STATUS_LABEL: Record<string, string> = {
    draft: 'Rascunho',
    active: 'Ativo',
    completed: 'Concluído',
};

function formatDate(iso?: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR');
}

function toInputDate(iso?: string) {
    if (!iso) return '';
    return iso.slice(0, 10);
}

interface EditFormData {
    name: string;
    goal: string;
    status: string;
    start_date: string;
    end_date: string;
}

export default function PeriodizacaoPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const studentId = params.id;

    const [plannings, setPlannings] = useState<MacrocycleResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleting, setDeleting] = useState<string | null>(null);

    // template states
    const [savingTemplate, setSavingTemplate] = useState<string | null>(null);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templates, setTemplates] = useState<MacrocycleResponse[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [applyingTemplate, setApplyingTemplate] = useState<string | null>(
        null,
    );
    const [deletingTemplate, setDeletingTemplate] = useState<string | null>(
        null,
    );

    // edit macrocycle states
    const [editing, setEditing] = useState<MacrocycleResponse | null>(null);
    const [editForm, setEditForm] = useState<EditFormData>({
        name: '',
        goal: '',
        status: 'draft',
        start_date: '',
        end_date: '',
    });
    const [savingEdit, setSavingEdit] = useState(false);
    const [editError, setEditError] = useState('');

    useEffect(() => {
        getStudentPlannings(studentId)
            .then(setPlannings)
            .catch((e: Error) => setError(e.message))
            .finally(() => setLoading(false));
    }, [studentId]);

    const handleDelete = useCallback(
        async (e: React.MouseEvent, id: string) => {
            e.stopPropagation();
            if (
                !confirm(
                    'Excluir este macrociclo? Esta ação não pode ser desfeita.',
                )
            )
                return;
            setDeleting(id);
            try {
                await deleteMacrocycle(studentId, id);
                setPlannings((prev) => prev.filter((p) => p.id !== id));
            } catch {
                alert('Erro ao excluir macrociclo.');
            } finally {
                setDeleting(null);
            }
        },
        [studentId],
    );

    const openEditModal = useCallback(
        (e: React.MouseEvent, macro: MacrocycleResponse) => {
            e.stopPropagation();
            setEditing(macro);
            setEditForm({
                name: macro.name,
                goal: macro.goal ?? '',
                status: macro.status,
                start_date: toInputDate(macro.start_date),
                end_date: toInputDate(macro.end_date),
            });
            setEditError('');
        },
        [],
    );

    const closeEditModal = useCallback(() => {
        setEditing(null);
        setEditError('');
    }, []);

    const handleEditInput = useCallback(
        (
            e: React.ChangeEvent<
                HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
            >,
        ) => {
            const { name, value } = e.target;
            setEditForm((prev) => ({ ...prev, [name]: value }));
        },
        [],
    );

    const handleEditSubmit = useCallback(async () => {
        if (!editing) return;
        if (
            editForm.start_date &&
            editForm.end_date &&
            editForm.end_date <= editForm.start_date
        ) {
            setEditError('Data de término deve ser depois da data de início.');
            return;
        }
        setSavingEdit(true);
        setEditError('');
        try {
            const updated = await updateMacrocycle(studentId, editing.id, {
                name: editForm.name,
                goal: editForm.goal,
                status: editForm.status,
                start_date: editForm.start_date || null,
                end_date: editForm.end_date || null,
            });
            setPlannings((prev) =>
                prev.map((p) => (p.id === updated.id ? updated : p)),
            );
            closeEditModal();
        } catch (e: unknown) {
            setEditError((e as Error).message ?? 'Erro ao salvar macrociclo.');
        } finally {
            setSavingEdit(false);
        }
    }, [editing, editForm, studentId, closeEditModal]);

    const handleSaveAsTemplate = useCallback(
        async (e: React.MouseEvent, macro: MacrocycleResponse) => {
            e.stopPropagation();
            const name = prompt('Nome do modelo:', macro.name + ' (modelo)');
            if (!name) return;
            setSavingTemplate(macro.id);
            try {
                await saveAsTemplate(studentId, macro.id, name);
                alert('Modelo salvo com sucesso!');
            } catch {
                alert('Erro ao salvar modelo.');
            } finally {
                setSavingTemplate(null);
            }
        },
        [studentId],
    );

    const openTemplateModal = useCallback(async () => {
        setShowTemplateModal(true);
        setLoadingTemplates(true);
        try {
            const data = await getMyTemplates();
            setTemplates(data);
        } catch {
            alert('Erro ao carregar modelos.');
            setShowTemplateModal(false);
        } finally {
            setLoadingTemplates(false);
        }
    }, []);

    const handleApplyTemplate = useCallback(
        async (templateId: string) => {
            if (
                !confirm(
                    'Aplicar este modelo ao aluno? Um novo macrociclo será criado.',
                )
            )
                return;
            setApplyingTemplate(templateId);
            try {
                const created = await applyTemplate(studentId, templateId);
                setPlannings((prev) => [...prev, created]);
                setShowTemplateModal(false);
                alert('Macrociclo criado a partir do modelo!');
            } catch {
                alert('Erro ao aplicar modelo.');
            } finally {
                setApplyingTemplate(null);
            }
        },
        [studentId],
    );

    const handleDeleteTemplate = useCallback(
        async (e: React.MouseEvent, templateId: string) => {
            e.stopPropagation();
            if (!confirm('Excluir este modelo permanentemente?')) return;
            setDeletingTemplate(templateId);
            try {
                await deleteTemplate(templateId);
                setTemplates((prev) => prev.filter((t) => t.id !== templateId));
            } catch {
                alert('Erro ao excluir modelo.');
            } finally {
                setDeletingTemplate(null);
            }
        },
        [],
    );

    return (
        <>
            <div className={s.page}>
                <div className={s.container}>
                    <div className={s.header}>
                        <div>
                            <h1 className={s.headerTitle}>📋 Periodização</h1>
                            <p className={s.headerSub}>Macrociclos do aluno</p>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                className={s.btnBack}
                                onClick={() => router.back()}
                            >
                                ← Voltar
                            </button>
                            <button
                                className={s.btnSecondary}
                                onClick={openTemplateModal}
                            >
                                📂 De Modelo
                            </button>
                            <button
                                className={s.btnAdd}
                                onClick={() =>
                                    router.push(
                                        `/personal/aluno/${studentId}/periodizacao/novo`,
                                    )
                                }
                            >
                                + Novo Macrociclo
                            </button>
                        </div>
                    </div>

                    {loading && (
                        <div className="text-center py-5">
                            <div className="spinner-border" role="status">
                                <span className="visually-hidden">
                                    Carregando...
                                </span>
                            </div>
                        </div>
                    )}

                    {error && <div className="alert alert-danger">{error}</div>}

                    {!loading && !error && plannings.length === 0 && (
                        <p
                            style={{
                                color: 'var(--text-muted)',
                                textAlign: 'center',
                                marginTop: 40,
                            }}
                        >
                            Nenhum macrociclo criado ainda. Clique em &quot;+
                            Novo Macrociclo&quot; para começar.
                        </p>
                    )}

                    {!loading && plannings.length > 0 && (
                        <div className={s.list}>
                            {plannings.map((m) => (
                                <div
                                    key={m.id}
                                    className={s.card}
                                    onClick={() =>
                                        router.push(
                                            `/personal/aluno/${studentId}/periodizacao/${m.id}`,
                                        )
                                    }
                                >
                                    <div className={s.cardInfo}>
                                        <p className={s.cardName}>
                                            {m.name}
                                            <span
                                                className={
                                                    m.status === 'active'
                                                        ? s.badgeActive
                                                        : m.status ===
                                                            'completed'
                                                          ? s.badgeCompleted
                                                          : s.badgeDraft
                                                }
                                            >
                                                {STATUS_LABEL[m.status] ??
                                                    m.status}
                                            </span>
                                        </p>
                                        <p className={s.cardMeta}>
                                            {m.goal ? m.goal + ' · ' : ''}
                                            {formatDate(m.start_date)} →{' '}
                                            {formatDate(m.end_date)} ·{' '}
                                            {m.mesocycles?.length ?? 0}{' '}
                                            mesociclo(s)
                                        </p>
                                    </div>
                                    <div className={s.cardActions}>
                                        <span className={s.btnAction}>
                                            Ver detalhes →
                                        </span>
                                        <button
                                            className={s.btnSecondary}
                                            onClick={(e) =>
                                                openEditModal(e, m)
                                            }
                                        >
                                            ✏️ Editar
                                        </button>
                                        <button
                                            className={s.btnSecondary}
                                            disabled={savingTemplate === m.id}
                                            onClick={(e) =>
                                                handleSaveAsTemplate(e, m)
                                            }
                                        >
                                            {savingTemplate === m.id
                                                ? '...'
                                                : '📋 Modelo'}
                                        </button>
                                        <button
                                            className={s.btnDanger}
                                            disabled={deleting === m.id}
                                            onClick={(e) =>
                                                handleDelete(e, m.id)
                                            }
                                        >
                                            {deleting === m.id
                                                ? '...'
                                                : '🗑️ Excluir'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de edição do macrociclo */}
            <Modal
                open={!!editing}
                onClose={closeEditModal}
                title="Editar Macrociclo"
                footer={
                    <>
                        <button
                            onClick={closeEditModal}
                            className={s.btnCancel}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleEditSubmit}
                            disabled={savingEdit}
                            className={s.btnSubmit}
                        >
                            {savingEdit ? 'Salvando...' : 'Salvar'}
                        </button>
                    </>
                }
            >
                {editError && (
                    <div className={s.errorMsg}>{editError}</div>
                )}
                <div className={s.formGroup}>
                    <label className={s.formLabel}>Nome</label>
                    <input
                        name="name"
                        value={editForm.name}
                        onChange={handleEditInput}
                        className={s.formInput}
                    />
                </div>
                <div className={s.formGroup}>
                    <label className={s.formLabel}>Objetivo</label>
                    <input
                        name="goal"
                        value={editForm.goal}
                        onChange={handleEditInput}
                        className={s.formInput}
                    />
                </div>
                <div className={s.formGroup}>
                    <label className={s.formLabel}>Status</label>
                    <select
                        name="status"
                        value={editForm.status}
                        onChange={handleEditInput}
                        className={s.formInput}
                    >
                        <option value="draft">Rascunho</option>
                        <option value="active">Ativo</option>
                        <option value="completed">Concluído</option>
                    </select>
                </div>
                <div className={s.formRow}>
                    <div className={s.formGroup}>
                        <label className={s.formLabel}>
                            Data de início
                        </label>
                        <input
                            type="date"
                            name="start_date"
                            value={editForm.start_date}
                            onChange={handleEditInput}
                            className={s.formInput}
                        />
                    </div>
                    <div className={s.formGroup}>
                        <label className={s.formLabel}>
                            Data de término
                        </label>
                        <input
                            type="date"
                            name="end_date"
                            value={editForm.end_date}
                            onChange={handleEditInput}
                            className={s.formInput}
                        />
                    </div>
                </div>
            </Modal>

            {/* Modal de templates */}
            <Modal
                open={showTemplateModal}
                onClose={() => setShowTemplateModal(false)}
                title="📂 Aplicar Modelo de Macrociclo"
                footer={
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowTemplateModal(false)}
                    >
                        Fechar
                    </button>
                }
            >
                {loadingTemplates && (
                    <div className="text-center py-3">
                        <div
                            className="spinner-border spinner-border-sm"
                            role="status"
                        />
                    </div>
                )}
                {!loadingTemplates &&
                    templates.length === 0 && (
                        <p className="text-muted text-center py-3">
                            Nenhum modelo salvo ainda. Use o
                            botão &quot;📋 Modelo&quot; em um
                            macrociclo para criar o primeiro.
                        </p>
                    )}
                {!loadingTemplates && templates.length > 0 && (
                    <ul className="list-group">
                        {templates.map((t) => (
                            <li
                                key={t.id}
                                className="list-group-item d-flex justify-content-between align-items-center"
                            >
                                <div>
                                    <strong>{t.name}</strong>
                                    <br />
                                    <small className="text-muted">
                                        {t.mesocycles?.length ??
                                            0}{' '}
                                        mesociclo(s)
                                    </small>
                                </div>
                                <div className="d-flex gap-2">
                                    <button
                                        className="btn btn-sm btn-primary"
                                        disabled={
                                            applyingTemplate ===
                                            t.id
                                        }
                                        onClick={() =>
                                            handleApplyTemplate(
                                                t.id,
                                            )
                                        }
                                    >
                                        {applyingTemplate ===
                                        t.id
                                            ? '...'
                                            : 'Aplicar'}
                                    </button>
                                    <button
                                        className="btn btn-sm btn-outline-danger"
                                        disabled={
                                            deletingTemplate ===
                                            t.id
                                        }
                                        onClick={(e) =>
                                            handleDeleteTemplate(
                                                e,
                                                t.id,
                                            )
                                        }
                                    >
                                        {deletingTemplate ===
                                        t.id
                                            ? '...'
                                            : '🗑️'}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Modal>
        </>
    );
}
