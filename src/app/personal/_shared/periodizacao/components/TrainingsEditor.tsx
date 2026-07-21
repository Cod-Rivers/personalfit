'use client';

import React from 'react';
import type { ExerciseLibraryItem } from '@/libs/planningService';
import {
    WEEKDAYS,
    weekdayLabel,
    type LocalExercise,
    type LocalTraining,
} from '../lib/mesocycleTransforms';
import ExercisePicker from './ExercisePicker';
import s from '../builder.module.css';

interface Props {
    trainings: LocalTraining[];
    onAddTraining: () => void;
    onRemoveTraining: (tid: string) => void;
    onDuplicateTraining: (tid: string) => void;
    onUpdateTrainingRef: (tid: string, ref: string) => void;
    onAddExercise: (tid: string) => void;
    /** No modo simples, troca o campo de referência (A/B/C) por um seletor de dia da semana. */
    simpleMode?: boolean;
    /** "weekday" (padrão, seletor de dia) ou "number" (Treino 1, Treino 2... pela ordem da lista). */
    dayLabelStyle?: 'weekday' | 'number';
    onUpdateTrainingWeekday?: (tid: string, weekday: number | undefined) => void;
    onRemoveExercise: (tid: string, eid: string) => void;
    onUpdateExercise: (
        tid: string,
        eid: string,
        field: keyof Omit<LocalExercise, '_id'>,
        value: string | boolean,
    ) => void;
    pickerFor: string | null;
    onOpenPicker: (tid: string) => void;
    onClosePicker: () => void;
    onPickExercise: (tid: string, item: ExerciseLibraryItem) => void;
}

