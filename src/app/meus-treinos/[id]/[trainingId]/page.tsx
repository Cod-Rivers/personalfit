// src/app/meus-treinos/[id]/[trainingId]/page.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState, use } from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
    FiArrowLeft,
    FiWifiOff,
    FiInfo,
    FiLink,
    FiCheck,
    FiSave,
    FiAlertTriangle,
    FiAward,
    FiShare2,
    FiMessageCircle,
} from 'react-icons/fi';
import { getStudentHomeRoute } from '@/libs/session';
import { getCachedMyLogWindow } from '@/libs/logWindowService';
import {
    getMyMacrocycle,
    MacrocycleResponse,
    MesocycleResponse,
    MicrocycleResponse,
    TrainingResponse,
    searchExercises,
} from '@/libs/planningService';
import { currentMicrocycleOf, localDateKey, logsOfWeek } from '@/libs/currentWeek';
import { ExerciseLog } from '../../../../components/features/types';
import Button from '@/components/atoms/Button';
import CircuitTimer, {
    type CircuitTimerHandle,
} from '@/components/molecules/CircuitTimer';
import {
    blockRecoverySeconds,
    circuitHasTimedWork,
    type CircuitExercise,
} from '@/libs/circuitPlan';
import ExerciseDetailCard from '../../../../components/features/ExerciseDetailCard';
import ExerciseSubstitutionModal from '../../../../components/features/ExerciseSubstitutionModal';
import WorkoutLogger, {
    type WorkoutShareData,
} from '../../../../components/features/WorkoutLogger';
import ShareAchievementModal from '../../../../components/features/ShareAchievementModal';
import { SubstitutionSuggestion } from '@/libs/aiSubstitutionAccessService';
import SyncPendingBadge from '../../../../components/features/SyncPendingBadge';
import styles from './TrainingPage.module.css';
import ImageComponent from 'next/image';
import weightIcon from './../../../../../public/assets/icons/weight-icon.png';
import {
    getNewWorkoutLogs,
    getMyWorkoutLogsInRange,
    NewWorkoutLogResponse,
} from '@/libs/workoutLogService';
import { computeAutoregulationDecision } from '@/libs/microcycleAutoregulation';
import {
    cacheMacrocycleForOffline,
    getOfflineMacrocycle,
} from '@/libs/offline/downloadManager';
import HelpTooltip from '@/components/atoms/HelpTooltip';
import { getMicrocycleHelpTopic } from '@/libs/microcycleHelpContent';
import { markWorkoutStartIfNeeded } from '@/libs/workoutSessionTimer';
import {
    clearExerciseDoneMarks,
    readExerciseDoneMarks,
    writeExerciseDoneMarks,
} from '@/libs/exerciseDoneMarks';
import { recordExerciseDone, studentDoneLoadKg } from '@/libs/exerciseDoneRecord';
import { getCachedWeight } from '@/libs/exerciseWeightService';
import DoneToggle from '@/components/atoms/DoneToggle';
import { getPendingMutations, onQueueChanged } from '@/libs/offline/syncQueue';
import ExerciseThumbnail from '@/components/features/ExerciseThumbnail';
import { resolveAutoregulationPolicy } from '@/libs/autoregulationPolicy';
import { getEffectiveAutoregulationPolicy } from '@/libs/autoregulationPolicyService';
import {
    computeLoadSuggestion,
    LoadHistoryEntry,
    LoadSuggestion,
} from '@/libs/loadSuggestion';
import {
    partitionExerciseGroups,
    comboGroupLabel,
} from '@/libs/trainingTechniques';
import { applySubstitutability, toExerciseLog } from '@/libs/exerciseLog';
import { isOverdueBlockError } from '@/libs/overdueBlock';
import OverdueBlockNotice from '@/components/features/OverdueBlockNotice';
import { labelPartsOf, trainingDisplayLabel } from '@/libs/trainingLabel';
import dynamic from 'next/dynamic';
import {
    detectNewRecords,
    exerciseKeyFor,
    formatKg,
    type LoadHistoryResponse,
    type NewRecord,
} from '@/libs/loadHistory';
import {
    getCachedLoadHistorySummary,
    getLoadHistorySummary,
} from '@/libs/loadHistoryService';

// Só abre quando o aluno toca em "Histórico de carga": fora do bundle da tela.
const ExerciseLoadHistoryModal = dynamic(
    () => import('@/components/features/load-history/ExerciseLoadHistoryModal'),
    { ssr: false },
);

/** Bloco agrupado no formato do cronômetro de circuito (libs/circuitPlan.ts). */
function toCircuit(group: ExerciseLog[]): CircuitExercise[] {
    return group.map((e) => ({
        name: e.name,
        series: e.series ?? [],
        timed: e.timed,
        series_label: e.series_label,
        rest: e.restTime,
    }));
}

interface TrainingPageParams {
    id: string; // macrocycle ID
    trainingId: string;
}

