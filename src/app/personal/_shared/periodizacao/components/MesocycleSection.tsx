'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    FiEdit3,
    FiCopy,
    FiTrash2,
    FiChevronRight,
    FiLink,
} from 'react-icons/fi';
import type {
    ExerciseRequest,
    MesocycleRequest,
    MesocycleResponse,
} from '@/libs/planningService';
import { formatDate, weekdayLabel } from '../lib/mesocycleTransforms';
import { saveExercisePatch } from '../lib/exercisePatch';
import {
    reorderById,
    saveExerciseOrder,
    saveTrainingOrder,
} from '../lib/reorderPatch';
import { SortableItem, SortableList } from '@/components/system/SortableList';
import { useToast } from '@/components/system/Toast';
import ExerciseThumbnail from '@/components/features/ExerciseThumbnail';
import ExerciseDetailCard from '@/components/features/ExerciseDetailCard';
import type { ExerciseLog } from '@/components/features/types';
import { toExerciseLog } from '@/libs/exerciseLog';
import { formatSeries } from '@/libs/seriesPrescription';
import {
    partitionExerciseGroups,
    comboGroupLabel,
} from '@/libs/trainingTechniques';
import s from '../builder.module.css';

/** Exercício aberto no modal de detalhe. Guarda só os IDs: o ExerciseLog em si
 * é derivado do `meso` a cada render, então uma alteração de prescrição salva
 * pelo próprio modal aparece nele sem precisar reabrir. */
interface SelectedExercise {
    trainingId: string;
    exerciseId: string;
}

/** Exercício em foco + os demais do mesmo treino, necessários para achar o
 * próximo do bloco de bi-set/triset/superset (ver `nextInGroup` no
 * ExerciseDetailCard). */
interface SelectedView {
    exercise: ExerciseLog;
    siblings: ExerciseLog[];
}

function nextInSameGroup(selected: SelectedView | null): ExerciseLog | null {
    if (!selected) return null;
    const { exercise, siblings } = selected;
    const idx = siblings.findIndex((e) => e.id === exercise.id);
    if (idx === -1) return null;
    const next = siblings[idx + 1];
    if (next && exercise.group_id && next.group_id === exercise.group_id) {
        return next;
    }
    return null;
}

interface Props {
    meso: MesocycleResponse;
    onEdit: () => void;
    onDelete: () => void;
    /** Ausente no modo simples — o mesociclo único e oculto não faz sentido duplicar. */
    onDuplicate?: () => void;
    /** Mostra o dia da semana (ou número) no lugar de "Treino {reference}". */
    simpleMode?: boolean;
    /** "weekday" (padrão) ou "number" — só relevante quando simpleMode=true. */
    dayLabelStyle?: 'weekday' | 'number';
    /** Grava esta fase com uma alteração pontual de prescrição feita direto no
     * card do exercício (séries/carga), sem abrir o editor — é o que permite
     * ao personal ajustar o treino enquanto acompanha o aluno.
     *
     * Ausente = a fase segue só de leitura, como antes. Deve devolver o
     * macrociclo salvo para a tela (o chamador já faz isso), e REJEITAR em
     * caso de erro: o card mostra o resultado ao personal. */
    onPersistMeso?: (req: MesocycleRequest) => Promise<unknown>;
    /** Avisa a tela que uma edição foi para a fila offline em vez de ir ao
     * servidor, para que ela aplique o mesmo patch no macrociclo em memória.
     * Sem isso o card mostra "salvo neste dispositivo" e logo em seguida
     * volta a exibir o valor antigo — o `meso` desta tela só muda com a
     * RESPOSTA do servidor, que offline nunca chega. Ausente nas telas de
     * template (que também não têm fila). */
    onPrescriptionQueued?: (
        mesocycleId: string,
        trainingId: string,
        exerciseId: string,
        patch: Partial<ExerciseRequest>,
    ) => void;
    /** ID do aluno e do macrociclo (o path da API chama de "planningId") —
     * só usados para enfileirar a edição no IndexedDB quando não há rede
     * (ver prescriptionQueue.ts). Obrigatórios juntos com onPersistMeso;
     * ausentes nas telas de template, que não têm aluno. */
    studentId?: string;
    planningId?: string;
}

