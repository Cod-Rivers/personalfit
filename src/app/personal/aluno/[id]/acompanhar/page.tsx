'use client';

/**
 * Acompanhamento presencial — a tela que o personal abre com o aluno ao lado.
 *
 * Existe porque nenhuma das telas que ele usava antes servia para isso:
 *
 * - "Ver como Aluno" (Header) troca para a área do aluno mas carrega o
 *   vínculo de aluno DO PRÓPRIO personal (getMyMacrocycle) — nunca o do aluno
 *   atendido, e o botão só aparece para quem tem vínculo próprio.
 * - A periodização (../periodizacao/[planningId]) é a tela de MONTAR o plano:
 *   abre na lista de fases e obriga a caçar o mesociclo, a semana e o treino
 *   de hoje antes de ver uma série.
 *
 * Aqui o caminho é: abrir → o treino de hoje já resolvido → conferir a série
 * prescrita e a última carga → finalizar. O registro que sai daqui é DO
 * ALUNO (conta em aderência, evolução e desafio), carimbado pelo servidor
 * como `recorded_via: "personal_assisted"` a partir do token — ver
 * workout-session-controller.go.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { FiArrowLeft, FiCheck, FiCheckCircle, FiWifiOff } from 'react-icons/fi';
import {
    getMacrocycle,
    getStudentPlannings,
    pickActiveMicrocycle,
    type MacrocycleResponse,
    type MesocycleResponse,
    type MicrocycleResponse,
    type TrainingResponse,
} from '@/libs/planningService';
import {
    getStudentMicrocycleWorkoutLogs,
    type NewWorkoutLogResponse,
} from '@/libs/workoutLogService';
import {
    getCachedPersonalMacrocycle,
    getCachedPersonalStudents,
    getCachedStudentPlannings,
    isOfflineError,
} from '@/libs/offline/personalCache';
import { Api } from '@/libs/api';
import { formatSeries } from '@/libs/seriesPrescription';
import {
    comboGroupLabel,
    partitionExerciseGroups,
} from '@/libs/trainingTechniques';
import ExerciseThumbnail from '@/components/features/ExerciseThumbnail';
import WorkoutLogger from '@/components/features/WorkoutLogger';
import { useToast } from '@/components/system/Toast';
import { markWorkoutStartIfNeeded } from '@/libs/workoutSessionTimer';
import s from './acompanhar.module.css';

interface StudentRow {
    id: string;
    name: string;
}

/** Mesociclo + microciclo que estão valendo hoje. `pickActiveMicrocycle` já
 * resolve a semana dentro de UM mesociclo; aqui falta decidir qual mesociclo
 * — o primeiro que tem semana ativa, e não simplesmente o primeiro da lista
 * (um plano de quatro fases abriria sempre na fase 1, mesmo em dezembro). */
function pickCurrentCycle(macro: MacrocycleResponse): {
    meso: MesocycleResponse;
    micro: MicrocycleResponse;
} | null {
    const mesos = [...(macro.mesocycles ?? [])].sort((a, b) => a.order - b.order);
    for (const meso of mesos) {
        const micro = pickActiveMicrocycle(meso.microcycles);
        if (micro) return { meso, micro };
    }
    // Plano sem nenhuma semana marcada como ativa: cai na primeira fase que
    // ao menos tenha treinos, para a tela não morrer vazia com o aluno
    // esperando.
    const withTrainings = mesos.find((m) => (m.trainings ?? []).length > 0);
    const micro = withTrainings?.microcycles?.[0];
    if (withTrainings && micro) return { meso: withTrainings, micro };
    return null;
}

