'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    arrayMove,
    rectSortingStrategy,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    MUSCLE_GROUPS,
    muscleGroupLabel,
    type ExerciseLibraryItem,
} from '@/libs/planningService';
import {
    WEEKDAYS,
    weekdayLabel,
    partitionExerciseGroups,
    comboGroupLabel,
    localExerciseToLog,
    type LocalExercise,
    type LocalTraining,
} from '../lib/mesocycleTransforms';
import ExercisePicker from './ExercisePicker';
import ExerciseThumbnail from '@/components/features/ExerciseThumbnail';
import ExerciseDetailCard from '@/components/features/ExerciseDetailCard';
import type { ExerciseLog } from '@/components/features/types';
import HelpTooltip from '@/components/atoms/HelpTooltip';
import { getGlossaryTerm } from '@/libs/glossaryContent';
import {
    TECHNIQUE_CATALOG,
    TECHNIQUE_CATEGORIES,
    GROUP_TECHNIQUE_CATALOG,
    formatTechniqueSummary,
    type TechniqueParamKey,
} from '@/libs/trainingTechniques';
import { FiMove, FiCopy, FiX, FiLink, FiPlay } from 'react-icons/fi';
import s from '../builder.module.css';

/** Mapeia a chave genérica do catálogo (rounds/round_reduction_pct/...) para
 * o campo string correspondente em LocalExercise. */
const TECHNIQUE_FIELD_MAP: Record<
    TechniqueParamKey,
    keyof Omit<LocalExercise, '_id'>
