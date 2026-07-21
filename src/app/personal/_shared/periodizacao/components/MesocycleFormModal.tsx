'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type {
    ExerciseLibraryItem,
    MesocycleRequest,
    MesocycleResponse,
} from '@/libs/planningService';
import {
    PHASES_MATVEYEV,
    PHASES_FORCE,
    METHODOLOGIES,
    NEXT_REF,
    SIMPLE_MODE_DEFAULTS,
    genId,
    makeDefaultMicrocycles,
    responseMicroToLocal,
    responseToLocal,
    syncMicrocyclesByDuration,
    localToMesoRequest,
    type LocalExercise,
    type LocalMicrocycle,
    type LocalTraining,
} from '../lib/mesocycleTransforms';
import MicrocycleEditor from './MicrocycleEditor';
import TrainingsEditor from './TrainingsEditor';
import s from '../builder.module.css';

const mesoSchema = z.object({
    name: z.string().min(1, 'Nome obrigatório'),
    phase: z.string().min(1, 'Fase obrigatória'),
    duration_weeks: z.number().min(1, 'Mínimo 1 semana').max(52),
    methodology: z.string().min(1, 'Metodologia obrigatória'),
});
type MesoFormData = z.infer<typeof mesoSchema>;

interface Props {
    mode: 'add' | 'edit';
    meso: MesocycleResponse | null;
    order: number;
    saving: boolean;
    saveError: string;
    onClose: () => void;
    onSave: (req: MesocycleRequest) => void;
    /** Modo simples: esconde nome/fase/duração/metodologia e usa valores fixos (SIMPLE_MODE_DEFAULTS). */
    simpleMode?: boolean;
    /** "weekday" (padrão) ou "number" — só relevante quando simpleMode=true. */
    dayLabelStyle?: 'weekday' | 'number';
}

