'use client';

import { useMemo, useState } from 'react';
import { FiChevronRight } from 'react-icons/fi';
import Modal from '@/components/system/Modal';
import ExerciseDetailCard from '@/components/features/ExerciseDetailCard';
import ExerciseThumbnail from '@/components/features/ExerciseThumbnail';
import type { ExerciseLog } from '@/components/features/types';
import type {
    MacrocycleResponse,
    MesocycleResponse,
} from '@/libs/planningService';
import { toExerciseLog } from '@/libs/exerciseLog';
import { currentCycle } from '@/libs/currentWeek';
import { labelPartsOf, trainingDisplayLabel } from '@/libs/trainingLabel';
import {
    comboGroupLabel,
    partitionExerciseGroups,
} from '@/libs/trainingTechniques';
import { formatSeriesCompact } from '@/libs/seriesPrescription';
import s from './StudentViewPreview.module.css';

/** A fase cujos treinos o aluno vê hoje: a única na rotina; na periodização,
 * a da semana atual pelo calendário (a mesma régua da tela do aluno), senão a
 * primeira. */
function visibleMeso(macro: MacrocycleResponse): MesocycleResponse | undefined {
    const mesos = [...(macro.mesocycles ?? [])].sort(
        (a, b) => a.order - b.order,
    );
    if (macro.planning_mode === 'simple') return mesos[0];
    return currentCycle(macro)?.meso ?? mesos[0];
}

/** Linha de resumo da prescrição, como o personal lê: "3 × 10 · 60s · 20 kg". */
function prescriptionLine(ex: ExerciseLog): string {
    const parts = [formatSeriesCompact(ex)];
    if (ex.restTime) parts.push(`descanso ${ex.restTime}s`);
    if (ex.plannedWeight) parts.push(`${ex.plannedWeight} kg`);
    return parts.join(' · ');
}

/**
 * "Visão do aluno": o treino montado do jeito que o aluno vê no app — o nome
 * de cada treino com as partes escolhidas, os blocos de bi-set, e o MESMO
 * card de exercício (ExerciseDetailCard) ao tocar. Só leitura: editar é no
 * editor da rotina.
 */
export default function StudentViewPreview({
    macro,
    onClose,
}: {
    macro: MacrocycleResponse;
    onClose: () => void;
}) {
    const meso = useMemo(() => visibleMeso(macro), [macro]);
    const trainings = useMemo(() => meso?.trainings ?? [], [meso]);
    const labelParts = labelPartsOf(macro);
    const [trainingIdx, setTrainingIdx] = useState(0);
    const training = trainings[Math.min(trainingIdx, trainings.length - 1)];
    const exercises = useMemo(
        () => (training?.exercises ?? []).map(toExerciseLog),
        [training],
    );
    const groups = useMemo(
        () => partitionExerciseGroups(exercises),
        [exercises],
    );
    const [open, setOpen] = useState<ExerciseLog | null>(null);

    const nextInGroup = (ex: ExerciseLog): ExerciseLog | null => {
        if (!ex.group_id) return null;
        const idx = exercises.findIndex((e) => e.id === ex.id);
        const next = exercises[idx + 1];
        return next && next.group_id === ex.group_id ? next : null;
    };

    return (
        <>
            <Modal open onClose={onClose} title="Visão do aluno">
                <p className={s.hint}>
                    É assim que o aluno vê este treino no app. Toque num
                    exercício para abrir o card que ele abre.
                </p>

                {macro.notes && (
                    <div className={s.notes}>
                        <p className={s.notesTitle}>Observações do personal</p>
                        <p className={s.notesText}>{macro.notes}</p>
                    </div>
                )}

                {trainings.length === 0 ? (
                    <p className={s.empty}>
                        Ainda não há treinos montados. O aluno verá este
                        treino vazio até você adicionar o primeiro.
                    </p>
                ) : (
                    <>
                        <div
                            className={s.chips}
                            role="tablist"
                            aria-label="Treinos"
                        >
                            {trainings.map((t, i) => (
                                <button
                                    key={t.id ?? i}
                                    role="tab"
                                    aria-selected={i === trainingIdx}
                                    className={
                                        i === trainingIdx ? s.chipOn : s.chip
                                    }
                                    onClick={() => setTrainingIdx(i)}
                                >
                                    {trainingDisplayLabel(t, i, labelParts)}
                                </button>
                            ))}
                        </div>

                        {exercises.length === 0 ? (
                            <p className={s.empty}>
                                Este treino ainda não tem exercícios.
                            </p>
                        ) : (
                            <ul className={s.list}>
                                {groups.map((group) => {
                                    const rows = group.map((ex) => (
                                        <li key={ex.id}>
                                            <button
                                                type="button"
                                                className={s.row}
                                                onClick={() => setOpen(ex)}
                                            >
                                                <ExerciseThumbnail
                                                    name={ex.name}
                                                    videoThumb={ex.video_thumb}
                                                    videoUrl={ex.video_url}
                                                    width={52}
                                                    height={52}
                                                    lazyCapture
                                                    captureFrame={false}
                                                />
                                                <span className={s.rowText}>
                                                    <span className={s.rowName}>
                                                        {ex.name}
                                                    </span>
                                                    <span className={s.rowMeta}>
                                                        {prescriptionLine(ex)}
                                                    </span>
                                                    {ex.comments && (
                                                        <span
                                                            className={
                                                                s.rowComment
                                                            }
                                                        >
                                                            {ex.comments}
                                                        </span>
                                                    )}
                                                </span>
                                                <FiChevronRight
                                                    className={s.rowIcon}
                                                    aria-hidden
                                                />
                                            </button>
                                        </li>
                                    ));
                                    if (group.length === 1) return rows;
                                    return (
                                        <li
                                            key={`g-${group[0].id}`}
                                            className={s.combo}
                                        >
                                            <span className={s.comboLabel}>
                                                {comboGroupLabel(
                                                    group.length,
                                                    group[0].group_technique,
                                                )}
                                            </span>
                                            <ul className={s.comboList}>
                                                {rows}
                                            </ul>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </>
                )}
            </Modal>

            {/* O mesmo card que o aluno abre. readOnly: anotações e registro
                de carga são do próprio aluno (rotas /me/...). */}
            {open && (
                <ExerciseDetailCard
                    exercise={open}
                    onClose={() => setOpen(null)}
                    nextInGroup={nextInGroup(open)}
                    onSelectExercise={setOpen}
                    readOnly
                />
            )}
        </>
    );
}