> = {
    rounds: 'technique_rounds',
    round_reduction_pct: 'technique_reduction_pct',
    pause_seconds: 'technique_pause_seconds',
    extra_reps: 'technique_extra_reps',
    hold_seconds: 'technique_hold_seconds',
};

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
    onUpdateTrainingWeekday?: (
        tid: string,
        weekday: number | undefined,
    ) => void;
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
    /** Reordena as abas de treino (arrastar e soltar). */
    onReorderTrainings?: (order: string[]) => void;
    /** Reordena os exercícios (ou blocos combo inteiros) dentro de um treino. */
    onReorderExercises?: (tid: string, exerciseIds: string[]) => void;
    /** Aplica os campos preenchidos no bloco de prescrição geral a todos os
     * exercícios do treino informado. */
    onBulkFillPrescription?: (
        tid: string,
        fields: BulkPrescriptionFields,
    ) => void;
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
    helpId,
}: {
    label: string;
    unit: string;
    value: string;
    onChange: (value: string) => void;
    min?: string;
    max?: string;
    step?: string;
    /** id do termo no glossário (glossaryContent.ts) — exibe um HelpTooltip ao lado do rótulo. */
    helpId?: string;
}) {
    return (
        <div className={s.prescriptionField}>
            <label className={s.formLabel}>
                {label}
                {helpId && (
                    <>
                        {' '}
                        <HelpTooltip
                            text={getGlossaryTerm(helpId).short}
                            href={`/ajuda#glossario-${helpId}`}
                            label={`Ajuda sobre ${label.toLowerCase()}`}
                        />
                    </>
                )}
            </label>
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

/** Select de grupo muscular — usado tanto na prescrição por exercício quanto
 * na prescrição geral do treino, daí extraído em vez de duplicado. */
function MuscleGroupSelect({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className={s.prescriptionFieldWide}>
            <label className={s.formLabel}>
                Grupo muscular{' '}
                <HelpTooltip
                    text={getGlossaryTerm('grupo-muscular').short}
                    href="/ajuda#glossario-grupo-muscular"
                    label="Ajuda sobre grupo muscular"
                />
            </label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={s.formSelect}
            >
                <option value="">Não definido</option>
                {MUSCLE_GROUPS.map((g) => (
                    <option key={g} value={g}>
                        {muscleGroupLabel(g)}
                    </option>
                ))}
            </select>
        </div>
    );
}

/** Select de técnica avançada + campos de parâmetro dela — mesmo motivo do
 * MuscleGroupSelect acima: idêntico na prescrição por exercício e na geral,
 * só muda de onde vem/vai o valor. */
function TechniqueBlock({
    technique,
    onChangeTechnique,
    getParamValue,
    onChangeParam,
}: {
    technique: string;
    onChangeTechnique: (value: string) => void;
    getParamValue: (key: TechniqueParamKey) => string;
    onChangeParam: (key: TechniqueParamKey, value: string) => void;
}) {
    return (
        <>
            <div className={s.prescriptionFieldWide}>
                <label className={s.formLabel}>
                    Técnica avançada{' '}
                    <HelpTooltip
                        text={getGlossaryTerm('tecnica').short}
                        href="/ajuda#glossario-tecnica"
                        label="Ajuda sobre técnica de treinamento"
                    />
                </label>
                <select
                    value={technique}
                    onChange={(e) => onChangeTechnique(e.target.value)}
                    className={s.formSelect}
                >
                    <option value="">Nenhuma</option>
                    {TECHNIQUE_CATEGORIES.map((category) => (
                        <optgroup key={category} label={category}>
                            {Object.entries(TECHNIQUE_CATALOG)
                                .filter(([, def]) => def.category === category)
                                .map(([value, def]) => (
                                    <option key={value} value={value}>
                                        {def.label}
                                    </option>
                                ))}
                        </optgroup>
                    ))}
                </select>
            </div>
            {technique &&
                TECHNIQUE_CATALOG[technique]?.fields.map((f) => (
                    <PrescriptionNumber
                        key={f.key}
                        label={f.label}
                        unit={f.unit}
                        min={String(f.min)}
                        max={String(f.max)}
                        value={getParamValue(f.key)}
                        onChange={(v) => onChangeParam(f.key, v)}
                    />
                ))}
        </>
    );
}

/** Campos de prescrição preenchíveis em bloco (não pertencem a nenhum
 * exercício até serem aplicados). */
export interface BulkPrescriptionFields {
    load_kg: string;
    load_percentage: string;
    tempo_seconds: string;
    rpe_target: string;
    muscle_group: string;
    technique: string;
    technique_rounds: string;
    technique_reduction_pct: string;
    technique_pause_seconds: string;
    technique_extra_reps: string;
    technique_hold_seconds: string;
}

const EMPTY_BULK_FIELDS: BulkPrescriptionFields = {
    load_kg: '',
    load_percentage: '',
    tempo_seconds: '',
    rpe_target: '',
    muscle_group: '',
    technique: '',
    technique_rounds: '',
    technique_reduction_pct: '',
    technique_pause_seconds: '',
    technique_extra_reps: '',
    technique_hold_seconds: '',
};

/** Preenchimento geral de prescrição: define uma vez os campos que valem pra
 * (quase) todos os exercícios do treino em foco, e só o que for preenchido
 * aqui é aplicado — o resto de cada exercício continua intocado, para o
 * personal ajustar pontualmente depois. */
function BulkPrescriptionFill({
    exerciseCount,
    onApply,
}: {
    exerciseCount: number;
    onApply: (fields: BulkPrescriptionFields) => void;
}) {
    const [open, setOpen] = useState(false);
    const [fields, setFields] =
        useState<BulkPrescriptionFields>(EMPTY_BULK_FIELDS);

    const setField =
        (key: keyof BulkPrescriptionFields): ((value: string) => void) =>
        (value) =>
            setFields((prev) => ({ ...prev, [key]: value }));

    const hasAnyValue = Object.values(fields).some((v) => v !== '');

    const handleApply = () => {
        if (!hasAnyValue) return;
        if (
            !confirm(
                `Aplicar esta prescrição geral aos ${exerciseCount} exercício${exerciseCount === 1 ? '' : 's'} deste treino? Os campos preenchidos aqui substituem os valores individuais já definidos — os demais campos de cada exercício continuam como estão.`,
            )
        )
            return;
        onApply(fields);
    };

    return (
        <div className={s.prescriptionCard} style={{ marginBottom: 12 }}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className={s.prescriptionToggle}
            >
                <span>
                    <span className={s.collapsibleTitle}>
                        Prescrição geral do treino
                    </span>
                    <span className={s.collapsibleSummary}>
                        Preenche todos os exercícios de uma vez — ajuste
                        pontualmente depois
                    </span>
                </span>
                <span
                    aria-hidden
                    className={
                        open ? s.collapsibleChevronOpen : s.collapsibleChevron
                    }
                >
                    ▾
                </span>
            </button>

            {open && (
                <div className={s.prescriptionBody}>
                    <PrescriptionNumber
                        label="Carga"
                        unit="kg"
                        min="0"
                        step="0.5"
                        value={fields.load_kg}
                        onChange={setField('load_kg')}
                        helpId="carga"
                    />
                    <PrescriptionNumber
                        label="% de 1RM"
                        unit="%"
                        min="0"
                        max="100"
                        value={fields.load_percentage}
                        onChange={setField('load_percentage')}
                        helpId="1rm"
                    />
                    <PrescriptionNumber
                        label="Cadência"
                        unit="seg"
                        min="0"
                        value={fields.tempo_seconds}
                        onChange={setField('tempo_seconds')}
                        helpId="cadencia"
                    />
                    <PrescriptionNumber
                        label="RPE alvo"
                        unit="1-10"
                        min="1"
                        max="10"
                        value={fields.rpe_target}
                        onChange={setField('rpe_target')}
                        helpId="rpe"
                    />
                    <MuscleGroupSelect
                        value={fields.muscle_group}
                        onChange={setField('muscle_group')}
                    />
                    <TechniqueBlock
                        technique={fields.technique}
                        onChangeTechnique={setField('technique')}
                        getParamValue={(key) =>
                            fields[
                                TECHNIQUE_FIELD_MAP[
                                    key
                                ] as keyof BulkPrescriptionFields
                            ]
                        }
                        onChangeParam={(key, value) =>
                            setFields((prev) => ({
                                ...prev,
                                [TECHNIQUE_FIELD_MAP[
                                    key
                                ] as keyof BulkPrescriptionFields]: value,
                            }))
                        }
                    />
                    <div
                        className={s.prescriptionFieldWide}
                        style={{ marginTop: 4 }}
                    >
                        <button
                            type="button"
                            className={s.btnSmall}
                            disabled={!hasAnyValue}
                            onClick={handleApply}
                        >
                            Aplicar a todos os {exerciseCount} exercício
                            {exerciseCount === 1 ? '' : 's'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/** Aba de treino arrastável — só vira "pegável" quando o modo de ordenação
 * está ligado, senão o clique normal (selecionar a aba) continua funcionando
 * sem conflito com os listeners de drag. */
function SortableDayChip({
    id,
    active,
    label,
    fullLabel,
    reorderMode,
    onClick,
}: {
    id: string;
    active: boolean;
    label: string;
    fullLabel: string;
    reorderMode: boolean;
    onClick: () => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, disabled: !reorderMode });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        touchAction: reorderMode ? 'none' : undefined,
    };

    return (
        <button
            ref={setNodeRef}
            style={style}
            type="button"
            className={active ? s.dayChipActive : s.dayChip}
            title={fullLabel}
            aria-label={fullLabel}
            onClick={reorderMode ? undefined : onClick}
            {...(reorderMode
                ? { ...attributes, ...listeners }
                : { 'aria-pressed': active })}
        >
            {reorderMode && (
                <span className={s.dragHandleIcon} aria-hidden>
                    ⠿
                </span>
            )}
            {label}
        </button>
    );
}

/** Envolve um bloco de exercício (avulso ou combo inteiro) para ficar
 * arrastável. A "alça" só aparece em modo de ordenação, e é ela — não o
 * card inteiro — que recebe os listeners de drag, para não brigar com os
 * inputs/botões do card por baixo. */
function SortableExerciseGroup({
    id,
    reorderMode,
    children,
}: {
    id: string;
    reorderMode: boolean;
    children: React.ReactNode;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, disabled: !reorderMode });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style}>
            {reorderMode && (
                <div className={s.dragHandleRow} {...attributes} {...listeners}>
                    <span aria-hidden>⠿</span> Arraste para reordenar
                </div>
            )}
            {children}
        </div>
    );
}

/** Resumo de 1 linha do bloco de prescrição recolhido — mesmo padrão do bloco
 * "Ajustes semanais" do MesocycleFormModal. */
function prescriptionSummary(ex: LocalExercise): string {
    const parts: string[] = [];
    if (ex.technique) {
        parts.push(
            formatTechniqueSummary(ex.technique, {
                rounds: ex.technique_rounds
                    ? Number(ex.technique_rounds)
                    : undefined,
                round_reduction_pct: ex.technique_reduction_pct
                    ? Number(ex.technique_reduction_pct)
                    : undefined,
                pause_seconds: ex.technique_pause_seconds
                    ? Number(ex.technique_pause_seconds)
                    : undefined,
                extra_reps: ex.technique_extra_reps
                    ? Number(ex.technique_extra_reps)
                    : undefined,
                hold_seconds: ex.technique_hold_seconds
                    ? Number(ex.technique_hold_seconds)
                    : undefined,
            }),
        );
    }
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
    onReorderTrainings,
    onReorderExercises,
    onBulkFillPrescription,
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

    // partitionExerciseGroups reagrupa por bissérie/trissérie a cada edição
    // de qualquer campo do treino ativo (o array de exercícios ganha nova
    // referência a cada tecla digitada) — memoizado para não recalcular 2x
    // por render (drag context + lista) nem gerar arrays novos que quebrem a
    // identidade usada pelo SortableContext.
    const activeExerciseGroups = useMemo(
        () => (active ? partitionExerciseGroups(active.exercises) : []),
        // Depende só do array de exercícios, não do objeto `active` inteiro:
        // trocar de aba (activeId) ou editar reference/weekday do treino sem
        // tocar nos exercícios não deve forçar reparticionar os grupos.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [active?.exercises],
    );

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

    // Pré-visualização do exercício (mesmo card que o aluno vê): abre pelo
    // clique na thumbnail, principalmente para conferir o vídeo do exercício
    // recém-adicionado sem sair do editor. Guarda também os irmãos do treino
    // para navegar dentro de um bloco de bi-set/triset (ver nextInGroup).
    const [preview, setPreview] = useState<{
        exercise: ExerciseLog;
        siblings: ExerciseLog[];
    } | null>(null);

    const previewNextInGroup = (): ExerciseLog | null => {
        if (!preview) return null;
        const { exercise, siblings } = preview;
        const idx = siblings.findIndex((e) => e.id === exercise.id);
        if (idx === -1) return null;
        const next = siblings[idx + 1];
        if (next && exercise.group_id && next.group_id === exercise.group_id) {
            return next;
        }
        return null;
    };

    // Ordenação por arrastar-e-soltar: modo explícito (em vez de sempre-ativo)
    // para não conflitar com o clique normal nas abas/botões dos cards.
    const [reorderTrainingsMode, setReorderTrainingsMode] = useState(false);
    const [reorderExercisesMode, setReorderExercisesMode] = useState(false);
    const dragSensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    );

    // Trocar de treino em foco com o modo de ordenar exercícios ligado
    // arrastaria a lista errada — desliga ao trocar de aba.
    useEffect(() => {
        setReorderExercisesMode(false);
    }, [activeId]);

    const handleTrainingsDragEnd = (event: DragEndEvent) => {
        const { active: dragged, over } = event;
        if (!over || dragged.id === over.id) return;
        const ids = trainings.map((t) => t._id);
        const oldIndex = ids.indexOf(String(dragged.id));
        const newIndex = ids.indexOf(String(over.id));
        if (oldIndex === -1 || newIndex === -1) return;
        onReorderTrainings?.(arrayMove(ids, oldIndex, newIndex));
    };

    return (
        <div className={s.trainingsSection}>
            <div className={s.sectionHeaderRow}>
                <p>Treinos desta fase</p>
                <div style={{ display: 'flex', gap: 8 }}>
                    {trainings.length > 1 && (
                        <button
                            type="button"
                            className={
                                reorderTrainingsMode
                                    ? s.btnSmallActive
                                    : s.btnSmall
                            }
                            onClick={() => setReorderTrainingsMode((v) => !v)}
                        >
                            {reorderTrainingsMode ? (
                                'Concluir ordenação'
                            ) : (
                                <>
                                    <FiMove /> Ordenar treinos
                                </>
                            )}
                        </button>
                    )}
                    <button
                        type="button"
                        className={s.btnSmall}
                        onClick={onAddTraining}
                    >
                        + Treino
                    </button>
                </div>
            </div>

            {trainings.length === 0 && (
                <p className={s.emptyHint}>
                    Nenhum treino adicionado. Use &quot;+ Treino&quot; para
                    adicionar.
                </p>
            )}

            {trainings.length > 0 && (
                <DndContext
                    sensors={dragSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleTrainingsDragEnd}
                >
                    <SortableContext
                        items={trainings.map((t) => t._id)}
                        strategy={rectSortingStrategy}
                    >
                        <div className={s.dayChipRow}>
                            {trainings.map((t, i) => {
                                const full = trainingFullLabel(
                                    t,
                                    i,
                                    simpleMode,
                                    isNumbered,
                                );
                                return (
                                    <SortableDayChip
                                        key={t._id}
                                        id={t._id}
                                        active={t._id === activeId}
                                        label={trainingTabLabel(
                                            t,
                                            i,
                                            simpleMode,
                                            isNumbered,
                                        )}
                                        fullLabel={full}
                                        reorderMode={reorderTrainingsMode}
                                        onClick={() => setActiveId(t._id)}
                                    />
                                );
                            })}
                        </div>
                    </SortableContext>
                </DndContext>
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
                            <FiCopy />
                        </button>
                        <button
                            type="button"
                            className={s.btnTiny}
                            style={{ color: 'var(--coral, #e74c3c)' }}
                            title="Remover treino"
                            onClick={() => {
                                if (
                                    !confirm(
                                        `Remover o treino "${active.reference || 'sem referência'}" e todos os seus exercícios? Essa ação não pode ser desfeita.`,
                                    )
                                )
                                    return;
                                onRemoveTraining(active._id);
                            }}
                        >
                            <FiX />
                        </button>
                    </div>

                    {/* Exercícios */}
                    {active.exercises.length > 0 && (
                        <>
                            {onBulkFillPrescription && (
                                <BulkPrescriptionFill
                                    exerciseCount={active.exercises.length}
                                    onApply={(fields) =>
                                        onBulkFillPrescription(
                                            active._id,
                                            fields,
                                        )
                                    }
                                />
                            )}

                            <div
                                className={s.sectionHeaderRow}
                                style={{ marginBottom: 8 }}
                            >
                                <p>Exercícios ({active.exercises.length})</p>
                                {active.exercises.length > 1 && (
                                    <button
                                        type="button"
                                        className={
                                            reorderExercisesMode
                                                ? s.btnSmallActive
                                                : s.btnSmall
                                        }
                                        onClick={() =>
                                            setReorderExercisesMode((v) => !v)
                                        }
                                    >
                                        {reorderExercisesMode ? (
                                            'Concluir ordenação'
                                        ) : (
                                            <>
                                                <FiMove /> Ordenar exercícios
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>

                            <DndContext
                                sensors={dragSensors}
                                collisionDetection={closestCenter}
                                onDragEnd={(event: DragEndEvent) => {
                                    const { active: dragged, over } = event;
                                    if (!over || dragged.id === over.id) return;
                                    const groupIds = activeExerciseGroups.map(
                                        (g) => g[0].group_id ?? g[0]._id,
                                    );
                                    const oldIndex = groupIds.indexOf(
                                        String(dragged.id),
                                    );
                                    const newIndex = groupIds.indexOf(
                                        String(over.id),
                                    );
                                    if (oldIndex === -1 || newIndex === -1)
                                        return;
                                    const reordered = arrayMove(
                                        activeExerciseGroups,
                                        oldIndex,
                                        newIndex,
                                    );
                                    onReorderExercises?.(
                                        active._id,
                                        reordered.flat().map((e) => e._id),
                                    );
                                }}
                            >
                                <SortableContext
                                    items={activeExerciseGroups.map(
                                        (g) => g[0].group_id ?? g[0]._id,
                                    )}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className={s.exercisesStack}>
                                        {activeExerciseGroups.map((group) => {
                                            const isCombo = group.length > 1;
                                            const groupId = group[0].group_id;
                                            const sortId =
                                                groupId ?? group[0]._id;
                                            const cards = group.map(
                                                (ex, idxInGroup) => {
                                                    const globalIdx =
                                                        active.exercises.findIndex(
                                                            (e) =>
                                                                e._id ===
                                                                ex._id,
                                                        );
                                                    const canCombine =
                                                        !ex.group_id &&
                                                        globalIdx > 0;
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
                                                                <button
                                                                    type="button"
                                                                    className={
                                                                        s.exerciseEditThumbBtn
                                                                    }
                                                                    title={`Ver vídeo e detalhes de ${ex.name || 'exercício'}`}
                                                                    aria-label={`Ver vídeo e detalhes de ${ex.name || 'exercício'}`}
                                                                    onClick={() =>
                                                                        setPreview(
                                                                            {
                                                                                exercise:
                                                                                    localExerciseToLog(
                                                                                        ex,
                                                                                    ),
                                                                                siblings:
                                                                                    active.exercises.map(
                                                                                        localExerciseToLog,
                                                                                    ),
                                                                            },
                                                                        )
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
                                                                        width={
                                                                            48
                                                                        }
                                                                        height={
                                                                            48
                                                                        }
                                                                        borderRadius={
                                                                            8
                                                                        }
                                                                        captureFrame={
                                                                            false
                                                                        }
                                                                        lazyCapture
                                                                        className={
                                                                            s.exerciseEditThumb
                                                                        }
                                                                    />
                                                                    <span
                                                                        className={
                                                                            s.exerciseEditThumbPlay
                                                                        }
                                                                        aria-hidden
                                                                    >
                                                                        <FiPlay />
                                                                    </span>
                                                                </button>
                                                                <input
                                                                    value={
                                                                        ex.name
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        onUpdateExercise(
                                                                            active._id,
                                                                            ex._id,
                                                                            'name',
                                                                            e
                                                                                .target
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
                                                                    onClick={() => {
                                                                        if (
                                                                            !confirm(
                                                                                `Remover o exercício "${ex.name || 'sem nome'}" e suas séries? Essa ação não pode ser desfeita.`,
                                                                            )
                                                                        )
                                                                            return;
                                                                        onRemoveExercise(
                                                                            active._id,
                                                                            ex._id,
                                                                        );
                                                                    }}
                                                                >
                                                                    <FiX />
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
                                                                    Séries{' '}
                                                                    <HelpTooltip
                                                                        text={getGlossaryTerm(
                                                                            'series-repeticoes',
                                                                        ).short}
                                                                        href="/ajuda#glossario-series-repeticoes"
                                                                        label="Ajuda sobre séries e repetições"
                                                                    />
                                                                </label>
                                                                <select
                                                                    value={
                                                                        ex.series_mode
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        onUpdateExercise(
                                                                            active._id,
                                                                            ex._id,
                                                                            'series_mode',
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    className={
                                                                        s.formSelect
                                                                    }
                                                                >
                                                                    <option value="reps">
                                                                        Reps
                                                                        (séries
                                                                        ×
                                                                        repetições)
                                                                    </option>
                                                                    <option value="time">
                                                                        Tempo
                                                                        (min/seg)
                                                                    </option>
                                                                    <option value="free">
                                                                        Livre
                                                                        (texto)
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
                                                                    Descanso
                                                                    entre séries{' '}
                                                                    <HelpTooltip
                                                                        text={getGlossaryTerm(
                                                                            'descanso',
                                                                        ).short}
                                                                        href="/ajuda#glossario-descanso"
                                                                        label="Ajuda sobre descanso entre séries"
                                                                    />
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
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            onUpdateExercise(
                                                                                active._id,
                                                                                ex._id,
                                                                                'rest_seconds',
                                                                                e
                                                                                    .target
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
                                                                    Variação{' '}
                                                                    <HelpTooltip
                                                                        text={getGlossaryTerm(
                                                                            'variacoes',
                                                                        ).short}
                                                                        href="/ajuda#glossario-variacoes"
                                                                        label="Ajuda sobre variações"
                                                                    />
                                                                </label>
                                                                <input
                                                                    value={
                                                                        ex.variations
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        onUpdateExercise(
                                                                            active._id,
                                                                            ex._id,
                                                                            'variations',
                                                                            e
                                                                                .target
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
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        onUpdateExercise(
                                                                            active._id,
                                                                            ex._id,
                                                                            'observations',
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    placeholder="Observações / instruções do personal (opcional)"
                                                                    className={
                                                                        s.formInput
                                                                    }
                                                                    rows={2}
                                                                    style={{
                                                                        resize: 'vertical',
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
                                                                            helpId="carga"
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
                                                                            helpId="1rm"
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
                                                                            helpId="cadencia"
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
                                                                            helpId="rpe"
                                                                        />
                                                                        <MuscleGroupSelect
                                                                            value={
                                                                                ex.muscle_group
                                                                            }
                                                                            onChange={(
                                                                                v,
                                                                            ) =>
                                                                                onUpdateExercise(
                                                                                    active._id,
                                                                                    ex._id,
                                                                                    'muscle_group',
                                                                                    v,
                                                                                )
                                                                            }
                                                                        />
                                                                        <TechniqueBlock
                                                                            technique={
                                                                                ex.technique
                                                                            }
                                                                            onChangeTechnique={(
                                                                                v,
                                                                            ) =>
                                                                                onUpdateExercise(
                                                                                    active._id,
                                                                                    ex._id,
                                                                                    'technique',
                                                                                    v,
                                                                                )
                                                                            }
                                                                            getParamValue={(
                                                                                key,
                                                                            ) =>
                                                                                ex[
                                                                                    TECHNIQUE_FIELD_MAP[
                                                                                        key
                                                                                    ]
                                                                                ] as string
                                                                            }
                                                                            onChangeParam={(
                                                                                key,
                                                                                v,
                                                                            ) =>
                                                                                onUpdateExercise(
                                                                                    active._id,
                                                                                    ex._id,
                                                                                    TECHNIQUE_FIELD_MAP[
                                                                                        key
                                                                                    ],
                                                                                    v,
                                                                                )
                                                                            }
                                                                        />
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
                                                                            <FiLink />
                                                                            Agrupar
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
                                                                            Tirar
                                                                            do
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
                                                    <SortableExerciseGroup
                                                        key={sortId}
                                                        id={sortId}
                                                        reorderMode={
                                                            reorderExercisesMode
                                                        }
                                                    >
                                                        {cards}
                                                    </SortableExerciseGroup>
                                                );
                                            }

                                            return (
                                                <SortableExerciseGroup
                                                    key={sortId}
                                                    id={sortId}
                                                    reorderMode={
                                                        reorderExercisesMode
                                                    }
                                                >
                                                    <div
                                                        className={s.comboGroup}
                                                    >
                                                        <div
                                                            className={
                                                                s.comboBracket
                                                            }
                                                        />
                                                        <div
                                                            className={
                                                                s.comboBody
                                                            }
                                                        >
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
                                                                    <FiLink />{' '}
                                                                    {comboGroupLabel(
                                                                        group.length,
                                                                        group[0]
                                                                            .group_technique,
                                                                    )}
                                                                </span>
                                                                <HelpTooltip
                                                                    text={getGlossaryTerm(
                                                                        'combinacao',
                                                                    ).short}
                                                                    href="/ajuda#glossario-combinacao"
                                                                    label="Ajuda sobre combinação de exercícios"
                                                                />
                                                                <select
                                                                    value={
                                                                        group[0]
                                                                            .group_technique ??
                                                                        ''
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) => {
                                                                        const value =
                                                                            e
                                                                                .target
                                                                                .value;
                                                                        group.forEach(
                                                                            (
                                                                                g,
                                                                            ) =>
                                                                                onUpdateExercise(
                                                                                    active._id,
                                                                                    g._id,
                                                                                    'group_technique',
                                                                                    value,
                                                                                ),
                                                                        );
                                                                    }}
                                                                    className={
                                                                        s.formInput
                                                                    }
                                                                    style={{
                                                                        maxWidth: 220,
                                                                    }}
                                                                >
                                                                    <option value="">
                                                                        Tipo de
                                                                        combinação…
                                                                    </option>
                                                                    {GROUP_TECHNIQUE_CATALOG.map(
                                                                        (
                                                                            gt,
                                                                        ) => (
                                                                            <option
                                                                                key={
                                                                                    gt.value
                                                                                }
                                                                                value={
                                                                                    gt.value
                                                                                }
                                                                            >
                                                                                {
                                                                                    gt.label
                                                                                }
                                                                            </option>
                                                                        ),
                                                                    )}
                                                                </select>
                                                                <button
                                                                    type="button"
                                                                    className={
                                                                        s.linkBtn
                                                                    }
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
                                                </SortableExerciseGroup>
                                            );
                                        })}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </>
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

            {/* Pré-visualização do exercício (o mesmo card que o aluno vê).
                readOnly: carga e anotações aqui seriam gravadas na conta do
                personal, não na do aluno. */}
            {preview && (
                <ExerciseDetailCard
                    exercise={preview.exercise}
                    onClose={() => setPreview(null)}
                    nextInGroup={previewNextInGroup()}
                    onSelectExercise={(exercise) =>
                        setPreview({ exercise, siblings: preview.siblings })
                    }
                    readOnly
                />
            )}
        </div>
    );
}
