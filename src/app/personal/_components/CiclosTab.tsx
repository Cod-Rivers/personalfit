'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    FiGlobe,
    FiStar,
    FiSettings,
    FiClipboard,
    FiEdit3,
    FiCopy,
    FiTrash2,
    FiArrowLeft,
    FiBookOpen,
    FiFolder,
} from 'react-icons/fi';
import { usePersonalTemplates } from '@/hooks/usePersonalTemplates';
import type { Student } from '@/hooks/usePersonalStudents';
import type { MacrocycleResponse } from '@/libs/planningService';
import Modal from '@/components/system/Modal';
import s from '../personal.module.css';

interface Props {
    view: 'own' | 'public';
    students: Student[];
    planType?: 'free' | 'pro';
    onBack?: () => void;
}

type SortMode = 'recent' | 'usage';

/** "Rotina · 3 treinos", "Periodização · 2 fases". */
function templateSummary(tpl: MacrocycleResponse): string {
    const mesos = tpl.mesocycles ?? [];
    if (tpl.planning_mode === 'simple') {
        const n = mesos.reduce((sum, m) => sum + (m.trainings?.length ?? 0), 0);
        return `Treino · ${n} treino${n === 1 ? '' : 's'}`;
    }
    return `Periodização · ${mesos.length} fase${mesos.length === 1 ? '' : 's'}`;
}

