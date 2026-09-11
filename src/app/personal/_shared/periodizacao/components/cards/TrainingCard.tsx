'use client';

import React, { useMemo, useState } from 'react';
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
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FiMove, FiX, FiLink, FiPlay } from 'react-icons/fi';
import ExerciseThumbnail from '@/components/features/ExerciseThumbnail';
import HelpTooltip from '@/components/atoms/HelpTooltip';
import { getGlossaryTerm } from '@/libs/glossaryContent';
import { GROUP_TECHNIQUE_CATALOG } from '@/libs/trainingTechniques';
import {
    WEEKDAYS,
    partitionExerciseGroups,
    comboGroupLabel,
    type LocalExercise,
    type LocalTraining,
} from '../../lib/mesocycleTransforms';
import {
    prescriptionSummary,
    seriesSummary,
} from '../fields/PrescriptionFields';
import NavRow from './NavRow';
import s from '../../builder.module.css';

/** Bloco arrastável: um exercício avulso ou um combo inteiro. */
function SortableGroup({
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

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.5 : 1,
            }}
        >
            {reorderMode && (
                <div className={s.dragHandleRow} {...attributes} {...listeners}>
                    <span aria-hidden>⠿</span> Arraste para reordenar
                </div>
            )}
            {children}
        </div>
    );
}

/**
 * Card de UM treino: identidade e a lista de exercícios como linhas.
 *
 * Cada exercício era um cartão aberto com 8 campos visíveis; aqui vira uma
 * linha de 48px com miniatura, nome e o resumo da prescrição, e o card próprio
 * do exercício guarda os 24 campos em quatro abas.
 */
