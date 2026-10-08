'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    FiArchive,
    FiBookmark,
    FiCheck,
    FiChevronRight,
    FiClipboard,
    FiArrowLeft,
    FiEdit3,
    FiRotateCcw,
    FiTrash2,
    FiWifiOff,
} from 'react-icons/fi';
import {
    getStudentPlannings,
    deleteMacrocycle,
    saveAsTemplate,
    getMyTemplates,
    updateTemplate,
    updateMacrocycle,
    setPlanningArchived,
    listPlanningTrash,
    restorePlanningFromTrash,
    deletePlanningForever,
    type MacrocycleResponse,
} from '@/libs/planningService';
import Modal from '@/components/system/Modal';
import { useToast } from '@/components/system/Toast';
import {
    cacheStudentPlannings,
    getCachedStudentPlannings,
    isOfflineError,
} from '@/libs/offline/personalCache';
import NewMacrocycleModal from '@/app/personal/_shared/periodizacao/components/NewMacrocycleModal';
import { planKindLabel } from '@/app/personal/_shared/periodizacao/lib/routineDefaults';
import s from './periodizacao.module.css';

/** Dias que um plano excluído fica na lixeira (training.TrashRetention). */
const TRASH_DAYS = 30;

type Tab = 'active' | 'archived' | 'trash';

function formatDate(iso?: string) {
    if (!iso) return '—';
    // Data civil: "2026-10-05" lida como UTC cairia no dia anterior no Brasil.
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
}

function toInputDate(iso?: string) {
    if (!iso) return '';
    return iso.slice(0, 10);
}

function serverMessage(e: unknown, fallback: string): string {
    const data = (
        e as { response?: { data?: { error?: string; message?: string } } }
    )?.response?.data;
    return data?.error || data?.message || fallback;
}

/** "3 treinos" na rotina, "2 fases" na periodização. */
function contentSummary(m: MacrocycleResponse): string {
    const mesos = m.mesocycles ?? [];
    if (m.planning_mode === 'simple') {
        const n = mesos.reduce((sum, x) => sum + (x.trainings?.length ?? 0), 0);
        return `${n} treino${n === 1 ? '' : 's'}`;
    }
    return `${mesos.length} fase${mesos.length === 1 ? '' : 's'}`;
}

/** Dias até a lixeira apagar o plano sozinha. */
function daysLeftInTrash(trashedAt?: string): number {
    if (!trashedAt) return TRASH_DAYS;
    const elapsed = Date.now() - new Date(trashedAt).getTime();
    return Math.max(0, TRASH_DAYS - Math.floor(elapsed / 86_400_000));
}

interface EditFormData {
    name: string;
    goal: string;
    start_date: string;
    end_date: string;
    notes: string;
    archive_on_end: boolean;
}