export default function MesocycleFormModal({
    mode,
    meso,
    order,
    saving,
    saveError,
    onClose,
    onSave,
    simpleMode,
    dayLabelStyle,
}: Props) {
    const [localTrainings, setLocalTrainings] = useState<LocalTraining[]>(
        () => (meso ? responseToLocal(meso.trainings) : []),
    );
    const [localMicrocycles, setLocalMicrocycles] = useState<
        LocalMicrocycle[]
    >(() =>
        meso
            ? responseMicroToLocal(meso.microcycles, meso.duration_weeks)
            : makeDefaultMicrocycles(4),
    );

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<MesoFormData>({
        resolver: zodResolver(mesoSchema),
        defaultValues: simpleMode
            ? SIMPLE_MODE_DEFAULTS
            : meso
              ? {
                    name: meso.name,
                    phase: meso.phase,
                    duration_weeks: meso.duration_weeks,
                    methodology: meso.methodology,
                }
              : { name: '', phase: '', duration_weeks: 4, methodology: '' },
    });
    const durationWeeksWatch = watch('duration_weeks');

    useEffect(() => {
        setLocalMicrocycles((prev) =>
            syncMicrocyclesByDuration(prev, durationWeeksWatch || 1),
        );
    }, [durationWeeksWatch]);

    /* ── Exercise picker ── */
    const [pickerFor, setPickerFor] = useState<string | null>(null);

    const openPicker = useCallback((tid: string) => setPickerFor(tid), []);
    const closePicker = useCallback(() => setPickerFor(null), []);

    const pickExercise = useCallback(
        (tid: string, item: ExerciseLibraryItem) => {
            setLocalTrainings((prev) =>
                prev.map((t) =>
                    t._id !== tid
                        ? t
                        : {
                              ...t,
                              exercises: [
                                  ...t.exercises,
                                  {
                                      _id: genId(),
                                      name: item.name,
                                      series_mode: 'reps',
                                      series_sets: '3',
                                      series_value: '10',
                                      series_free: '',
                                      observations: '',
                                      variations: '',
                                      timed: false,
                                      video_url: item.video_url ?? '',
                                      video_thumb: item.video_thumb ?? '',
                                  },
                              ],
                          },
                ),
            );
            closePicker();
        },
        [closePicker],
    );

    /* ── Microcycle CRUD ── */
    const updateMicrocycle = useCallback(
        (
            microId: string,
            field: keyof Omit<LocalMicrocycle, '_id' | 'week_number'>,
            value: string | boolean,
        ) => {
            setLocalMicrocycles((prev) =>
                prev.map((m) =>
                    m._id === microId ? { ...m, [field]: value } : m,
                ),
            );
        },
        [],
    );

    /* ── Training CRUD ── */
    const addTraining = useCallback(() => {
        setLocalTrainings((prev) => {
            const usedRefs = prev.map((t) => t.reference);
            const nextRef =
                NEXT_REF.find((r) => !usedRefs.includes(r)) ??
                String(prev.length + 1);
            return [...prev, { _id: genId(), reference: nextRef, exercises: [] }];
        });
    }, []);

    const removeTraining = useCallback(
        (tid: string) =>
            setLocalTrainings((prev) => prev.filter((t) => t._id !== tid)),
        [],
    );

    const duplicateTraining = useCallback((tid: string) => {
        setLocalTrainings((prev) => {
            const source = prev.find((t) => t._id === tid);
            if (!source) return prev;
            const usedRefs = prev.map((t) => t.reference);
            const nextRef =
                NEXT_REF.find((r) => !usedRefs.includes(r)) ??
                String(prev.length + 1);
            return [
                ...prev,
                {
                    _id: genId(),
                    reference: nextRef,
                    weekday: source.weekday,
                    exercises: source.exercises.map((ex) => ({
                        ...ex,
                        _id: genId(),
                    })),
                },
            ];
        });
    }, []);

    const updateTrainingRef = useCallback(
        (tid: string, ref: string) =>
            setLocalTrainings((prev) =>
                prev.map((t) => (t._id === tid ? { ...t, reference: ref } : t)),
            ),
        [],
    );

    const updateTrainingWeekday = useCallback(
        (tid: string, weekday: number | undefined) =>
            setLocalTrainings((prev) =>
                prev.map((t) => (t._id === tid ? { ...t, weekday } : t)),
            ),
        [],
    );

    /* ── Exercise CRUD ── */
    const addExercise = useCallback(
        (tid: string) =>
            setLocalTrainings((prev) =>
                prev.map((t) =>
                    t._id !== tid
                        ? t
                        : {
                              ...t,
                              exercises: [
                                  ...t.exercises,
                                  {
                                      _id: genId(),
                                      name: '',
                                      series_mode: 'reps',
                                      series_sets: '3',
                                      series_value: '10',
                                      series_free: '',
                                      observations: '',
                                      variations: '',
                                      timed: false,
                                      video_url: '',
                                      video_thumb: '',
                                  },
                              ],
                          },
                ),
            ),
        [],
    );

    const removeExercise = useCallback(
        (tid: string, eid: string) =>
            setLocalTrainings((prev) =>
                prev.map((t) =>
                    t._id !== tid
                        ? t
                        : {
                              ...t,
                              exercises: t.exercises.filter(
                                  (e) => e._id !== eid,
                              ),
                          },
                ),
            ),
        [],
    );

    const updateExercise = useCallback(
        (
            tid: string,
            eid: string,
            field: keyof Omit<LocalExercise, '_id'>,
            value: string | boolean,
        ) =>
            setLocalTrainings((prev) =>
                prev.map((t) =>
                    t._id !== tid
                        ? t
                        : {
                              ...t,
                              exercises: t.exercises.map((e) =>
                                  e._id !== eid ? e : { ...e, [field]: value },
                              ),
                          },
                ),
            ),
        [],
    );

    // Aviso leve (não bloqueia salvar): fases longas sem nenhuma semana de
    // deload marcada são um sinal comum de risco de overtraining/estagnação —
    // ver diretrizes de periodização (Bompa/Fleck: deload a cada 4-6 semanas).
    const suggestDeloadWarning =
        !simpleMode &&
        durationWeeksWatch >= 5 &&
        !localMicrocycles.some((m) => m.is_deload);

    const onSubmit = (data: MesoFormData) => {
        const req = localToMesoRequest(
            data,
            localTrainings,
            localMicrocycles,
            order,
            meso?.id,
        );
        onSave(req);
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.7)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '24px',
                overflowY: 'auto',
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                style={{
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 12,
                    padding: '28px 32px',
                    width: '100%',
                    maxWidth: 640,
                    marginTop: 40,
                    marginBottom: 40,
                }}
            >
                <h3 style={{ margin: '0 0 20px', fontSize: '1.15rem' }}>
                    {simpleMode
                        ? 'Treinos da Semana'
                        : mode === 'add'
                          ? 'Nova Fase (Mesociclo)'
                          : `Editar: ${meso?.name}`}
                </h3>

                <form onSubmit={handleSubmit(onSubmit)}>
                    {!simpleMode && (
                        <>
                            {/* ── Phase info ── */}
                            <div style={{ marginBottom: 14 }}>
                                <label
                                    style={{
                                        display: 'block',
                                        fontSize: '0.8rem',
                                        color: 'var(--text-muted)',
                                        marginBottom: 4,
                                    }}
                                >
                                    Nome *
                                </label>
                                <input
                                    {...register('name')}
                                    placeholder="Ex: Fase de Hipertrofia"
                                    className="form-control"
                                />
                                {errors.name && (
                                    <small className="text-danger">
                                        {errors.name.message}
                                    </small>
                                )}
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    gap: 12,
                                    marginBottom: 14,
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <label
                                        style={{
                                            display: 'block',
                                            fontSize: '0.8rem',
                                            color: 'var(--text-muted)',
                                            marginBottom: 4,
                                        }}
                                    >
                                        Fase *
                                    </label>
                                    <select
                                        {...register('phase')}
                                        className="form-control"
                                    >
                                        <option value="">Selecione</option>
                                        <optgroup label="Clássica (Matveyev)">
                                            {PHASES_MATVEYEV.map((p) => (
                                                <option key={p} value={p}>
                                                    {p}
                                                </option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Força / Bloco (Bompa)">
                                            {PHASES_FORCE.map((p) => (
                                                <option key={p} value={p}>
                                                    {p}
                                                </option>
                                            ))}
                                        </optgroup>
                                    </select>
                                    {errors.phase && (
                                        <small className="text-danger">
                                            {errors.phase.message}
                                        </small>
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label
                                        style={{
                                            display: 'block',
                                            fontSize: '0.8rem',
                                            color: 'var(--text-muted)',
                                            marginBottom: 4,
                                        }}
                                    >
                                        Duração{' '}
                                        <span style={{ fontWeight: 400 }}>
                                            (semanas = microciclos)
                                        </span>{' '}
                                        *
                                    </label>
                                    {/* Presets rápidos */}
                                    <div className="d-flex gap-1 mb-1 flex-wrap">
                                        {[3, 4, 5, 6].map((w) => {
                                            const current =
                                                watch('duration_weeks');
                                            const active = current === w;
                                            return (
                                                <button
                                                    key={w}
                                                    type="button"
                                                    onClick={() =>
                                                        setValue(
                                                            'duration_weeks',
                                                            w,
                                                            {
                                                                shouldValidate:
                                                                    true,
                                                            },
                                                        )
                                                    }
                                                    style={{
                                                        padding: '3px 11px',
                                                        borderRadius: 20,
                                                        border: active
                                                            ? '1.5px solid var(--mint, #2ecc71)'
                                                            : '1px solid var(--border-subtle)',
                                                        background: active
                                                            ? 'var(--mint, #2ecc71)'
                                                            : 'transparent',
                                                        color: active
                                                            ? '#000'
                                                            : 'var(--text-muted)',
                                                        fontSize: '0.78rem',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {w} sem
                                                    {w === 4 ? ' ⭐' : ''}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <input
                                        {...register('duration_weeks', {
                                            valueAsNumber: true,
                                        })}
                                        type="number"
                                        min={1}
                                        max={52}
                                        className="form-control"
                                        placeholder="Outra duração..."
                                    />
                                    <small
                                        style={{
                                            color: 'var(--text-muted)',
                                            fontSize: '0.72rem',
                                        }}
                                    >
                                        Recomendado: 3–6 semanas por fase
                                    </small>
                                    {errors.duration_weeks && (
                                        <small className="text-danger d-block">
                                            {errors.duration_weeks.message}
                                        </small>
                                    )}
                                </div>
                            </div>

                            <div style={{ marginBottom: 20 }}>
                                <label
                                    style={{
                                        display: 'block',
                                        fontSize: '0.8rem',
                                        color: 'var(--text-muted)',
                                        marginBottom: 4,
                                    }}
                                >
                                    Metodologia *
                                </label>
                                <select
                                    {...register('methodology')}
                                    className="form-control"
                                >
                                    <option value="">Selecione</option>
                                    {METHODOLOGIES.map((m) => (
                                        <option key={m} value={m}>
                                            {m}
                                        </option>
                                    ))}
                                </select>
                                {errors.methodology && (
                                    <small className="text-danger">
                                        {errors.methodology.message}
                                    </small>
                                )}
                            </div>
                        </>
                    )}

                    {suggestDeloadWarning && (
                        <div
                            className="alert alert-warning py-2 mb-3"
                            style={{ fontSize: '0.8rem' }}
                        >
                            ⚠️ Fase com {durationWeeksWatch} semanas e nenhuma
                            marcada como deload. Blocos longos sem semana de
                            descarga aumentam o risco de overtraining —
                            considere marcar uma semana como deload (ex: a
                            última) abaixo.
                        </div>
                    )}

                    <MicrocycleEditor
                        microcycles={localMicrocycles}
                        onUpdate={updateMicrocycle}
                        simpleMode={simpleMode}
                    />

                    <TrainingsEditor
                        trainings={localTrainings}
                        onAddTraining={addTraining}
                        onRemoveTraining={removeTraining}
                        onDuplicateTraining={duplicateTraining}
                        onUpdateTrainingRef={updateTrainingRef}
                        onAddExercise={addExercise}
                        onRemoveExercise={removeExercise}
                        onUpdateExercise={updateExercise}
                        pickerFor={pickerFor}
                        onOpenPicker={openPicker}
                        onClosePicker={closePicker}
                        onPickExercise={pickExercise}
                        simpleMode={simpleMode}
                        dayLabelStyle={dayLabelStyle}
                        onUpdateTrainingWeekday={updateTrainingWeekday}
                    />

                    {saveError && (
                        <div
                            className="alert alert-danger py-2 mb-3"
                            style={{ fontSize: '0.85rem' }}
                        >
                            {saveError}
                        </div>
                    )}

                    <div
                        style={{
                            display: 'flex',
                            gap: 10,
                            justifyContent: 'flex-end',
                        }}
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-muted)',
                                padding: '8px 18px',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className={s.btnEdit}
                            disabled={saving}
                            style={{ padding: '8px 24px', fontSize: '0.9rem' }}
                        >
                            {saving
                                ? 'Salvando...'
                                : mode === 'add'
                                  ? 'Adicionar'
                                  : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
