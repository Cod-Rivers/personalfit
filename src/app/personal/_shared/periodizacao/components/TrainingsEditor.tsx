'use client';

import React, { useEffect, useState } from 'react';
import { MUSCLE_GROUPS, type ExerciseLibraryItem } from '@/libs/planningService';
import {
    WEEKDAYS,
    weekdayLabel,
    partitionExerciseGroups,
    comboGroupLabel,
    type LocalExercise,
    type LocalTraining,
} from '../lib/mesocycleTransforms';
import ExercisePicker from './ExercisePicker';
import ExerciseThumbnail from '@/components/features/ExerciseThumbnail';
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
    /** Agrupa um exercício com o exercício imediatamente anterior num bloco
     * (bissérie/trissérie/superssérie) — descanso só ao final do bloco. */
    onCombineWithPrevious?: (tid: string, eid: string) => void;
    /** Desfaz o bloco inteiro, devolvendo todos os membros a exercícios avulsos. */
    onUngroupExercises?: (tid: string, groupId: string) => void;
    /** Tira só o último exercício adicionado ao bloco (reversível). */
    onRemoveLastFromGroup?: (tid: string, eid: string) => void;
}

/** Rótulo curto da aba. Os três modos caem no mesmo fallback (`T1`, `T2`…)
 * quando não há rótulo próprio, para que nenhuma aba fique sem identidade
 * (antes, todo treino sem dia definido virava "Novo" e ficava indistinguível). */
function trainingTabLabel(
    t: LocalTraining,
    index: number,
    simpleMode?: boolean,
    isNumbered?: boolean,
): string {
    if (isNumbered) return `T${index + 1}`;
    if (simpleMode)
        return weekdayLabel(t.weekday)?.slice(0, 3) ?? `T${index + 1}`;
    return t.reference || `T${index + 1}`;
}

/** Campo numérico do bloco de prescrição. Todos seguem o mesmo formato
 * (rótulo + input estreito + unidade), então vale extrair em vez de repetir. */
function PrescriptionNumber({
    label,
    unit,
    value,
    onChange,
    min,
    max,
    step,
}: {
    label: string;
    unit: string;
    value: string;
    onChange: (value: string) => void;
    min?: string;
    max?: string;
    step?: string;
}) {
    return (
        <div className={s.prescriptionField}>
            <label className={s.formLabel}>{label}</label>
            <div className={s.prescriptionInputRow}>
                <input
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={s.smallNumInput}
                />
                <span className={s.seriesUnitLabel}>{unit}</span>
            </div>
        </div>
    );
}

/** Resumo de 1 linha do bloco de prescrição recolhido — mesmo padrão do bloco
 * "Ajustes semanais" do MesocycleFormModal. */
function prescriptionSummary(ex: LocalExercise): string {
    const parts: string[] = [];
    if (ex.load_kg) parts.push(`${ex.load_kg} kg`);
    if (ex.load_percentage) parts.push(`${ex.load_percentage}% 1RM`);
    if (ex.tempo_seconds) parts.push(`Cadência ${ex.tempo_seconds}s`);
    if (ex.rpe_target) parts.push(`RPE ${ex.rpe_target}`);
    if (ex.muscle_group) parts.push(ex.muscle_group);
    return parts.length > 0
        ? parts.join(' · ')
        : 'Opcional — carga, cadência, RPE e grupo muscular';
}

