'use client';

import React, { useEffect, useState } from 'react';
import {
    Protocol,
    ProtocolFolder,
    TrainingDTO,
    ExerciseDTO,
    getAllProtocolFolders,
    createProtocol,
    updateProtocol,
    deleteProtocol,
} from '@/libs/protocolService';
import Modal from '@/components/system/Modal';
import styles from './AdminProtocols.module.css';

type Difficulty = 'iniciante' | 'intermediário' | 'avançado';

const DIFFICULTIES: Difficulty[] = ['iniciante', 'intermediário', 'avançado'];

const emptyExercise: ExerciseDTO = {
    name: '',
    series: [],
    variations: '',
    comments: '',
    video_url: '',
    video_thumb: '',
    timed: false,
    muscle_group: '',
};

const emptyTraining: TrainingDTO = {
    reference: '',
    exercises: [],
    weekday: null,
};

interface ProtocolFormState {
    periodicity: number;
    muscle_emphasis: string;
    notes: string;
    trainings: TrainingDTO[];
}

const emptyForm: ProtocolFormState = {
    periodicity: 3,
    muscle_emphasis: '',
    notes: '',
    trainings: [],
};

function seriesToText(series: number[]): string {
    return (series ?? []).join(', ');
}

function textToSeries(text: string): number[] {
    return text
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => !Number.isNaN(n));
}

