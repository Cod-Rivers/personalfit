// src/app/meus-treinos/[id]/[trainingId]/page.tsx
'use client';

import React, { useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
    getMyMacrocycle,
    MacrocycleResponse,
    ExerciseResponse,
    MesocycleResponse,
    MicrocycleResponse,
    TrainingResponse,
    searchExercises,
} from '@/libs/planningService';
import { ExerciseLog } from '../../../../components/features/types';
import ExerciseDetailCard from '../../../../components/features/ExerciseDetailCard';
import WorkoutLogger from '../../../../components/features/WorkoutLogger';
import SyncPendingBadge from '../../../../components/features/SyncPendingBadge';
import styles from './TrainingPage.module.css';
import ImageComponent from 'next/image';
import weightIcon from './../../../../../public/assets/icons/weight-icon.png';
import { getNewWorkoutLogs, NewWorkoutLogResponse } from '@/libs/workoutLogService';
import { isEmbeddableUrl } from '@/libs/exerciseVideoService';
import { computeAutoregulationDecision } from '@/libs/microcycleAutoregulation';
import { getOfflineMacrocycle } from '@/libs/offline/downloadManager';
import HelpTooltip from '@/components/atoms/HelpTooltip';
import { getMicrocycleHelpTopic } from '@/libs/microcycleHelpContent';

/** Exibe um frame estático do vídeo como thumbnail na lista. videoUrl já vem
 * resolvida pela API como URL pública final (R2/CDN), pronta para tocar. */
function VideoFrameThumbnail({
    videoUrl,
    className,
    style,
}: {
    videoUrl: string;
    className?: string;
    style?: React.CSSProperties;
}) {
    if (!videoUrl) {
        return (
            <div
                className={className}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#1a1a2e',
                    borderRadius: 6,
                    fontSize: 22,
                    flexShrink: 0,
                    ...style,
                }}
            >
                🎬
            </div>
        );
    }

    return (
        <video
            src={videoUrl}
            muted
            playsInline
            preload="metadata"
            onLoadedMetadata={(e) => {
                e.currentTarget.currentTime = 1;
            }}
            className={className}
            style={{
                objectFit: 'cover',
                borderRadius: 6,
                flexShrink: 0,
                background: '#000',
                ...style,
            }}
        />
    );
}

interface TrainingPageParams {
    id: string; // macrocycle ID
    trainingId: string;
}

interface TrainingExercisesPageProps {
    params: Promise<TrainingPageParams>;
}

function toExerciseLog(ex: ExerciseResponse): ExerciseLog {
    return {
        id: ex.id,
        name: ex.name,
        series: ex.series ?? [],
        variations: ex.variations ?? '',
        video_url: ex.video_url ?? '',
        // Só usa video_thumb se for URL http (não caminho GCS privado)
        video_thumb: ex.video_thumb?.startsWith('http') ? ex.video_thumb : '',
        weight: 0,
        notes: ex.comments ?? '',
        restTime: 90,
    };
}

/** Enriquece exercícios sem vídeo buscando na biblioteca global pelo nome. */
async function enrichWithLibraryVideos(
    exs: ExerciseLog[],
): Promise<ExerciseLog[]> {
    const noVideo = exs.filter((e) => !e.video_url);
    if (noVideo.length === 0) return exs;

    const enriched = [...exs];
    await Promise.all(
        noVideo.map(async (ex) => {
            try {
                const results = await searchExercises(ex.name);
                const match = results.find(
                    (r) =>
                        r.name.toLowerCase() === ex.name.toLowerCase() &&
                        r.video_url,
                );
                if (match) {
                    const idx = enriched.findIndex((e) => e.id === ex.id);
                    if (idx !== -1) {
                        enriched[idx] = {
                            ...enriched[idx],
                            video_url: match.video_url,
                            video_thumb: match.video_thumb?.startsWith('http')
                                ? match.video_thumb
                                : '',
                        };
                    }
                }
            } catch {
                // enriquecimento é best-effort
            }
        }),
    );
    return enriched;
}

