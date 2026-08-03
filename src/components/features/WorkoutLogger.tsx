'use client';

import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { FiX, FiCheck, FiAlertCircle, FiLoader, FiLink } from 'react-icons/fi';
import {
    TrainingResponse,
    MesocycleResponse,
    MicrocycleResponse,
} from '@/libs/planningService';
import {
    createNewWorkoutLog,
    CompleteWorkoutLogRequest,
    completeNewWorkoutLog,
    skipNewWorkoutLog,
    NewWorkoutLogResponse,
} from '@/libs/workoutLogService';
import { getPendingWorkoutLogId } from '@/libs/offline/downloadManager';
import { enqueueCompletion, enqueueSkip } from '@/libs/offline/syncQueue';
import Modal from '@/components/system/Modal';
import {
    partitionExerciseGroups,
    comboGroupLabel,
} from '@/libs/trainingTechniques';
import s from './WorkoutLogger.module.css';

const OFFLINE_NO_PRECREATED_LOG_MESSAGE =
    'Sem conexão e este treino não foi baixado para uso offline. Baixe o plano em "Meus Treinos" enquanto estiver online para poder completá-lo sem internet.';

/** Recomendação do painel de autorregulação (ver microcycleAutoregulation.ts)
 * repassada para pré-preencher o log em vez de ficar só como texto acima. */
interface AutoregulationHint {
    targetRPE: number;
    intraSessionLoadAdjustPct: number;
    message: string;
}

interface WorkoutLoggerProps {
    studentId: string;
    planningId: string;
    mesocycle: MesocycleResponse;
    microcycle: MicrocycleResponse;
    training: TrainingResponse;
    onClose: () => void;
    onComplete: (log: NewWorkoutLogResponse) => void;
    /** Chamado quando a conclusão/skip não pôde ir ao servidor (offline) mas
     * foi enfileirada localmente para sincronizar depois. */
    onQueued: () => void;
    autoregulation?: AutoregulationHint;
}

interface ExerciseLog {
    exerciseId: string;
    name: string;
    /** Bissérie/trissérie/superssérie a que este exercício pertence no
     * plano (ExerciseResponse.group_id) — repassado ao registrar o treino
     * para o histórico poder exibir as séries executadas agrupadas. */
    groupId?: string;
    /** Variante do bloco (ver GROUP_TECHNIQUE_CATALOG), só para exibição. */
    groupTechnique?: string;
    plannedSeries: number[];
    series: Array<{
        seriesNum: number;
        reps: number;
        loadKg: number;
        rpe: number;
        notes: string;
    }>;
}

