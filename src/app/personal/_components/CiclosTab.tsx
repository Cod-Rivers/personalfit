'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePersonalTemplates } from '@/hooks/usePersonalTemplates';
import type { Student } from '@/hooks/usePersonalStudents';
import type { MacrocycleResponse } from '@/libs/planningService';
import s from '../personal.module.css';

interface Props {
    view: 'own' | 'public';
    students: Student[];
    onBack?: () => void;
}

type SortMode = 'recent' | 'usage';

export default function CiclosTab({ view, students, onBack }: Props) {
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

    const [search, setSearch] = useState('');
    const [sortMode, setSortMode] = useState<SortMode>('recent');

    const visibleTemplates = useMemo(() => {
        const q = search.trim().toLowerCase();
        const filtered = q
            ? templates.filter(
                  (t) =>
                      t.name?.toLowerCase().includes(q) ||
                      t.goal?.toLowerCase().includes(q),
              )
            : templates;
        if (sortMode === 'usage') {
            return [...filtered].sort(
                (a, b) => (b.usage_count ?? 0) - (a.usage_count ?? 0),
            );
        }
        return filtered;
    }, [templates, search, sortMode]);

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
                        {tpl.name || 'Ciclo sem nome'}
                        <span
                            className={`${s.badgeMesocycles} ${
                                tpl.status === 'active'
                                    ? s.badgeActive
                                    : tpl.status === 'draft'
                                      ? s.badgeDraft
                                      : s.badgeArchived
                            }`}
                        >
                            {tpl.mesocycles?.length ?? 0} meso
                            {tpl.mesocycles?.length === 1 ? '' : 's'}
                        </span>
                        {isPublic && tpl.is_public && (
                            <span className={s.badgePublic} title="Público">
                                🌐
                            </span>
                        )}
                        {tpl.featured && (
                            <span className={s.badgePublic} title="Destaque">
                                ⭐
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
                            🛠 Configurar treinos
                        </button>
                    )}
                    <button
                        onClick={() => openApply(tpl)}
                        className={s.btnApply}
                    >
                        📋 Aplicar
                    </button>
                    {!isPublic && (
                        <>
                            <button
                                onClick={() => openEdit(tpl)}
                                className={s.btnCancel}
                            >
                                ✏️ Editar
                            </button>
                            <button
                                onClick={() => duplicateTpl(tpl)}
                                disabled={duplicatingId === tpl.id}
                                className={s.btnCancel}
                            >
                                {duplicatingId === tpl.id
                                    ? 'Duplicando...'
                                    : '🧬 Duplicar'}
                            </button>
                            <button
                                onClick={() => openDelete(tpl)}
                                className={s.btnCancel}
                            >
                                🗑 Remover
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
                    {isPublic
                        ? '🌐 Biblioteca Pública'
                        : 'Minha Periodização / Treinos'}
                </h2>
                {isPublic ? (
                    <button onClick={onBack} className={s.btnCancel}>
                        ← Voltar aos Próprios
                    </button>
                ) : (
                    <button
                        onClick={() => router.push('/personal/templates/novo')}
                        className={s.btnAdd}
                    >
                        + Novo Ciclo
                    </button>
                )}
            </div>

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
                    <div className={s.emptyIcon}>{isPublic ? '🌐' : '📚'}</div>
                    <h3 className={s.emptyTitle}>
                        {isPublic
                            ? 'Nenhum ciclo público disponível'
                            : 'Nenhuma periodização criada ainda'}
                    </h3>
                    <p className={s.emptyText}>
                        {isPublic
                            ? 'Ciclos públicos ficam visíveis quando o personal escolhe compartilhar.'
                            : 'Monte periodizações e treinos reutilizáveis para aplicar rapidamente em alunos.'}
                    </p>
                </div>
            ) : visibleTemplates.length === 0 ? (
                <p className={s.loading}>
                    Nenhum ciclo encontrado para &quot;{search}&quot;.
                </p>
            ) : (
                <div className={s.studentList}>
                    {visibleTemplates.map((tpl) => renderTemplateCard(tpl))}
                </div>
            )}

            {/* ── Template Apply Modal ── */}
            {modal === 'tplApply' && selectedTemplate && (
                <div className={s.overlay} onClick={closeModal}>
                    <div
                        className={s.modal}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={s.modalHeader}>
                            <h2 className={s.modalTitle}>
                                Aplicar ciclo em aluno
                            </h2>
                            <button
                                onClick={closeModal}
                                className={s.btnClose}
                            >
                                ×
                            </button>
                        </div>
                        {error && <div className={s.errorMsg}>{error}</div>}
                        <p className={s.applyConfirmText}>
                            Ciclo:{' '}
                            <strong>
                                {selectedTemplate.name || 'Ciclo sem nome'}
                            </strong>
                            <br />
                            Objetivo: {selectedTemplate.goal || 'Não definido'}
                        </p>
                        <select
                            value=""
                            onChange={(e) => applyToStudent(e.target.value)}
                            className={s.formInput}
                        >
                            <option value="">Selecione o aluno</option>
                            {students.map((st) => (
                                <option key={st.id} value={st.id}>
                                    {st.name} — {st.email}
                                </option>
                            ))}
                        </select>
                        {submitting && (
                            <p className={s.loading}>Aplicando ciclo...</p>
                        )}
                    </div>
                </div>
            )}

            {/* ── Template Edit Modal (metadados) ── */}
            {modal === 'tplEdit' && (
                <div className={s.overlay} onClick={closeModal}>
                    <div
                        className={s.modal}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={s.modalHeader}>
                            <h2 className={s.modalTitle}>Editar Ciclo</h2>
                            <button
                                onClick={closeModal}
                                className={s.btnClose}
                            >
                                ×
                            </button>
                        </div>
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
                            <label className={s.formLabel}>
                                Visibilidade
                            </label>
                            <select
                                value={String(tplForm.is_public || false)}
                                onChange={(e) =>
                                    setTplForm({
                                        ...tplForm,
                                        is_public: e.target.value === 'true',
                                    })
                                }
                                className={s.formInput}
                            >
                                <option value="false">
                                    Privado — apenas você
                                </option>
                                <option value="true">
                                    Público (plano PRO) — acessível por
                                    outros personals e pela equipe Venafit
                                </option>
                            </select>
                            {error && error.toLowerCase().includes('pro') && (
                                <p
                                    style={{
                                        fontSize: '0.8rem',
                                        color: '#8892b0',
                                        marginTop: 4,
                                    }}
                                >
                                    Divulgar ciclos na biblioteca pública é
                                    exclusivo do plano PRO.
                                </p>
                            )}
                        </div>
                        <div className={s.formActions}>
                            <button
                                onClick={closeModal}
                                className={s.btnCancel}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleTplUpdate}
                                disabled={submitting || !tplForm.name?.trim()}
                                className={s.btnSubmit}
                            >
                                {submitting ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Template Delete Modal ── */}
            {modal === 'tplDelete' && selectedTemplate && (
                <div className={s.overlay} onClick={closeModal}>
                    <div
                        className={s.modal}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={s.modalHeader}>
                            <h2 className={s.modalTitle}>Remover Ciclo</h2>
                            <button
                                onClick={closeModal}
                                className={s.btnClose}
                            >
                                ×
                            </button>
                        </div>
                        {error && <div className={s.errorMsg}>{error}</div>}
                        <p className={s.confirmText}>
                            Tem certeza que deseja remover o ciclo{' '}
                            <span className={s.confirmName}>
                                {selectedTemplate.name || 'Ciclo sem nome'}
                            </span>
                            ?
                        </p>
                        <p className={s.confirmText}>
                            Esta ação não pode ser desfeita. Templates
                            aplicados a alunos serão removidos permanentemente.
                        </p>
                        <div className={s.formActions}>
                            <button
                                onClick={closeModal}
                                className={s.btnCancel}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleTplDelete}
                                disabled={submitting}
                                className={s.btnSubmit}
                                style={{ background: '#e74c3c', color: '#fff' }}
                            >
                                {submitting ? 'Removendo...' : 'Remover'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