interface TrainingExercisesPageProps {
    params: Promise<TrainingPageParams>;
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
    /** Nome do treino como na lista (dia, letra/número, nome livre). */
    const [trainingLabel, setTrainingLabel] = useState('');
    const [selectedExercise, setSelectedExercise] =
        useState<ExerciseLog | null>(null);
    const [substitutionFor, setSubstitutionFor] = useState<ExerciseLog | null>(
        null,
    );
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Personal pausou o acesso por mensalidade vencida (403
    // student_blocked_overdue): aviso próprio em vez do erro genérico.
    const [overdueBlocked, setOverdueBlocked] = useState(false);
    const [sendStatus, setSendStatus] = useState<
        'idle' | 'success' | 'queued' | 'error'
    >('idle');
    // Independente de sendStatus (que só fala do TREINO): a foto pode se
    // perder mesmo quando o treino sincroniza perfeitamente, então o aviso
    // precisa sobreviver à promoção 'queued' -> 'success' abaixo (pendência
    // -19 — sem isto, o aluno nunca saberia que a foto não foi salva).
    const [photoDiscardedWarning, setPhotoDiscardedWarning] = useState(false);
    // Nome do personal a quem o aluno acabou de mandar comentário no check-in
    // ("" = sem nome no cache; null = não houve comentário).
    const [commentSentTo, setCommentSentTo] = useState<string | null>(null);
    const [showWorkoutLogger, setShowWorkoutLogger] = useState(false);
    // Material do card de compartilhamento do treino recém-concluído. Fica
    // NESTA página, e não dentro do WorkoutLogger, porque o diálogo de
    // registro se fecha no instante da confirmação (é o que o aluno espera)
    // e o convite para compartilhar precisa sobreviver a esse fechamento —
    // inclusive para ser reaberto pelo botão do aviso de sucesso.
    const [shareData, setShareData] = useState<WorkoutShareData | null>(null);
    const [shareOpen, setShareOpen] = useState(false);
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
    const [autoregulationOverrides, setAutoregulationOverrides] = useState<
        Parameters<typeof resolveAutoregulationPolicy>[0]['personal']
    >(null);
    const [loadHistoryByExercise, setLoadHistoryByExercise] = useState<
        Record<string, LoadHistoryEntry[]>
    >({});
    // Histórico de carga completo (resumo por exercício): "ver histórico" do
    // card e o aviso de recorde ao finalizar. Vem do cache offline quando não
    // há rede — é exatamente na academia sem sinal que ele mais serve.
    const [loadHistory, setLoadHistory] = useState<LoadHistoryResponse | null>(null);
    const [historyFor, setHistoryFor] = useState<{ key: string; name: string } | null>(null);
    const [newRecords, setNewRecords] = useState<NewRecord[]>([]);
    const [recordShareOpen, setRecordShareOpen] = useState(false);

    const [readinessScore, setReadinessScore] = useState<number>(6);
    const [sleepHours, setSleepHours] = useState<number>(7);
    const [stressScore, setStressScore] = useState<number>(4);
    const [sorenessScore, setSorenessScore] = useState<number>(4);
    const [hrvDeltaMs, setHrvDeltaMs] = useState<number>(0);
    const [previousRPE, setPreviousRPE] = useState<number>(7);
    const [highFatigueDays, setHighFatigueDays] = useState<number>(0);
    const [microPanelOpen, setMicroPanelOpen] = useState(false);

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

                    // A trava de substituição resolvida pelo backend para o
                    // aluno (inclui a derivada da dor e o motivo) também vale
                    // no plano salvo offline, que é a mesma resposta da API.
                    const logs = (t.exercises ?? []).map((ex) =>
                        applySubstitutability(
                            toExerciseLog(ex),
                            macro.substitutability?.[ex.id],
                        ),
                    );
                    const enriched = await enrichWithLibraryVideos(logs);
                    setExercises(enriched);
                    setTrainingRef(t.reference);
                    setTrainingLabel(
                        trainingDisplayLabel(
                            t,
                            (meso.trainings ?? []).indexOf(t),
                            labelPartsOf(macro),
                        ),
                    );
                    setCurrentTraining(t);

                    // Semana pelo calendário, não pelo status: é neste
                    // microciclo que o registro de hoje é gravado (ver
                    // libs/currentWeek.ts).
                    const selectedMicro = currentMicrocycleOf(macro, meso);
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
                            setMicroLogsCount(logsOfWeek(currentLogs).length);

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
                // Guarda o plano para a próxima abertura sem rede. A Central
                // de Ajuda promete que registrar funciona "com ou sem plano
                // baixado previamente" — sem isto, quem nunca tocou em
                // "Baixar para offline" não conseguia nem ABRIR o treino sem
                // sinal, e portanto não havia o que a fila local guardar.
                void cacheMacrocycleForOffline(macro);
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
                } else if (isOverdueBlockError(err)) {
                    setOverdueBlocked(true);
                } else {
                    setError('Não foi possível carregar os exercícios.');
                }
            } finally {
                setIsLoading(false);
            }
        })();
    }, [macrocycleId, trainingId]);

    /* ── Prescrição sempre atual ──
     * O personal ajusta o treino pela tela dele enquanto o aluno está com
     * este aberto (na academia, lado a lado). Sem isto, o aluno só via a
     * mudança ao sair e voltar. Busca o plano de novo ao voltar ao app e a
     * cada 30s com a tela visível, e troca SÓ a prescrição: a carga que o
     * aluno está registrando mora no próprio card, não neste estado.
     *
     * Exceção: se o aluno trocou um exercício nesta sessão (substituição por
     * IA, que não é persistida), a atualização é pulada — reaplicar o plano
     * desfaria a troca no meio do treino. */
    const exercisesRef = React.useRef(exercises);
    exercisesRef.current = exercises;
    useEffect(() => {
        if (!macrocycleId || !trainingId || isLoading || isOffline) return;
        let cancelled = false;

        const refresh = async () => {
            if (document.visibilityState !== 'visible' || !navigator.onLine)
                return;
            if (exercisesRef.current.some((e) => e.substitutedFrom)) return;
            try {
                const macro = await getMyMacrocycle(macrocycleId);
                if (cancelled) return;
                for (const meso of macro.mesocycles ?? []) {
                    const t = (meso.trainings ?? []).find(
                        (tr) => tr.id === trainingId,
                    );
                    if (!t) continue;
                    const logs = (t.exercises ?? []).map((ex) =>
                        applySubstitutability(
                            toExerciseLog(ex),
                            macro.substitutability?.[ex.id],
                        ),
                    );
                    const enriched = await enrichWithLibraryVideos(logs);
                    if (
                        cancelled ||
                        exercisesRef.current.some((e) => e.substitutedFrom)
                    )
                        return;
                    setExercises(enriched);
                    setCurrentTraining(t);
                    setCurrentMeso(meso);
                    // Card aberto: passa a mostrar a prescrição nova.
                    setSelectedExercise((prev) =>
                        prev
                            ? (enriched.find((e) => e.id === prev.id) ?? prev)
                            : prev,
                    );
                    void cacheMacrocycleForOffline(macro);
                    return;
                }
            } catch {
                // Falha silenciosa: a tela segue com o que já mostrava.
            }
        };

        const onVisible = () => {
            if (document.visibilityState === 'visible') void refresh();
        };
        document.addEventListener('visibilitychange', onVisible);
        const timer = window.setInterval(() => void refresh(), 30_000);
        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', onVisible);
            window.clearInterval(timer);
        };
    }, [macrocycleId, trainingId, isLoading, isOffline]);

    // Parâmetros de autorregulação do personal (quando definidos) + histórico
    // de cargas executadas nos últimos 90 dias, usados pelo motor de
    // sugestão de carga (libs/loadSuggestion.ts). Independente do carregamento
    // do plano — falha aqui não deve bloquear a tela de exercícios.
    useEffect(() => {
        let cancelled = false;

        getEffectiveAutoregulationPolicy()
            .then((overrides) => {
                if (!cancelled) setAutoregulationOverrides(overrides);
            })
            .catch(() => {
                // Sem policy customizada (offline ou aluno sem personal vinculado):
                // segue com o padrão do app.
            });

        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - 90);
        const toISO = to.toISOString().split('T')[0];
        const fromISO = from.toISOString().split('T')[0];

        getMyWorkoutLogsInRange(fromISO, toISO)
            .then((logs) => {
                if (cancelled) return;
                // Indexado pela chave estável quando o registro já a tem
                // (sobrevive à troca de ciclo, que muda o exercise_id); os
                // registros antigos, sem carimbo, ficam pelo exercise_id.
                // Cada série entra em UM índice só — ver a leitura em
                // loadSuggestions, que soma os dois sem duplicar.
                const byExercise: Record<string, LoadHistoryEntry[]> = {};
                const today = localDateKey();
                for (const log of logs) {
                    // in_progress = exercícios marcados "feito" num treino
                    // não finalizado: vale como histórico, menos o de hoje —
                    // é a sessão em curso, e contá-la mudaria a sugestão no
                    // meio do treino.
                    const partialOfPast =
                        log.status === 'in_progress' &&
                        log.planned_date.slice(0, 10) !== today;
                    if (log.status !== 'completed' && !partialOfPast) continue;
                    const date = log.completed_date ?? log.planned_date;
                    for (const ep of log.exercises) {
                        const index = ep.exercise_key
                            ? `key:${ep.exercise_key}`
                            : ep.exercise_id
                              ? `id:${ep.exercise_id}`
                              : null;
                        if (!index) continue;
                        (byExercise[index] ??= []).push({
                            date,
                            loadKg: ep.load_kg,
                            reps: ep.reps,
                            rpe: ep.rpe,
                        });
                    }
                }
                setLoadHistoryByExercise(byExercise);
            })
            .catch(() => {
                // Sem histórico (offline ou sem logs ainda): sugestão de carga
                // cai para "só prescrição" ou "sem base", conforme o caso.
            });

        // Resumo do histórico de carga: getLoadHistorySummary já cai no cache
        // offline sozinho quando não há rede.
        getLoadHistorySummary()
            .then((r) => {
                if (!cancelled) setLoadHistory(r.data);
            })
            .catch(() => {
                // Sem histórico e sem cache: o card só não mostra o atalho
                // com dados, e o aviso de recorde não aparece — nada quebra.
            });

        return () => {
            cancelled = true;
        };
    }, []);

    // WorkoutLogger (Sprint 3, RN-09/RN-10) sempre enfileira ao concluir,
    // mesmo online — a fila costuma drenar em segundos nesse caso, mas
    // `onQueued` só sabia dizer "queued", nunca "success" depois. Sem isto,
    // todo aluno com internet perfeita via "Salvo localmente — será
    // sincronizado quando a internet voltar" para sempre, mesmo com o
    // registro já confirmado no servidor. Assina o mesmo evento que o
    // SyncPendingBadge usa e promove para 'success' assim que a mutação
    // deste treino específico (por microciclo+referência) sair da fila.
    useEffect(() => {
        if (sendStatus !== 'queued' || !currentMicro || !currentTraining) {
            return;
        }
        let cancelled = false;
        const checkSynced = () => {
            getPendingMutations().then((rows) => {
                if (cancelled) return;
                const stillQueued = rows.some(
                    (r) =>
                        r.microcycleId === currentMicro.id &&
                        r.trainingRef === currentTraining.reference,
                );
                if (!stillQueued) setSendStatus('success');
            });
        };
        checkSynced();
        const unsubscribe = onQueueChanged(checkSynced);
        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, [sendStatus, currentMicro, currentTraining]);

    const markSessionStart = () => {
        if (currentMicro) {
            markWorkoutStartIfNeeded(currentMicro.id, trainingRef);
        }
    };

    const handleExerciseClick = (exercise: ExerciseLog) => {
        markSessionStart();
        setSelectedExercise(exercise);
    };

    const openWorkoutLogger = () => {
        setPhotoDiscardedWarning(false);
        setShowWorkoutLogger(true);
    };

    /** Circuitos concluídos, pelo id do 1º exercício do bloco: entram como
     * conferidos no registro do treino (ver WorkoutLogger). */
    const [circuitDoneKeys, setCircuitDoneKeys] = useState<
        ReadonlySet<string>
    >(() => new Set());
    const markCircuitDone = (key: string) =>
        setCircuitDoneKeys((prev) =>
            prev.has(key) ? prev : new Set(prev).add(key),
        );

    /** "Exercício feito" do aluno durante o treino — o círculo ao lado do
     * nome, na lista e no card aberto. A marcação fica no aparelho para
     * sobreviver a um recarregamento no meio do treino
     * (libs/exerciseDoneMarks.ts), e a carga do exercício vai na hora para o
     * histórico (libs/exerciseDoneRecord.ts) — desmarcar tira de lá. */
    const [doneIds, setDoneIds] = useState<ReadonlySet<string>>(
        () => new Set(),
    );
    // Cópia sempre atual: o CircuitTimer pode chamar onComplete guardado de
    // um render anterior, e ler `doneIds` dali apagaria as marcações feitas
    // depois.
    const doneRef = useRef<ReadonlySet<string>>(doneIds);
    const microId = currentMicro?.id;
    useEffect(() => {
        if (!microId) return;
        const stored = readExerciseDoneMarks(microId, trainingRef);
        doneRef.current = stored;
        setDoneIds(stored);
    }, [microId, trainingRef]);
    const saveDone = (next: Set<string>) => {
        doneRef.current = next;
        setDoneIds(next);
        if (microId) writeExerciseDoneMarks(microId, trainingRef, next);
    };
    /** Carga que o "feito" grava e que o "Finalizar treino" abre preenchida
     * para o exercício marcado — a mesma conta nos dois, para a finalização
     * não desfazer o que o "feito" gravou. */
    const doneLoadKg = (exercise: ExerciseLog) =>
        studentDoneLoadKg({
            registeredKg: getCachedWeight(exercise.id),
            suggestedKg: loadSuggestions[exercise.id]?.suggestedKg,
            plannedKg: exercise.plannedWeight,
            loadAdjustPct: decision.intraSessionLoadAdjustPct,
        });
    const recordDone = (ids: string[], done: boolean) => {
        if (!currentMeso || !currentMicro || !currentTraining) return;
        for (const id of ids) {
            // exercisesRef: o CircuitTimer chama com closure de um render
            // anterior (ver doneRef).
            const exercise = exercisesRef.current.find((e) => e.id === id);
            if (!exercise) continue;
            recordExerciseDone({
                studentId,
                planningId: macrocycleId,
                mesocycleId: currentMeso.id,
                microcycleId: currentMicro.id,
                trainingRef: currentTraining.reference,
                exercise,
                done,
                loadKg: doneLoadKg(exercise),
                rpe: Math.round(sessionTargetRPE),
            });
        }
    };
    const toggleDone = (id: string) => {
        // Marcar um exercício como feito também conta como início da sessão
        // (duração automática), igual a abrir o card.
        markSessionStart();
        const next = new Set(doneRef.current);
        const done = !next.delete(id);
        if (done) next.add(id);
        saveDone(next);
        recordDone([id], done);
    };
    /** Fim do circuito = o bloco inteiro foi feito (só marca, não desmarca). */
    const markDone = (ids: string[]) => {
        const current = doneRef.current;
        const added = ids.filter((id) => !current.has(id));
        if (added.length === 0) return;
        saveDone(new Set([...current, ...added]));
        recordDone(added, true);
    };
    /** Treino finalizado: a conferência desta sessão acabou. A tela continua
     * mostrando as marcações até o aluno sair dela. */
    const forgetDone = () => {
        if (microId) clearExerciseDoneMarks(microId, trainingRef);
    };

    const handleCloseDetailCard = () => {
        setSelectedExercise(null);
    };

    /** Aplica um substituto sugerido pela IA só para a sessão de hoje — não
     * persiste nada, recarregar a página restaura a prescrição original. O
     * `id` do exercício é preservado de propósito: histórico de carga,
     * anotações e o log do treino continuam apontando para o exercício
     * PRESCRITO (ver Todo/PLANO_SUBSTITUICAO_EXERCICIOS_IA.md §3.5). */
    const handleApplySubstitution = (suggestion: SubstitutionSuggestion) => {
        const targetId = substitutionFor?.id;
        if (!targetId) return;

        // A sugestão agora vem vinculada ao catálogo real do app, então tem
        // mídia própria — zerá-la (comportamento da v1) escondia justamente o
        // vídeo demonstrativo do substituto. Continua vazia quando a sugestão
        // veio da tabela estática do backend, que não tem mídia.
        // `variations` segue zerado de propósito: a prescrição de variação do
        // exercício original não vale para o substituto.
        const substituteMedia = {
            video_url: suggestion.video_url ?? '',
            video_thumb: suggestion.video_thumb ?? '',
            variations: '',
        };

        setExercises((prev) =>
            prev.map((e) =>
                e.id === targetId
                    ? {
                          ...e,
                          name: suggestion.nome_exercicio,
                          muscle_group: suggestion.grupo_muscular,
                          ...substituteMedia,
                          substitutedFrom: e.substitutedFrom ?? e.name,
                      }
                    : e,
            ),
        );

        // O WorkoutLogger monta os logs a partir de currentTraining.exercises,
        // não do estado `exercises` acima — sem atualizar os dois, o aluno
        // registraria a série sob o nome do exercício antigo.
        setCurrentTraining((prev) =>
            prev
                ? {
                      ...prev,
                      exercises: prev.exercises.map((x) =>
                          x.id === targetId
                              ? {
                                    ...x,
                                    name: suggestion.nome_exercicio,
                                    muscle_group: suggestion.grupo_muscular,
                                }
                              : x,
                      ),
                  }
                : prev,
        );

        if (selectedExercise?.id === targetId) {
            setSelectedExercise((prev) =>
                prev
                    ? {
                          ...prev,
                          name: suggestion.nome_exercicio,
                          muscle_group: suggestion.grupo_muscular,
                          ...substituteMedia,
                          substitutedFrom: prev.substitutedFrom ?? prev.name,
                      }
                    : prev,
            );
        }

        setSubstitutionFor(null);
    };

    // Resolve os parâmetros de autorregulação: config do personal (quando
    // definida) sobrepondo o padrão do app, campo a campo (ver
    // libs/autoregulationPolicy.ts). Ainda não há níveis de macro/microciclo
    // persistidos, então o único override possível hoje é o do personal.
    const policy = useMemo(
        () =>
            resolveAutoregulationPolicy({ personal: autoregulationOverrides })
                .policy,
        [autoregulationOverrides],
    );

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
                policy,
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
            policy,
        ],
    );

    /** RPE alvo de hoje: o do microciclo ajustado pela zona do dia. É o que o
     * "Finalizar treino" pré-preenche e o que o "feito" grava. */
    const sessionTargetRPE = Math.max(
        1,
        Math.min(
            10,
            (currentMicro?.target_rpe ?? 7) +
                (decision.zone === 'fadiga'
                    ? -1
                    : decision.zone === 'supercompensacao'
                      ? 0.5
                      : 0),
        ),
    );

    // Sugestão de carga por exercício: combina prescrição do personal com o
    // histórico executado pelo aluno e aplica por cima o ajuste do dia
    // decidido acima (ver libs/loadSuggestion.ts). Mapeado por exercise.id
    // para alimentar tanto a lista de exercícios quanto o card de detalhe.
    const loadSuggestions = useMemo(() => {
        const targetRPE =
            currentMicro?.target_rpe != null
                ? currentMicro.target_rpe +
                  (decision.zone === 'fadiga'
                      ? -1
                      : decision.zone === 'supercompensacao'
                        ? 0.5
                        : 0)
                : 7;
        const isDeload = Boolean(currentMicro?.is_deload) || decision.triggerDeload;

        const map: Record<string, LoadSuggestion> = {};
        for (const exercise of exercises) {
            map[exercise.id] = computeLoadSuggestion({
                prescribedKg: exercise.plannedWeight,
                prescribedAt: exercise.loadPrescribedAt,
                history: [
                    ...(loadHistoryByExercise[`key:${exerciseKeyFor(exercise)}`] ?? []),
                    ...(loadHistoryByExercise[`id:${exercise.id}`] ?? []),
                ],
                targetRPE,
                // Topo da faixa de reps prescrita (dupla progressão): só
                // conta como sessão qualificada se também bateu as reps.
                plannedReps:
                    exercise.series.length > 0
                        ? Math.max(...exercise.series)
                        : undefined,
                autoregulationAdjustPct: decision.intraSessionLoadAdjustPct,
                isDeload,
                referenceDate: new Date().toISOString().slice(0, 10),
                policy,
            });
        }
        return map;
    }, [exercises, loadHistoryByExercise, currentMicro, decision, policy]);

    // Blocos de bi-set/trisset/superset: exercícios consecutivos com o mesmo
    // group_id (ver libs/trainingTechniques.ts). Bloco de tamanho 1 = avulso.
    const exerciseGroups = useMemo(
        () => partitionExerciseGroups(exercises),
        [exercises],
    );

    // Próximo exercício do mesmo bloco do exercício aberto no detail card —
    // usado para trocar o timer de descanso por um atalho "sem descanso,
    // siga direto" (ver ExerciseDetailCard).
    const nextInGroup = useMemo(() => {
        if (!selectedExercise) return null;
        const idx = exercises.findIndex((e) => e.id === selectedExercise.id);
        if (idx === -1) return null;
        const next = exercises[idx + 1];
        if (
            next &&
            selectedExercise.group_id &&
            next.group_id === selectedExercise.group_id
        ) {
            return next;
        }
        return null;
    }, [exercises, selectedExercise]);

    // Cronômetro de cada bloco-circuito, pelo id do 1º exercício do bloco:
    // o card do exercício aberto ganha um "Iniciar circuito" que dá o start
    // no cronômetro certo sem a aluna ter que achar o bloco na lista.
    const circuitTimers = useRef(new Map<string, CircuitTimerHandle>());
    const selectedCircuitKey = useMemo(() => {
        if (!selectedExercise?.group_id) return null;
        const group = exerciseGroups.find(
            (g) =>
                g.length > 1 && g.some((e) => e.id === selectedExercise.id),
        );
        return group && circuitHasTimedWork(toCircuit(group))
            ? group[0].id
            : null;
    }, [exerciseGroups, selectedExercise]);

    if (isLoading) {
        return <div className="p-6 text-center">Carregando exercícios...</div>;
    }

    if (overdueBlocked) {
        return (
            <div className="p-6">
                <OverdueBlockNotice what="ao seu treino" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center text-red-600">Erro: {error}</div>
        );
    }

    return (
        <>
            <div className="container mx-auto p-4 min-h-screen relative">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <Link
                        href={getStudentHomeRoute()}
                        className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-2"
                    >
                        <FiArrowLeft /> Voltar para Meus Treinos
                    </Link>
                    <SyncPendingBadge />
                </div>
                {isOffline && (
                    <div
                        className="alert alert-warning py-2 px-3 mb-3 d-flex align-items-center gap-2"
                        style={{ fontSize: '0.85rem' }}
                    >
                        <FiWifiOff /> Exibindo treino salvo offline (sem conexão no momento).
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
                                {trainingLabel || trainingRef.toUpperCase()}
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
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setMicroPanelOpen((v) => !v)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setMicroPanelOpen((v) => !v);
                            }
                        }}
                        aria-expanded={microPanelOpen}
                        className={`card-body d-flex justify-content-between align-items-center ${styles.microPanelToggle}`}
                    >
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
                        <div className="d-flex align-items-center gap-2">
                            {currentMicro && (
                                <span className="badge bg-secondary">
                                    Semana {currentMicro.week_number}
                                </span>
                            )}
                            <span
                                aria-hidden
                                className={
                                    microPanelOpen
                                        ? styles.microPanelChevronOpen
                                        : styles.microPanelChevron
                                }
                            >
                                ▾
                            </span>
                        </div>
                    </div>

                    {microPanelOpen && (
                    <div className="card-body pt-0">
                        <p className="small alert alert-info py-2 px-3 mb-3 d-flex align-items-start gap-2">
                            <FiInfo className="flex-shrink-0 mt-1" /> Preencha estes campos todos os dias antes de
                            treinar e sempre finalize o treino pelo app (não
                            deixe pendente) — é isso que alimenta o histórico
                            usado para calcular e evoluir a sugestão de carga.
                        </p>
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
                    )}
                </div>
                {exercises.length > 0 ? (
                    <ul className={`${styles.exerciseListContainer} space-y-3`}>
                        {exerciseGroups.map((group) => {
                            const isCombo = group.length > 1;
                            const items = group.map((exercise) => {
                                const suggestion = loadSuggestions[exercise.id];
                                const done = doneIds.has(exercise.id);
                                // O círculo de "feito" é irmão do botão, não
                                // filho: um <button> não pode conter outro
                                // controle. Fica por cima, no canto direito
                                // (ver .exerciseItemRow).
                                return (
                                    <div
                                        key={exercise.id}
                                        className={styles.exerciseItemRow}
                                    >
                                        <button
                                            onClick={() =>
                                                handleExerciseClick(exercise)
                                            }
                                            className={`${styles.cardButton} ${styles.exerciseItemContainer}`}
                                            data-done={done || undefined}
                                        >
                                            <div className="flex items-center">
                                                <ExerciseThumbnail
                                                    name={exercise.name}
                                                    videoThumb={exercise.video_thumb}
                                                    videoUrl={exercise.video_url}
                                                    className={
                                                        styles.exerciseThumbnail
                                                    }
                                                    style={{ marginRight: 16 }}
                                                />
                                                <div className="flex-grow">
                                                    <span
                                                        className="text-xl font-semibold"
                                                        style={{
                                                            color: 'var(--text-primary)',
                                                            display: 'block',
                                                        }}
                                                    >
                                                        {exercise.name}
                                                    </span>
                                                    {suggestion?.suggestedKg != null ? (
                                                        <span
                                                            className="small"
                                                            style={{
                                                                color: suggestion.abovePrescribed
                                                                    ? 'var(--coral, #ff6b6b)'
                                                                    : 'var(--mint, #3dffd0)',
                                                            }}
                                                            title={suggestion.reason}
                                                        >
                                                            Sugerido hoje:{' '}
                                                            {suggestion.suggestedKg} kg
                                                            {suggestion.source === 'ambos'
                                                                ? ' · base: você + personal'
                                                                : suggestion.source === 'aluno'
                                                                  ? ' · base: seu histórico'
                                                                  : ' · base: personal'}
                                                        </span>
                                                    ) : (
                                                        exercise.plannedWeight == null && (
                                                            <span
                                                                className="small"
                                                                style={{
                                                                    color: 'var(--text-muted)',
                                                                }}
                                                            >
                                                                Sem carga registrada ainda
                                                            </span>
                                                        )
                                                    )}
                                                </div>
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
                                        <DoneToggle
                                            className={styles.exerciseDone}
                                            checked={done}
                                            onChange={() =>
                                                toggleDone(exercise.id)
                                            }
                                            exerciseName={exercise.name}
                                        />
                                    </div>
                                );
                            });

                            if (!isCombo) {
                                return <li key={group[0].id}>{items}</li>;
                            }
                            // Bloco com série por tempo: guia a execução em
                            // rodadas (ver libs/circuitPlan.ts).
                            const circuit = toCircuit(group);
                            const circuitKey = group[0].id;
                            return (
                                <li
                                    key={group[0].id}
                                    className={styles.exerciseGroupBlock}
                                >
                                    <div className={styles.exerciseGroupBadge}>
                                        <FiLink />{' '}
                                        {comboGroupLabel(
                                            group.length,
                                            group[0].group_technique,
                                        )}{' '}
                                        {blockRecoverySeconds(group) > 0
                                            ? `— ${blockRecoverySeconds(group)} s de recuperação entre os exercícios`
                                            : '— sem descanso entre os exercícios'}
                                    </div>
                                    {/* Cronômetro ANTES dos exercícios: embaixo
                                        do bloco, o "Iniciar circuito" só
                                        aparecia depois de rolar a tela. */}
                                    {circuitHasTimedWork(circuit) && (
                                        <CircuitTimer
                                            key={JSON.stringify(circuit)}
                                            ref={(h) => {
                                                if (h) {
                                                    circuitTimers.current.set(
                                                        circuitKey,
                                                        h,
                                                    );
                                                } else {
                                                    circuitTimers.current.delete(
                                                        circuitKey,
                                                    );
                                                }
                                            }}
                                            exercises={circuit}
                                            recoverySeconds={blockRecoverySeconds(
                                                group,
                                            )}
                                            storageKey={`${currentMicro?.id ?? macrocycleId}:${trainingId}:${circuitKey}`}
                                            onStart={markSessionStart}
                                            onComplete={() => {
                                                markCircuitDone(circuitKey);
                                                markDone(
                                                    group.map((e) => e.id),
                                                );
                                            }}
                                            doneAction={
                                                sendStatus === 'idle' ||
                                                sendStatus === 'error' ? (
                                                    <Button
                                                        variant="primary"
                                                        fullWidth
                                                        leftIcon={<FiCheck />}
                                                        onClick={
                                                            openWorkoutLogger
                                                        }
                                                    >
                                                        Registrar treino
                                                    </Button>
                                                ) : undefined
                                            }
                                        />
                                    )}
                                    <div className={styles.exerciseGroupItems}>
                                        {items}
                                    </div>
                                </li>
                            );
                        })}
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
                        loadAdjustPct={decision.intraSessionLoadAdjustPct}
                        loadSuggestion={loadSuggestions[selectedExercise.id]}
                        nextInGroup={nextInGroup}
                        onSelectExercise={handleExerciseClick}
                        onEquipmentUnavailable={setSubstitutionFor}
                        onStartCircuit={
                            selectedCircuitKey
                                ? () => {
                                      circuitTimers.current
                                          .get(selectedCircuitKey)
                                          ?.start();
                                      handleCloseDetailCard();
                                  }
                                : undefined
                        }
                        onShowHistory={() =>
                            setHistoryFor({
                                key: exerciseKeyFor(selectedExercise),
                                name: selectedExercise.name,
                            })
                        }
                        done={doneIds.has(selectedExercise.id)}
                        onToggleDone={() => toggleDone(selectedExercise.id)}
                    />
                )}
                {historyFor && (
                    <ExerciseLoadHistoryModal
                        open={!!historyFor}
                        onClose={() => setHistoryFor(null)}
                        exerciseKey={historyFor.key}
                        exerciseName={historyFor.name}
                    />
                )}
                {substitutionFor && (
                    <ExerciseSubstitutionModal
                        open
                        exercise={substitutionFor}
                        planningId={macrocycleId}
                        trainingId={trainingId}
                        onClose={() => setSubstitutionFor(null)}
                        onApply={handleApplySubstitution}
                    />
                )}
                <div className={styles.finalizarContainer}>
                    {sendStatus === 'success' ? (
                        <p className={styles.finalizarSuccess}>
                            <FiCheck /> Treino finalizado com sucesso!
                        </p>
                    ) : sendStatus === 'queued' ? (
                        <p className={styles.finalizarSuccess}>
                            <FiSave /> Salvo localmente — será sincronizado quando a
                            internet voltar.
                        </p>
                    ) : (
                        <button
                            className={styles.finalizarBtn}
                            onClick={openWorkoutLogger}
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
                    {commentSentTo !== null && sendStatus !== 'error' && (
                        <p className={styles.finalizarSuccess} role="status">
                            <FiMessageCircle /> Comentário enviado para{' '}
                            {commentSentTo || 'seu personal'}
                            {sendStatus === 'queued'
                                ? ' — vai junto com o treino, assim que tiver internet.'
                                : '.'}{' '}
                            <Link href="/meus-comentarios">Ver respostas</Link>
                        </p>
                    )}
                    {shareData && !shareOpen && (
                        <button
                            type="button"
                            className={styles.compartilharBtn}
                            onClick={() => setShareOpen(true)}
                        >
                            <FiShare2 /> Compartilhar treino
                        </button>
                    )}
                    {newRecords.length > 0 && (
                        <div className={styles.recordNotice} role="status">
                            <p>
                                <FiAward aria-hidden="true" />{' '}
                                {newRecords.length === 1
                                    ? 'Novo recorde!'
                                    : `${newRecords.length} novos recordes!`}
                            </p>
                            <ul>
                                {newRecords.map((r) => (
                                    <li key={r.key}>
                                        <strong>{r.name}</strong>:{' '}
                                        {r.kind === 'reps'
                                            ? `${r.current} repetições (antes ${r.previous})`
                                            : r.kind === 'load'
                                              ? `${formatKg(r.topLoadKg)} kg × ${r.topReps} (antes ${formatKg(r.previous)} kg)`
                                              : `${formatKg(r.topLoadKg)} kg × ${r.topReps} — 1RM estimado ${formatKg(r.current)} kg`}
                                    </li>
                                ))}
                            </ul>
                            <button
                                type="button"
                                className={styles.compartilharBtn}
                                onClick={() => setRecordShareOpen(true)}
                            >
                                <FiShare2 /> Compartilhar recorde
                            </button>
                        </div>
                    )}
                    {photoDiscardedWarning && (
                        <p className={styles.finalizarWarning}>
                            <FiAlertTriangle /> O treino foi salvo, mas a foto do
                            check-in não pôde ser guardada (sem espaço no
                            aparelho ou arquivo inválido) — tente anexar uma
                            foto menor no próximo treino.
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
                    circuitDoneBlockKeys={circuitDoneKeys}
                    doneLoadKg={Object.fromEntries(
                        exercises
                            .filter((e) => doneIds.has(e.id))
                            .map((e) => [e.id, doneLoadKg(e)]),
                    )}
                    autoregulation={{
                        targetRPE: sessionTargetRPE,
                        intraSessionLoadAdjustPct:
                            decision.intraSessionLoadAdjustPct,
                        message: decision.message,
                    }}
                    onClose={() => setShowWorkoutLogger(false)}
                    onComplete={() => {
                        setShowWorkoutLogger(false);
                        setSendStatus('success');
                        forgetDone();
                    }}
                    loadHistory={loadHistory}
                    onQueued={(info) => {
                        setShowWorkoutLogger(false);
                        setSendStatus('queued');
                        forgetDone();
                        if (info?.commented) {
                            setCommentSentTo(getCachedMyLogWindow()?.personal_name ?? '');
                        }
                        if (info?.photoDiscarded) setPhotoDiscardedWarning(true);
                        // Recorde contra o histórico que a tela já tem (ou o
                        // do cache): o treino acabou de entrar na fila e
                        // talvez nem sincronize agora — o aluno não precisa
                        // esperar a rede para saber que bateu a marca.
                        if (info?.performed?.length) {
                            const performed = info.performed;
                            void (async () => {
                                const history = loadHistory ?? (await getCachedLoadHistorySummary());
                                setNewRecords(detectNewRecords(performed, history));
                            })();
                        }
                        if (info?.share) {
                            setShareData(info.share);
                            // Abre sozinho SÓ quando há foto: aí o convite é
                            // sobre algo que o aluno acabou de criar. Sem
                            // foto, o card existe igual, mas quem decide
                            // abri-lo é o botão do aviso de sucesso — abrir
                            // um diálogo de divulgação por conta própria a
                            // cada treino cansaria rápido.
                            setShareOpen(!!info.share.photo);
                        }
                    }}
                />
            )}
            {shareData && (
                <ShareAchievementModal
                    open={shareOpen}
                    onClose={() => setShareOpen(false)}
                    title="Compartilhar treino"
                    card={{
                        photo: shareData.photo,
                        headline: 'Treino concluído',
                        subline: `Treino ${shareData.trainingName} · ${new Date().toLocaleDateString('pt-BR')}`,
                        stats: workoutShareStats(shareData),
                        callToAction: 'Meu treino de hoje, registrado no',
                    }}
                    captionLines={[
                        `Treino ${shareData.trainingName} concluído. Mais um dia feito.`,
                        workoutShareStats(shareData)
                            .map((st) => `${st.value} ${st.label}`)
                            .join(' · '),
                    ]}
                />
            )}
            {newRecords.length > 0 && (
                <ShareAchievementModal
                    open={recordShareOpen}
                    onClose={() => setRecordShareOpen(false)}
                    title="Compartilhar recorde"
                    card={{
                        // Mesma foto do check-in, quando houver: é o dia do recorde.
                        photo: shareData?.photo ?? null,
                        headline:
                            newRecords.length === 1
                                ? `Novo recorde no ${newRecords[0].name}`
                                : `${newRecords.length} recordes hoje`,
                        subline: new Date().toLocaleDateString('pt-BR'),
                        stats: recordShareStats(newRecords),
                        callToAction: 'Minha evolução de carga, registrada no',
                    }}
                    captionLines={newRecords.map((r) =>
                        r.kind === 'reps'
                            ? `Novo recorde no ${r.name}: ${r.current} repetições.`
                            : `Novo recorde no ${r.name}: ${formatKg(r.topLoadKg)} kg × ${r.topReps}.`,
                    )}
                />
            )}
        </>
    );
}