export default function AdminProtocols() {
    const [folders, setFolders] = useState<ProtocolFolder[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Difficulty>('iniciante');
    const [showForm, setShowForm] = useState(false);
    const [editTarget, setEditTarget] = useState<Protocol | null>(null);
    const [form, setForm] = useState<ProtocolFormState>(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const fetchFolders = async () => {
        setLoading(true);
        try {
            const data = await getAllProtocolFolders();
            setFolders(data ?? []);
        } catch {
            setFolders([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFolders();
    }, []);

    const currentFolder = folders.find((f) => f.difficulty === tab);
    const protocols = (currentFolder?.protocols ?? []).slice().sort(
        (a, b) =>
            a.order - b.order ||
            a.periodicity - b.periodicity ||
            a.muscle_emphasis.localeCompare(b.muscle_emphasis),
    );

    const openCreate = () => {
        setEditTarget(null);
        setForm(emptyForm);
        setError('');
        setShowForm(true);
    };

    const openEdit = (protocol: Protocol) => {
        setEditTarget(protocol);
        setForm({
            periodicity: protocol.periodicity,
            muscle_emphasis: protocol.muscle_emphasis,
            notes: protocol.notes ?? '',
            trainings: protocol.trainings ?? [],
        });
        setError('');
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            if (editTarget) {
                await updateProtocol(editTarget.id, {
                    periodicity: form.periodicity,
                    muscle_emphasis: form.muscle_emphasis,
                    notes: form.notes,
                    trainings: form.trainings,
                });
            } else {
                await createProtocol({
                    difficulty: 'avançado',
                    periodicity: form.periodicity,
                    muscle_emphasis: form.muscle_emphasis,
                    notes: form.notes,
                    trainings: form.trainings,
                });
            }
            setShowForm(false);
            await fetchFolders();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string } } };
            setError(e?.response?.data?.error ?? 'Erro ao salvar protocolo.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (protocol: Protocol) => {
        if (
            !confirm(
                `Excluir o protocolo avançado #${protocol.order} (${protocol.muscle_emphasis}, ${protocol.periodicity}x/semana)?`,
            )
        )
            return;
        try {
            await deleteProtocol(protocol.id);
            await fetchFolders();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string } } };
            alert(e?.response?.data?.error ?? 'Erro ao excluir protocolo.');
        }
    };

    // ── Trainings/exercises editors (mutação imutável do form) ──
    const addTraining = () => {
        setForm((f) => ({
            ...f,
            trainings: [...f.trainings, { ...emptyTraining }],
        }));
    };

    const removeTraining = (idx: number) => {
        setForm((f) => ({
            ...f,
            trainings: f.trainings.filter((_, i) => i !== idx),
        }));
    };

    const updateTraining = (idx: number, patch: Partial<TrainingDTO>) => {
        setForm((f) => ({
            ...f,
            trainings: f.trainings.map((t, i) =>
                i === idx ? { ...t, ...patch } : t,
            ),
        }));
    };

    const addExercise = (trainingIdx: number) => {
        setForm((f) => ({
            ...f,
            trainings: f.trainings.map((t, i) =>
                i === trainingIdx
                    ? { ...t, exercises: [...t.exercises, { ...emptyExercise }] }
                    : t,
            ),
        }));
    };

    const removeExercise = (trainingIdx: number, exIdx: number) => {
        setForm((f) => ({
            ...f,
            trainings: f.trainings.map((t, i) =>
                i === trainingIdx
                    ? {
                          ...t,
                          exercises: t.exercises.filter(
                              (_, j) => j !== exIdx,
                          ),
                      }
                    : t,
            ),
        }));
    };

    const updateExercise = (
        trainingIdx: number,
        exIdx: number,
        patch: Partial<ExerciseDTO>,
    ) => {
        setForm((f) => ({
            ...f,
            trainings: f.trainings.map((t, i) =>
                i === trainingIdx
                    ? {
                          ...t,
                          exercises: t.exercises.map((ex, j) =>
                              j === exIdx ? { ...ex, ...patch } : ex,
                          ),
                      }
                    : t,
            ),
        }));
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>🏋️‍♂️ Protocolos de Treino</h2>
                {tab === 'avançado' && (
                    <button onClick={openCreate} className={styles.btnAdd}>
                        + Novo Protocolo Avançado
                    </button>
                )}
            </div>

            <p className={styles.hint}>
                Iniciante e intermediário têm faixas fixas de protocolos: só
                podem ser <strong>editados</strong> (conteúdo dos treinos),
                nunca criados ou excluídos. Avançado é aberto: novos
                protocolos podem ser criados (Order é calculado
                automaticamente) e excluídos, desde que nenhum aluno os tenha
                atualmente atribuídos.
            </p>

            <div className={styles.tabs}>
                {DIFFICULTIES.map((d) => (
                    <button
                        key={d}
                        onClick={() => setTab(d)}
                        className={tab === d ? styles.tabActive : styles.tab}
                    >
                        {d}
                    </button>
                ))}
            </div>

            {loading ? (
                <p className={styles.loading}>Carregando...</p>
            ) : protocols.length === 0 ? (
                <p className={styles.empty}>
                    Nenhum protocolo cadastrado para {tab}.
                </p>
            ) : (
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Order</th>
                            <th>Periodicidade</th>
                            <th>Ênfase Muscular</th>
                            <th>Treinos</th>
                            <th>Notas</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {protocols.map((p) => (
                            <tr key={p.id}>
                                <td>
                                    <span className={styles.badge}>
                                        #{p.order}
                                    </span>
                                </td>
                                <td>{p.periodicity}x/semana</td>
                                <td>{p.muscle_emphasis}</td>
                                <td>{p.trainings?.length ?? 0}</td>
                                <td
                                    style={{
                                        maxWidth: 220,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                    title={p.notes}
                                >
                                    {p.notes || '—'}
                                </td>
                                <td>
                                    <div className={styles.actions}>
                                        <button
                                            onClick={() => openEdit(p)}
                                            className={styles.btnEdit}
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(p)}
                                            disabled={tab !== 'avançado'}
                                            title={
                                                tab !== 'avançado'
                                                    ? 'Só protocolos avançado podem ser excluídos'
                                                    : undefined
                                            }
                                            className={styles.btnDelete}
                                        >
                                            Excluir
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <Modal
                open={showForm}
                onClose={() => setShowForm(false)}
                title={
                    editTarget
                        ? `Editar Protocolo #${editTarget.order} (${editTarget.difficulty})`
                        : 'Novo Protocolo Avançado'
                }
                footer={
                    <>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className={styles.btnCancel}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="protocolForm"
                            className={styles.btnSave}
                            disabled={submitting}
                        >
                            {submitting
                                ? 'Salvando...'
                                : editTarget
                                  ? 'Atualizar'
                                  : 'Criar'}
                        </button>
                    </>
                }
            >
                {error && <div className={styles.errorMsg}>{error}</div>}

                <form
                    id="protocolForm"
                    onSubmit={handleSubmit}
                    className={styles.form}
                >
                    <div className={styles.rowGroup}>
                        <div className={styles.row}>
                            <label className={styles.label}>
                                Periodicidade (x/semana) *
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={7}
                                className={styles.input}
                                value={form.periodicity}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        periodicity:
                                            Number(e.target.value) || 0,
                                    })
                                }
                                required
                            />
                        </div>
                        <div className={styles.row}>
                            <label className={styles.label}>
                                Ênfase Muscular *
                            </label>
                            <input
                                type="text"
                                className={styles.input}
                                placeholder="Ex: Geral, Glúteo, quadríceps..."
                                value={form.muscle_emphasis}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        muscle_emphasis: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>
                    </div>

                    {editTarget && (
                        <small className={styles.smallHint}>
                            Order (#{editTarget.order}) e dificuldade (
                            {editTarget.difficulty}) não podem ser alterados
                            aqui — protegidos pela rotação de protocolos.
                        </small>
                    )}
                    {!editTarget && (
                        <small className={styles.smallHint}>
                            O Order será calculado automaticamente como o
                            próximo disponível para essa periodicidade +
                            ênfase muscular dentro de &quot;avançado&quot;.
                        </small>
                    )}

                    <div className={styles.row}>
                        <label className={styles.label}>Notas</label>
                        <textarea
                            className={styles.input}
                            placeholder="Observações sobre o protocolo"
                            value={form.notes}
                            onChange={(e) =>
                                setForm({ ...form, notes: e.target.value })
                            }
                            rows={3}
                        />
                    </div>

                    <div className={styles.row}>
                        <label className={styles.label}>
                            Treinos ({form.trainings.length})
                        </label>
                        {form.trainings.map((t, tIdx) => (
                            <div key={tIdx} className={styles.trainingBlock}>
                                <div className={styles.trainingHeader}>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        placeholder="Referência (ex: Treino A)"
                                        value={t.reference}
                                        onChange={(e) =>
                                            updateTraining(tIdx, {
                                                reference: e.target.value,
                                            })
                                        }
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeTraining(tIdx)}
                                        className={styles.btnSmallDanger}
                                    >
                                        Remover treino
                                    </button>
                                </div>

                                {t.exercises.map((ex, exIdx) => (
                                    <div
                                        key={exIdx}
                                        className={styles.exerciseBlock}
                                    >
                                        <div className={styles.exerciseGrid}>
                                            <input
                                                type="text"
                                                className={styles.input}
                                                placeholder="Nome do exercício"
                                                value={ex.name}
                                                onChange={(e) =>
                                                    updateExercise(
                                                        tIdx,
                                                        exIdx,
                                                        {
                                                            name: e.target
                                                                .value,
                                                        },
                                                    )
                                                }
                                            />
                                            <input
                                                type="text"
                                                className={styles.input}
                                                placeholder="Séries (ex: 10, 10, 8)"
                                                value={seriesToText(
                                                    ex.series,
                                                )}
                                                onChange={(e) =>
                                                    updateExercise(
                                                        tIdx,
                                                        exIdx,
                                                        {
                                                            series: textToSeries(
                                                                e.target
                                                                    .value,
                                                            ),
                                                        },
                                                    )
                                                }
                                            />
                                            <input
                                                type="text"
                                                className={styles.input}
                                                placeholder="Variações"
                                                value={ex.variations}
                                                onChange={(e) =>
                                                    updateExercise(
                                                        tIdx,
                                                        exIdx,
                                                        {
                                                            variations:
                                                                e.target
                                                                    .value,
                                                        },
                                                    )
                                                }
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            placeholder="URL do vídeo"
                                            value={ex.video_url}
                                            onChange={(e) =>
                                                updateExercise(tIdx, exIdx, {
                                                    video_url: e.target.value,
                                                })
                                            }
                                            style={{ marginBottom: 8 }}
                                        />
                                        <div className={styles.checkRow}>
                                            <input
                                                type="checkbox"
                                                id={`timed-${tIdx}-${exIdx}`}
                                                checked={ex.timed}
                                                onChange={(e) =>
                                                    updateExercise(
                                                        tIdx,
                                                        exIdx,
                                                        {
                                                            timed: e.target
                                                                .checked,
                                                        },
                                                    )
                                                }
                                            />
                                            <label
                                                htmlFor={`timed-${tIdx}-${exIdx}`}
                                            >
                                                Cronometrado
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeExercise(
                                                        tIdx,
                                                        exIdx,
                                                    )
                                                }
                                                className={
                                                    styles.btnSmallDanger
                                                }
                                                style={{ marginLeft: 'auto' }}
                                            >
                                                Remover exercício
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={() => addExercise(tIdx)}
                                    className={styles.btnAddSmall}
                                >
                                    + Adicionar exercício
                                </button>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={addTraining}
                            className={styles.btnAddSmall}
                        >
                            + Adicionar treino
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
