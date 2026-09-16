'use client';

import { useMemo, useState } from 'react';
import axios from 'axios';
import { FiEdit3, FiCopy, FiTrash2, FiChevronRight, FiLink } from 'react-icons/fi';
import type {
    ExerciseRequest,
    MesocycleRequest,
    MesocycleResponse,
} from '@/libs/planningService';
import { formatDate, mesoToRequest, weekdayLabel } from '../lib/mesocycleTransforms';
import ExerciseThumbnail from '@/components/features/ExerciseThumbnail';
import ExerciseDetailCard from '@/components/features/ExerciseDetailCard';
import type { ExerciseLog } from '@/components/features/types';
import { toExerciseLog } from '@/libs/exerciseLog';
import { formatSeries } from '@/libs/seriesPrescription';
import {
    enqueuePrescriptionPatch,
    PrescriptionQueuedOfflineError,
} from '@/libs/offline/prescriptionQueue';
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

/** Mensagem de erro de uma gravação de prescrição. Sem rede é um caso
 * diferente de erro do servidor, e aqui a distinção importa: o personal está
 * na academia, e precisa saber se a alteração chegou ao aluno ou não. */
function describeSaveError(err: unknown): string {
    if (axios.isAxiosError(err) && !err.response) {
        return 'Sem conexão — a alteração NÃO foi salva. Tente de novo quando a internet voltar.';
    }
    const message = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)?.message
        : undefined;
    return message || 'Não foi possível salvar a alteração. Tente novamente.';
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

    /**
     * Enfileira a edição no IndexedDB para sincronizar quando a rede voltar
     * (ver prescriptionQueue.ts) e sinaliza isso ao card via
     * PrescriptionQueuedOfflineError — NÃO é um erro de verdade, é o mesmo
     * padrão do resto do app (SyncPendingBadge) para "salvo neste
     * dispositivo, ainda não chegou ao servidor". Sem studentId/planningId
     * (telas de template) não há como enfileirar — vira erro normal.
     */
    const queueOffline = async (
        exerciseId: string,
        exerciseName: string,
        patch: Partial<ExerciseRequest>,
    ): Promise<never> => {
        if (!studentId || !planningId) {
            throw new Error(
                'Sem conexão — a alteração NÃO foi salva. Tente de novo quando a internet voltar.',
            );
        }
        await enqueuePrescriptionPatch({
            studentId,
            planningId,
            mesocycleId: meso.id,
            trainingId: selected!.trainingId,
            exerciseId,
            exerciseName,
            patch,
        });
        throw new PrescriptionQueuedOfflineError();
    };

    /**
     * Grava uma alteração pontual de prescrição no exercício aberto.
     *
     * Reenvia a FASE inteira (não só o exercício) porque é esse o contrato do
     * endpoint de salvamento por card do editor — `UpsertMesocycleHandler`
     * substitui o mesociclo pelo payload. Daí o cuidado de partir de
     * `mesoToRequest(meso)`: ele preserva os IDs de treino, exercício e
     * microciclo, e perder qualquer um deles órfãaria o histórico de séries e
     * as anotações que o aluno já tem.
     *
     * Sem rede — detectada de antemão ou pela falha da chamada — a edição
     * não é descartada: vai para a fila offline (ver queueOffline acima) e
     * sincroniza sozinha quando a conexão voltar.
     */
    const patchSelectedExercise = async (patch: Partial<ExerciseRequest>) => {
        if (!onPersistMeso || !selected) return;
        const exerciseName =
            meso.trainings
                .find((t) => t.id === selected.trainingId)
                ?.exercises.find((e) => e.id === selected.exerciseId)?.name ??
            'Exercício';

        // Sem rede detectada ANTES de tentar: evita esperar o timeout de uma
        // requisição que já se sabe que vai falhar.
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            await queueOffline(selected.exerciseId, exerciseName, patch);
        }

        const req = mesoToRequest(meso);
        const training = req.trainings.find((t) => t.id === selected.trainingId);
        const target = training?.exercises.find(
            (e) => e.id === selected.exerciseId,
        );
        if (!target) {
            throw new Error(
                'Este exercício não está mais nesta fase. Recarregue a página.',
            );
        }
        Object.assign(target, patch);
        try {
            await onPersistMeso(req);
        } catch (err) {
            if (axios.isAxiosError(err) && !err.response) {
                // Sem resposta do servidor = sem rede, mesmo que
                // navigator.onLine ainda não tivesse percebido.
                await queueOffline(selected.exerciseId, exerciseName, patch);
            }
            throw new Error(describeSaveError(err));
        }
    };

    const canPrescribe = !!onPersistMeso;

    return (
        <div className={s.mesoSection}>
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
                            {meso.trainings.length !== 1 ? 's' : ''}{' '}
                            configurado{meso.trainings.length !== 1 ? 's' : ''}
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
                            Nenhum treino cadastrado. Clique em &quot;Editar&quot; para
                            adicionar.
                        </p>
                    ) : (
                        meso.trainings.map((t, index) => (
                            <div key={t.id} className={s.trainingBlock}>
                                <button
                                    type="button"
                                    className={s.trainingHeaderBtn}
                                    aria-expanded={openTraining === t.id}
                                    onClick={() =>
                                        setOpenTraining((prev) =>
                                            prev === t.id ? null : t.id,
                                        )
                                    }
                                >
                                    <p className={s.trainingLabel}>
                                        {isNumbered
                                            ? `Treino ${index + 1}`
                                            : simpleMode
                                              ? (weekdayLabel(t.weekday) ??
                                                'Sem dia definido')
                                              : `Treino ${t.reference}`}
                                    </p>
                                    <span
                                        style={{
                                            fontSize: '0.8rem',
                                            color: 'var(--text-muted)',
                                        }}
                                    >
                                        {t.exercises.length} exercício(s)
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
                                        const exerciseLogs =
                                            t.exercises.map(toExerciseLog);
                                        const groups =
                                            partitionExerciseGroups(
                                                exerciseLogs,
                                            );
                                        return (
                                            <ul className={s.exerciseList}>
                                                {groups.map((group) => {
                                                    const isCombo =
                                                        group.length > 1;
                                                    const items = group.map(
                                                        (ex) => {
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

                                                    if (!isCombo) {
                                                        return (
                                                            <li key={group[0].id}>
                                                                {items}
                                                            </li>
                                                        );
                                                    }
                                                    return (
                                                        <li
                                                            key={group[0].id}
                                                            className={
                                                                s.exerciseGroupBlock
                                                            }
                                                        >
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
                                                                — sem
                                                                descanso entre
                                                                os exercícios
                                                            </div>
                                                            <div
                                                                className={
                                                                    s.exerciseGroupItems
                                                                }
                                                            >
                                                                {items}
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        );
                                    })()}
                            </div>
                        ))
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
                                      load_kg: weightKg > 0 ? weightKg : undefined,
                                  })
                            : undefined
                    }
                />
            )}
        </div>
    );
}