export default function AcompanharTreinoPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const searchParams = useSearchParams();
    const studentId = params.id;
    const { showSuccess, ToastSlot } = useToast();

    const [studentName, setStudentName] = useState('');
    const [macro, setMacro] = useState<MacrocycleResponse | null>(null);
    const [logs, setLogs] = useState<NewWorkoutLogResponse[]>([]);
    const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(
        null,
    );
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState('');
    const [isOfflineData, setIsOfflineData] = useState(false);
    const [loggerOpen, setLoggerOpen] = useState(false);

    /* ── Nome do aluno ──
     * Best-effort e nunca bloqueia: sem ele a tela continua inteira, só com
     * o título genérico. O cache do painel do personal responde primeiro
     * porque é o caminho que funciona sem rede. */
    useEffect(() => {
        let alive = true;
        (async () => {
            const cached = await getCachedPersonalStudents<StudentRow>();
            const hit = cached?.find((st) => st.id === studentId);
            if (hit && alive) setStudentName(hit.name);
            try {
                const { data } = await Api.get<StudentRow>(
                    `/students/${studentId}`,
                );
                if (alive && data?.name) setStudentName(data.name);
            } catch {
                /* offline ou 403: fica com o que o cache deu */
            }
        })();
        return () => {
            alive = false;
        };
    }, [studentId]);

    /* ── Plano ──
     * `?planningId=` permite chegar aqui direto de um plano específico (o
     * botão da periodização manda o plano aberto); sem ele, resolve o plano
     * ativo do aluno. Offline cai no mesmo cache que a periodização alimenta
     * — ver personalCache.ts. */
    const loadPlan = useCallback(async () => {
        const fromQuery = searchParams.get('planningId');
        try {
            let planningId = fromQuery;
            if (!planningId) {
                const plannings = await getStudentPlannings(studentId);
                if (plannings.length === 0) {
                    setPageError(
                        'Este aluno ainda não tem um plano de treino. Monte a periodização antes de acompanhar a sessão.',
                    );
                    return;
                }
                planningId = (
                    plannings.find((p) => p.status === 'active') ?? plannings[0]
                ).id;
            }
            const data = await getMacrocycle(studentId, planningId);
            setMacro(data);
            setIsOfflineData(false);
            setPageError('');
        } catch (e) {
            // Mesma distinção de sempre (rules/api-error-offline-vs-server):
            // sem resposta = sem rede, cai na cópia local; resposta 4xx/5xx é
            // erro de verdade e o plano velho só esconderia o motivo.
            if (isOfflineError(e)) {
                const cachedPlannings =
                    await getCachedStudentPlannings(studentId);
                const targetId =
                    fromQuery ??
                    (
                        cachedPlannings?.find((p) => p.status === 'active') ??
                        cachedPlannings?.[0]
                    )?.id;
                const cached = targetId
                    ? await getCachedPersonalMacrocycle(studentId, targetId)
                    : null;
                if (cached) {
                    setMacro(cached);
                    setIsOfflineData(true);
                    setPageError('');
                    return;
                }
                setPageError(
                    'Sem conexão e este plano ainda não foi aberto neste aparelho. Abra a periodização do aluno uma vez com internet para poder acompanhar offline.',
                );
                return;
            }
            setPageError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, [studentId, searchParams]);

    useEffect(() => {
        void loadPlan();
    }, [loadPlan]);

    const cycle = useMemo(() => (macro ? pickCurrentCycle(macro) : null), [macro]);

    /* ── O que o aluno já registrou nesta semana ──
     * É daqui que sai tanto o "já feito" no seletor de treino quanto a última
     * carga por exercício. Falha não bloqueia: sem esses números a tela ainda
     * mostra a prescrição e finaliza o treino. */
    const loadLogs = useCallback(async () => {
        if (!macro || !cycle) return;
        try {
            const data = await getStudentMicrocycleWorkoutLogs(
                studentId,
                macro.id,
                cycle.meso.id,
                cycle.micro.id,
            );
            setLogs(data);
        } catch {
            setLogs([]);
        }
    }, [studentId, macro, cycle]);

    useEffect(() => {
        void loadLogs();
    }, [loadLogs]);

    // Rede de volta: recarrega plano e registros, para a tela sair da cópia
    // local e já refletir o que a fila offline acabou de sincronizar.
    useEffect(() => {
        const onOnline = () => {
            void loadPlan();
            void loadLogs();
        };
        window.addEventListener('online', onOnline);
        return () => window.removeEventListener('online', onOnline);
    }, [loadPlan, loadLogs]);

    const trainings = useMemo(
        () => cycle?.meso.trainings ?? [],
        [cycle],
    );

    /** Treino escolhido — por padrão o primeiro que ainda não foi concluído
     * nesta semana, que é quase sempre o de hoje. Sem isso o personal abria
     * sempre no treino A e tinha que corrigir à mão a partir da terça. */
    const selectedTraining: TrainingResponse | null = useMemo(() => {
        if (trainings.length === 0) return null;
        if (selectedTrainingId) {
            return (
                trainings.find((t) => t.id === selectedTrainingId) ??
                trainings[0]
            );
        }
        const completedRefs = new Set(
            logs
                .filter((l) => l.status === 'completed')
                .map((l) => l.training_ref),
        );
        return (
            trainings.find((t) => !completedRefs.has(t.reference)) ??
            trainings[0]
        );
    }, [trainings, selectedTrainingId, logs]);

    /** Última carga registrada por exercício, na semana corrente. Casa por
     * exercise_id e, quando ele muda entre reedições do plano, pelo nome — é
     * a mesma dupla de chaves que o motor de sugestão de carga do aluno usa
     * (loadSuggestion.ts). */
    const lastLoadByExercise = useMemo(() => {
        const byKey = new Map<string, number>();
        for (const log of logs) {
            if (log.status !== 'completed') continue;
            for (const perf of log.exercises ?? []) {
                if (perf.load_kg <= 0) continue;
                byKey.set(perf.exercise_id, perf.load_kg);
                if (perf.name) byKey.set(perf.name.toLowerCase(), perf.load_kg);
            }
        }
        return byKey;
    }, [logs]);

    const completedRefs = useMemo(
        () =>
            new Set(
                logs
                    .filter((l) => l.status === 'completed')
                    .map((l) => l.training_ref),
            ),
        [logs],
    );

    /* ── Cronômetro da sessão ──
     * Sem isto o registro saía sempre sem duração: WorkoutLogger lê o início
     * de `workoutSessionTimer`, que o aluno carimba ao abrir um exercício no
     * app dele — coisa que nunca acontece no aparelho do personal. Aqui o
     * relógio começa quando o treino aparece na tela, que é quando o
     * atendimento de fato começou. A chave do timer já é por usuário logado,
     * então a contagem de um personal não contamina a do aluno. */
    useEffect(() => {
        if (!cycle || !selectedTraining) return;
        markWorkoutStartIfNeeded(cycle.micro.id, selectedTraining.reference);
    }, [cycle, selectedTraining]);

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border" role="status">
                    <span className="visually-hidden">Carregando...</span>
                </div>
            </div>
        );
    }

    if (pageError) {
        return (
            <div className={s.page}>
                <div className={s.container}>
                    <div className={s.errorBox}>{pageError}</div>
                    <button
                        className={s.btnBack}
                        style={{ marginTop: 'var(--space-4)' }}
                        onClick={() => router.push(`/personal/aluno/${studentId}/periodizacao`)}
                    >
                        <FiArrowLeft /> Ir para a periodização
                    </button>
                </div>
            </div>
        );
    }

    if (!macro) return null;

    const selectedDone =
        selectedTraining !== null &&
        completedRefs.has(selectedTraining.reference);

    return (
        <div className={s.page}>
            {ToastSlot}
            <div className={s.container}>
                <div className={s.header}>
                    <div>
                        <h1 className={s.headerTitle}>
                            {studentName
                                ? `Acompanhando ${studentName}`
                                : 'Acompanhar treino'}
                        </h1>
                        <p className={s.headerSub}>{macro.name}</p>
                    </div>
                    <button
                        className={s.btnBack}
                        onClick={() =>
                            router.push(
                                `/personal/aluno/${studentId}/periodizacao/${macro.id}`,
                            )
                        }
                    >
                        <FiArrowLeft /> Editar plano
                    </button>
                </div>

                <div className={s.chips}>
                    {cycle && (
                        <>
                            <span className={s.chip}>{cycle.meso.name}</span>
                            <span className={s.chip}>
                                Semana {cycle.micro.week_number}
                                {cycle.micro.is_deload ? ' · deload' : ''}
                            </span>
                            {cycle.micro.target_rpe ? (
                                <span className={s.chip}>
                                    RPE alvo {cycle.micro.target_rpe}
                                </span>
                            ) : null}
                        </>
                    )}
                    <span className={s.chip}>
                        {completedRefs.size} de {trainings.length} treinos feitos
                        nesta semana
                    </span>
                </div>

                {isOfflineData && (
                    <div className={s.notice}>
                        <FiWifiOff /> Sem conexão — mostrando a última versão
                        deste plano salva no aparelho. Finalizar o treino
                        continua funcionando: o registro fica guardado aqui e
                        é enviado assim que a internet voltar.
                    </div>
                )}

                {!cycle || trainings.length === 0 ? (
                    <p className={s.empty}>
                        Este plano ainda não tem treinos montados nesta fase.
                        Abra a periodização para prescrever.
                    </p>
                ) : (
                    <>
                        <h2 className={s.sectionTitle}>Treino de hoje</h2>
                        <div className={s.trainingGrid}>
                            {trainings.map((t) => {
                                const done = completedRefs.has(t.reference);
                                const active = selectedTraining?.id === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        className={`${s.trainingCard}${active ? ` ${s.trainingCardActive}` : ''}`}
                                        onClick={() =>
                                            setSelectedTrainingId(t.id)
                                        }
                                        aria-pressed={active}
                                    >
                                        <span className={s.trainingRef}>
                                            Treino {t.reference}
                                        </span>
                                        <span className={s.trainingMeta}>
                                            {t.exercises?.length ?? 0}{' '}
                                            {(t.exercises?.length ?? 0) === 1
                                                ? 'exercício'
                                                : 'exercícios'}
                                        </span>
                                        {done && (
                                            <span className={s.doneTag}>
                                                <FiCheckCircle /> Feito nesta
                                                semana
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {selectedTraining && (
                            <>
                                <h2 className={s.sectionTitle}>
                                    Série prescrita
                                </h2>
                                <div className={s.exerciseList}>
                                    {partitionExerciseGroups(
                                        selectedTraining.exercises ?? [],
                                    ).map((block, blockIdx) => {
                                        const rows = block.map((ex) => {
                                            const last =
                                                lastLoadByExercise.get(ex.id) ??
                                                lastLoadByExercise.get(
                                                    ex.name.toLowerCase(),
                                                );
                                            return (
                                                <div
                                                    key={ex.id}
                                                    className={s.exerciseRow}
                                                >
                                                    <ExerciseThumbnail
                                                        name={ex.name}
                                                        videoThumb={
                                                            ex.video_thumb
                                                        }
                                                        videoUrl={ex.video_url}
                                                        width={52}
                                                        height={52}
                                                        lazyCapture
                                                        captureFrame={false}
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
                                                            {ex.name}
                                                        </p>
                                                        <div
                                                            className={
                                                                s.prescription
                                                            }
                                                        >
                                                            <span>
                                                                {formatSeries(
                                                                    ex,
                                                                )}
                                                            </span>
                                                            {ex.load_kg ? (
                                                                <span>
                                                                    {ex.load_kg}
                                                                    kg
                                                                    prescritos
                                                                </span>
                                                            ) : null}
                                                            {ex.rest_seconds ? (
                                                                <span>
                                                                    {
                                                                        ex.rest_seconds
                                                                    }
                                                                    s de
                                                                    descanso
                                                                </span>
                                                            ) : null}
                                                            {ex.rpe_target ? (
                                                                <span>
                                                                    RPE{' '}
                                                                    {
                                                                        ex.rpe_target
                                                                    }
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    <span
                                                        className={`${s.lastLoad}${last ? '' : ` ${s.lastLoadEmpty}`}`}
                                                    >
                                                        {last
                                                            ? `Última: ${last}kg`
                                                            : 'Sem registro'}
                                                    </span>
                                                </div>
                                            );
                                        });

                                        if (block.length === 1) {
                                            return rows[0];
                                        }
                                        return (
                                            <div
                                                key={`block-${blockIdx}`}
                                                className={s.groupBlock}
                                            >
                                                <span className={s.groupLabel}>
                                                    {comboGroupLabel(
                                                        block.length,
                                                        block[0]
                                                            .group_technique,
                                                    )}{' '}
                                                    — sem descanso entre os
                                                    exercícios
                                                </span>
                                                {rows}
                                            </div>
                                        );
                                    })}
                                    {(selectedTraining.exercises ?? []).length ===
                                        0 && (
                                        <p className={s.empty}>
                                            Nenhum exercício prescrito neste
                                            treino.
                                        </p>
                                    )}
                                </div>

                                <div className={s.finishBar}>
                                    <button
                                        type="button"
                                        className={s.btnFinish}
                                        onClick={() => setLoggerOpen(true)}
                                        disabled={
                                            (selectedTraining.exercises ?? [])
                                                .length === 0
                                        }
                                    >
                                        <FiCheck />{' '}
                                        {selectedDone
                                            ? 'Registrar novamente'
                                            : 'Finalizar treino'}
                                    </button>
                                </div>
                                {selectedDone && (
                                    <p
                                        className={s.empty}
                                        style={{ marginTop: 'var(--space-2)' }}
                                    >
                                        O treino {selectedTraining.reference} já
                                        consta como feito nesta semana. Um novo
                                        registro para a mesma data é recusado
                                        pelo servidor — use outro dia ou outro
                                        treino.
                                    </p>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>

            {loggerOpen && cycle && selectedTraining && (
                <WorkoutLogger
                    studentId={studentId}
                    planningId={macro.id}
                    mesocycle={cycle.meso}
                    microcycle={cycle.micro}
                    training={selectedTraining}
                    assisted
                    studentName={studentName || undefined}
                    onClose={() => setLoggerOpen(false)}
                    onComplete={() => {
                        setLoggerOpen(false);
                        showSuccess('Treino registrado no histórico do aluno.');
                        void loadLogs();
                    }}
                    onQueued={() => {
                        setLoggerOpen(false);
                        // Sem rede o registro não some: fica na fila local e
                        // sai sozinho quando a internet voltar. Dizer isso é o
                        // que impede o personal de registrar de novo "porque
                        // não apareceu".
                        showSuccess(
                            'Treino guardado neste aparelho — será enviado ao histórico do aluno assim que houver internet.',
                        );
                    }}
                />
            )}
        </div>
    );
}