export default function MesocycleSection({
    meso,
    onEdit,
    onDelete,
    onDuplicate,
    simpleMode,
    dayLabelStyle,
    onPersistMeso,
    onPrescriptionQueued,
    studentId,
    planningId,
}: Props) {
    const isNumbered = simpleMode && dayLabelStyle === 'number';
    const [open, setOpen] = useState(false);
    // Um treino aberto por vez. Com todos abertos, uma fase de 4 treinos x 6
    // exercícios enchia a tela de periodização com 24 cards e obrigava a rolar
    // a página inteira para chegar na fase seguinte.
    const [openTraining, setOpenTraining] = useState<string | null>(null);
    const [selected, setSelected] = useState<SelectedExercise | null>(null);

    /** Exercício aberto, sempre derivado do `meso` atual — inclusive depois de
     * uma gravação, que devolve a fase inteira do servidor. */
    const selectedView = useMemo<SelectedView | null>(() => {
        if (!selected) return null;
        const training = meso.trainings.find(
            (t) => t.id === selected.trainingId,
        );
        if (!training) return null;
        const siblings = training.exercises.map(toExerciseLog);
        const exercise = siblings.find((e) => e.id === selected.exerciseId);
        return exercise ? { exercise, siblings } : null;
    }, [meso, selected]);

    const { showError, ToastSlot } = useToast();

    /* ── Ordem (arrastar e soltar) ──
     * A ordem nova aparece na hora e só depois vai ao servidor: o `meso` desta
     * tela vem de fora e só muda com a RESPOSTA da gravação, então sem esse
     * espelho local o item voltava para o lugar antigo durante o salvamento.
     * Se a gravação falha, o espelho cai e a lista volta ao que o servidor
     * tem — com o motivo no toast. */
    const [trainingOrder, setTrainingOrder] = useState<string[] | null>(null);
    const [exerciseOrder, setExerciseOrder] = useState<
        Record<string, string[]>
    >({});

    // Resposta do servidor chegou (ou a fase mudou): o espelho perde a razão
    // de existir.
    useEffect(() => {
        setTrainingOrder(null);
        setExerciseOrder({});
    }, [meso]);

    const orderedTrainings = trainingOrder
        ? reorderById(meso.trainings, trainingOrder)
        : meso.trainings;

    const reorderTrainings = async (ids: string[]) => {
        if (!onPersistMeso) return;
        setTrainingOrder(ids);
        try {
            await saveTrainingOrder({ meso, persist: onPersistMeso }, ids);
        } catch (e) {
            setTrainingOrder(null);
            showError((e as Error).message);
        }
    };

    const reorderExercises = async (trainingId: string, ids: string[]) => {
        if (!onPersistMeso) return;
        setExerciseOrder((prev) => ({ ...prev, [trainingId]: ids }));
        try {
            await saveExerciseOrder(
                { meso, persist: onPersistMeso },
                trainingId,
                ids,
            );
        } catch (e) {
            setExerciseOrder((prev) => {
                const next = { ...prev };
                delete next[trainingId];
                return next;
            });
            showError((e as Error).message);
        }
    };

    /** Grava uma alteração pontual de prescrição no exercício aberto — ver
     * saveExercisePatch (fase inteira, IDs preservados, fila offline). */
    const patchSelectedExercise = async (patch: Partial<ExerciseRequest>) => {
        if (!onPersistMeso || !selected) return;
        await saveExercisePatch(
            {
                meso,
                trainingId: selected.trainingId,
                exerciseId: selected.exerciseId,
                persist: onPersistMeso,
                studentId,
                planningId,
                onQueued: onPrescriptionQueued,
            },
            patch,
        );
    };

    const canPrescribe = !!onPersistMeso;
    /** Sem gravação possível (telas de template) a ordem também não muda. */
    const canReorder = !!onPersistMeso;

    return (
        <div className={s.mesoSection}>
            {ToastSlot}
            <div
                className={open ? s.mesoHeader : s.mesoHeaderCollapsed}
                onClick={() => setOpen((v) => !v)}
            >
                <div>
                    <p className={s.mesoTitle}>
                        {simpleMode ? meso.name : `${meso.order}. ${meso.name}`}
                    </p>
                    {simpleMode ? (
                        <p className={s.mesoMeta}>
                            {meso.trainings.length} treino
                            {meso.trainings.length !== 1 ? 's' : ''} configurado
                            {meso.trainings.length !== 1 ? 's' : ''}
                        </p>
                    ) : (
                        <p className={s.mesoMeta}>
                            {meso.phase} · {meso.duration_weeks} semana(s){' '}
                            <span
                                style={{
                                    color: 'var(--text-muted)',
                                    fontSize: '0.75em',
                                }}
                            >
                                ({meso.duration_weeks} microciclo
                                {meso.duration_weeks !== 1 ? 's' : ''})
                            </span>{' '}
                            · {meso.methodology}
                            {meso.start_date &&
                                ` · ${formatDate(meso.start_date)} → ${formatDate(meso.end_date)}`}
                        </p>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                        className={s.btnSmall}
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit();
                        }}
                    >
                        <FiEdit3 /> Editar
                    </button>
                    {onDuplicate && (
                        <button
                            className={s.btnSmall}
                            onClick={(e) => {
                                e.stopPropagation();
                                onDuplicate();
                            }}
                        >
                            <FiCopy /> Duplicar
                        </button>
                    )}
                    <button
                        className={s.btnSmall}
                        style={{
                            color: 'var(--coral, #e74c3c)',
                            borderColor: 'var(--coral, #e74c3c)',
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                    >
                        <FiTrash2 /> Excluir
                    </button>
                    <span className={open ? s.mesoToggleOpen : s.mesoToggle}>
                        <FiChevronRight />
                    </span>
                </div>
            </div>

            {open && (
                <div className={s.mesoBody}>
                    {meso.trainings.length === 0 ? (
                        <p
                            style={{
                                color: 'var(--text-muted)',
                                fontSize: '0.85rem',
                            }}
                        >
                            Nenhum treino cadastrado. Clique em
                            &quot;Editar&quot; para adicionar.
                        </p>
                    ) : (
                        <SortableList
                            ids={orderedTrainings.map((t) => t.id)}
                            onReorder={reorderTrainings}
                        >
                            {orderedTrainings.map((t, index) => {
                                const trainingLabel = isNumbered
                                    ? `Treino ${index + 1}`
                                    : simpleMode
                                      ? (weekdayLabel(t.weekday) ??
                                        'Sem dia definido')
                                      : `Treino ${t.reference}`;
                                return (
                                    <SortableItem
                                        key={t.id}
                                        id={t.id}
                                        label={trainingLabel}
                                        disabled={
                                            !canReorder ||
                                            orderedTrainings.length < 2
                                        }
                                    >
                                        <div className={s.trainingBlock}>
                                            <button
                                                type="button"
                                                className={s.trainingHeaderBtn}
                                                aria-expanded={
                                                    openTraining === t.id
                                                }
                                                onClick={() =>
                                                    setOpenTraining((prev) =>
                                                        prev === t.id
                                                            ? null
                                                            : t.id,
                                                    )
                                                }
                                            >
                                                <p className={s.trainingLabel}>
                                                    {trainingLabel}
                                                </p>
                                                <span
                                                    style={{
                                                        fontSize: '0.8rem',
                                                        color: 'var(--text-muted)',
                                                    }}
                                                >
                                                    {t.exercises.length}{' '}
                                                    exercício(s)
                                                </span>
                                                <span
                                                    aria-hidden
                                                    className={
                                                        openTraining === t.id
                                                            ? s.mesoToggleOpen
                                                            : s.mesoToggle
                                                    }
                                                >
                                                    <FiChevronRight />
                                                </span>
                                            </button>
                                            {openTraining === t.id &&
                                                t.exercises.length > 0 &&
                                                (() => {
                                                    const pending =
                                                        exerciseOrder[t.id];
                                                    const exerciseLogs = pending
                                                        ? reorderById(
                                                              t.exercises.map(
                                                                  toExerciseLog,
                                                              ),
                                                              pending,
                                                          )
                                                        : t.exercises.map(
                                                              toExerciseLog,
                                                          );
                                                    const groups =
                                                        partitionExerciseGroups(
                                                            exerciseLogs,
                                                        );
                                                    /* Arrasta BLOCO: um bi-set
                                                       anda inteiro, como no
                                                       editor (TrainingCard). */
                                                    const blockId = (
                                                        group: (typeof groups)[number],
                                                    ) =>
                                                        group[0].group_id ??
                                                        group[0].id;
                                                    return (
                                                        <SortableList
                                                            ids={groups.map(
                                                                blockId,
                                                            )}
                                                            onReorder={(
                                                                ids,
                                                            ) => {
                                                                const byId =
                                                                    new Map(
                                                                        groups.map(
                                                                            (
                                                                                g,
                                                                            ) =>
                                                                                [
                                                                                    blockId(
                                                                                        g,
                                                                                    ),
                                                                                    g,
                                                                                ] as const,
                                                                        ),
                                                                    );
                                                                void reorderExercises(
                                                                    t.id,
                                                                    ids.flatMap(
                                                                        (id) =>
                                                                            (
                                                                                byId.get(
                                                                                    id,
                                                                                ) ??
                                                                                []
                                                                            ).map(
                                                                                (
                                                                                    e,
                                                                                ) =>
                                                                                    e.id,
                                                                            ),
                                                                    ),
                                                                );
                                                            }}
                                                            className={
                                                                s.exerciseList
                                                            }
                                                        >
                                                            {groups.map(
                                                                (group) => {
                                                                    const isCombo =
                                                                        group.length >
                                                                        1;
                                                                    const items =
                                                                        group.map(
                                                                            (
                                                                                ex,
                                                                            ) => {
                                                                                const seriesText =
                                                                                    formatSeries(
                                                                                        ex,
                                                                                    );
                                                                                return (
                                                                                    <button
                                                                                        key={
                                                                                            ex.id
                                                                                        }
                                                                                        type="button"
                                                                                        className={
                                                                                            s.exerciseCard
                                                                                        }
                                                                                        onClick={() =>
                                                                                            setSelected(
                                                                                                {
                                                                                                    trainingId:
                                                                                                        t.id,
                                                                                                    exerciseId:
                                                                                                        ex.id,
                                                                                                },
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        <ExerciseThumbnail
                                                                                            name={
                                                                                                ex.name
                                                                                            }
                                                                                            videoThumb={
                                                                                                ex.video_thumb
                                                                                            }
                                                                                            videoUrl={
                                                                                                ex.video_url
                                                                                            }
                                                                                            captureFrame={
                                                                                                false
                                                                                            }
                                                                                            lazyCapture
                                                                                            className={
                                                                                                s.exerciseThumbnail
                                                                                            }
                                                                                        />
                                                                                        <div
                                                                                            className={
                                                                                                s.exerciseInfo
                                                                                            }
                                                                                        >
                                                                                            <p
                                                                                                className={
                                                                                                    s.exerciseName
                                                                                                }
                                                                                            >
                                                                                                {
                                                                                                    ex.name
                                                                                                }
                                                                                            </p>
                                                                                            <p
                                                                                                className={
                                                                                                    s.exerciseMeta
                                                                                                }
                                                                                            >
                                                                                                {
                                                                                                    seriesText
                                                                                                }
                                                                                                {ex.variations &&
                                                                                                    ` · ${ex.variations}`}
                                                                                            </p>
                                                                                            {ex.comments && (
                                                                                                <p
                                                                                                    className={
                                                                                                        s.exerciseComments
                                                                                                    }
                                                                                                >
                                                                                                    {
                                                                                                        ex.comments
                                                                                                    }
                                                                                                </p>
                                                                                            )}
                                                                                        </div>
                                                                                        <FiChevronRight
                                                                                            className={
                                                                                                s.exerciseCardChevron
                                                                                            }
                                                                                            aria-hidden
                                                                                        />
                                                                                    </button>
                                                                                );
                                                                            },
                                                                        );

                                                                    return (
                                                                        <SortableItem
                                                                            key={blockId(
                                                                                group,
                                                                            )}
                                                                            id={blockId(
                                                                                group,
                                                                            )}
                                                                            label={
                                                                                isCombo
                                                                                    ? comboGroupLabel(
                                                                                          group.length,
                                                                                          group[0]
                                                                                              .group_technique,
                                                                                      )
                                                                                    : group[0]
                                                                                          .name
                                                                            }
                                                                            disabled={
                                                                                !canReorder ||
                                                                                groups.length <
                                                                                    2
                                                                            }
                                                                            className={
                                                                                isCombo
                                                                                    ? s.exerciseGroupBlock
                                                                                    : undefined
                                                                            }
                                                                        >
                                                                            {!isCombo ? (
                                                                                items
                                                                            ) : (
                                                                                <>
                                                                                    <div
                                                                                        className={
                                                                                            s.exerciseGroupBadge
                                                                                        }
                                                                                    >
                                                                                        <FiLink />{' '}
                                                                                        {comboGroupLabel(
                                                                                            group.length,
                                                                                            group[0]
                                                                                                .group_technique,
                                                                                        )}{' '}
                                                                                        —
                                                                                        sem
                                                                                        descanso
                                                                                        entre
                                                                                        os
                                                                                        exercícios
                                                                                    </div>
                                                                                    <div
                                                                                        className={
                                                                                            s.exerciseGroupItems
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            items
                                                                                        }
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                        </SortableItem>
                                                                    );
                                                                },
                                                            )}
                                                        </SortableList>
                                                    );
                                                })()}
                                        </div>
                                    </SortableItem>
                                );
                            })}
                        </SortableList>
                    )}
                </div>
            )}
            {selected && selectedView && (
                <ExerciseDetailCard
                    exercise={selectedView.exercise}
                    onClose={() => setSelected(null)}
                    nextInGroup={nextInSameGroup(selectedView)}
                    onSelectExercise={(exercise) =>
                        setSelected({
                            trainingId: selected.trainingId,
                            exerciseId: exercise.id,
                        })
                    }
                    // readOnly: anotações e o registro de carga que aparecem
                    // aqui são "/me/..." — do usuário logado, ou seja, do
                    // PERSONAL. O que ele edita por este card é a prescrição
                    // do aluno, pelos dois callbacks abaixo.
                    readOnly
                    onPrescribeSeries={
                        canPrescribe
                            ? (patch) => patchSelectedExercise(patch)
                            : undefined
                    }
                    onPrescribeWeight={
                        canPrescribe
                            ? (weightKg) =>
                                  patchSelectedExercise({
                                      load_kg:
                                          weightKg > 0 ? weightKg : undefined,
                                  })
                            : undefined
                    }
                />
            )}
        </div>
    );
}