export default function PeriodizacaoPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const studentId = params.id;
    const { showSuccess, showError, ToastSlot } = useToast();

    const [plannings, setPlannings] = useState<MacrocycleResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    /** Lista servida do cache local por falta de rede (ver personalCache.ts). */
    const [isOfflineData, setIsOfflineData] = useState(false);
    const [tab, setTab] = useState<Tab>('active');
    const [busyId, setBusyId] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    // Lixeira: carregada ao abrir a aba (precisa de rede).
    const [trash, setTrash] = useState<MacrocycleResponse[] | null>(null);
    const [trashError, setTrashError] = useState('');
    const [trashTarget, setTrashTarget] = useState<MacrocycleResponse | null>(
        null,
    );
    const [foreverTarget, setForeverTarget] =
        useState<MacrocycleResponse | null>(null);

    // Salvar na biblioteca
    const [libraryTarget, setLibraryTarget] =
        useState<MacrocycleResponse | null>(null);
    const [libraryName, setLibraryName] = useState('');
    const [libraryFolder, setLibraryFolder] = useState('');
    const [knownFolders, setKnownFolders] = useState<string[]>([]);
    const [savingLibrary, setSavingLibrary] = useState(false);
    const [libraryError, setLibraryError] = useState('');

    // Edição dos dados da rotina
    const [editing, setEditing] = useState<MacrocycleResponse | null>(null);
    const [editForm, setEditForm] = useState<EditFormData>({
        name: '',
        goal: '',
        start_date: '',
        end_date: '',
        notes: '',
        archive_on_end: false,
    });
    const [savingEdit, setSavingEdit] = useState(false);
    const [editError, setEditError] = useState('');

    /* Cada carga com rede também grava a lista no IndexedDB. É o elo que
     * faltava entre "Meus Alunos" e o editor de periodização: sem ele, a
     * navegação do personal offline parava aqui, e a fila de edição de
     * prescrição (prescriptionQueue.ts) nunca era alcançada. */
    const loadPlannings = useCallback(async () => {
        try {
            const data = await getStudentPlannings(studentId);
            setPlannings(data);
            setIsOfflineData(false);
            setError('');
            void cacheStudentPlannings(studentId, data);
        } catch (e) {
            if (isOfflineError(e)) {
                const cached = await getCachedStudentPlannings(studentId);
                if (cached && cached.length > 0) {
                    setPlannings(cached);
                    setIsOfflineData(true);
                    setError('');
                    return;
                }
                setError(
                    'Sem conexão e os treinos deste aluno ainda não foram abertos neste aparelho. Abra esta tela uma vez com internet para poder consultá-la offline.',
                );
                return;
            }
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    useEffect(() => {
        void loadPlannings();
    }, [loadPlannings]);

    useEffect(() => {
        const onOnline = () => void loadPlannings();
        window.addEventListener('online', onOnline);
        return () => window.removeEventListener('online', onOnline);
    }, [loadPlannings]);

    const loadTrash = useCallback(async () => {
        setTrashError('');
        try {
            setTrash(await listPlanningTrash(studentId));
        } catch (e) {
            setTrash([]);
            setTrashError(
                isOfflineError(e)
                    ? 'A lixeira precisa de internet.'
                    : serverMessage(e, 'Não foi possível abrir a lixeira.'),
            );
        }
    }, [studentId]);

    useEffect(() => {
        if (tab === 'trash' && trash === null) void loadTrash();
    }, [tab, trash, loadTrash]);

    const active = useMemo(
        () => plannings.filter((p) => !p.archived),
        [plannings],
    );
    const archived = useMemo(
        () => plannings.filter((p) => p.archived),
        [plannings],
    );
    const shown = tab === 'archived' ? archived : active;

    const replacePlanning = useCallback(
        (updated: MacrocycleResponse) =>
            setPlannings((prev) =>
                prev.map((p) => (p.id === updated.id ? updated : p)),
            ),
        [],
    );

    /* ── Arquivar / desarquivar ── */
    const toggleArchived = useCallback(
        async (e: React.MouseEvent, macro: MacrocycleResponse) => {
            e.stopPropagation();
            setBusyId(macro.id);
            try {
                const updated = await setPlanningArchived(
                    studentId,
                    macro.id,
                    !macro.archived,
                );
                replacePlanning(updated);
                showSuccess(
                    updated.archived
                        ? 'Arquivado. O aluno não vê mais este treino.'
                        : 'Desarquivado. O treino voltou para o aluno.',
                );
            } catch (err) {
                showError(serverMessage(err, 'Não foi possível arquivar.'));
            } finally {
                setBusyId(null);
            }
        },
        [studentId, replacePlanning, showSuccess, showError],
    );

    /* ── Excluir = mover para a lixeira ── */
    const confirmTrash = useCallback(async () => {
        if (!trashTarget) return;
        const target = trashTarget;
        setBusyId(target.id);
        try {
            await deleteMacrocycle(studentId, target.id);
            setPlannings((prev) => prev.filter((p) => p.id !== target.id));
            setTrash(null); // recarrega quando a aba abrir
            setTrashTarget(null);
            showSuccess(
                `Movida para a lixeira. Dá para restaurar por ${TRASH_DAYS} dias.`,
            );
        } catch (err) {
            showError(serverMessage(err, 'Não foi possível excluir.'));
        } finally {
            setBusyId(null);
        }
    }, [trashTarget, studentId, showSuccess, showError]);

    const restore = useCallback(
        async (macro: MacrocycleResponse) => {
            setBusyId(macro.id);
            try {
                const restored = await restorePlanningFromTrash(
                    studentId,
                    macro.id,
                );
                setTrash((prev) =>
                    (prev ?? []).filter((p) => p.id !== macro.id),
                );
                setPlannings((prev) => [restored, ...prev]);
                showSuccess('Restaurado. O treino voltou para o aluno.');
            } catch (err) {
                showError(serverMessage(err, 'Não foi possível restaurar.'));
            } finally {
                setBusyId(null);
            }
        },
        [studentId, showSuccess, showError],
    );

    const confirmForever = useCallback(async () => {
        if (!foreverTarget) return;
        const target = foreverTarget;
        setBusyId(target.id);
        try {
            await deletePlanningForever(studentId, target.id);
            setTrash((prev) => (prev ?? []).filter((p) => p.id !== target.id));
            setForeverTarget(null);
            showSuccess('Apagada de vez.');
        } catch (err) {
            showError(serverMessage(err, 'Não foi possível apagar.'));
        } finally {
            setBusyId(null);
        }
    }, [foreverTarget, studentId, showSuccess, showError]);

    /* ── Edição dos dados ── */
    const openEditModal = useCallback(
        (e: React.MouseEvent, macro: MacrocycleResponse) => {
            e.stopPropagation();
            setEditing(macro);
            setEditForm({
                name: macro.name,
                goal: macro.goal ?? '',
                start_date: toInputDate(macro.start_date),
                end_date: toInputDate(macro.end_date),
                notes: macro.notes ?? '',
                archive_on_end: !!macro.archive_on_end,
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
            setEditForm((prev) => ({
                ...prev,
                [name]: value,
                // Sem término não há o que arquivar sozinho.
                ...(name === 'end_date' && !value
                    ? { archive_on_end: false }
                    : {}),
            }));
        },
        [],
    );

    const handleEditSubmit = useCallback(async () => {
        if (!editing) return;
        if (!editForm.name.trim()) {
            setEditError('Dê um nome ao treino.');
            return;
        }
        if (
            editForm.start_date &&
            editForm.end_date &&
            editForm.end_date <= editForm.start_date
        ) {
            setEditError('O término precisa ser depois do início.');
            return;
        }
        setSavingEdit(true);
        setEditError('');
        try {
            const updated = await updateMacrocycle(studentId, editing.id, {
                name: editForm.name.trim(),
                goal: editForm.goal,
                start_date: editForm.start_date || null,
                end_date: editForm.end_date || null,
                notes: editForm.notes.trim(),
                archive_on_end: !!editForm.end_date && editForm.archive_on_end,
                // "Rascunho" saiu do fluxo: o aluno sempre viu o plano em
                // qualquer status. Um plano antigo em rascunho vira ativo ao
                // ser editado, para entrar no relatório do personal.
                ...(editing.status === 'draft' ? { status: 'active' } : {}),
            });
            replacePlanning(updated);
            closeEditModal();
            showSuccess('Dados salvos.');
        } catch (e: unknown) {
            setEditError(serverMessage(e, 'Não foi possível salvar.'));
        } finally {
            setSavingEdit(false);
        }
    }, [
        editing,
        editForm,
        studentId,
        replacePlanning,
        closeEditModal,
        showSuccess,
    ]);

    /* ── Salvar na biblioteca ── */
    const openLibraryModal = useCallback(
        (e: React.MouseEvent, macro: MacrocycleResponse) => {
            e.stopPropagation();
            setLibraryTarget(macro);
            setLibraryName(macro.name);
            setLibraryFolder('');
            setLibraryError('');
            // Pastas já usadas, para sugerir no campo.
            getMyTemplates()
                .then((tpls) =>
                    setKnownFolders(
                        [
                            ...new Set(
                                tpls
                                    .map((t) => t.folder)
                                    .filter((f): f is string => !!f),
                            ),
                        ].sort((a, b) => a.localeCompare(b, 'pt-BR')),
                    ),
                )
                .catch(() => setKnownFolders([]));
        },
        [],
    );

    const confirmSaveToLibrary = useCallback(async () => {
        if (!libraryTarget || !libraryName.trim()) return;
        setSavingLibrary(true);
        setLibraryError('');
        try {
            const tpl = await saveAsTemplate(
                studentId,
                libraryTarget.id,
                libraryName.trim(),
            );
            if (libraryFolder.trim()) {
                await updateTemplate(tpl.id, { folder: libraryFolder.trim() });
            }
            setLibraryTarget(null);
            showSuccess(
                'Salvo na biblioteca. Use "Copiar da biblioteca" ao criar o treino de outro aluno.',
            );
        } catch (err: unknown) {
            // 409 = nome repetido entre os treinos da biblioteca.
            setLibraryError(serverMessage(err, 'Não foi possível salvar.'));
        } finally {
            setSavingLibrary(false);
        }
    }, [libraryTarget, libraryName, libraryFolder, studentId, showSuccess]);

    const online = !isOfflineData;

    return (
        <>
            {ToastSlot}
            <div className={s.page}>
                <div className={s.container}>
                    <div className={s.header}>
                        <div>
                            <h1 className={s.headerTitle}>
                                <FiClipboard /> Treinos
                            </h1>
                            <p className={s.headerSub}>
                                Treinos do aluno
                            </p>
                        </div>
                        <div className={s.headerActions}>
                            <button
                                className={s.btnBack}
                                onClick={() => router.back()}
                            >
                                <FiArrowLeft /> Voltar
                            </button>
                            <button
                                className={s.btnAdd}
                                onClick={() => setCreating(true)}
                                disabled={!online}
                            >
                                + Criar treino
                            </button>
                        </div>
                    </div>

                    <div className={s.tabs} role="tablist">
                        {(
                            [
                                ['active', `Ativos (${active.length})`],
                                ['archived', `Arquivados (${archived.length})`],
                                ['trash', 'Lixeira'],
                            ] as [Tab, string][]
                        ).map(([key, label]) => (
                            <button
                                key={key}
                                role="tab"
                                aria-selected={tab === key}
                                className={tab === key ? s.tabOn : s.tab}
                                onClick={() => setTab(key)}
                            >
                                {label}
                            </button>
                        ))}
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

                    {isOfflineData && (
                        <div className={s.offlineNotice}>
                            <FiWifiOff /> Sem conexão — mostrando os treinos
                            salvos neste aparelho. Abrir um treino e ajustar
                            série/carga continua funcionando; o envio acontece
                            quando a internet voltar.
                        </div>
                    )}

                    {error && <div className="alert alert-danger">{error}</div>}

                    {tab !== 'trash' &&
                        !loading &&
                        !error &&
                        shown.length === 0 && (
                            <div className={s.emptyPlans}>
                                {tab === 'active' ? (
                                    <>
                                        <p className={s.emptyPlansText}>
                                            Este aluno ainda não tem treino.
                                            Monte um treino do zero ou copie
                                            um treino da sua biblioteca.
                                        </p>
                                        <button
                                            className={s.btnAdd}
                                            onClick={() => setCreating(true)}
                                            disabled={!online}
                                        >
                                            + Criar treino
                                        </button>
                                    </>
                                ) : (
                                    <p className={s.emptyPlansText}>
                                        Nenhum treino arquivado. Arquivado, o
                                        treino some do app do aluno e continua
                                        guardada aqui.
                                    </p>
                                )}
                            </div>
                        )}

                    {tab !== 'trash' && !loading && shown.length > 0 && (
                        <div className={s.list}>
                            {shown.map((m) => (
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
                                            <span className={s.badgeKind}>
                                                {planKindLabel(m.planning_mode)}
                                            </span>
                                            {m.archived && (
                                                <span className={s.badgeDraft}>
                                                    Arquivado
                                                </span>
                                            )}
                                        </p>
                                        <p className={s.cardMeta}>
                                            {m.goal ? m.goal + ' · ' : ''}
                                            {formatDate(m.start_date)} →{' '}
                                            {formatDate(m.end_date)} ·{' '}
                                            {contentSummary(m)}
                                            {m.archive_on_end &&
                                                !m.archived &&
                                                ' · arquiva ao terminar'}
                                        </p>
                                    </div>
                                    <div className={s.cardActions}>
                                        <span className={s.btnAction}>
                                            Abrir <FiChevronRight />
                                        </span>
                                        <button
                                            className={s.btnSecondary}
                                            disabled={!online}
                                            onClick={(e) => openEditModal(e, m)}
                                        >
                                            <FiEdit3 /> Editar
                                        </button>
                                        {/* O plano que o aluno comprou na loja
                                            não vai para a biblioteca do
                                            personal (o servidor recusa). */}
                                        {m.category !== 'celebrity' && (
                                            <button
                                                className={s.btnSecondary}
                                                disabled={!online}
                                                onClick={(e) =>
                                                    openLibraryModal(e, m)
                                                }
                                            >
                                                <FiBookmark /> Salvar na
                                                biblioteca
                                            </button>
                                        )}
                                        <button
                                            className={s.btnSecondary}
                                            disabled={!online || busyId === m.id}
                                            onClick={(e) => toggleArchived(e, m)}
                                        >
                                            {m.archived ? (
                                                <>
                                                    <FiRotateCcw /> Desarquivar
                                                </>
                                            ) : (
                                                <>
                                                    <FiArchive /> Arquivar
                                                </>
                                            )}
                                        </button>
                                        <button
                                            className={s.btnDanger}
                                            disabled={!online || busyId === m.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTrashTarget(m);
                                            }}
                                        >
                                            <FiTrash2 /> Excluir
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {tab === 'trash' && (
                        <>
                            <p className={s.trashHint}>
                                O que você exclui fica aqui por {TRASH_DAYS}{' '}
                                dias e depois some sozinho. Enquanto estiver
                                na lixeira, o aluno não vê.
                            </p>
                            {trash === null ? (
                                <p className={s.loading}>Carregando...</p>
                            ) : trashError ? (
                                <div className={s.errorMsg}>{trashError}</div>
                            ) : trash.length === 0 ? (
                                <div className={s.emptyPlans}>
                                    <p className={s.emptyPlansText}>
                                        A lixeira está vazia.
                                    </p>
                                </div>
                            ) : (
                                <div className={s.list}>
                                    {trash.map((m) => (
                                        <div
                                            key={m.id}
                                            className={s.cardStatic}
                                        >
                                            <div className={s.cardInfo}>
                                                <p className={s.cardName}>
                                                    {m.name}
                                                    <span
                                                        className={s.badgeKind}
                                                    >
                                                        {planKindLabel(
                                                            m.planning_mode,
                                                        )}
                                                    </span>
                                                </p>
                                                <p className={s.cardMeta}>
                                                    {contentSummary(m)} · some
                                                    em{' '}
                                                    {daysLeftInTrash(
                                                        m.trashed_at,
                                                    )}{' '}
                                                    dia
                                                    {daysLeftInTrash(
                                                        m.trashed_at,
                                                    ) === 1
                                                        ? ''
                                                        : 's'}
                                                </p>
                                            </div>
                                            <div className={s.cardActions}>
                                                <button
                                                    className={s.btnSecondary}
                                                    disabled={busyId === m.id}
                                                    onClick={() => restore(m)}
                                                >
                                                    <FiRotateCcw /> Restaurar
                                                </button>
                                                <button
                                                    className={s.btnDanger}
                                                    disabled={busyId === m.id}
                                                    onClick={() =>
                                                        setForeverTarget(m)
                                                    }
                                                >
                                                    <FiTrash2 /> Apagar de vez
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Dados da rotina */}
            <Modal
                open={!!editing}
                onClose={closeEditModal}
                title={`Editar ${planKindLabel(editing?.planning_mode).toLowerCase()}`}
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
                {editError && <div className={s.errorMsg}>{editError}</div>}
                <div className={s.formGroup}>
                    <label className={s.formLabel} htmlFor="ed-name">
                        Nome
                    </label>
                    <input
                        id="ed-name"
                        name="name"
                        value={editForm.name}
                        onChange={handleEditInput}
                        className={s.formInput}
                    />
                </div>
                <div className={s.formGroup}>
                    <label className={s.formLabel} htmlFor="ed-goal">
                        Objetivo (opcional)
                    </label>
                    <input
                        id="ed-goal"
                        name="goal"
                        value={editForm.goal}
                        onChange={handleEditInput}
                        className={s.formInput}
                    />
                </div>
                <div className={s.formRow}>
                    <div className={s.formGroup}>
                        <label className={s.formLabel} htmlFor="ed-start">
                            Início
                        </label>
                        <input
                            id="ed-start"
                            type="date"
                            name="start_date"
                            value={editForm.start_date}
                            onChange={handleEditInput}
                            className={s.formInput}
                        />
                    </div>
                    <div className={s.formGroup}>
                        <label className={s.formLabel} htmlFor="ed-end">
                            Término
                        </label>
                        <input
                            id="ed-end"
                            type="date"
                            name="end_date"
                            value={editForm.end_date}
                            onChange={handleEditInput}
                            className={s.formInput}
                        />
                    </div>
                </div>
                {/* Botão com aria-pressed, não checkbox: o CSS global já
                    comeu o :checked dos checkboxes do app uma vez. */}
                <button
                    type="button"
                    aria-pressed={editForm.archive_on_end}
                    disabled={!editForm.end_date}
                    className={
                        editForm.archive_on_end ? s.toggleChipOn : s.toggleChip
                    }
                    onClick={() =>
                        setEditForm((prev) => ({
                            ...prev,
                            archive_on_end: !prev.archive_on_end,
                        }))
                    }
                >
                    {editForm.archive_on_end && <FiCheck aria-hidden />}
                    Arquivar quando terminar
                </button>
                <div className={s.formGroup} style={{ marginTop: 16 }}>
                    <label className={s.formLabel} htmlFor="ed-notes">
                        Observações para o aluno
                    </label>
                    <textarea
                        id="ed-notes"
                        name="notes"
                        value={editForm.notes}
                        onChange={handleEditInput}
                        className={s.formInput}
                        rows={3}
                        maxLength={2000}
                        placeholder="Ex.: aqueça 10 minutos antes de todo treino."
                    />
                </div>
            </Modal>

            {/* Salvar na biblioteca */}
            <Modal
                open={!!libraryTarget}
                onClose={() => setLibraryTarget(null)}
                title="Salvar na biblioteca"
                footer={
                    <>
                        <button
                            onClick={() => setLibraryTarget(null)}
                            className={s.btnCancel}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmSaveToLibrary}
                            disabled={savingLibrary || !libraryName.trim()}
                            className={s.btnSubmit}
                        >
                            {savingLibrary ? 'Salvando...' : 'Salvar'}
                        </button>
                    </>
                }
            >
                {libraryError && (
                    <div className={s.errorMsg}>{libraryError}</div>
                )}
                <p className={s.confirmText}>
                    Guarda uma cópia deste treino para usar com outros alunos.
                    Mudar a cópia depois não mexe no treino deste aluno.
                </p>
                <div className={s.formGroup}>
                    <label className={s.formLabel} htmlFor="lib-name">
                        Nome na biblioteca
                    </label>
                    <input
                        id="lib-name"
                        value={libraryName}
                        onChange={(e) => setLibraryName(e.target.value)}
                        className={s.formInput}
                    />
                </div>
                <div className={s.formGroup}>
                    <label className={s.formLabel} htmlFor="lib-folder">
                        Pasta (opcional)
                    </label>
                    <input
                        id="lib-folder"
                        list="lib-folders"
                        value={libraryFolder}
                        onChange={(e) => setLibraryFolder(e.target.value)}
                        className={s.formInput}
                        maxLength={40}
                        placeholder="Ex.: Iniciante, Feminino, Hipertrofia"
                    />
                    <datalist id="lib-folders">
                        {knownFolders.map((f) => (
                            <option key={f} value={f} />
                        ))}
                    </datalist>
                </div>
            </Modal>

            {/* Excluir → lixeira */}
            <Modal
                open={!!trashTarget}
                onClose={() => setTrashTarget(null)}
                title="Excluir treino"
                footer={
                    <>
                        <button
                            onClick={() => setTrashTarget(null)}
                            className={s.btnCancel}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmTrash}
                            disabled={busyId === trashTarget?.id}
                            className={s.btnSubmit}
                        >
                            Mover para a lixeira
                        </button>
                    </>
                }
            >
                <p className={s.confirmText}>
                    <span className={s.confirmName}>{trashTarget?.name}</span>{' '}
                    sai do app do aluno e fica na lixeira por {TRASH_DAYS}{' '}
                    dias. Dá para restaurar nesse prazo.
                </p>
            </Modal>

            {/* Apagar de vez */}
            <Modal
                open={!!foreverTarget}
                onClose={() => setForeverTarget(null)}
                title="Apagar de vez"
                footer={
                    <>
                        <button
                            onClick={() => setForeverTarget(null)}
                            className={s.btnCancel}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmForever}
                            disabled={busyId === foreverTarget?.id}
                            className={s.btnSubmit}
                        >
                            Apagar de vez
                        </button>
                    </>
                }
            >
                <p className={s.confirmText}>
                    <span className={s.confirmName}>
                        {foreverTarget?.name}
                    </span>{' '}
                    será apagada e não poderá ser recuperada.
                </p>
            </Modal>

            {creating && (
                <NewMacrocycleModal
                    studentId={studentId}
                    onClose={() => setCreating(false)}
                    onCreated={(macro) =>
                        router.push(
                            `/personal/aluno/${studentId}/periodizacao/${macro.id}?created=1`,
                        )
                    }
                />
            )}
        </>
    );
}
