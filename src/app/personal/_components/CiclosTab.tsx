'use client';

import { useCallback } from 'react';
import { usePersonalTemplates } from '@/hooks/usePersonalTemplates';
import type { Student } from '@/hooks/usePersonalStudents';
import type { MacrocycleResponse } from '@/libs/planningService';
import s from '../personal.module.css';

interface Props {
    view: 'own' | 'public';
    students: Student[];
    onBack?: () => void;
}

export default function CiclosTab({ view, students, onBack }: Props) {
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
        openCreate,
        openDelete,
        closeModal,
        applyToStudent,
        handleTplCreateOrUpdate,
        handleTplDelete,
    } = usePersonalTemplates(view);

    const isPublic = view === 'public';

    const renderTemplateCard = useCallback(
        (tpl: MacrocycleResponse) => (
            <div key={tpl.id} className={s.templateCard}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p className={s.templateName}>
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
                    </p>
                </div>
                <div className={s.studentActions}>
                    <button
                        onClick={() => openApply(tpl)}
                        className={s.btnApply}
                    >
                        📋 Aplicar
                    </button>
                    {!isPublic && (
                        <button
                            onClick={() => openDelete(tpl)}
                            className={s.btnCancel}
                        >
                            🗑 Remover
                        </button>
                    )}
                </div>
            </div>
        ),
        [isPublic, openApply, openDelete],
    );

    return (
        <>
            <div className={s.toolbar}>
                <h2 className={s.sectionTitle}>
                    {isPublic ? '🌐 Ciclos Públicos' : 'Ciclos Próprios'}
                </h2>
                {isPublic ? (
                    <button onClick={onBack} className={s.btnCancel}>
                        ← Voltar aos Próprios
                    </button>
                ) : (
                    <button onClick={openCreate} className={s.btnAdd}>
                        + Novo Ciclo
                    </button>
                )}
            </div>

            {tplLoading ? (
                <p className={s.loading}>
                    {isPublic ? 'Carregando públicos...' : 'Carregando...'}
                </p>
            ) : templates.length === 0 ? (
                <div className={s.empty}>
                    <div className={s.emptyIcon}>{isPublic ? '🌐' : '🔄'}</div>
                    <h3 className={s.emptyTitle}>
                        {isPublic
                            ? 'Nenhum ciclo público disponível'
                            : 'Nenhum ciclo criado'}
                    </h3>
                    <p className={s.emptyText}>
                        {isPublic
                            ? 'Ciclos públicos ficam visíveis quando o personal escolhe compartilhar.'
                            : 'Crie seus próprios ciclos de treino pré-prontos para aplicar rapidamente em alunos.'}
                    </p>
                </div>
            ) : (
                <div className={s.studentList}>
                    {templates.map((tpl) => renderTemplateCard(tpl))}
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

            {/* ── Template Create / Edit Modal ── */}
            {(modal === 'tplCreate' || modal === 'tplEdit') && (
                <div className={s.overlay} onClick={closeModal}>
                    <div
                        className={s.modal}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={s.modalHeader}>
                            <h2 className={s.modalTitle}>
                                {modal === 'tplEdit'
                                    ? 'Editar Ciclo'
                                    : 'Novo Ciclo'}
                            </h2>
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
                                onClick={handleTplCreateOrUpdate}
                                disabled={submitting || !tplForm.name?.trim()}
                                className={s.btnSubmit}
                            >
                                {modal === 'tplEdit'
                                    ? submitting
                                        ? 'Salvando...'
                                        : 'Salvar'
                                    : submitting
                                      ? 'Criando...'
                                      : 'Criar'}
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