const WorkoutLogger: React.FC<WorkoutLoggerProps> = ({
    studentId,
    planningId,
    mesocycle,
    microcycle,
    training,
    onClose,
    onComplete,
    onQueued,
    autoregulation,
}) => {
    const [logs, setLogs] = useState<ExerciseLog[]>(
        training.exercises.map((ex) => {
            // Pré-preenche RPE alvo e ajuste de carga sugeridos pelo painel
            // de autorregulação em vez de deixá-los só como texto acima —
            // sem isso a recomendação nunca chegava a influenciar o que
            // efetivamente era registrado.
            const suggestedRPE = autoregulation
                ? Math.round(autoregulation.targetRPE)
                : 7;
            const loadAdjust = autoregulation
                ? 1 + autoregulation.intraSessionLoadAdjustPct / 100
                : 1;
            return {
                exerciseId: ex.id,
                name: ex.name,
                groupId: ex.group_id,
                groupTechnique: ex.group_technique,
                plannedSeries: ex.series,
                series: ex.series.map((plannedReps, i) => ({
                    seriesNum: i + 1,
                    // Pré-preenche com a rep prescrita em vez de 0 — o
                    // backend rejeita a submissão inteira (400) quando
                    // qualquer série chega com reps=0 (binding:"required"
                    // em campo numérico), então deixar em branco aqui fazia
                    // o treino inteiro falhar ao salvar se o aluno esquecesse
                    // de preencher reps em uma única série de aquecimento.
                    reps: plannedReps || 0,
                    loadKg: ex.load_kg
                        ? Math.round(ex.load_kg * loadAdjust * 2) / 2
                        : 0,
                    rpe: suggestedRPE,
                    notes: '',
                })),
            };
        }),
    );

    const [duration, setDuration] = useState<number | null>(null);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateSeriesLog = useCallback(
        (
            exIdx: number,
            seriesIdx: number,
            field: string,
            value: string | number | null,
        ) => {
            setLogs((prev) => {
                const newLogs = [...prev];
                newLogs[exIdx].series[seriesIdx] = {
                    ...newLogs[exIdx].series[seriesIdx],
                    [field]: value,
                };
                return newLogs;
            });
        },
        [],
    );

    const handleComplete = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const body: CompleteWorkoutLogRequest = {
                duration_minutes: duration ?? undefined,
                exercises: logs.flatMap((ex) =>
                    ex.series.map((s) => ({
                        exercise_id: ex.exerciseId,
                        series: s.seriesNum,
                        reps: s.reps,
                        load_kg: s.loadKg,
                        rpe: s.rpe,
                        notes: s.notes,
                        group_id: ex.groupId,
                    })),
                ),
                notes,
            };

            // Se o plano foi baixado para offline, já existe um log "pending"
            // pré-criado online para este treino — só falta o PATCH de
            // conclusão, que funciona (ou enfileira) tanto online quanto offline.
            const preCreatedId = await getPendingWorkoutLogId(
                microcycle.id,
                training.reference,
            );

            if (preCreatedId) {
                try {
                    const completed = await completeNewWorkoutLog(
                        studentId,
                        planningId,
                        mesocycle.id,
                        microcycle.id,
                        preCreatedId,
                        body,
                    );
                    onComplete(completed);
                } catch (err) {
                    if (axios.isAxiosError(err) && !err.response) {
                        await enqueueCompletion({
                            studentId,
                            planningId,
                            mesocycleId: mesocycle.id,
                            microcycleId: microcycle.id,
                            workoutLogId: preCreatedId,
                            completeBody: body,
                        });
                        onQueued();
                        return;
                    }
                    throw err;
                }
                return;
            }

            // Sem log pré-criado (aluno não baixou o plano antes de perder
            // conexão) — só dá pra completar com o fluxo online normal.
            const newLog = await createNewWorkoutLog(
                studentId,
                planningId,
                mesocycle.id,
                microcycle.id,
                {
                    planned_date: new Date().toISOString().split('T')[0],
                    training_ref: training.reference,
                },
            );
            const completed = await completeNewWorkoutLog(
                studentId,
                planningId,
                mesocycle.id,
                microcycle.id,
                newLog.id,
                body,
            );
            onComplete(completed);
        } catch (err) {
            if (axios.isAxiosError(err) && !err.response) {
                setError(OFFLINE_NO_PRECREATED_LOG_MESSAGE);
            } else {
                setError('Erro ao salvar workout. Tente novamente.');
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [
        studentId,
        planningId,
        mesocycle,
        microcycle,
        training,
        duration,
        notes,
        logs,
        onComplete,
        onQueued,
    ]);

    const handleSkip = useCallback(async () => {
        const reason = notes || 'Sem motivo informado';
        try {
            setLoading(true);
            setError(null);

            const preCreatedId = await getPendingWorkoutLogId(
                microcycle.id,
                training.reference,
            );

            if (preCreatedId) {
                try {
                    const skipped = await skipNewWorkoutLog(
                        studentId,
                        planningId,
                        mesocycle.id,
                        microcycle.id,
                        preCreatedId,
                        reason,
                    );
                    onComplete(skipped);
                } catch (err) {
                    if (axios.isAxiosError(err) && !err.response) {
                        await enqueueSkip({
                            studentId,
                            planningId,
                            mesocycleId: mesocycle.id,
                            microcycleId: microcycle.id,
                            workoutLogId: preCreatedId,
                            skipReason: reason,
                        });
                        onQueued();
                        return;
                    }
                    throw err;
                }
                return;
            }

            const newLog = await createNewWorkoutLog(
                studentId,
                planningId,
                mesocycle.id,
                microcycle.id,
                {
                    planned_date: new Date().toISOString().split('T')[0],
                    training_ref: training.reference,
                },
            );
            const skipped = await skipNewWorkoutLog(
                studentId,
                planningId,
                mesocycle.id,
                microcycle.id,
                newLog.id,
                reason,
            );
            onComplete(skipped);
        } catch (err) {
            if (axios.isAxiosError(err) && !err.response) {
                setError(OFFLINE_NO_PRECREATED_LOG_MESSAGE);
            } else {
                setError('Erro ao cancelar. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    }, [
        studentId,
        planningId,
        mesocycle,
        microcycle,
        training,
        notes,
        onComplete,
        onQueued,
    ]);

    // Blocos de bi-set/triset/superset: exercícios consecutivos com o mesmo
    // groupId (ver libs/trainingTechniques.ts). Bloco de tamanho 1 = avulso.
    const blocks = partitionExerciseGroups(
        logs.map((l, idx) => ({ group_id: l.groupId, idx })),
    );

    const renderSeriesRow = (
        exIdx: number,
        seriesIdx: number,
        sr: ExerciseLog['series'][number],
        label: React.ReactNode,
    ) => (
        <div key={`${exIdx}-${seriesIdx}`} className={s.seriesRow}>
            <label className={s.label}>{label}</label>
            <div className={s.inputs}>
                <input
                    type="number"
                    placeholder="Reps"
                    value={sr.reps || ''}
                    onChange={(e) =>
                        updateSeriesLog(
                            exIdx,
                            seriesIdx,
                            'reps',
                            parseInt(e.target.value) || 0,
                        )
                    }
                    disabled={loading}
                />
                <input
                    type="number"
                    placeholder="Kg"
                    step="0.5"
                    value={sr.loadKg || ''}
                    onChange={(e) =>
                        updateSeriesLog(
                            exIdx,
                            seriesIdx,
                            'loadKg',
                            parseFloat(e.target.value) || 0,
                        )
                    }
                    disabled={loading}
                />
                <select
                    value={sr.rpe}
                    onChange={(e) =>
                        updateSeriesLog(
                            exIdx,
                            seriesIdx,
                            'rpe',
                            parseInt(e.target.value),
                        )
                    }
                    disabled={loading}
                >
                    {/* RPE 1-10 */}
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => (
                        <option key={r} value={r}>
                            RPE {r}
                        </option>
                    ))}
                </select>
                <input
                    type="text"
                    placeholder="Notas"
                    value={sr.notes}
                    onChange={(e) =>
                        updateSeriesLog(
                            exIdx,
                            seriesIdx,
                            'notes',
                            e.target.value,
                        )
                    }
                    disabled={loading}
                />
            </div>
        </div>
    );

    const footer = (
        <div className={s.actions}>
            <button
                className={s.btnSkip}
                onClick={handleSkip}
                disabled={loading}
            >
                {loading ? <FiLoader className={s.spin} /> : <FiX />}{' '}
                Pular Treino
            </button>
            <button
                className={s.btnComplete}
                onClick={handleComplete}
                disabled={loading}
            >
                {loading ? (
                    <FiLoader className={s.spin} />
                ) : (
                    <FiCheck />
                )}{' '}
                Completar Treino
            </button>
        </div>
    );

    return (
        <Modal
            open
            onClose={onClose}
            title={
                <>
                    Registrar Treino{' '}
                    <span className={s.ref}>{training.reference}</span>
                </>
            }
            footer={footer}
        >
            <div className={s.content}>
                {error && (
                        <div className={s.errorBanner}>
                            <FiAlertCircle /> {error}
                        </div>
                    )}

                    {autoregulation && (
                        <p
                            className="small text-muted"
                            style={{ marginTop: -4, marginBottom: 12 }}
                        >
                            Sugestão de hoje: {autoregulation.message} (RPE e
                            carga já pré-preenchidos abaixo — ajuste livremente).
                        </p>
                    )}

                    {blocks.map((block) => {
                        if (block.length === 1) {
                            const exIdx = block[0].idx;
                            const ex = logs[exIdx];
                            return (
                                <div
                                    key={ex.exerciseId}
                                    className={s.exerciseBlock}
                                >
                                    <h3>{ex.name}</h3>
                                    <div className={s.seriesGrid}>
                                        {ex.series.map((sr, seriesIdx) =>
                                            renderSeriesRow(
                                                exIdx,
                                                seriesIdx,
                                                sr,
                                                `Série ${sr.seriesNum}`,
                                            ),
                                        )}
                                    </div>
                                </div>
                            );
                        }

                        // Bloco combinado: séries intercaladas por rodada
                        // (Série 1 de A, Série 1 de B, Série 2 de A, ...) —
                        // é assim que bi-set/triset/superset são executados
                        // de fato, sem descanso entre os exercícios do bloco.
                        const members = block.map((b) => logs[b.idx]);
                        const maxRounds = Math.max(
                            ...members.map((m) => m.series.length),
                        );
                        const rows: React.ReactNode[] = [];
                        for (let round = 0; round < maxRounds; round++) {
                            block.forEach((b) => {
                                const ex = logs[b.idx];
                                const sr = ex.series[round];
                                if (!sr) return;
                                rows.push(
                                    renderSeriesRow(
                                        b.idx,
                                        round,
                                        sr,
                                        <>
                                            <span
                                                className={
                                                    s.comboSeriesLabel
                                                }
                                            >
                                                {ex.name}
                                            </span>{' '}
                                            · Série {sr.seriesNum}
                                        </>,
                                    ),
                                );
                            });
                        }
                        return (
                            <div
                                key={members[0].exerciseId}
                                className={`${s.exerciseBlock} ${s.comboBlock}`}
                            >
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <FiLink />{' '}
                                    {comboGroupLabel(
                                        block.length,
                                        members[0].groupTechnique,
                                    )}
                                </h3>
                                <p className={s.comboMembers}>
                                    {members
                                        .map((m) => m.name)
                                        .join(' + ')}{' '}
                                    — sem descanso entre as séries abaixo
                                </p>
                                <div className={s.seriesGrid}>{rows}</div>
                            </div>
                        );
                    })}

                    <div className={s.footerSection}>
                        <label>
                            Duração (minutos):
                            <input
                                type="number"
                                value={duration ?? ''}
                                onChange={(e) =>
                                    setDuration(
                                        parseInt(e.target.value) || null,
                                    )
                                }
                                disabled={loading}
                            />
                        </label>
                        <label>
                            Notas Gerais:
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Cansaço, ânimo, observações..."
                                disabled={loading}
                            />
                        </label>
                    </div>
                </div>
        </Modal>
    );
};

export default WorkoutLogger;