export default function MeusTreinosExercisesPage({
    params: paramsPromise,
}: TrainingExercisesPageProps) {
    const routeParams = use(paramsPromise);
    const { id: macrocycleId, trainingId } = routeParams;

    const [exercises, setExercises] = useState<ExerciseLog[]>([]);
    const [trainingRef, setTrainingRef] = useState(trainingId);
    const [selectedExercise, setSelectedExercise] =
        useState<ExerciseLog | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sendStatus, setSendStatus] = useState<
        'idle' | 'success' | 'queued' | 'error'
    >('idle');
    const [showWorkoutLogger, setShowWorkoutLogger] = useState(false);
    const [currentMeso, setCurrentMeso] = useState<MesocycleResponse | null>(
        null,
    );
    const [currentMicro, setCurrentMicro] = useState<MicrocycleResponse | null>(
        null,
    );
    const [currentTraining, setCurrentTraining] =
        useState<TrainingResponse | null>(null);
    const [isOffline, setIsOffline] = useState(false);
    const [studentId, setStudentId] = useState('');
    const [microLogsCount, setMicroLogsCount] = useState(0);
    const [previousMicroAvgRPE, setPreviousMicroAvgRPE] = useState(7);

    const [readinessScore, setReadinessScore] = useState<number>(6);
    const [sleepHours, setSleepHours] = useState<number>(7);
    const [stressScore, setStressScore] = useState<number>(4);
    const [sorenessScore, setSorenessScore] = useState<number>(4);
    const [hrvDeltaMs, setHrvDeltaMs] = useState<number>(0);
    const [previousRPE, setPreviousRPE] = useState<number>(7);
    const [highFatigueDays, setHighFatigueDays] = useState<number>(0);

    const calculateAvgRPE = (logs: NewWorkoutLogResponse[]): number => {
        const all = logs.flatMap((log) => log.exercises.map((ex) => ex.rpe));
        if (all.length === 0) return 7;
        const avg = all.reduce((acc, val) => acc + val, 0) / all.length;
        return Math.round(avg * 10) / 10;
    };

    useEffect(() => {
        if (!macrocycleId || !trainingId) return;

        setIsLoading(true);
        setError(null);
        setIsOffline(false);

        /** Aplica um macrociclo (vindo da API ou do cache offline) ao
         * estado da tela. Retorna true se o treino foi encontrado nele. */
        async function applyMacrocycle(
            macro: MacrocycleResponse,
            loggedStudentId: string,
        ): Promise<boolean> {
            let found = false;
            for (const meso of macro.mesocycles ?? []) {
                for (const t of meso.trainings ?? []) {
                    if (t.id !== trainingId) continue;

                    const logs = (t.exercises ?? []).map(toExerciseLog);
                    const enriched = await enrichWithLibraryVideos(logs);
                    setExercises(enriched);
                    setTrainingRef(t.reference);
                    setCurrentTraining(t);

                    const selectedMicro =
                        meso.microcycles?.find((m) => m.status === 'in_progress') ??
                        meso.microcycles?.find((m) => m.status === 'pending') ??
                        meso.microcycles?.[meso.microcycles.length - 1] ??
                        null;
                    setCurrentMeso(meso);
                    setCurrentMicro(selectedMicro);

                    if (loggedStudentId && selectedMicro) {
                        try {
                            const currentLogs = await getNewWorkoutLogs(
                                loggedStudentId,
                                macro.id,
                                meso.id,
                                selectedMicro.id,
                            );
                            setMicroLogsCount(currentLogs.length);

                            const prevMicro = meso.microcycles?.find(
                                (m) => m.week_number === selectedMicro.week_number - 1,
                            );
                            if (prevMicro) {
                                const prevLogs = await getNewWorkoutLogs(
                                    loggedStudentId,
                                    macro.id,
                                    meso.id,
                                    prevMicro.id,
                                );
                                const avgPrev = calculateAvgRPE(prevLogs);
                                setPreviousMicroAvgRPE(avgPrev);
                                setPreviousRPE(avgPrev);

                                const consecutiveHigh = avgPrev >= 8.5 ? 1 : 0;
                                setHighFatigueDays(consecutiveHigh);
                            }
                        } catch {
                            // Falha de leitura de logs não bloqueia a tela.
                        }
                    }

                    found = true;
                    break;
                }
                if (found) break;
            }
            return found;
        }

        (async () => {
            const userRaw = localStorage.getItem('user');
            const localUser = userRaw ? JSON.parse(userRaw) : null;
            const loggedStudentId = localUser?.id ?? '';
            setStudentId(loggedStudentId);

            try {
                const macro = await getMyMacrocycle(macrocycleId);
                const found = await applyMacrocycle(macro, loggedStudentId);
                if (!found) {
                    setError('Treino não encontrado neste macrociclo.');
                }
            } catch (err) {
                if (axios.isAxiosError(err) && !err.response) {
                    const offline = await getOfflineMacrocycle(macrocycleId);
                    if (offline) {
                        setIsOffline(true);
                        const found = await applyMacrocycle(offline.data, loggedStudentId);
                        if (!found) {
                            setError('Treino não encontrado no plano salvo offline.');
                        }
                    } else {
                        setError(
                            'Sem conexão com a API e nenhuma versão offline deste plano foi baixada. Verifique se o backend está ativo e acessível em http://localhost:8080.',
                        );
                    }
                } else {
                    setError('Não foi possível carregar os exercícios.');
                }
            } finally {
                setIsLoading(false);
            }
        })();
    }, [macrocycleId, trainingId]);

    const handleExerciseClick = (exercise: ExerciseLog) => {
        setSelectedExercise(exercise);
    };

    const handleCloseDetailCard = () => {
        setSelectedExercise(null);
    };

    const decision = useMemo(
        () =>
            computeAutoregulationDecision({
                readinessScore,
                sleepHours,
                stressScore,
                sorenessScore,
                previousRPE,
                hrvDeltaMs,
                targetRPE: currentMicro?.target_rpe,
                plannedVolumeAdjustPct: currentMicro?.volume_adjust_pct,
                plannedIntensityAdjustPct: currentMicro?.intensity_adjust_pct,
                consecutiveHighFatigueDays: highFatigueDays,
            }),
        [
            readinessScore,
            sleepHours,
            stressScore,
            sorenessScore,
            previousRPE,
            hrvDeltaMs,
            currentMicro,
            highFatigueDays,
        ],
    );

    if (isLoading) {
        return <div className="p-6 text-center">Carregando exercícios...</div>;
    }

    if (error) {
        return (
            <div className="p-6 text-center text-red-600">Erro: {error}</div>
        );
    }

    return (
        <>
            <div className="container mx-auto p-4 min-h-screen relative">
                <div className="d-flex justify-content-end mb-2">
                    <SyncPendingBadge />
                </div>
                {isOffline && (
                    <div
                        className="alert alert-warning py-2 px-3 mb-3"
                        style={{ fontSize: '0.85rem' }}
                    >
                        📴 Exibindo treino salvo offline (sem conexão no momento).
                    </div>
                )}
                <div className="mb-8">
                    <div className={styles.Title}>
                        <ImageComponent
                            className={styles.myImageInTitle}
                            src={weightIcon}
                            alt="This is a weight image"
                            width={30}
                            height={30}
                        />
                        <h1
                            className="mt-4 text-3xl font-extrabold tracking-tight"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            Meus treinos de{' '}
                            <span style={{ color: 'var(--mint)' }}>
                                {trainingRef.toUpperCase()}
                            </span>
                        </h1>
                    </div>
                    <p
                        className="text-lg mt-1"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        Clique em um exercício para ver os detalhes.
                    </p>
                </div>

                {/* Painel de autorregulação do microciclo */}
                <div className="card mb-4">
                    <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h2 className="h6 mb-0 d-flex align-items-center">
                                Controle do Microciclo (Autorregulação)
                                <HelpTooltip
                                    text={
                                        getMicrocycleHelpTopic('autorregulacao')
                                            .short
                                    }
                                    href="/ajuda#autorregulacao"
                                />
                            </h2>
                            {currentMicro && (
                                <span className="badge bg-secondary">
                                    Semana {currentMicro.week_number}
                                </span>
                            )}
                        </div>

                        {currentMeso && currentMicro && (
                            <p className="small text-muted mb-2">
                                {currentMeso.name} · foco:{' '}
                                {currentMicro.focus || 'não definido'} · RPE
                                alvo: {currentMicro.target_rpe ?? '—'} · logs:{' '}
                                {microLogsCount}
                            </p>
                        )}

                        <div className="row g-2 mb-2">
                            <div className="col-6 col-md-2">
                                <label className="form-label small mb-1 d-flex align-items-center">
                                    Prontidão (1-10)
                                    <HelpTooltip
                                        text={
                                            getMicrocycleHelpTopic('prontidao')
                                                .short
                                        }
                                        href="/ajuda#prontidao"
                                    />
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    className="form-control form-control-sm"
                                    value={readinessScore}
                                    onChange={(e) =>
                                        setReadinessScore(
                                            parseInt(e.target.value, 10) || 1,
                                        )
                                    }
                                />
                            </div>
                            <div className="col-6 col-md-2">
                                <label className="form-label small mb-1 d-flex align-items-center">
                                    Sono (h)
                                    <HelpTooltip
                                        text={
                                            getMicrocycleHelpTopic('sono')
                                                .short
                                        }
                                        href="/ajuda#sono"
                                    />
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    max={12}
                                    step={0.5}
                                    className="form-control form-control-sm"
                                    value={sleepHours}
                                    onChange={(e) =>
                                        setSleepHours(
                                            parseFloat(e.target.value) || 0,
                                        )
                                    }
                                />
                            </div>
                            <div className="col-6 col-md-2">
                                <label className="form-label small mb-1 d-flex align-items-center">
                                    Estresse (1-10)
                                    <HelpTooltip
                                        text={
                                            getMicrocycleHelpTopic('estresse')
                                                .short
                                        }
                                        href="/ajuda#estresse"
                                    />
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    className="form-control form-control-sm"
                                    value={stressScore}
                                    onChange={(e) =>
                                        setStressScore(
                                            parseInt(e.target.value, 10) || 1,
                                        )
                                    }
                                />
                            </div>
                            <div className="col-6 col-md-2">
                                <label className="form-label small mb-1 d-flex align-items-center">
                                    Dor muscular (1-10)
                                    <HelpTooltip
                                        text={
                                            getMicrocycleHelpTopic(
                                                'dor-muscular',
                                            ).short
                                        }
                                        href="/ajuda#dor-muscular"
                                    />
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    className="form-control form-control-sm"
                                    value={sorenessScore}
                                    onChange={(e) =>
                                        setSorenessScore(
                                            parseInt(e.target.value, 10) || 1,
                                        )
                                    }
                                />
                            </div>
                            <div className="col-6 col-md-2">
                                <label className="form-label small mb-1 d-flex align-items-center">
                                    Delta VFC (ms)
                                    <HelpTooltip
                                        text={
                                            getMicrocycleHelpTopic(
                                                'delta-vfc',
                                            ).short
                                        }
                                        href="/ajuda#delta-vfc"
                                    />
                                </label>
                                <input
                                    type="number"
                                    min={-30}
                                    max={30}
                                    className="form-control form-control-sm"
                                    value={hrvDeltaMs}
                                    onChange={(e) =>
                                        setHrvDeltaMs(
                                            parseInt(e.target.value, 10) || 0,
                                        )
                                    }
                                />
                            </div>
                            <div className="col-6 col-md-2">
                                <label className="form-label small mb-1 d-flex align-items-center">
                                    RPE prévio
                                    <HelpTooltip
                                        text={
                                            getMicrocycleHelpTopic(
                                                'rpe-previo',
                                            ).short
                                        }
                                        href="/ajuda#rpe-previo"
                                    />
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    step={0.5}
                                    className="form-control form-control-sm"
                                    value={previousRPE}
                                    onChange={(e) =>
                                        setPreviousRPE(
                                            parseFloat(e.target.value) || 1,
                                        )
                                    }
                                />
                            </div>
                        </div>

                        <p className="small text-muted mb-2">
                            RPE médio do microciclo anterior:{' '}
                            {previousMicroAvgRPE.toFixed(1)}
                        </p>

                        <div
                            className={`alert ${
                                decision.zone === 'supercompensacao'
                                    ? 'alert-success'
                                    : decision.zone === 'fadiga'
                                      ? 'alert-warning'
                                      : 'alert-info'
                            } mb-2`}
                        >
                            <div className="fw-semibold mb-1">
                                {decision.message}
                            </div>
                            <div className="small">
                                Aptidão: {decision.fitnessScore} · Fadiga:{' '}
                                {decision.fatigueScore} · Balanço:{' '}
                                {decision.balance}
                            </div>
                            <div className="small">
                                Ajuste intersessão: volume{' '}
                                {decision.volumeAdjustPct}% · intensidade{' '}
                                {decision.intensityAdjustPct}%
                            </div>
                            <div className="small">
                                Ajuste intrassessão: carga{' '}
                                {decision.intraSessionLoadAdjustPct}%
                                {decision.intraSessionLoadAdjustPct < 0
                                    ? ' quando RIR cair mais que o alvo'
                                    : ' quando séries estiverem leves'}
                            </div>
                            {decision.triggerDeload && (
                                <div className="small fw-semibold mt-1">
                                    Gatilho de deload ativo para o próximo
                                    microciclo.
                                </div>
                            )}
                        </div>
                        {decision.reasons.length > 0 && (
                            <p className="small text-muted mb-0">
                                Fatores: {decision.reasons.join(', ')}.
                            </p>
                        )}
                        <div className="mt-3">
                            <Link
                                href="/meus-treinos/autorregulacao"
                                className="btn btn-outline-secondary btn-sm"
                            >
                                Entender como esse controle funciona
                            </Link>
                        </div>
                    </div>
                </div>
                {exercises.length > 0 ? (
                    <ul className={`${styles.exerciseListContainer} space-y-3`}>
                        {exercises.map((exercise) => (
                            <li key={exercise.id}>
                                <button
                                    onClick={() =>
                                        handleExerciseClick(exercise)
                                    }
                                    className={`${styles.cardButton} ${styles.exerciseItemContainer}`}
                                >
                                    <div className="flex items-center">
                                        {exercise.video_thumb?.startsWith(
                                            'http',
                                        ) ? (
                                            <img
                                                src={exercise.video_thumb}
                                                alt={`Thumbnail para ${exercise.name}`}
                                                className={
                                                    styles.exerciseThumbnail
                                                }
                                            />
                                        ) : exercise.video_url &&
                                          !isEmbeddableUrl(
                                              exercise.video_url,
                                          ) ? (
                                            <VideoFrameThumbnail
                                                videoUrl={exercise.video_url}
                                                className={
                                                    styles.exerciseThumbnail
                                                }
                                            />
                                        ) : null}
                                        <span
                                            className="text-xl font-semibold flex-grow"
                                            style={{
                                                color: 'var(--text-primary)',
                                            }}
                                        >
                                            {exercise.name}
                                        </span>
                                    </div>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className={styles.cardIcon}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        aria-hidden="true"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 5l7 7-7 7"
                                        />
                                    </svg>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-12">
                        <h3
                            className="mt-2 text-xl font-semibold"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            Nenhum exercício encontrado
                        </h3>
                        <p
                            className="mt-1 text-sm"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            Não há exercícios cadastrados para este treino (
                            {trainingId}).
                        </p>
                    </div>
                )}
                {selectedExercise && (
                    <ExerciseDetailCard
                        exercise={selectedExercise}
                        onClose={handleCloseDetailCard}
                    />
                )}
                <div className={styles.finalizarContainer}>
                    {sendStatus === 'success' ? (
                        <p className={styles.finalizarSuccess}>
                            ✓ Treino finalizado com sucesso!
                        </p>
                    ) : sendStatus === 'queued' ? (
                        <p className={styles.finalizarSuccess}>
                            💾 Salvo localmente — será sincronizado quando a
                            internet voltar.
                        </p>
                    ) : (
                        <button
                            className={styles.finalizarBtn}
                            onClick={() => setShowWorkoutLogger(true)}
                            disabled={exercises.length === 0}
                        >
                            Finalizar Treino
                        </button>
                    )}
                    {sendStatus === 'error' && (
                        <p className={styles.finalizarError}>
                            Erro ao finalizar. Tente novamente.
                        </p>
                    )}
                </div>
            </div>
            {showWorkoutLogger && currentMeso && currentMicro && currentTraining && (
                <WorkoutLogger
                    studentId={studentId}
                    planningId={macrocycleId}
                    mesocycle={currentMeso}
                    microcycle={currentMicro}
                    training={currentTraining}
                    autoregulation={{
                        targetRPE: Math.max(
                            1,
                            Math.min(
                                10,
                                (currentMicro.target_rpe ?? 7) +
                                    (decision.zone === 'fadiga'
                                        ? -1
                                        : decision.zone === 'supercompensacao'
                                          ? 0.5
                                          : 0),
                            ),
                        ),
                        intraSessionLoadAdjustPct:
                            decision.intraSessionLoadAdjustPct,
                        message: decision.message,
                    }}
                    onClose={() => setShowWorkoutLogger(false)}
                    onComplete={() => {
                        setShowWorkoutLogger(false);
                        setSendStatus('success');
                    }}
                    onQueued={() => {
                        setShowWorkoutLogger(false);
                        setSendStatus('queued');
                    }}
                />
            )}
        </>
    );
}
