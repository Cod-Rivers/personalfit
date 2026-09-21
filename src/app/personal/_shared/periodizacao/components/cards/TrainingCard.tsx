'use client';

import React, { useMemo } from 'react';
import { FiX, FiLink, FiPlay } from 'react-icons/fi';
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
import NavRow, {
    NavRowGroup,
    navRowSummarySecondary,
} from '@/components/molecules/NavRow';
import { SortableItem, SortableList } from '@/components/system/SortableList';
import s from '../../builder.module.css';

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
    helpHref = '/ajuda#montar-treino',
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
    /** Seção da Central de Ajuda sobre montar treino, conforme o público. */
    helpHref?: string;
}) {
    // partitionExerciseGroups reagrupa por bissérie/trissérie e recebe um array
    // novo a cada edição — memoizado para não gerar identidades novas que
    // quebrem o SortableContext.
    const groups = useMemo(
        () => partitionExerciseGroups(training.exercises),
        [training.exercises],
    );

    /** A lista arrasta BLOCOS, não exercícios soltos: um bi-set anda inteiro,
     * senão soltar no meio dele quebraria a combinação sem o personal pedir.
     * A ordem que sai daqui é a dos exercícios já achatados. */
    const handleReorder = (blockIds: string[]) => {
        const byId = new Map(
            groups.map((g) => [g[0].group_id ?? g[0]._id, g] as const),
        );
        onReorderExercises?.(
            blockIds.flatMap((id) => (byId.get(id) ?? []).map((e) => e._id)),
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
                                <span className={navRowSummarySecondary}>
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
            </div>

            {training.exercises.length === 0 ? (
                <p className={s.emptyHint}>
                    Nenhum exercício neste treino. Escolha da biblioteca para já
                    vir com vídeo e grupo muscular.
                </p>
            ) : (
                <SortableList
                    ids={groups.map((g) => g[0].group_id ?? g[0]._id)}
                    onReorder={handleReorder}
                    className={s.sortableGroup}
                >
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
                                isCombo && idxInGroup === group.length - 1,
                            ),
                        );
                        const label = isCombo
                            ? comboGroupLabel(
                                  group.length,
                                  group[0].group_technique,
                              )
                            : group[0].name || 'exercício';

                        return (
                            <SortableItem
                                key={sortId}
                                id={sortId}
                                label={label}
                                disabled={
                                    !onReorderExercises || groups.length < 2
                                }
                            >
                                {!isCombo || !groupId ? (
                                    rows
                                ) : (
                                    <div className={s.comboGroup}>
                                        <div className={s.comboBracket} />
                                        <div className={s.comboBody}>
                                            <div className={s.comboLabelRow}>
                                                <span className={s.comboChip}>
                                                    <FiLink /> {label}
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
                                                    style={{ maxWidth: 220 }}
                                                    aria-label="Tipo de combinação"
                                                >
                                                    <option value="">
                                                        Tipo de combinação…
                                                    </option>
                                                    {GROUP_TECHNIQUE_CATALOG.map(
                                                        (gt) => (
                                                            <option
                                                                key={gt.value}
                                                                value={gt.value}
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
                                )}
                            </SortableItem>
                        );
                    })}
                </SortableList>
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
                <HelpTooltip
                    text="Da biblioteca, o exercício já vem com vídeo e grupo muscular. Manual é para o que não está nela: você digita o nome e, se quiser, cola um link de vídeo."
                    href={helpHref}
                    label="Diferença entre exercício da biblioteca e manual"
                />
            </div>

            {training.exercises.length > 0 && (
                <NavRowGroup>
                    <NavRow
                        title="Prescrição geral"
                        summary={`Preenche de uma vez os ${training.exercises.length} exercício${training.exercises.length === 1 ? '' : 's'} deste treino`}
                        onClick={onOpenBulkPrescription}
                    />
                </NavRowGroup>
            )}
        </>
    );
}
