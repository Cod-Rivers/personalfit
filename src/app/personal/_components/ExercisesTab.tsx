'use client';

import { useState } from 'react';
import { MUSCLE_GROUPS, type ExerciseLibraryItem } from '@/libs/planningService';
import { usePersonalExercises } from '@/hooks/usePersonalExercises';
import VideoUploadModal from '@/components/features/VideoUploadModal';
import Modal from '@/components/system/Modal';
import s from '../personal.module.css';

interface ExercisesTabProps {
    /** Plano do personal — somente 'pro' habilita upload de arquivo no VideoUploadModal. */
    planType?: 'free' | 'pro';
}

export default function ExercisesTab({ planType = 'free' }: ExercisesTabProps) {
    const {
        myExercises,
        exLoading,
        exSearch,
        exMuscle,
        modal,
        exForm,
        setExForm,
        exDeleteTarget,
        submitting,
        error,
        closeModal,
        handleExSearchChange,
        handleExMuscleChange,
        openExCreate,
        openExEdit,
        openExDelete,
        handleExCreate,
        handleExUpdate,
        handleExDelete,
        refetchExercises,
    } = usePersonalExercises();

    const [videoModalExercise, setVideoModalExercise] =
        useState<ExerciseLibraryItem | null>(null);

    return (
        <>
            <div className={s.toolbar}>
                <h2 className={s.sectionTitle}>Meus Exercícios</h2>
                <button onClick={openExCreate} className={s.btnAdd}>
                    + Novo Exercício
                </button>
            </div>

            <div className={s.exSearch}>
                <input
                    type="text"
                    placeholder="Buscar exercício..."
                    value={exSearch}
                    onChange={(e) => handleExSearchChange(e.target.value)}
                    className={s.exInput}
                />
                <select
                    value={exMuscle}
                    onChange={(e) => handleExMuscleChange(e.target.value)}
                    className={s.exSelect}
                >
                    <option value="">Todos os grupos</option>
                    {MUSCLE_GROUPS.map((mg) => (
                        <option key={mg} value={mg}>
                            {mg}
                        </option>
                    ))}
                </select>
            </div>

            {exLoading ? (
                <p className={s.loading}>Carregando...</p>
            ) : myExercises.length === 0 ? (
                <div className={s.empty}>
                    <div className={s.emptyIcon}>📝</div>
                    <h3 className={s.emptyTitle}>
                        Nenhum exercício personalizado
                    </h3>
                    <p className={s.emptyText}>
                        Crie seus próprios exercícios para complementar o
                        catálogo do sistema.
                    </p>
                </div>
            ) : (
                <div className={s.studentList}>
                    {myExercises.map((ex) => (
                        <div key={ex.id} className={s.exCard}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p className={s.exCardName}>
                                    {ex.name}
                                    <span className={s.badgeCustom}>
                                        Personalizado
                                    </span>
                                </p>
                                <p className={s.exCardMeta}>
                                    {ex.muscle_group}
                                    {ex.category ? ` · ${ex.category}` : ''}
                                </p>
                            </div>
                            <div className={s.studentActions}>
                                <button
                                    onClick={() => setVideoModalExercise(ex)}
                                    className={s.btnAction}
                                    title="Definir vídeo/mídia"
                                >
                                    🎥 Vídeo
                                </button>
                                <button
                                    onClick={() => openExEdit(ex)}
                                    className={s.btnAction}
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => openExDelete(ex)}
                                    className={s.btnDanger}
                                >
                                    Remover
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Exercise Create Modal ── */}
            <Modal
                open={modal === 'exCreate'}
                onClose={closeModal}
                title="Novo Exercício"
                footer={
                    <>
                        <button onClick={closeModal} className={s.btnCancel}>
                            Cancelar
                        </button>
                        <button
                            onClick={handleExCreate}
                            disabled={
                                submitting ||
                                !exForm.name.trim() ||
                                !exForm.muscle_group
                            }
                            className={s.btnSubmit}
                        >
                            {submitting ? 'Criando...' : 'Criar'}
                        </button>
                    </>
                }
            >
                {error && <div className={s.errorMsg}>{error}</div>}
                <div className={s.formGroup}>
                    <label className={s.formLabel}>Nome *</label>
                    <input
                        value={exForm.name}
                        onChange={(e) =>
                            setExForm({
                                ...exForm,
                                name: e.target.value,
                            })
                        }
                        className={s.formInput}
                        placeholder="Nome do exercício"
                    />
                </div>
                <div className={s.formGroup}>
                    <label className={s.formLabel}>
                        Grupo Muscular *
                    </label>
                    <select
                        value={exForm.muscle_group}
                        onChange={(e) =>
                            setExForm({
                                ...exForm,
                                muscle_group: e.target.value,
                            })
                        }
                        className={s.formInput}
                    >
                        <option value="">Selecione</option>
                        {MUSCLE_GROUPS.map((mg) => (
                            <option key={mg} value={mg}>
                                {mg}
                            </option>
                        ))}
                    </select>
                </div>
                <div className={s.formGroup}>
                    <label className={s.formLabel}>Categoria</label>
                    <input
                        value={exForm.category || ''}
                        onChange={(e) =>
                            setExForm({
                                ...exForm,
                                category: e.target.value || undefined,
                            })
                        }
                        className={s.formInput}
                        placeholder="Ex: Isolador, Composto..."
                    />
                </div>
                <div className={s.formGroup}>
                    <label className={s.formLabel}>URL do Vídeo</label>
                    <input
                        value={exForm.video_url || ''}
                        onChange={(e) =>
                            setExForm({
                                ...exForm,
                                video_url: e.target.value || undefined,
                            })
                        }
                        className={s.formInput}
                        placeholder="https://..."
                    />
                </div>
                <div className={s.formGroup}>
                    <label className={s.formLabel}>Descrição</label>
                    <input
                        value={exForm.description || ''}
                        onChange={(e) =>
                            setExForm({
                                ...exForm,
                                description:
                                    e.target.value || undefined,
                            })
                        }
                        className={s.formInput}
                        placeholder="Descrição do exercício"
                    />
                </div>
            </Modal>

            {/* ── Exercise Edit Modal ── */}
            <Modal
                open={modal === 'exEdit'}
                onClose={closeModal}
                title="Editar Exercício"
                footer={
                    <>
                        <button onClick={closeModal} className={s.btnCancel}>
                            Cancelar
                        </button>
                        <button
                            onClick={handleExUpdate}
                            disabled={
                                submitting ||
                                !exForm.name.trim() ||
                                !exForm.muscle_group
                            }
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
                        value={exForm.name}
                        onChange={(e) =>
                            setExForm({
                                ...exForm,
                                name: e.target.value,
                            })
                        }
                        className={s.formInput}
                    />
                </div>
                <div className={s.formGroup}>
                    <label className={s.formLabel}>
                        Grupo Muscular *
                    </label>
                    <select
                        value={exForm.muscle_group}
                        onChange={(e) =>
                            setExForm({
                                ...exForm,
                                muscle_group: e.target.value,
                            })
                        }
                        className={s.formInput}
                    >
                        <option value="">Selecione</option>
                        {MUSCLE_GROUPS.map((mg) => (
                            <option key={mg} value={mg}>
                                {mg}
                            </option>
                        ))}
                    </select>
                </div>
                <div className={s.formGroup}>
                    <label className={s.formLabel}>Categoria</label>
                    <input
                        value={exForm.category || ''}
                        onChange={(e) =>
                            setExForm({
                                ...exForm,
                                category: e.target.value || undefined,
                            })
                        }
                        className={s.formInput}
                    />
                </div>
                <div className={s.formGroup}>
                    <label className={s.formLabel}>URL do Vídeo</label>
                    <input
                        value={exForm.video_url || ''}
                        onChange={(e) =>
                            setExForm({
                                ...exForm,
                                video_url: e.target.value || undefined,
                            })
                        }
                        className={s.formInput}
                    />
                </div>
                <div className={s.formGroup}>
                    <label className={s.formLabel}>Descrição</label>
                    <input
                        value={exForm.description || ''}
                        onChange={(e) =>
                            setExForm({
                                ...exForm,
                                description:
                                    e.target.value || undefined,
                            })
                        }
                        className={s.formInput}
                    />
                </div>
            </Modal>

            {/* ── Exercise Delete Modal ── */}
            <Modal
                open={modal === 'exDelete' && !!exDeleteTarget}
                onClose={closeModal}
                title="Remover Exercício"
                footer={
                    <>
                        <button onClick={closeModal} className={s.btnCancel}>
                            Cancelar
                        </button>
                        <button
                            onClick={handleExDelete}
                            disabled={submitting}
                            className={s.btnSubmit}
                            style={{ background: '#e74c3c', color: '#fff' }}
                        >
                            {submitting ? 'Removendo...' : 'Remover'}
                        </button>
                    </>
                }
            >
                {error && <div className={s.errorMsg}>{error}</div>}
                <p className={s.confirmText}>
                    Tem certeza que deseja remover{' '}
                    <span className={s.confirmName}>
                        {exDeleteTarget?.name}
                    </span>
                    ?
                </p>
            </Modal>

            {/* ── Vídeo/mídia do exercício ── */}
            {videoModalExercise && (
                <VideoUploadModal
                    exerciseId={videoModalExercise.id}
                    mode="personal"
                    planType={planType}
                    onSuccess={() => {
                        setVideoModalExercise(null);
                        refetchExercises();
                    }}
                    onClose={() => setVideoModalExercise(null)}
                />
            )}
        </>
    );
}