export default function TrainingCard({
    training,
    index,
    simpleMode,
    isNumbered,
    onUpdateRef,
    onUpdateWeekday,
    onOpenExercise,
    onOpenPicker,
    onOpenBulkPrescription,
    onAddManualExercise,
    onRemoveExercise,
    onUpdateExercise,
    onReorderExercises,
    onCombineWithPrevious,
    onUngroupExercises,
    onRemoveLastFromGroup,
    onPreviewExercise,
}: {
    training: LocalTraining;
    index: number;
    simpleMode?: boolean;
    isNumbered?: boolean;
    onUpdateRef: (reference: string) => void;
    onUpdateWeekday: (weekday: number | undefined) => void;
    onOpenExercise: (exerciseId: string) => void;
    onOpenPicker: () => void;
    onOpenBulkPrescription: () => void;
    onAddManualExercise: () => void;
    onRemoveExercise: (exerciseId: string) => void;
    onUpdateExercise: (
        exerciseId: string,
        field: keyof Omit<LocalExercise, '_id'>,
        value: string | boolean,
    ) => void;
    onReorderExercises?: (exerciseIds: string[]) => void;
    onCombineWithPrevious?: (exerciseId: string) => void;
    onUngroupExercises?: (groupId: string) => void;
    onRemoveLastFromGroup?: (exerciseId: string) => void;
    onPreviewExercise: (exercise: LocalExercise) => void;
}) {
    const [reorderMode, setReorderMode] = useState(false);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    );

    // partitionExerciseGroups reagrupa por bissérie/trissérie e recebe um array
    // novo a cada edição — memoizado para não gerar identidades novas que
    // quebrem o SortableContext.
    const groups = useMemo(
        () => partitionExerciseGroups(training.exercises),
        [training.exercises],
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const groupIds = groups.map((g) => g[0].group_id ?? g[0]._id);
        const oldIndex = groupIds.indexOf(String(active.id));
        const newIndex = groupIds.indexOf(String(over.id));
        if (oldIndex === -1 || newIndex === -1) return;
        onReorderExercises?.(
            arrayMove(groups, oldIndex, newIndex)
                .flat()
                .map((e) => e._id),
        );
    };

    const exerciseRow = (
        ex: LocalExercise,
        globalIdx: number,
        isLastInGroup: boolean,
    ) => {
        const canCombine = !ex.group_id && globalIdx > 0;
        return (
            <div key={ex._id}>
                <div className={s.rowWithActions}>
                    <button
                        type="button"
                        className={s.exerciseRowThumbBtn}
                        title={`Ver vídeo e detalhes de ${ex.name || 'exercício'}`}
                        aria-label={`Ver vídeo e detalhes de ${ex.name || 'exercício'}`}
                        onClick={() => onPreviewExercise(ex)}
                    >
                        <ExerciseThumbnail
                            name={ex.name || 'Exercício'}
                            videoThumb={ex.video_thumb}
                            videoUrl={ex.video_url}
                            width={44}
                            height={44}
                            borderRadius={8}
                            captureFrame={false}
                            lazyCapture
                        />
                        <span className={s.exerciseRowThumbPlay} aria-hidden>
                            <FiPlay />
                        </span>
                    </button>
                    <NavRow
                        title={ex.name || 'Exercício sem nome'}
                        summary={
                            <>
                                {seriesSummary(ex)}
                                <span className={s.navRowSummarySecondary}>
                                    {prescriptionSummary(ex)}
                                </span>
                            </>
                        }
                        onClick={() => onOpenExercise(ex._id)}
                    />
                    <button
                        type="button"
                        className={s.btnTiny}
                        style={{ color: 'var(--coral, #e74c3c)' }}
                        title="Remover exercício"
                        aria-label={`Remover ${ex.name || 'exercício'}`}
                        onClick={() => {
                            if (
                                !confirm(
                                    `Remover o exercício "${ex.name || 'sem nome'}" e suas séries? Essa ação não pode ser desfeita.`,
                                )
                            )
                                return;
                            onRemoveExercise(ex._id);
                        }}
                    >
                        <FiX />
                    </button>
                </div>

                {(canCombine || isLastInGroup) && (
                    <div className={s.comboActionsRow}>
                        {canCombine && (
                            <button
                                type="button"
                                className={s.linkBtnAccent}
                                onClick={() => onCombineWithPrevious?.(ex._id)}
                            >
                                <FiLink /> Agrupar com exercício anterior
                            </button>
                        )}
                        {isLastInGroup && (
                            <button
                                type="button"
                                className={s.linkBtn}
                                onClick={() => onRemoveLastFromGroup?.(ex._id)}
                            >
                                Tirar do bloco
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <div className={s.trainingCardHeader}>
                {isNumbered ? (
                    <span className={s.refStatic}>Treino {index + 1}</span>
                ) : simpleMode ? (
                    <select
                        value={training.weekday ?? ''}
                        onChange={(e) =>
                            onUpdateWeekday(
                                e.target.value === ''
                                    ? undefined
                                    : Number(e.target.value),
                            )
                        }
                        className={s.weekdaySelectNarrow}
                        aria-label="Dia da semana do treino"
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
                        value={training.reference}
                        onChange={(e) => onUpdateRef(e.target.value)}
                        placeholder="Ref (A, B…)"
                        className={s.refInput}
                        aria-label="Referência do treino"
                    />
                )}
                <span className={s.trainingCardMeta}>
                    {training.exercises.length} exercício
                    {training.exercises.length === 1 ? '' : 's'}
                </span>
                {training.exercises.length > 1 && onReorderExercises && (
                    <button
                        type="button"
                        className={reorderMode ? s.btnSmallActive : s.btnSmall}
                        onClick={() => setReorderMode((v) => !v)}
                    >
                        {reorderMode ? (
                            'Concluir'
                        ) : (
                            <>
                                <FiMove /> Ordenar
                            </>
                        )}
                    </button>
                )}
            </div>

            {training.exercises.length === 0 ? (
                <p className={s.emptyHint}>
                    Nenhum exercício neste treino. Escolha da biblioteca para já
                    vir com vídeo e grupo muscular.
                </p>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={groups.map((g) => g[0].group_id ?? g[0]._id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className={s.navRowGroup}>
                            {groups.map((group) => {
                                const isCombo = group.length > 1;
                                const groupId = group[0].group_id;
                                const sortId = groupId ?? group[0]._id;
                                const rows = group.map((ex, idxInGroup) =>
                                    exerciseRow(
                                        ex,
                                        training.exercises.findIndex(
                                            (e) => e._id === ex._id,
                                        ),
                                        isCombo &&
                                            idxInGroup === group.length - 1,
                                    ),
                                );

                                if (!isCombo || !groupId) {
                                    return (
                                        <SortableGroup
                                            key={sortId}
                                            id={sortId}
                                            reorderMode={reorderMode}
                                        >
                                            {rows}
                                        </SortableGroup>
                                    );
                                }

                                return (
                                    <SortableGroup
                                        key={sortId}
                                        id={sortId}
                                        reorderMode={reorderMode}
                                    >
                                        <div className={s.comboGroup}>
                                            <div className={s.comboBracket} />
                                            <div className={s.comboBody}>
                                                <div
                                                    className={s.comboLabelRow}
                                                >
                                                    <span
                                                        className={s.comboChip}
                                                    >
                                                        <FiLink />{' '}
                                                        {comboGroupLabel(
                                                            group.length,
                                                            group[0]
                                                                .group_technique,
                                                        )}
                                                    </span>
                                                    <HelpTooltip
                                                        text={
                                                            getGlossaryTerm(
                                                                'combinacao',
                                                            ).short
                                                        }
                                                        href="/ajuda#glossario-combinacao"
                                                        label="Ajuda sobre combinação de exercícios"
                                                    />
                                                    <select
                                                        value={
                                                            group[0]
                                                                .group_technique ??
                                                            ''
                                                        }
                                                        onChange={(e) => {
                                                            const value =
                                                                e.target.value;
                                                            group.forEach((g) =>
                                                                onUpdateExercise(
                                                                    g._id,
                                                                    'group_technique',
                                                                    value,
                                                                ),
                                                            );
                                                        }}
                                                        className={s.formInput}
                                                        style={{
                                                            maxWidth: 220,
                                                        }}
                                                        aria-label="Tipo de combinação"
                                                    >
                                                        <option value="">
                                                            Tipo de combinação…
                                                        </option>
                                                        {GROUP_TECHNIQUE_CATALOG.map(
                                                            (gt) => (
                                                                <option
                                                                    key={
                                                                        gt.value
                                                                    }
                                                                    value={
                                                                        gt.value
                                                                    }
                                                                >
                                                                    {gt.label}
                                                                </option>
                                                            ),
                                                        )}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        className={s.linkBtn}
                                                        onClick={() =>
                                                            onUngroupExercises?.(
                                                                groupId,
                                                            )
                                                        }
                                                    >
                                                        Desagrupar
                                                    </button>
                                                </div>
                                                {rows}
                                            </div>
                                        </div>
                                    </SortableGroup>
                                );
                            })}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            <div className={s.cardActionsRow}>
                <button
                    type="button"
                    className={s.btnBlock}
                    onClick={onOpenPicker}
                >
                    + Exercício da biblioteca
                </button>
                <button
                    type="button"
                    className={s.btnSmall}
                    onClick={onAddManualExercise}
                >
                    + Manual
                </button>
            </div>

            {training.exercises.length > 0 && (
                <div className={s.navRowGroup}>
                    <NavRow
                        title="Prescrição geral"
                        summary={`Preenche de uma vez os ${training.exercises.length} exercício${training.exercises.length === 1 ? '' : 's'} deste treino`}
                        onClick={onOpenBulkPrescription}
                    />
                </div>
            )}
        </>
    );
}
