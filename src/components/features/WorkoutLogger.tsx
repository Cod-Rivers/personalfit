'use client';

import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { FiX, FiCheck, FiAlertCircle, FiLoader } from 'react-icons/fi';
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
                plannedSeries: ex.series,
                series: ex.series.map((_, i) => ({
                    seriesNum: i + 1,
                    reps: 0,
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

                    {logs.map((ex, exIdx) => (
                        <div key={ex.exerciseId} className={s.exerciseBlock}>
                            <h3>{ex.name}</h3>
                            <div className={s.seriesGrid}>
                                {ex.series.map((sr, seriesIdx) => (
                                    <div
                                        key={seriesIdx}
                                        className={s.seriesRow}
                                    >
                                        <label className={s.label}>
                                            Série {sr.seriesNum}
                                        </label>
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
                                                        parseInt(
                                                            e.target.value,
                                                        ) || 0,
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
                                                        parseFloat(
                                                            e.target.value,
                                                        ) || 0,
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
                                                        parseInt(
                                                            e.target.value,
                                                        ),
                                                    )
                                                }
                                                disabled={loading}
                                            >
                                                {/* RPE 1-10 */}
                                                {[
                                                    1, 2, 3, 4, 5, 6, 7, 8, 9,
                                                    10,
                                                ].map((r) => (
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
                                ))}
                            </div>
                        </div>
                    ))}

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