/** Rótulo por extenso — usado no title/aria-label da aba, igual nos 3 modos. */
function trainingFullLabel(
    t: LocalTraining,
    index: number,
    simpleMode?: boolean,
    isNumbered?: boolean,
): string {
    if (isNumbered) return `Treino ${index + 1}`;
    if (simpleMode)
        return weekdayLabel(t.weekday) ?? `Treino ${index + 1} (sem dia)`;
    return `Treino ${t.reference || index + 1}`;
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
    onCombineWithPrevious,
    onUngroupExercises,
    onRemoveLastFromGroup,
}: Props) {
    const isNumbered = simpleMode && dayLabelStyle === 'number';

    // Um treino por vez em foco — evita ter que rolar por A, B, C, D (ou os 7
    // dias da semana) inteiros abertos ao mesmo tempo. Sempre que o treino em
    // foco deixa de existir (removido, ou ainda não há nenhum), cai para o
    // último da lista — cobre criação (+ Treino) e remoção numa só regra.
    const [activeId, setActiveId] = useState<string | null>(
        trainings[0]?._id ?? null,
    );
    useEffect(() => {
        if (trainings.length === 0) {
            if (activeId !== null) setActiveId(null);
            return;
        }
        if (!trainings.some((t) => t._id === activeId)) {
            setActiveId(trainings[trainings.length - 1]._id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trainings]);

    const active = trainings.find((t) => t._id === activeId) ?? null;
    const activeIndex = active ? trainings.indexOf(active) : -1;

    // Bloco de prescrição por exercício — recolhido por padrão, como o
    // "Ajustes semanais": são campos opcionais e o que mais se consulta ao
    // abrir o treino é nome/séries/descanso.
    const [openPrescription, setOpenPrescription] = useState<Set<string>>(
        () => new Set(),
    );
    const togglePrescription = (eid: string) =>
        setOpenPrescription((prev) => {
            const next = new Set(prev);
            if (next.has(eid)) next.delete(eid);
            else next.add(eid);
            return next;
        });

    return (
        <div className={s.trainingsSection}>
            <div className={s.sectionHeaderRow}>
                <p>Treinos desta fase</p>
                <button
                    type="button"
                    className={s.btnSmall}
                    onClick={onAddTraining}
                >
                    + Treino
                </button>
            </div>

            {trainings.length === 0 && (
                <p className={s.emptyHint}>
                    Nenhum treino adicionado. Use &quot;+ Treino&quot; para
                    adicionar.
                </p>
            )}

            {trainings.length > 0 && (
                <div className={s.dayChipRow}>
                    {trainings.map((t, i) => {
                        const full = trainingFullLabel(
                            t,
                            i,
                            simpleMode,
                            isNumbered,
                        );
                        return (
                            <button
                                key={t._id}
                                type="button"
                                className={
                                    t._id === activeId
                                        ? s.dayChipActive
                                        : s.dayChip
                                }
                                title={full}
                                aria-label={full}
                                aria-pressed={t._id === activeId}
                                onClick={() => setActiveId(t._id)}
                            >
                                {trainingTabLabel(t, i, simpleMode, isNumbered)}
                            </button>
                        );
                    })}
                </div>
            )}

            {active && (
                <div className={s.trainingCard}>
                    {/* Cabeçalho: referência/dia da semana + ações do treino */}
                    <div className={s.trainingCardHeader}>
                        {isNumbered ? (
                            <span className={s.refStatic}>
                                Treino {activeIndex + 1}
                            </span>
                        ) : simpleMode ? (
                            <select
                                value={active.weekday ?? ''}
                                onChange={(e) =>
                                    onUpdateTrainingWeekday?.(
                                        active._id,
                                        e.target.value === ''
                                            ? undefined
                                            : Number(e.target.value),
                                    )
                                }
                                className={s.weekdaySelectNarrow}
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
                                value={active.reference}
                                onChange={(e) =>
                                    onUpdateTrainingRef(
                                        active._id,
                                        e.target.value,
                                    )
                                }
                                placeholder="Ref (A, B…)"
                                className={s.refInput}
                            />
                        )}
                        <span className={s.trainingCardMeta}>
                            {active.exercises.length} exercício
                            {active.exercises.length === 1 ? '' : 's'}
                        </span>
                        <button
                            type="button"
                            className={s.btnTiny}
                            title="Duplicar treino"
                            onClick={() => onDuplicateTraining(active._id)}
                        >
                            🧬
                        </button>
                        <button
                            type="button"
                            className={s.btnTiny}
                            style={{ color: 'var(--coral, #e74c3c)' }}
                            title="Remover treino"
                            onClick={() => onRemoveTraining(active._id)}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Exercícios */}
                    {active.exercises.length > 0 && (
                        <div className={s.exercisesStack}>
                            {partitionExerciseGroups(active.exercises).map(
                                (group) => {
                                    const isCombo = group.length > 1;
                                    const groupId = group[0].group_id;
                                    const cards = group.map(
                                        (ex, idxInGroup) => {
                                            const globalIdx =
                                                active.exercises.findIndex(
                                                    (e) => e._id === ex._id,
                                                );
                                            const canCombine =
                                                !ex.group_id && globalIdx > 0;
                                            const isLastInGroup =
                                                isCombo &&
                                                idxInGroup ===
                                                    group.length - 1;
                                            return (
                                                <div
                                                    key={ex._id}
                                                    className={
                                                        s.exerciseEditCard
                                                    }
                                                >
                                                    <div
                                                        className={
                                                            s.exerciseEditHeader
                                                        }
                                                    >
                                                        <ExerciseThumbnail
                                                            name={
                                                                ex.name ||
                                                                'Exercício'
                                                            }
                                                            videoThumb={
                                                                ex.video_thumb
                                                            }
                                                            videoUrl={
                                                                ex.video_url
                                                            }
                                                            width={48}
                                                            height={48}
                                                            borderRadius={8}
                                                            captureFrame={
                                                                false
                                                            }
                                                            lazyCapture
                                                            className={
                                                                s.exerciseEditThumb
                                                            }
                                                        />
                                                        <input
                                                            value={ex.name}
                                                            onChange={(e) =>
                                                                onUpdateExercise(
                                                                    active._id,
                                                                    ex._id,
                                                                    'name',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="Nome do exercício"
                                                            className={
                                                                s.formInput
                                                            }
                                                        />
                                                        <button
                                                            type="button"
                                                            title="Remover exercício"
                                                            className={
                                                                s.btnRemoveExercise
                                                            }
                                                            onClick={() =>
                                                                onRemoveExercise(
                                                                    active._id,
                                                                    ex._id,
                                                                )
                                                            }
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>

                                                    <div
                                                        className={
                                                            s.formGroup
                                                        }
                                                        style={{
                                                            marginBottom: 0,
                                                        }}
                                                    >
                                                        <label
                                                            className={
                                                                s.formLabel
                                                            }
                                                        >
                                                            Séries
                                                        </label>
                                                        <select
                                                            value={
                                                                ex.series_mode
                                                            }
                                                            onChange={(e) =>
                                                                onUpdateExercise(
                                                                    active._id,
                                                                    ex._id,
                                                                    'series_mode',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            className={
                                                                s.formSelect
                                                            }
                                                        >
                                                            <option value="reps">
                                                                Reps (séries ×
                                                                repetições)
                                                            </option>
                                                            <option value="time">
                                                                Tempo (min/seg)
                                                            </option>
                                                            <option value="free">
                                                                Livre (texto)
                                                            </option>
                                                        </select>
                                                        {ex.series_mode ===
                                                            'reps' && (
                                                            <div
                                                                className={
                                                                    s.seriesSubfieldRow
                                                                }
                                                            >
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={
                                                                        ex.series_sets
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        onUpdateExercise(
                                                                            active._id,
                                                                            ex._id,
                                                                            'series_sets',
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    placeholder="Séries"
                                                                    className={
                                                                        s.smallNumInput
                                                                    }
                                                                />
                                                                <span
                                                                    className={
                                                                        s.seriesTimesSign
                                                                    }
                                                                >
                                                                    ×
                                                                </span>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={
                                                                        ex.series_value
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        onUpdateExercise(
                                                                            active._id,
                                                                            ex._id,
                                                                            'series_value',
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    placeholder="Reps"
                                                                    className={
                                                                        s.smallNumInput
                                                                    }
                                                                />
                                                                <span
                                                                    className={
                                                                        s.seriesUnitLabel
                                                                    }
                                                                >
                                                                    reps
                                                                </span>
                                                            </div>
                                                        )}
                                                        {ex.series_mode ===
                                                            'time' && (
                                                            <div
                                                                className={
                                                                    s.seriesSubfieldRow
                                                                }
                                                            >
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={
                                                                        ex.series_sets
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        onUpdateExercise(
                                                                            active._id,
                                                                            ex._id,
                                                                            'series_sets',
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    placeholder="Séries"
                                                                    className={
                                                                        s.smallNumInput
                                                                    }
                                                                />
                                                                <span
                                                                    className={
                                                                        s.seriesTimesSign
                                                                    }
                                                                >
                                                                    ×
                                                                </span>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={
                                                                        ex.series_value
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        onUpdateExercise(
                                                                            active._id,
                                                                            ex._id,
                                                                            'series_value',
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    placeholder="Segundos"
                                                                    className={
                                                                        s.smallNumInput
                                                                    }
                                                                />
                                                                <span
                                                                    className={
                                                                        s.seriesUnitLabel
                                                                    }
                                                                >
                                                                    seg
                                                                </span>
                                                            </div>
                                                        )}
                                                        {ex.series_mode ===
                                                            'free' && (
                                                            <input
                                                                value={
                                                                    ex.series_free
                                                                }
                                                                onChange={(
                                                                    e,
                                                                ) =>
                                                                    onUpdateExercise(
                                                                        active._id,
                                                                        ex._id,
                                                                        'series_free',
                                                                        e
                                                                            .target
                                                                            .value,
                                                                    )
                                                                }
                                                                placeholder="Ex: 3-4 × 10-12 reps"
                                                                className={
                                                                    s.formInput
                                                                }
                                                                style={{
                                                                    marginTop: 8,
                                                                }}
                                                            />
                                                        )}
                                                    </div>

                                                    {/* Descanso fica fora do
                                                        bloco recolhível: é o
                                                        campo de prescrição
                                                        mais usado e alimenta
                                                        o cronômetro do aluno. */}
                                                    <div
                                                        className={
                                                            s.formGroup
                                                        }
                                                        style={{
                                                            marginBottom: 0,
                                                        }}
                                                    >
                                                        <label
                                                            className={
                                                                s.formLabel
                                                            }
                                                        >
                                                            Descanso entre
                                                            séries
                                                        </label>
                                                        <div
                                                            className={
                                                                s.seriesSubfieldRow
                                                            }
                                                        >
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="5"
                                                                value={
                                                                    ex.rest_seconds
                                                                }
                                                                onChange={(e) =>
                                                                    onUpdateExercise(
                                                                        active._id,
                                                                        ex._id,
                                                                        'rest_seconds',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                placeholder="90"
                                                                className={
                                                                    s.smallNumInput
                                                                }
                                                            />
                                                            <span
                                                                className={
                                                                    s.seriesUnitLabel
                                                                }
                                                            >
                                                                segundos
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div
                                                        className={
                                                            s.formGroup
                                                        }
                                                        style={{
                                                            marginBottom: 0,
                                                        }}
                                                    >
                                                        <label
                                                            className={
                                                                s.formLabel
                                                            }
                                                        >
                                                            Variação
                                                        </label>
                                                        <input
                                                            value={
                                                                ex.variations
                                                            }
                                                            onChange={(e) =>
                                                                onUpdateExercise(
                                                                    active._id,
                                                                    ex._id,
                                                                    'variations',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="Opcional"
                                                            className={
                                                                s.formInput
                                                            }
                                                        />
                                                    </div>

                                                    <div
                                                        className={
                                                            s.formGroup
                                                        }
                                                        style={{
                                                            marginBottom: 0,
                                                        }}
                                                    >
                                                        <label
                                                            className={
                                                                s.formLabel
                                                            }
                                                        >
                                                            Observações
                                                        </label>
                                                        <textarea
                                                            value={
                                                                ex.observations
                                                            }
                                                            onChange={(e) =>
                                                                onUpdateExercise(
                                                                    active._id,
                                                                    ex._id,
                                                                    'observations',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="Observações / instruções do personal (opcional)"
                                                            className={
                                                                s.formInput
                                                            }
                                                            rows={2}
                                                            style={{
                                                                resize:
                                                                    'vertical',
                                                            }}
                                                        />
                                                    </div>

                                                    <div
                                                        className={
                                                            s.prescriptionCard
                                                        }
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                togglePrescription(
                                                                    ex._id,
                                                                )
                                                            }
                                                            aria-expanded={openPrescription.has(
                                                                ex._id,
                                                            )}
                                                            className={
                                                                s.prescriptionToggle
                                                            }
                                                        >
                                                            <span>
                                                                <span
                                                                    className={
                                                                        s.collapsibleTitle
                                                                    }
                                                                >
                                                                    Prescrição
                                                                </span>
                                                                <span
                                                                    className={
                                                                        s.collapsibleSummary
                                                                    }
                                                                >
                                                                    {prescriptionSummary(
                                                                        ex,
                                                                    )}
                                                                </span>
                                                            </span>
                                                            <span
                                                                aria-hidden
                                                                className={
                                                                    openPrescription.has(
                                                                        ex._id,
                                                                    )
                                                                        ? s.collapsibleChevronOpen
                                                                        : s.collapsibleChevron
                                                                }
                                                            >
                                                                ▾
                                                            </span>
                                                        </button>

                                                        {openPrescription.has(
                                                            ex._id,
                                                        ) && (
                                                            <div
                                                                className={
                                                                    s.prescriptionBody
                                                                }
                                                            >
                                                                <PrescriptionNumber
                                                                    label="Carga"
                                                                    unit="kg"
                                                                    min="0"
                                                                    step="0.5"
                                                                    value={
                                                                        ex.load_kg
                                                                    }
                                                                    onChange={(
                                                                        v,
                                                                    ) =>
                                                                        onUpdateExercise(
                                                                            active._id,
                                                                            ex._id,
                                                                            'load_kg',
                                                                            v,
                                                                        )
                                                                    }
                                                                />
                                                                <PrescriptionNumber
                                                                    label="% de 1RM"
                                                                    unit="%"
                                                                    min="0"
                                                                    max="100"
                                                                    value={
                                                                        ex.load_percentage
                                                                    }
                                                                    onChange={(
                                                                        v,
                                                                    ) =>
                                                                        onUpdateExercise(
                                                                            active._id,
                                                                            ex._id,
                                                                            'load_percentage',
                                                                            v,
                                                                        )
                                                                    }
                                                                />
                                                                <PrescriptionNumber
                                                                    label="Cadência"
                                                                    unit="seg"
                                                                    min="0"
                                                                    value={
                                                                        ex.tempo_seconds
                                                                    }
                                                                    onChange={(
                                                                        v,
                                                                    ) =>
                                                                        onUpdateExercise(
                                                                            active._id,
                                                                            ex._id,
                                                                            'tempo_seconds',
                                                                            v,
                                                                        )
                                                                    }
                                                                />
                                                                <PrescriptionNumber
                                                                    label="RPE alvo"
                                                                    unit="1-10"
                                                                    min="1"
                                                                    max="10"
                                                                    value={
                                                                        ex.rpe_target
                                                                    }
                                                                    onChange={(
                                                                        v,
                                                                    ) =>
                                                                        onUpdateExercise(
                                                                            active._id,
                                                                            ex._id,
                                                                            'rpe_target',
                                                                            v,
                                                                        )
                                                                    }
                                                                />
                                                                <div
                                                                    className={
                                                                        s.prescriptionFieldWide
                                                                    }
                                                                >
                                                                    <label
                                                                        className={
                                                                            s.formLabel
                                                                        }
                                                                    >
                                                                        Grupo
                                                                        muscular
                                                                    </label>
                                                                    <select
                                                                        value={
                                                                            ex.muscle_group
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            onUpdateExercise(
                                                                                active._id,
                                                                                ex._id,
                                                                                'muscle_group',
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                        className={
                                                                            s.formSelect
                                                                        }
                                                                    >
                                                                        <option value="">
                                                                            Não
                                                                            definido
                                                                        </option>
                                                                        {MUSCLE_GROUPS.map(
                                                                            (
                                                                                g,
                                                                            ) => (
                                                                                <option
                                                                                    key={
                                                                                        g
                                                                                    }
                                                                                    value={
                                                                                        g
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        g
                                                                                    }
                                                                                </option>
                                                                            ),
                                                                        )}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {(canCombine ||
                                                        isLastInGroup) && (
                                                        <div
                                                            className={
                                                                s.comboActionsRow
                                                            }
                                                        >
                                                            {canCombine && (
                                                                <button
                                                                    type="button"
                                                                    className={
                                                                        s.linkBtnAccent
                                                                    }
                                                                    onClick={() =>
                                                                        onCombineWithPrevious?.(
                                                                            active._id,
                                                                            ex._id,
                                                                        )
                                                                    }
                                                                >
                                                                    🔗 Agrupar
                                                                    com
                                                                    exercício
                                                                    anterior
                                                                </button>
                                                            )}
                                                            {isLastInGroup && (
                                                                <button
                                                                    type="button"
                                                                    className={
                                                                        s.linkBtn
                                                                    }
                                                                    onClick={() =>
                                                                        onRemoveLastFromGroup?.(
                                                                            active._id,
                                                                            ex._id,
                                                                        )
                                                                    }
                                                                >
                                                                    Tirar do
                                                                    bloco
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        },
                                    );

                                    if (!isCombo || !groupId) {
                                        return (
                                            <React.Fragment key={group[0]._id}>
                                                {cards}
                                            </React.Fragment>
                                        );
                                    }

                                    return (
                                        <div
                                            key={group[0]._id}
                                            className={s.comboGroup}
                                        >
                                            <div
                                                className={s.comboBracket}
                                            />
                                            <div className={s.comboBody}>
                                                <div
                                                    className={
                                                        s.comboLabelRow
                                                    }
                                                >
                                                    <span
                                                        className={
                                                            s.comboChip
                                                        }
                                                    >
                                                        🔗{' '}
                                                        {comboGroupLabel(
                                                            group.length,
                                                        )}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className={s.linkBtn}
                                                        onClick={() =>
                                                            onUngroupExercises?.(
                                                                active._id,
                                                                groupId,
                                                            )
                                                        }
                                                    >
                                                        Desagrupar
                                                    </button>
                                                </div>
                                                {cards}
                                            </div>
                                        </div>
                                    );
                                },
                            )}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            type="button"
                            className={s.btnSmall}
                            onClick={() => onOpenPicker(active._id)}
                        >
                            + Exercício
                        </button>
                        <button
                            type="button"
                            className={s.btnSmall}
                            onClick={() => onAddExercise(active._id)}
                        >
                            + Manual
                        </button>
                    </div>

                    {/* Exercise Picker */}
                    {pickerFor === active._id && (
                        <ExercisePicker
                            onPick={(item) => onPickExercise(active._id, item)}
                            onClose={onClosePicker}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