/** Números do card de recorde: com um recorde, a marca dele; com vários, um
 * por exercício (o card aceita até três). */
function recordShareStats(records: NewRecord[]) {
    if (records.length === 1) {
        const r = records[0];
        if (r.kind === 'reps') return [{ label: 'repetições', value: String(r.current) }];
        return [
            { label: 'kg', value: formatKg(r.topLoadKg) },
            { label: 'repetições', value: String(r.topReps) },
        ];
    }
    return records.slice(0, 3).map((r) => ({
        label: r.name,
        value: r.kind === 'reps' ? `${r.current} reps` : `${formatKg(r.topLoadKg)} kg`,
    }));
}

/** Números que entram no card do treino. Cada um só aparece quando existe de
 * verdade: "0 kg" ou "0 min" num post diz que o app não sabe o que
 * aconteceu. */
function workoutShareStats(data: WorkoutShareData) {
    const stats: Array<{ label: string; value: string }> = [];
    if (data.exerciseCount > 0) {
        stats.push({ label: 'exercícios', value: String(data.exerciseCount) });
    }
    if (data.durationMinutes && data.durationMinutes > 0) {
        stats.push({ label: 'minutos', value: String(data.durationMinutes) });
    }
    if (data.volumeKg > 0) {
        stats.push({
            label: 'kg levantados',
            value: data.volumeKg.toLocaleString('pt-BR'),
        });
    }
    return stats;
}
