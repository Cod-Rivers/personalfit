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
    nextFreeWeekday,
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
import Modal from '@/components/system/Modal';
import s from '../builder.module.css';

const MESOCYCLE_FORM_ID = 'mesocycle-form-modal';

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
    // Ajustes semanais ficam recolhidos por padrão: a prescrição de
    // exercícios é a informação mais consultada ao abrir o formulário.
    const [adjustmentsOpen, setAdjustmentsOpen] = useState(false);

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
                                      // Vem da biblioteca: já nasce vinculado,
                                      // é o que permite propagar mídia depois.
                                      exercise_library_id: item.id,
                                      name: item.name,
                                      series_mode: 'reps',
                                      series_sets: '3',
                                      series_value: '10',
                                      series_free: '',
                                      observations: '',
                                      variations: '',
                                      rest_seconds: '',
                                      load_kg: '',
                                      load_percentage: '',
                                      tempo_seconds: '',
                                      rpe_target: '',
                                      muscle_group: item.muscle_group ?? '',
                                      timed: false,
                                      video_url: item.video_url ?? '',
                                      video_thumb: item.video_thumb ?? '',
                                      technique: '',
                                      technique_rounds: '',
                                      technique_reduction_pct: '',
                                      technique_pause_seconds: '',
                                      technique_extra_reps: '',
                                      technique_hold_seconds: '',
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
    // No modo por dia da semana o dia faz o papel do A/B/C: cada treino novo
    // já nasce rotulado (Seg, Ter…), senão todas as abas ficariam iguais até
    // o personal escolher o dia uma a uma.
    const autoWeekday = Boolean(simpleMode) && dayLabelStyle !== 'number';

    const addTraining = useCallback(() => {
        setLocalTrainings((prev) => {
            const usedRefs = prev.map((t) => t.reference);
            const nextRef =
                NEXT_REF.find((r) => !usedRefs.includes(r)) ??
                String(prev.length + 1);
            return [
                ...prev,
                {
                    _id: genId(),
                    reference: nextRef,
                    weekday: autoWeekday
                        ? nextFreeWeekday(prev.map((t) => t.weekday))
                        : undefined,
                    exercises: [],
                },
            ];
        });
    }, [autoWeekday]);

    const removeTraining = useCallback(
        (tid: string) =>
            setLocalTrainings((prev) => prev.filter((t) => t._id !== tid)),
        [],
    );

    const duplicateTraining = useCallback(
        (tid: string) => {
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
                        // A cópia vai para o próximo dia livre — repetir o dia
                        // da origem criaria duas abas com o mesmo rótulo.
                        weekday: autoWeekday
                            ? nextFreeWeekday(prev.map((t) => t.weekday))
                            : source.weekday,
                        exercises: source.exercises.map((ex) => ({
                            ...ex,
                            _id: genId(),
                        })),
                    },
                ];
            });
        },
        [autoWeekday],
    );

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
                                      rest_seconds: '',
                                      load_kg: '',
                                      load_percentage: '',
                                      tempo_seconds: '',
                                      rpe_target: '',
                                      muscle_group: '',
                                      timed: false,
                                      video_url: '',
                                      video_thumb: '',
                                      technique: '',
                                      technique_rounds: '',
                                      technique_reduction_pct: '',
                                      technique_pause_seconds: '',
                                      technique_extra_reps: '',
                                      technique_hold_seconds: '',
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

    /* ── Combinar exercícios (bissérie/trissérie/superssérie) ── */
    const combineWithPrevious = useCallback(
        (tid: string, eid: string) =>
            setLocalTrainings((prev) =>
                prev.map((t) => {
                    if (t._id !== tid) return t;
                    const idx = t.exercises.findIndex((e) => e._id === eid);
                    if (idx <= 0) return t;
                    const groupId =
                        t.exercises[idx - 1].group_id ?? genId();
                    return {
                        ...t,
                        exercises: t.exercises.map((e, i) =>
                            i === idx - 1 || i === idx
                                ? { ...e, group_id: groupId }
                                : e,
                        ),
                    };
                }),
            ),
        [],
    );

    const ungroupExercises = useCallback(
        (tid: string, groupId: string) =>
            setLocalTrainings((prev) =>
                prev.map((t) =>
                    t._id !== tid
                        ? t
                        : {
                              ...t,
                              exercises: t.exercises.map((e) =>
                                  e.group_id === groupId
                                      ? { ...e, group_id: undefined }
                                      : e,
                              ),
                          },
                ),
            ),
        [],
    );

    const removeLastFromGroup = useCallback(
        (tid: string, eid: string) =>
            setLocalTrainings((prev) =>
                prev.map((t) => {
                    if (t._id !== tid) return t;
                    const target = t.exercises.find((e) => e._id === eid);
                    const groupId = target?.group_id;
                    if (!groupId) return t;
                    const membersLeft = t.exercises.filter(
                        (e) => e._id !== eid && e.group_id === groupId,
                    );
                    // Se só sobrar 1 exercício no bloco, desfaz o bloco inteiro
                    // (um "grupo" de 1 exercício não faz sentido).
                    const clearAlso =
                        membersLeft.length === 1 ? membersLeft[0]._id : null;
                    return {
                        ...t,
                        exercises: t.exercises.map((e) =>
                            e._id === eid || e._id === clearAlso
                                ? { ...e, group_id: undefined }
                                : e,
                        ),
                    };
                }),
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

    // Resumo de 1 linha mostrado com o bloco de ajustes recolhido.
    const adjustmentsSummary = (() => {
        if (!simpleMode) {
            return `${localMicrocycles.length} semana${localMicrocycles.length === 1 ? '' : 's'} configurável${localMicrocycles.length === 1 ? '' : 'is'}`;
        }
        const week = localMicrocycles[0];
        const parts: string[] = [];
        if (week?.target_rpe) parts.push(`RPE ${week.target_rpe}`);
        if (week?.volume_adjust_pct && week.volume_adjust_pct !== '0')
            parts.push(`Volume ${week.volume_adjust_pct}%`);
        if (week?.intensity_adjust_pct && week.intensity_adjust_pct !== '0')
            parts.push(`Intensidade ${week.intensity_adjust_pct}%`);
        if (week?.focus) parts.push(`Foco: ${week.focus}`);
        return parts.length > 0
            ? parts.join(' · ')
            : 'Opcional — RPE, volume, intensidade, foco e notas';
    })();

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

    const modalTitle = simpleMode
        ? 'Treinos da Semana'
        : mode === 'add'
          ? 'Nova Fase (Mesociclo)'
          : `Editar: ${meso?.name}`;

    return (
        <Modal
            open
            onClose={onClose}
            title={modalTitle}
            footer={
                <>
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
                        form={MESOCYCLE_FORM_ID}
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
                </>
            }
        >
                <form id={MESOCYCLE_FORM_ID} onSubmit={handleSubmit(onSubmit)}>
                    {!simpleMode && (
                        <>
                            {/* ── Phase info ── */}
                            <div className={s.formGroup}>
                                <label className={s.formLabel}>Nome *</label>
                                <input
                                    {...register('name')}
                                    placeholder="Ex: Fase de Hipertrofia"
                                    className={s.formInput}
                                />
                                {errors.name && (
                                    <small className="text-danger">
                                        {errors.name.message}
                                    </small>
                                )}
                            </div>

                            <div className={s.formRow}>
                                <div className={s.formGroup}>
                                    <label className={s.formLabel}>
                                        Fase *
                                    </label>
                                    <select
                                        {...register('phase')}
                                        className={s.formSelect}
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
                                <div className={s.formGroup}>
                                    <label className={s.formLabel}>
                                        Duração{' '}
                                        <span style={{ fontWeight: 400 }}>
                                            (semanas = microciclos)
                                        </span>{' '}
                                        *
                                    </label>
                                    {/* Presets rápidos */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: 6,
                                            marginBottom: 6,
                                            flexWrap: 'wrap',
                                        }}
                                    >
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
                                                    className={
                                                        active
                                                            ? s.presetChipActive
                                                            : s.presetChip
                                                    }
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
                                        className={s.formInput}
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

                            <div className={s.formGroup}>
                                <label className={s.formLabel}>
                                    Metodologia *
                                </label>
                                <select
                                    {...register('methodology')}
                                    className={s.formSelect}
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
                        onCombineWithPrevious={combineWithPrevious}
                        onUngroupExercises={ungroupExercises}
                        onRemoveLastFromGroup={removeLastFromGroup}
                    />

                    <div className={s.collapsibleCard}>
                        <button
                            type="button"
                            onClick={() => setAdjustmentsOpen((v) => !v)}
                            aria-expanded={adjustmentsOpen}
                            className={s.collapsibleToggle}
                        >
                            <span>
                                <span className={s.collapsibleTitle}>
                                    {simpleMode
                                        ? 'Ajustes desta semana'
                                        : 'Ajustes semanais'}
                                </span>
                                <span className={s.collapsibleSummary}>
                                    {adjustmentsSummary}
                                </span>
                            </span>
                            <span
                                aria-hidden
                                className={
                                    adjustmentsOpen
                                        ? s.collapsibleChevronOpen
                                        : s.collapsibleChevron
                                }
                            >
                                ▾
                            </span>
                        </button>

                        {adjustmentsOpen && (
                            <div className={s.collapsibleBody}>
                                {suggestDeloadWarning && (
                                    <div
                                        className="alert alert-warning py-2 mb-3"
                                        style={{ fontSize: '0.8rem' }}
                                    >
                                        ⚠️ Fase com {durationWeeksWatch}{' '}
                                        semanas e nenhuma marcada como deload.
                                        Blocos longos sem semana de descarga
                                        aumentam o risco de overtraining —
                                        considere marcar uma semana como
                                        deload abaixo.
                                    </div>
                                )}
                                <MicrocycleEditor
                                    microcycles={localMicrocycles}
                                    onUpdate={updateMicrocycle}
                                    simpleMode={simpleMode}
                                />
                            </div>
                        )}
                    </div>

                    {saveError && (
                        <div
                            className="alert alert-danger py-2 mb-3"
                            style={{ fontSize: '0.85rem' }}
                        >
                            {saveError}
                        </div>
                    )}
                </form>
        </Modal>
    );
}