export default function TrainingsEditor({
    trainings,
    onAddTraining,
    onRemoveTraining,
    onDuplicateTraining,
    onUpdateTrainingRef,
    onAddExercise,
    onRemoveExercise,
    onUpdateExercise,
    pickerFor,
    onOpenPicker,
    onClosePicker,
    onPickExercise,
    simpleMode,
    dayLabelStyle = 'weekday',
    onUpdateTrainingWeekday,
}: Props) {
    const isNumbered = simpleMode && dayLabelStyle === 'number';
    return (
        <div
            style={{
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: 20,
                marginBottom: 20,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                }}
            >
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>
                    Treinos desta fase
                </p>
                <button
                    type="button"
                    className={s.btnSmall}
                    onClick={onAddTraining}
                >
                    + Treino
                </button>
            </div>

            {trainings.length === 0 && (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Nenhum treino adicionado. Use &quot;+ Treino&quot; para
                    adicionar.
                </p>
            )}

            {trainings.map((t, index) => (
                <div
                    key={t._id}
                    style={{
                        background: 'var(--surface-2, rgba(255,255,255,0.04))',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 8,
                        padding: '12px 14px',
                        marginBottom: 12,
                    }}
                >
                    {/* Training header */}
                    <div
                        style={{
                            display: 'flex',
                            gap: 8,
                            alignItems: 'center',
                            marginBottom: 10,
                        }}
                    >
                        {isNumbered ? (
                            <span
                                style={{
                                    width: 80,
                                    textAlign: 'center',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                }}
                            >
                                Treino {index + 1}
                            </span>
                        ) : simpleMode ? (
                            <select
                                value={t.weekday ?? ''}
                                onChange={(e) =>
                                    onUpdateTrainingWeekday?.(
                                        t._id,
                                        e.target.value === ''
                                            ? undefined
                                            : Number(e.target.value),
                                    )
                                }
                                className="form-control"
                                style={{ width: 150, fontWeight: 700 }}
                            >
                                <option value="">Sem dia definido</option>
                                {WEEKDAYS.map((w) => (
                                    <option key={w.value} value={w.value}>
                                        {w.label}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                value={t.reference}
                                onChange={(e) =>
                                    onUpdateTrainingRef(t._id, e.target.value)
                                }
                                placeholder="Ref (A, B…)"
                                className="form-control"
                                style={{
                                    width: 80,
                                    textAlign: 'center',
                                    fontWeight: 700,
                                }}
                            />
                        )}
                        <span
                            style={{
                                fontSize: '0.82rem',
                                color: 'var(--text-muted)',
                                flex: 1,
                            }}
                        >
                            {isNumbered
                                ? `Treino ${index + 1}`
                                : simpleMode
                                  ? (weekdayLabel(t.weekday) ??
                                    'Sem dia definido')
                                  : `Treino ${t.reference}`}{' '}
                            — {t.exercises.length} exercício(s)
                        </span>
                        <button
                            type="button"
                            className={s.btnTiny}
                            title="Duplicar treino"
                            onClick={() => onDuplicateTraining(t._id)}
                        >
                            🧬
                        </button>
                        <button
                            type="button"
                            className={s.btnTiny}
                            style={{ color: 'var(--coral, #e74c3c)' }}
                            onClick={() => onRemoveTraining(t._id)}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Exercises table */}
                    {t.exercises.length > 0 && (
                        <div className={s.exerciseTableWrap}>
                        <table
                            style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                marginBottom: 8,
                            }}
                        >
                            <thead>
                                <tr>
                                    <th
                                        style={{
                                            fontSize: '0.72rem',
                                            color: 'var(--text-muted)',
                                            textAlign: 'left',
                                            padding: '4px 6px',
                                            borderBottom:
                                                '1px solid var(--border-subtle)',
                                        }}
                                    >
                                        Exercício *
                                    </th>
                                    <th
                                        style={{
                                            fontSize: '0.72rem',
                                            color: 'var(--text-muted)',
                                            textAlign: 'left',
                                            padding: '4px 6px',
                                            borderBottom:
                                                '1px solid var(--border-subtle)',
                                            width: 120,
                                        }}
                                    >
                                        Séries
                                    </th>
                                    <th
                                        style={{
                                            fontSize: '0.72rem',
                                            color: 'var(--text-muted)',
                                            textAlign: 'left',
                                            padding: '4px 6px',
                                            borderBottom:
                                                '1px solid var(--border-subtle)',
                                        }}
                                    >
                                        Variação
                                    </th>
                                    <th style={{ width: 32 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {t.exercises.map((ex) => (
                                    <React.Fragment key={ex._id}>
                                        <tr>
                                            <td style={{ padding: '4px 4px' }}>
                                                <input
                                                    value={ex.name}
                                                    onChange={(e) =>
                                                        onUpdateExercise(
                                                            t._id,
                                                            ex._id,
                                                            'name',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Nome do exercício"
                                                    className="form-control form-control-sm"
                                                />
                                            </td>
                                            <td
                                                style={{
                                                    padding: '4px 4px',
                                                    minWidth: 200,
                                                }}
                                            >
                                                {/* Seletor de modo de séries */}
                                                <select
                                                    value={ex.series_mode}
                                                    onChange={(e) =>
                                                        onUpdateExercise(
                                                            t._id,
                                                            ex._id,
                                                            'series_mode',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="form-select form-select-sm mb-1"
                                                >
                                                    <option value="reps">
                                                        Reps (N×M)
                                                    </option>
                                                    <option value="time">
                                                        Tempo (min/seg)
                                                    </option>
                                                    <option value="free">
                                                        Livre (texto)
                                                    </option>
                                                </select>
                                                {ex.series_mode === 'reps' && (
                                                    <div className="d-flex gap-1 align-items-center">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={
                                                                ex.series_sets
                                                            }
                                                            onChange={(e) =>
                                                                onUpdateExercise(
                                                                    t._id,
                                                                    ex._id,
                                                                    'series_sets',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="Séries"
                                                            className="form-control form-control-sm"
                                                            style={{
                                                                width: 60,
                                                            }}
                                                        />
                                                        <span
                                                            style={{
                                                                fontSize:
                                                                    '0.8rem',
                                                            }}
                                                        >
                                                            ×
                                                        </span>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={
                                                                ex.series_value
                                                            }
                                                            onChange={(e) =>
                                                                onUpdateExercise(
                                                                    t._id,
                                                                    ex._id,
                                                                    'series_value',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="Reps"
                                                            className="form-control form-control-sm"
                                                            style={{
                                                                width: 60,
                                                            }}
                                                        />
                                                        <span
                                                            style={{
                                                                fontSize:
                                                                    '0.75rem',
                                                                color: 'var(--text-muted)',
                                                            }}
                                                        >
                                                            reps
                                                        </span>
                                                    </div>
                                                )}
                                                {ex.series_mode === 'time' && (
                                                    <div className="d-flex gap-1 align-items-center">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={
                                                                ex.series_sets
                                                            }
                                                            onChange={(e) =>
                                                                onUpdateExercise(
                                                                    t._id,
                                                                    ex._id,
                                                                    'series_sets',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="Séries"
                                                            className="form-control form-control-sm"
                                                            style={{
                                                                width: 60,
                                                            }}
                                                        />
                                                        <span
                                                            style={{
                                                                fontSize:
                                                                    '0.8rem',
                                                            }}
                                                        >
                                                            ×
                                                        </span>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={
                                                                ex.series_value
                                                            }
                                                            onChange={(e) =>
                                                                onUpdateExercise(
                                                                    t._id,
                                                                    ex._id,
                                                                    'series_value',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="Segundos"
                                                            className="form-control form-control-sm"
                                                            style={{
                                                                width: 70,
                                                            }}
                                                        />
                                                        <span
                                                            style={{
                                                                fontSize:
                                                                    '0.75rem',
                                                                color: 'var(--text-muted)',
                                                            }}
                                                        >
                                                            seg
                                                        </span>
                                                    </div>
                                                )}
                                                {ex.series_mode === 'free' && (
                                                    <input
                                                        value={
                                                            ex.series_free
                                                        }
                                                        onChange={(e) =>
                                                            onUpdateExercise(
                                                                t._id,
                                                                ex._id,
                                                                'series_free',
                                                                e.target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="Ex: 3-4 × 10-12 reps"
                                                        className="form-control form-control-sm"
                                                    />
                                                )}
                                            </td>
                                            <td style={{ padding: '4px 4px' }}>
                                                <input
                                                    value={ex.variations}
                                                    onChange={(e) =>
                                                        onUpdateExercise(
                                                            t._id,
                                                            ex._id,
                                                            'variations',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Opcional"
                                                    className="form-control form-control-sm"
                                                />
                                            </td>
                                            <td
                                                style={{
                                                    padding: '4px 4px',
                                                    textAlign: 'center',
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    title="Remover exercício"
                                                    style={{
                                                        background:
                                                            'transparent',
                                                        border: '1px solid #e74c3c',
                                                        color: '#e74c3c',
                                                        padding: '2px 7px',
                                                        borderRadius: 4,
                                                        cursor: 'pointer',
                                                        fontSize: '0.78rem',
                                                        fontWeight: 700,
                                                        lineHeight: 1.4,
                                                        flexShrink: 0,
                                                    }}
                                                    onClick={() =>
                                                        onRemoveExercise(
                                                            t._id,
                                                            ex._id,
                                                        )
                                                    }
                                                >
                                                    ✕
                                                </button>
                                            </td>
                                        </tr>
                                        {/* Linha de observações */}
                                        <tr key={ex._id + '-obs'}>
                                            <td
                                                colSpan={4}
                                                style={{
                                                    padding: '0 4px 8px 4px',
                                                }}
                                            >
                                                <textarea
                                                    value={ex.observations}
                                                    onChange={(e) =>
                                                        onUpdateExercise(
                                                            t._id,
                                                            ex._id,
                                                            'observations',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Observações / instruções do personal (opcional)"
                                                    className="form-control form-control-sm"
                                                    rows={2}
                                                    style={{
                                                        resize: 'vertical',
                                                        fontSize: '0.8rem',
                                                    }}
                                                />
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    )}

                    <div className="d-flex gap-2">
                        <button
                            type="button"
                            className={s.btnSmall}
                            onClick={() => onOpenPicker(t._id)}
                        >
                            + Exercício
                        </button>
                        <button
                            type="button"
                            className={s.btnSmall}
                            onClick={() => onAddExercise(t._id)}
                        >
                            + Manual
                        </button>
                    </div>

                    {/* Exercise Picker */}
                    {pickerFor === t._id && (
                        <ExercisePicker
                            onPick={(item) => onPickExercise(t._id, item)}
                            onClose={onClosePicker}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}