export default function CiclosTab({ view, students, planType = 'free', onBack }: Props) {
    const isPro = planType === 'pro';
    const router = useRouter();
    const {
        templates,
        tplLoading,
        selectedTemplate,
        modal,
        tplForm,
        setTplForm,
        submitting,
        error,
        openApply,
        openEdit,
        openDelete,
        closeModal,
        applyToStudent,
        handleTplUpdate,
        handleTplDelete,
        duplicateTpl,
        duplicatingId,
    } = usePersonalTemplates(view);

    const isPublic = view === 'public';

    // No plano free, ciclos nunca podem ficar privados — força o valor mesmo
    // para registros legados criados antes dessa regra existir, já que o
    // dropdown de "Privado" fica oculto e o personal não tem como escolhê-lo.
    useEffect(() => {
        if (modal === 'tplEdit' && !isPro) {
            setTplForm((prev) => ({ ...prev, is_public: true }));
        }
    }, [modal, isPro, setTplForm]);

    const [search, setSearch] = useState('');
    const [sortMode, setSortMode] = useState<SortMode>('recent');
    /** Pasta escolhida no filtro. null = todas. */
    const [folder, setFolder] = useState<string | null>(null);

    // Pastas em uso, para o filtro e para sugerir no formulário.
    const folders = useMemo(() => {
        const set = new Set<string>();
        templates.forEach((t) => t.folder && set.add(t.folder));
        return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }, [templates]);

    const visibleTemplates = useMemo(() => {
        const q = search.trim().toLowerCase();
        const inFolder =
            folder === null
                ? templates
                : templates.filter((t) => (t.folder ?? '') === folder);
        const filtered = q
            ? inFolder.filter(
                  (t) =>
                      t.name?.toLowerCase().includes(q) ||
                      t.goal?.toLowerCase().includes(q),
              )
            : inFolder;
        if (sortMode === 'usage') {
            return [...filtered].sort(
                (a, b) => (b.usage_count ?? 0) - (a.usage_count ?? 0),
            );
        }
        return filtered;
    }, [templates, search, sortMode, folder]);

    const renderTemplateCard = useCallback(
        (tpl: MacrocycleResponse) => (
            <div key={tpl.id} className={s.templateCard}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                        className={s.templateName}
                        style={!isPublic ? { cursor: 'pointer' } : undefined}
                        onClick={
                            !isPublic
                                ? () =>
                                      router.push(
                                          `/personal/templates/${tpl.id}`,
                                      )
                                : undefined
                        }
                    >
                        {tpl.name || 'Treino sem nome'}
                        <span className={`${s.badgeMesocycles} ${s.badgeArchived}`}>
                            {templateSummary(tpl)}
                        </span>
                        {!isPublic && tpl.folder && (
                            <span className={`${s.badgeMesocycles} ${s.badgeArchived}`}>
                                <FiFolder aria-hidden /> {tpl.folder}
                            </span>
                        )}
                        {isPublic && tpl.is_public && (
                            <span className={s.badgePublic} title="Público">
                                <FiGlobe />
                            </span>
                        )}
                        {tpl.featured && (
                            <span className={s.badgePublic} title="Destaque">
                                <FiStar style={{ fill: 'currentColor' }} />
                            </span>
                        )}
                        {!isPublic && tpl.is_public && (
                            <span
                                className={s.badgeMesocycles}
                                style={
                                    tpl.approval_status === 'approved'
                                        ? { background: 'rgba(34,197,94,0.15)', color: '#22c55e' }
                                        : tpl.approval_status === 'rejected'
                                          ? { background: 'rgba(239,68,68,0.15)', color: '#ef4444' }
                                          : { background: 'rgba(234,179,8,0.15)', color: '#eab308' }
                                }
                                title={
                                    tpl.approval_status === 'rejected'
                                        ? tpl.rejection_reason || 'Rejeitado pela equipe Venafit'
                                        : undefined
                                }
                            >
                                {tpl.approval_status === 'approved'
                                    ? 'Aprovado'
                                    : tpl.approval_status === 'rejected'
                                      ? 'Rejeitado'
                                      : 'Pendente de revisão'}
                            </span>
                        )}
                        {(tpl.usage_count ?? 0) > 0 && (
                            <span
                                className={s.badgeMesocycles}
                                style={{
                                    background: 'rgba(124,92,252,0.15)',
                                    color: '#7c5cfc',
                                }}
                                title="Vezes aplicado a alunos"
                            >
                                {tpl.usage_count} uso
                                {tpl.usage_count === 1 ? '' : 's'}
                            </span>
                        )}
                    </p>
                </div>
                <div className={s.studentActions}>
                    {!isPublic && (
                        <button
                            onClick={() =>
                                router.push(`/personal/templates/${tpl.id}`)
                            }
                            className={s.btnEdit}
                        >
                            <FiSettings /> Montar treinos
                        </button>
                    )}
                    <button
                        onClick={() => openApply(tpl)}
                        className={s.btnApply}
                    >
                        <FiClipboard /> Copiar para aluno
                    </button>
                    {!isPublic && (
                        <>
                            <button
                                onClick={() => openEdit(tpl)}
                                className={s.btnCancel}
                            >
                                <FiEdit3 /> Editar
                            </button>
                            <button
                                onClick={() => duplicateTpl(tpl)}
                                disabled={duplicatingId === tpl.id}
                                className={s.btnCancel}
                            >
                                {duplicatingId === tpl.id ? (
                                    'Duplicando...'
                                ) : (
                                    <>
                                        <FiCopy /> Duplicar
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => openDelete(tpl)}
                                className={s.btnCancel}
                            >
                                <FiTrash2 /> Remover
                            </button>
                        </>
                    )}
                </div>
            </div>
        ),
        [isPublic, openApply, openEdit, openDelete, duplicateTpl, duplicatingId, router],
    );

    return (
        <>
            <div className={s.toolbar}>
                <h2 className={s.sectionTitle}>
                    {isPublic ? (
                        <>
                            <FiGlobe /> Biblioteca Pública
                        </>
                    ) : (
                        'Minha biblioteca de treinos'
                    )}
                </h2>
                {isPublic ? (
                    <button onClick={onBack} className={s.btnCancel}>
                        <FiArrowLeft /> Voltar à minha biblioteca
                    </button>
                ) : (
                    <button
                        onClick={() => router.push('/personal/templates/novo')}
                        className={s.btnAdd}
                    >
                        + Novo treino
                    </button>
                )}
            </div>

            {/* Pastas (Iniciante, Feminino...): o personal agrupa os treinos
                que reaproveita. Só na biblioteca própria. */}
            {!isPublic && folders.length > 0 && (
                <div
                    className={s.folderChips}
                    role="group"
                    aria-label="Pastas"
                >
                    {[null, ...folders].map((f) => (
                        <button
                            key={f ?? '__all'}
                            type="button"
                            aria-pressed={folder === f}
                            className={
                                folder === f ? s.folderChipOn : s.folderChip
                            }
                            onClick={() => setFolder(f)}
                        >
                            {f ? (
                                <>
                                    <FiFolder aria-hidden /> {f}
                                </>
                            ) : (
                                'Todas'
                            )}
                        </button>
                    ))}
                </div>
            )}

            {!tplLoading && templates.length > 0 && (
                <div className={s.exSearch}>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nome ou objetivo..."
                        className={s.exInput}
                    />
                    <select
                        value={sortMode}
                        onChange={(e) =>
                            setSortMode(e.target.value as SortMode)
                        }
                        className={s.exSelect}
                    >
                        <option value="recent">Mais recentes</option>
                        <option value="usage">Mais usados primeiro</option>
                    </select>
                </div>
            )}

            {tplLoading ? (
                <p className={s.loading}>
                    {isPublic ? 'Carregando públicos...' : 'Carregando...'}
                </p>
            ) : templates.length === 0 ? (
                <div className={s.empty}>
                    <div className={s.emptyIcon}>{isPublic ? <FiGlobe /> : <FiBookOpen />}</div>
                    <h3 className={s.emptyTitle}>
                        {isPublic
                            ? 'Nenhum treino público disponível'
                            : 'Sua biblioteca ainda está vazia'}
                    </h3>
                    <p className={s.emptyText}>
                        {isPublic
                            ? 'Treinos públicos ficam visíveis quando o personal escolhe compartilhar.'
                            : 'Guarde aqui os treinos que você repete (iniciante, hipertrofia, emagrecimento...) e copie para um aluno em dois toques. No treino de um aluno, "Salvar na biblioteca" também traz o treino para cá.'}
                    </p>
                </div>
            ) : visibleTemplates.length === 0 ? (
                <p className={s.loading}>
                    {search.trim()
                        ? `Nenhum treino encontrado para "${search}".`
                        : 'Nenhum treino nesta pasta.'}
                </p>
            ) : (
                <div className={s.studentList}>
                    {visibleTemplates.map((tpl) => renderTemplateCard(tpl))}
                </div>
            )}

            {/* ── Template Apply Modal ── */}
            <Modal
                open={modal === 'tplApply' && !!selectedTemplate}
                onClose={closeModal}
                title="Copiar treino para um aluno"
            >
                {error && <div className={s.errorMsg}>{error}</div>}
                {selectedTemplate && (
                    <p className={s.applyConfirmText}>
                        Treino:{' '}
                        <strong>
                            {selectedTemplate.name || 'Treino sem nome'}
                        </strong>
                        <br />
                        Objetivo: {selectedTemplate.goal || 'Não definido'}
                    </p>
                )}
                <select
                    value=""
                    onChange={(e) => applyToStudent(e.target.value)}
                    className={s.formInput}
                >
                    <option value="">Selecione o aluno</option>
                    {students.filter((st) => !st.awaiting_consent).map((st) => (
                        <option key={st.id} value={st.id}>
                            {st.name} — {st.email}
                        </option>
                    ))}
                </select>
                {submitting && (
                    <p className={s.loading}>Copiando treino...</p>
                )}
                <p className={s.confirmText}>
                    O aluno recebe uma cópia: o que você ajustar nele não muda
                    o treino da biblioteca.
                </p>
            </Modal>

            {/* ── Template Edit Modal (metadados) ── */}
            <Modal
                open={modal === 'tplEdit'}
                onClose={closeModal}
                title="Editar treino da biblioteca"
                footer={
                    <>
                        <button onClick={closeModal} className={s.btnCancel}>
                            Cancelar
                        </button>
                        <button
                            onClick={handleTplUpdate}
                            disabled={submitting || !tplForm.name?.trim()}
                            className={s.btnSubmit}
                        >
                            {submitting ? 'Salvando...' : 'Salvar'}
                        </button>
                    </>
                }
            >
                {error && <div className={s.errorMsg}>{error}</div>}
                <div className={s.formGroup}>
                    <label className={s.formLabel}>Nome *</label>
                    <input
                        value={tplForm.name || ''}
                        onChange={(e) =>
                            setTplForm({
                                ...tplForm,
                                name: e.target.value,
                            })
                        }
                        className={s.formInput}
                        placeholder="Ex: Hipertrofia 12 semanas"
                    />
                </div>
                <div className={s.formGroup}>
                    <label className={s.formLabel}>Objetivo</label>
                    <select
                        value={tplForm.goal || ''}
                        onChange={(e) =>
                            setTplForm({
                                ...tplForm,
                                goal: e.target.value,
                            })
                        }
                        className={s.formInput}
                    >
                        <option value="">Selecione o objetivo</option>
                        {[
                            'Hipertrofia',
                            'Força',
                            'Resistência',
                            'Condicionamento',
                            'Reabilitação',
                        ].map((g) => (
                            <option key={g} value={g}>
                                {g}
                            </option>
                        ))}
                    </select>
                </div>
                <div className={s.formGroup}>
                    <label className={s.formLabel} htmlFor="tpl-folder">
                        Pasta (opcional)
                    </label>
                    <input
                        id="tpl-folder"
                        list="tpl-folders"
                        value={tplForm.folder || ''}
                        onChange={(e) =>
                            setTplForm({
                                ...tplForm,
                                folder: e.target.value,
                            })
                        }
                        maxLength={40}
                        className={s.formInput}
                        placeholder="Ex.: Iniciante, Feminino, Hipertrofia"
                    />
                    <datalist id="tpl-folders">
                        {folders.map((f) => (
                            <option key={f} value={f} />
                        ))}
                    </datalist>
                </div>
                <div className={s.formGroup}>
                    <label className={s.formLabel}>
                        Visibilidade
                    </label>
                    {isPro ? (
                        <select
                            value={String(tplForm.is_public || false)}
                            onChange={(e) =>
                                setTplForm({
                                    ...tplForm,
                                    is_public:
                                        e.target.value === 'true',
                                })
                            }
                            className={s.formInput}
                        >
                            <option value="false">
                                Privado — apenas você
                            </option>
                            <option value="true">
                                Público — acessível por outros
                                personals e pela equipe Venafit
                            </option>
                        </select>
                    ) : (
                        <p
                            style={{
                                fontSize: '0.85rem',
                                color: '#8892b0',
                                margin: 0,
                            }}
                        >
                            No plano gratuito, os treinos da biblioteca ficam
                            disponíveis para revisão da equipe
                            Venafit e podem entrar na biblioteca
                            pública. Quer manter seus treinos privados?{' '}
                            <a
                                href="/pagamento?produto=pro"
                                style={{ color: '#d4af37' }}
                            >
                                Assine o plano PRO.
                            </a>
                        </p>
                    )}
                    {error && error.toLowerCase().includes('pro') && (
                        <p
                            style={{
                                fontSize: '0.8rem',
                                color: '#8892b0',
                                marginTop: 4,
                            }}
                        >
                            Manter treinos privados é exclusivo do
                            plano PRO.
                        </p>
                    )}
                </div>
            </Modal>

            {/* ── Template Delete Modal ── */}
            <Modal
                open={modal === 'tplDelete' && !!selectedTemplate}
                onClose={closeModal}
                title="Remover da biblioteca"
                footer={
                    <>
                        <button onClick={closeModal} className={s.btnCancel}>
                            Cancelar
                        </button>
                        <button
                            onClick={handleTplDelete}
                            disabled={submitting}
                            className={s.btnSubmit}
                            style={{ background: 'var(--grad-coral)', color: '#fff' }}
                        >
                            {submitting ? 'Removendo...' : 'Remover'}
                        </button>
                    </>
                }
            >
                {error && <div className={s.errorMsg}>{error}</div>}
                <p className={s.confirmText}>
                    Tem certeza que deseja remover o treino{' '}
                    <span className={s.confirmName}>
                        {selectedTemplate?.name || 'Treino sem nome'}
                    </span>
                    ?
                </p>
                <p className={s.confirmText}>
                    Esta ação não pode ser desfeita. Os alunos que já
                    receberam uma cópia continuam com ela.
                </p>
            </Modal>
        </>
    );
}
