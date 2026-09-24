'use client';

/**
 * Treino do aluno — a ÚNICA tela que o personal abre para ver e ajustar o
 * treino de um aluno ("Ver Treino" e "Acompanhar Treino" eram duas telas e
 * viraram esta). Serve na mesa e na academia, com o aluno do lado:
 *
 * - Tocar num exercício abre o MESMO card que o aluno vê
 *   (ExerciseDetailCard), e é nele que está TUDO do exercício: séries e carga
 *   editáveis na hora, + e × de série, e logo abaixo as abas do editor da
 *   fase (ExerciseInlineEditor — descanso, RPE, técnica, mídia, observações).
 *   Antes, qualquer coisa além de séries e carga exigia "Editar treino" →
 *   achar o exercício → abas.
 * - Na lista: + adiciona exercícios da biblioteca, o botão de troca abre a
 *   biblioteca para substituir, × exclui (com confirmação), e a alça ⠿
 *   reordena.
 * - Nos cartões de treino: + cria um treino novo e × exclui (com
 *   confirmação). O antigo "Editar treino" (editor da fase) saiu daqui;
 *   bi-set se monta pelo "+ Exercício" (multi-seleção → "Adicionar como")
 *   ou, com os exercícios já no treino, marcando 2+ no ✓ da alça →
 *   "Agrupar como". O resto da fase segue em "Plano completo".
 * - Fases e semanas continuam na periodização ("Plano completo").
 *
 * Por que não bastavam as telas antigas:
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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
    FiArrowLeft,
    FiCheck,
    FiCheckCircle,
    FiLink,
    FiPlus,
    FiWifiOff,
    FiX,
} from 'react-icons/fi';
import {
    createMesocycle,
    getMacrocycle,
    getStudentPlannings,
    pickActiveMicrocycle,
    updateMesocycle,
    type ExerciseLibraryItem,
    type ExerciseRequest,
    type ExerciseResponse,
    type MacrocycleResponse,
    type MesocycleRequest,
    type MesocycleResponse,
    type MicrocycleResponse,
    type TrainingResponse,
} from '@/libs/planningService';
import {
    getStudentMicrocycleWorkoutLogs,
    type NewWorkoutLogResponse,
} from '@/libs/workoutLogService';
import {
    cachePersonalMacrocycle,
    getCachedPersonalMacrocycle,
    getCachedPersonalStudents,
    getCachedStudentPlannings,
    isOfflineError,
} from '@/libs/offline/personalCache';
import { Api } from '@/libs/api';
import {
    GROUP_TECHNIQUE_CATALOG,
    comboGroupLabel,
    isGroupTechniqueValidForSize,
    partitionExerciseGroups,
} from '@/libs/trainingTechniques';
import WorkoutLogger from '@/components/features/WorkoutLogger';
import ExerciseDetailCard from '@/components/features/ExerciseDetailCard';
import type { ExerciseLog } from '@/components/features/types';
import PersonalAnamnesisQuickView from '@/components/features/PersonalAnamnesisQuickView';
import { toExerciseLog } from '@/libs/exerciseLog';
import { pickSavedMesocycle } from '@/app/personal/_shared/periodizacao/lib/mesocycleTransforms';
import {
    applyExercisePatch,
    saveExercisePatch,
} from '@/app/personal/_shared/periodizacao/lib/exercisePatch';
import {
    reorderById,
    saveExerciseOrder,
    saveTrainingOrder,
} from '@/app/personal/_shared/periodizacao/lib/reorderPatch';
import {
    addExercisesToTraining,
    addTrainingToMeso,
    groupExercisesInTraining,
    removeExerciseFromTraining,
    removeTrainingFromMeso,
    replaceExerciseInTraining,
    saveTrainingEdit,
    setGroupTechniqueInTraining,
    setGroupRecoveryInTraining,
    ungroupInTraining,
} from '@/app/personal/_shared/periodizacao/lib/trainingEditPatch';
import ExercisePicker from '@/app/personal/_shared/periodizacao/components/ExercisePicker';
import ExerciseInlineEditor from '@/app/personal/_shared/periodizacao/components/ExerciseInlineEditor';
import Modal from '@/components/system/Modal';
import { SortableItem, SortableList } from '@/components/system/SortableList';
import { useToast } from '@/components/system/Toast';
import { markWorkoutStartIfNeeded } from '@/libs/workoutSessionTimer';
import CircuitTimer from '@/components/molecules/CircuitTimer';
import {
    blockRecoverySeconds,
    circuitHasTimedWork,
    type CircuitExercise,
} from '@/libs/circuitPlan';
import { GroupRecoverySelect } from '@/app/personal/_shared/periodizacao/components/GroupingControls';
import StudentExerciseRow, { type WeekRecord } from './StudentExerciseRow';
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
    const mesos = [...(macro.mesocycles ?? [])].sort(
        (a, b) => a.order - b.order,
    );
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

/** Id do BLOCO para o arrastar e soltar: um bi-set anda inteiro, então quem
 * manda é o group_id; exercício solto responde pelo próprio id. */
function blockId(block: { id: string; group_id?: string }[]): string {
    return block[0].group_id ?? block[0].id;
}

/** Próximo exercício do mesmo bi-set/tri-set, para o card navegar dentro do
 * bloco — mesma regra da MesocycleSection. */
function nextInSameGroup(
    exercise: ExerciseLog,
    siblings: ExerciseLog[],
): ExerciseLog | null {
    const idx = siblings.findIndex((e) => e.id === exercise.id);
    const next = idx === -1 ? undefined : siblings[idx + 1];
    return next && exercise.group_id && next.group_id === exercise.group_id
        ? next
        : null;
}

export default function AcompanharTreinoPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const searchParams = useSearchParams();
    const studentId = params.id;
    const { showSuccess, showError, ToastSlot } = useToast();

    const [studentName, setStudentName] = useState('');
    const [macro, setMacro] = useState<MacrocycleResponse | null>(null);
    const [logs, setLogs] = useState<NewWorkoutLogResponse[]>([]);
    /** Registros da semana não carregaram: a linha não afirma "ainda não
     * fez" sem saber (ver WeekRecord). */
    const [logsFailed, setLogsFailed] = useState(false);
    const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(
        null,
    );
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState('');
    const [isOfflineData, setIsOfflineData] = useState(false);
    const [loggerOpen, setLoggerOpen] = useState(false);
    /** Exercício aberto no card do aluno (ajuste rápido). Só o ID: o card é
     * derivado do macrociclo atual, então uma gravação aparece nele na hora. */
    const [openExerciseId, setOpenExerciseId] = useState<string | null>(null);
    /** Marcação visual do personal durante o atendimento presencial — "já
     * apliquei este exercício com o aluno". Só nesta tela, só nesta sessão:
     * não é o registro do aluno (isso é `record`/`lastLoadByExercise`, vindo
     * do workout log) nem grava em lugar nenhum — reinicia ao trocar de
     * treino ou recarregar a página, de propósito, para nunca ficar
     * marcado de uma sessão presencial para a próxima.
     *
     * É também a SELEÇÃO do agrupamento: com 2+ marcados aparece a barra
     * "Agrupar como" (bi-set, tri-set…), para combinar exercícios que já
     * foram incluídos separados. Uma marcação só, dois usos — o personal
     * não precisa de um modo de seleção à parte. */
    const [completedExerciseIds, setCompletedExerciseIds] = useState<
        Set<string>
    >(new Set());
    /** Marca/desmarca um bloco inteiro: exercício solto ou todos os de um
     * bi-set. Bloco parcialmente marcado conta como desmarcado → marca tudo. */
    const toggleBlockCompleted = (ids: string[]) => {
        setCompletedExerciseIds((prev) => {
            const next = new Set(prev);
            const allOn = ids.every((id) => next.has(id));
            for (const id of ids) {
                if (allOn) next.delete(id);
                else next.add(id);
            }
            return next;
        });
    };
    /** Variante escolhida na barra "Agrupar como" ('' = sem variante). */
    const [groupTechnique, setGroupTechnique] = useState('');
    /** Biblioteca aberta: para acrescentar exercícios ao treino, ou para
     * trocar um deles. */
    const [picker, setPicker] = useState<
        { mode: 'add' } | { mode: 'replace'; exerciseId: string } | null
    >(null);
    /** Exercício ou treino esperando a confirmação de exclusão. */
    const [pendingDelete, setPendingDelete] = useState<
        | { kind: 'exercise'; id: string; name: string }
        | { kind: 'training'; id: string; name: string }
        | null
    >(null);
    const [busy, setBusy] = useState(false);

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

    const cycle = useMemo(
        () => (macro ? pickCurrentCycle(macro) : null),
        [macro],
    );

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
            setLogsFailed(false);
        } catch {
            setLogs([]);
            setLogsFailed(true);
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

    /* ── Ordem (arrastar e soltar) ──
     * Espelho local da ordem enquanto a gravação não volta: o plano desta tela
     * só muda com a RESPOSTA do servidor, então sem isto o item que o personal
     * acabou de arrastar pula de volta na frente do aluno. Falhou, o espelho
     * cai e a lista volta ao que o servidor tem. */
    const [trainingOrder, setTrainingOrder] = useState<string[] | null>(null);
    const [exerciseOrder, setExerciseOrder] = useState<
        Record<string, string[]>
    >({});

    useEffect(() => {
        setTrainingOrder(null);
        setExerciseOrder({});
    }, [macro]);

    const trainings = useMemo(() => {
        const list = cycle?.meso.trainings ?? [];
        return trainingOrder ? reorderById(list, trainingOrder) : list;
    }, [cycle, trainingOrder]);

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

    /** Modo por dia da semana: o rótulo que o aluno vê é o dia. Aí o treino
     * novo nasce no próximo dia livre e a letra NÃO acompanha a posição (ver
     * relabelByPosition). */
    const autoWeekday =
        macro?.planning_mode === 'simple' &&
        macro.simple_day_label !== 'number';

    /* ── Gravação ──
     * Mesmo contrato da periodização: a fase inteira vai ao servidor e a
     * resposta substitui o macrociclo desta tela (e o cache offline). */
    const onPersistMeso = useCallback(
        async (req: MesocycleRequest) => {
            if (!macro) return null;
            const updated = req.id
                ? await updateMesocycle(studentId, macro.id, req.id, req)
                : await createMesocycle(studentId, macro.id, req);
            // Síncrono, antes do re-render: a próxima gravação da fila
            // (ver `serialized`) roda logo em seguida e precisa partir disto.
            macroRef.current = updated;
            setMacro(updated);
            void cachePersonalMacrocycle(studentId, updated);
            return pickSavedMesocycle(updated, req.id);
        },
        [studentId, macro],
    );

    /* ── Fila de gravações ──
     * Toda gravação desta tela reenvia a FASE inteira. Duas em voo ao mesmo
     * tempo partiriam da mesma cópia, e a que chegasse por último apagaria a
     * outra — ex.: adicionar um exercício e arrastar outro logo depois fazia
     * o exercício novo sumir. Aqui elas saem uma de cada vez, e cada uma lê a
     * fase como ficou depois da anterior (macroRef), não a do momento do
     * toque. */
    const macroRef = useRef(macro);
    macroRef.current = macro;
    const saveChainRef = useRef<Promise<unknown>>(Promise.resolve());
    const serialized = useCallback(
        <T,>(job: (meso: MesocycleResponse) => Promise<T>): Promise<T> => {
            const run = saveChainRef.current.then(() => {
                const current = macroRef.current
                    ? pickCurrentCycle(macroRef.current)
                    : null;
                if (!current) {
                    throw new Error('Plano não carregado. Recarregue a página.');
                }
                return job(current.meso);
            });
            saveChainRef.current = run.catch(() => undefined);
            return run;
        },
        [],
    );

    /** Edição que foi para a fila offline: aplica o patch em memória e no
     * cache, senão o card voltaria a mostrar o valor antigo. */
    const onPrescriptionQueued = useCallback(
        (
            mesocycleId: string,
            trainingId: string,
            exerciseId: string,
            patch: Partial<ExerciseRequest>,
        ) => {
            setMacro((prev) => {
                if (!prev) return prev;
                const next = applyExercisePatch(
                    prev,
                    mesocycleId,
                    trainingId,
                    exerciseId,
                    patch,
                );
                void cachePersonalMacrocycle(studentId, next);
                macroRef.current = next;
                return next;
            });
        },
        [studentId],
    );

    const reorderTrainings = async (ids: string[]) => {
        if (!cycle) return;
        setTrainingOrder(ids);
        try {
            await serialized((meso) =>
                saveTrainingOrder(
                    { meso, persist: onPersistMeso, relabel: !autoWeekday },
                    ids,
                ),
            );
        } catch (e) {
            setTrainingOrder(null);
            showError((e as Error).message);
        }
    };

    const reorderExercises = async (trainingId: string, ids: string[]) => {
        if (!cycle) return;
        setExerciseOrder((prev) => ({ ...prev, [trainingId]: ids }));
        try {
            await serialized((meso) =>
                saveExerciseOrder(
                    { meso, persist: onPersistMeso },
                    trainingId,
                    ids,
                ),
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

    /** Exercícios do treino aberto, já na ordem que a tela está mostrando. */
    const selectedExercises = useMemo(() => {
        const list = selectedTraining?.exercises ?? [];
        const pending = selectedTraining
            ? exerciseOrder[selectedTraining.id]
            : undefined;
        return pending ? reorderById(list, pending) : list;
    }, [selectedTraining, exerciseOrder]);

    /** Blocos (exercício solto ou bi-set inteiro) do treino aberto. */
    const exerciseBlocks = useMemo(
        () => partitionExerciseGroups(selectedExercises),
        [selectedExercises],
    );

    const openExerciseView = useMemo(() => {
        if (!openExerciseId || !selectedTraining) return null;
        const siblings = selectedExercises.map(toExerciseLog);
        const exercise = siblings.find((e) => e.id === openExerciseId);
        const raw = selectedExercises.find((e) => e.id === openExerciseId);
        return exercise && raw ? { exercise, siblings, raw } : null;
    }, [openExerciseId, selectedTraining, selectedExercises]);

    /** Adicionar, excluir e trocar exercício: a fase inteira vai ao servidor
     * e a resposta substitui o plano da tela (ver trainingEditPatch.ts). */
    const editTraining = async (
        mutate: Parameters<typeof saveTrainingEdit>[1],
    ): Promise<MesocycleResponse | null> => {
        if (!cycle) return null;
        setBusy(true);
        try {
            return await serialized((meso) =>
                saveTrainingEdit({ meso, persist: onPersistMeso }, mutate),
            );
        } finally {
            setBusy(false);
        }
    };

    const addExercises = async (
        items: ExerciseLibraryItem[],
        groupTechnique?: string,
    ) => {
        if (!selectedTraining) return;
        setPicker(null);
        try {
            await editTraining((req) =>
                addExercisesToTraining(
                    req,
                    selectedTraining.id,
                    items,
                    groupTechnique,
                ),
            );
            showSuccess(
                items.length === 1
                    ? `${items[0].name} adicionado ao treino.`
                    : `${items.length} exercícios adicionados ao treino.`,
            );
        } catch (e) {
            showError((e as Error).message);
        }
    };

    const addTraining = async () => {
        // No modo por dia da semana o treino novo já nasce no próximo dia
        // livre — mesma regra do editor da fase.
        let position = -1;
        try {
            const saved = await editTraining((req) => {
                position = addTrainingToMeso(req, { autoWeekday });
            });
            const created = saved?.trainings[position];
            if (created) setSelectedTrainingId(created.id);
            showSuccess(
                created
                    ? `Treino ${created.reference} criado. Adicione os exercícios.`
                    : 'Treino criado.',
            );
        } catch (e) {
            showError((e as Error).message);
        }
    };

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        const target = pendingDelete;
        setPendingDelete(null);
        try {
            if (target.kind === 'training') {
                await editTraining((req) =>
                    removeTrainingFromMeso(req, target.id, {
                        relabel: !autoWeekday,
                    }),
                );
                // O treino escolhido (ou o exercício aberto dele) deixou de
                // existir: volta ao padrão em vez de apontar para o nada.
                if (selectedTraining?.id === target.id) {
                    setSelectedTrainingId(null);
                    setOpenExerciseId(null);
                }
                showSuccess(`${target.name} excluído.`);
                return;
            }
            if (!selectedTraining) return;
            await editTraining((req) =>
                removeExerciseFromTraining(req, selectedTraining.id, target.id),
            );
            if (openExerciseId === target.id) {
                setOpenExerciseId(null);
            }
            showSuccess(`${target.name} excluído do treino.`);
        } catch (e) {
            showError((e as Error).message);
        }
    };

    /** Exercícios marcados no treino aberto, na ordem da lista. */
    const markedExerciseIds = useMemo(
        () =>
            selectedExercises
                .filter((e) => completedExerciseIds.has(e.id))
                .map((e) => e.id),
        [selectedExercises, completedExerciseIds],
    );
    const effectiveGroupTechnique =
        groupTechnique &&
        isGroupTechniqueValidForSize(groupTechnique, markedExerciseIds.length)
            ? groupTechnique
            : '';

    /** Junta os marcados num bloco (ver groupExercisesInTraining). */
    const groupMarked = async () => {
        if (!selectedTraining || markedExerciseIds.length < 2) return;
        const ids = markedExerciseIds;
        const technique = effectiveGroupTechnique || undefined;
        try {
            await editTraining((req) =>
                groupExercisesInTraining(
                    req,
                    selectedTraining.id,
                    ids,
                    technique,
                ),
            );
            setCompletedExerciseIds((prev) => {
                const next = new Set(prev);
                for (const id of ids) next.delete(id);
                return next;
            });
            setGroupTechnique('');
            showSuccess(
                `${comboGroupLabel(ids.length, technique)} montado com ${ids.length} exercícios.`,
            );
        } catch (e) {
            showError((e as Error).message);
        }
    };

    const ungroup = async (groupId: string) => {
        if (!selectedTraining) return;
        try {
            await editTraining((req) =>
                ungroupInTraining(req, selectedTraining.id, groupId),
            );
            showSuccess(
                'Bloco desfeito — os exercícios voltaram a ser separados.',
            );
        } catch (e) {
            showError((e as Error).message);
        }
    };

    const changeGroupTechnique = async (groupId: string, value: string) => {
        if (!selectedTraining) return;
        try {
            await editTraining((req) =>
                setGroupTechniqueInTraining(
                    req,
                    selectedTraining.id,
                    groupId,
                    value || undefined,
                ),
            );
        } catch (e) {
            showError((e as Error).message);
        }
    };

    const changeGroupRecovery = async (groupId: string, seconds: number) => {
        if (!selectedTraining) return;
        try {
            await editTraining((req) =>
                setGroupRecoveryInTraining(
                    req,
                    selectedTraining.id,
                    groupId,
                    seconds,
                ),
            );
        } catch (e) {
            showError((e as Error).message);
        }
    };

    /** O ✓ na coluna da alça: marca o exercício (ou o bloco inteiro) como
     * aplicado — e é a seleção da barra "Agrupar como". */
    const renderMarkToggle = (block: ExerciseResponse[]) => {
        const ids = block.map((e) => e.id);
        const checked = ids.every((id) => completedExerciseIds.has(id));
        const name =
            block.length === 1
                ? block[0].name
                : comboGroupLabel(block.length, block[0].group_technique);
        const inputId = `complete-${blockId(block)}`;
        return (
            <>
                <input
                    id={inputId}
                    type="checkbox"
                    className={s.completeCheckbox}
                    checked={checked}
                    onChange={() => toggleBlockCompleted(ids)}
                />
                <label
                    htmlFor={inputId}
                    className={s.completeToggle}
                    data-checked={checked || undefined}
                    title={
                        checked
                            ? 'Desmarcar'
                            : 'Marcar como aplicado ou para agrupar'
                    }
                >
                    <FiCheck aria-hidden />
                    <span className={s.srOnly}>
                        {checked ? `Desmarcar ${name}` : `Marcar ${name}`}
                    </span>
                </label>
            </>
        );
    };

    const replaceExercise = async (
        exerciseId: string,
        item: ExerciseLibraryItem,
    ) => {
        if (!selectedTraining) return;
        setPicker(null);
        let position = -1;
        try {
            const saved = await editTraining((req) => {
                position = replaceExerciseInTraining(
                    req,
                    selectedTraining.id,
                    exerciseId,
                    item,
                );
            });
            // O exercício trocado nasce com id novo (ver
            // replaceExerciseInTraining): o card aberto nele segue para o
            // novo, achado pela posição, em vez de sumir.
            const newId = saved?.trainings
                .find((t) => t.id === selectedTraining.id)
                ?.exercises[position]?.id;
            if (openExerciseId === exerciseId) {
                setOpenExerciseId(newId ?? null);
            }
            showSuccess(`Trocado por ${item.name}.`);
        } catch (e) {
            showError((e as Error).message);
        }
    };

    /** Grava campos de UM exercício do treino aberto, pelo caminho do ajuste
     * rápido — inclusive a fila offline. O id vem de quem chama, e não do
     * card aberto: o editor embutido grava ao FECHAR o card, quando o card
     * aberto já é outro (ou nenhum). */
    const patchExercise = async (
        exerciseId: string,
        patch: Partial<ExerciseRequest>,
    ) => {
        if (!cycle || !selectedTraining || !macro) return;
        // Capturados no toque: quando a vez desta gravação chegar, a tela já
        // pode estar em outro treino.
        const trainingId = selectedTraining.id;
        const planningId = macro.id;
        await serialized((meso) =>
            saveExercisePatch(
                {
                    meso,
                    trainingId,
                    exerciseId,
                    persist: onPersistMeso,
                    studentId,
                    planningId,
                    onQueued: onPrescriptionQueued,
                },
                patch,
            ),
        );
    };

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

    // Troca de treino (A/B/C) = novo atendimento: as marcações do anterior
    // não fazem sentido aqui.
    useEffect(() => {
        setCompletedExerciseIds(new Set());
        setGroupTechnique('');
    }, [selectedTraining?.id]);

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
                        onClick={() =>
                            router.push(
                                `/personal/aluno/${studentId}/periodizacao`,
                            )
                        }
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
                                ? `Treino de ${studentName}`
                                : 'Treino do aluno'}
                        </h1>
                        <p className={s.headerSub}>{macro.name}</p>
                    </div>
                    <div className={s.headerActions}>
                        <PersonalAnamnesisQuickView
                            studentId={studentId}
                            className={s.btnBack}
                        />
                        {/* Fases, semanas e o plano inteiro — o que não é
                            ajuste de um treino — seguem na periodização. */}
                        <button
                            className={s.btnBack}
                            onClick={() =>
                                router.push(
                                    `/personal/aluno/${studentId}/periodizacao/${macro.id}`,
                                )
                            }
                        >
                            Plano completo
                        </button>
                        <button
                            className={s.btnBack}
                            onClick={() => router.push('/personal')}
                        >
                            <FiArrowLeft /> Voltar
                        </button>
                    </div>
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
                        {completedRefs.size} de {trainings.length} treinos
                        feitos nesta semana
                    </span>
                </div>

                {isOfflineData && (
                    <div className={s.notice}>
                        <FiWifiOff /> Sem conexão — mostrando a última versão
                        deste plano salva no aparelho. Finalizar o treino
                        continua funcionando: o registro fica guardado aqui e é
                        enviado assim que a internet voltar.
                    </div>
                )}

                {!cycle || trainings.length === 0 ? (
                    <p className={s.empty}>
                        Este plano ainda não tem treinos montados nesta fase.
                        Abra a periodização para prescrever.
                    </p>
                ) : (
                    <>
                        <div className={s.sectionHeader}>
                            <h2 className={s.sectionTitle}>
                                Treinos da semana
                            </h2>
                            {!isOfflineData && (
                                <button
                                    type="button"
                                    className={s.btnAdd}
                                    onClick={() => void addTraining()}
                                    disabled={busy}
                                    aria-label="Adicionar treino"
                                    title="Criar um treino novo nesta fase"
                                >
                                    <FiPlus /> Treino
                                </button>
                            )}
                        </div>
                        <SortableList
                            ids={trainings.map((t) => t.id)}
                            onReorder={(ids) => void reorderTrainings(ids)}
                            layout="grid"
                            className={s.sortableSpacing}
                        >
                            {trainings.map((t) => {
                                const done = completedRefs.has(t.reference);
                                const active = selectedTraining?.id === t.id;
                                return (
                                    <SortableItem
                                        key={t.id}
                                        id={t.id}
                                        label={`Treino ${t.reference}`}
                                        disabled={
                                            isOfflineData ||
                                            trainings.length < 2
                                        }
                                    >
                                        <div className={s.trainingCardWrap}>
                                            <button
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
                                                <span
                                                    className={s.trainingMeta}
                                                >
                                                    {t.exercises?.length ?? 0}{' '}
                                                    {(t.exercises?.length ??
                                                        0) === 1
                                                        ? 'exercício'
                                                        : 'exercícios'}
                                                </span>
                                                {done && (
                                                    <span className={s.doneTag}>
                                                        <FiCheckCircle /> Feito
                                                        nesta semana
                                                    </span>
                                                )}
                                            </button>
                                            {/* Fora do botão do card, para não
                                                aninhar botões. */}
                                            {!isOfflineData &&
                                                trainings.length > 1 && (
                                                    <button
                                                        type="button"
                                                        className={
                                                            s.trainingCardClose
                                                        }
                                                        onClick={() =>
                                                            setPendingDelete({
                                                                kind: 'training',
                                                                id: t.id,
                                                                name: `Treino ${t.reference}`,
                                                            })
                                                        }
                                                        disabled={busy}
                                                        aria-label={`Excluir treino ${t.reference}`}
                                                        title="Excluir este treino"
                                                    >
                                                        <FiX />
                                                    </button>
                                                )}
                                        </div>
                                    </SortableItem>
                                );
                            })}
                        </SortableList>

                        {selectedTraining && (
                            <>
                                <div className={s.sectionHeader}>
                                    <h2 className={s.sectionTitle}>
                                        Exercícios do Treino{' '}
                                        {selectedTraining.reference}
                                    </h2>
                                    {!isOfflineData && (
                                        <div className={s.headerActions}>
                                            <button
                                                type="button"
                                                className={s.btnAdd}
                                                onClick={() =>
                                                    setPicker({ mode: 'add' })
                                                }
                                                disabled={busy}
                                                aria-label="Adicionar exercício"
                                                title="Adicionar exercício da biblioteca"
                                            >
                                                <FiPlus /> Exercício
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <p className={s.hint}>
                                    Toque no exercício para ver e editar. A
                                    alça ⠿ muda a ordem; o <FiCheck aria-hidden className={s.hintIcon} /> acima
                                    dela marca o exercício como aplicado com o
                                    aluno nesta sessão. Marque 2 ou mais para
                                    agrupá-los em bi-set, tri-set, superset…
                                </p>
                                <SortableList
                                    ids={exerciseBlocks.map(blockId)}
                                    onReorder={(ids) => {
                                        const byId = new Map(
                                            exerciseBlocks.map(
                                                (b) => [blockId(b), b] as const,
                                            ),
                                        );
                                        void reorderExercises(
                                            selectedTraining.id,
                                            ids.flatMap((id) =>
                                                (byId.get(id) ?? []).map(
                                                    (e) => e.id,
                                                ),
                                            ),
                                        );
                                    }}
                                    className={s.sortableSpacing}
                                >
                                    {exerciseBlocks.map((block) => {
                                        // Bloco com série por tempo roda como
                                        // circuito: o descanso da rodada fica
                                        // no CircuitTimer, não no último item.
                                        const circuit = block.map(
                                            toCircuitExercise,
                                        );
                                        const asCircuit =
                                            circuitHasTimedWork(circuit);
                                        const rows = block.map((ex, i) => {
                                            const kg =
                                                lastLoadByExercise.get(ex.id) ??
                                                lastLoadByExercise.get(
                                                    ex.name.toLowerCase(),
                                                );
                                            const record: WeekRecord =
                                                logsFailed
                                                    ? { kind: 'unknown' }
                                                    : kg != null
                                                      ? { kind: 'load', kg }
                                                      : selectedDone
                                                        ? { kind: 'done-no-load' }
                                                        : { kind: 'not-done' };
                                            return (
                                                <StudentExerciseRow
                                                    key={ex.id}
                                                    exercise={ex}
                                                    record={record}
                                                    showRestTimer={
                                                        i ===
                                                            block.length - 1 &&
                                                        !asCircuit
                                                    }
                                                    showActions={!isOfflineData}
                                                    busy={busy}
                                                    completed={completedExerciseIds.has(
                                                        ex.id,
                                                    )}
                                                    onOpen={() =>
                                                        setOpenExerciseId(ex.id)
                                                    }
                                                    onReplace={() =>
                                                        setPicker({
                                                            mode: 'replace',
                                                            exerciseId: ex.id,
                                                        })
                                                    }
                                                    onDelete={() =>
                                                        setPendingDelete({
                                                            kind: 'exercise',
                                                            id: ex.id,
                                                            name: ex.name,
                                                        })
                                                    }
                                                />
                                            );
                                        });

                                        return (
                                            <SortableItem
                                                key={blockId(block)}
                                                id={blockId(block)}
                                                label={
                                                    block.length === 1
                                                        ? block[0].name
                                                        : comboGroupLabel(
                                                              block.length,
                                                              block[0]
                                                                  .group_technique,
                                                          )
                                                }
                                                disabled={
                                                    isOfflineData ||
                                                    exerciseBlocks.length < 2
                                                }
                                                topSlot={renderMarkToggle(
                                                    block,
                                                )}
                                            >
                                                {block.length === 1 ? (
                                                    rows[0]
                                                ) : (
                                                    <div
                                                        className={s.groupBlock}
                                                    >
                                                        {isOfflineData ||
                                                        !block[0].group_id ? (
                                                            <span
                                                                className={
                                                                    s.groupLabel
                                                                }
                                                            >
                                                                {comboGroupLabel(
                                                                    block.length,
                                                                    block[0]
                                                                        .group_technique,
                                                                )}{' '}
                                                                — sem descanso
                                                                entre os
                                                                exercícios
                                                            </span>
                                                        ) : (
                                                            <GroupHeader
                                                                size={
                                                                    block.length
                                                                }
                                                                technique={
                                                                    block[0]
                                                                        .group_technique
                                                                }
                                                                busy={busy}
                                                                onChange={(v) =>
                                                                    void changeGroupTechnique(
                                                                        block[0]
                                                                            .group_id!,
                                                                        v,
                                                                    )
                                                                }
                                                                recoverySeconds={blockRecoverySeconds(
                                                                    block,
                                                                )}
                                                                onChangeRecovery={(
                                                                    secs,
                                                                ) =>
                                                                    void changeGroupRecovery(
                                                                        block[0]
                                                                            .group_id!,
                                                                        secs,
                                                                    )
                                                                }
                                                                onUngroup={() =>
                                                                    void ungroup(
                                                                        block[0]
                                                                            .group_id!,
                                                                    )
                                                                }
                                                            />
                                                        )}
                                                        {rows}
                                                        {asCircuit && (
                                                            <CircuitTimer
                                                                key={JSON.stringify(
                                                                    circuit,
                                                                )}
                                                                exercises={
                                                                    circuit
                                                                }
                                                                recoverySeconds={blockRecoverySeconds(
                                                                    block,
                                                                )}
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </SortableItem>
                                        );
                                    })}
                                    {selectedExercises.length === 0 && (
                                        <p className={s.empty}>
                                            Nenhum exercício prescrito neste
                                            treino.
                                        </p>
                                    )}
                                </SortableList>

                                {!isOfflineData &&
                                    markedExerciseIds.length >= 2 && (
                                        <div
                                            className={s.groupBar}
                                            role="region"
                                            aria-label="Agrupar exercícios marcados"
                                        >
                                            <span className={s.groupBarCount}>
                                                {markedExerciseIds.length}{' '}
                                                marcados — agrupar como
                                            </span>
                                            <select
                                                value={effectiveGroupTechnique}
                                                onChange={(e) =>
                                                    setGroupTechnique(
                                                        e.target.value,
                                                    )
                                                }
                                                className="form-control form-control-sm"
                                                aria-label="Agrupar os marcados como"
                                            >
                                                <option value="">
                                                    Bloco sem tipo definido
                                                </option>
                                                {GROUP_TECHNIQUE_CATALOG.map(
                                                    (gt) => (
                                                        <option
                                                            key={gt.value}
                                                            value={gt.value}
                                                            disabled={
                                                                !isGroupTechniqueValidForSize(
                                                                    gt.value,
                                                                    markedExerciseIds.length,
                                                                )
                                                            }
                                                        >
                                                            {gt.label}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                            <div className={s.groupBarActions}>
                                                <button
                                                    type="button"
                                                    className={s.btnBack}
                                                    onClick={() =>
                                                        setCompletedExerciseIds(
                                                            new Set(),
                                                        )
                                                    }
                                                >
                                                    Limpar
                                                </button>
                                                <button
                                                    type="button"
                                                    className={s.btnAdd}
                                                    onClick={() =>
                                                        void groupMarked()
                                                    }
                                                    disabled={busy}
                                                >
                                                    <FiLink /> Agrupar
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                <div className={s.finishBar}>
                                    <button
                                        type="button"
                                        className={s.btnFinish}
                                        onClick={() => setLoggerOpen(true)}
                                        disabled={
                                            selectedExercises.length === 0
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

            {openExerciseView && (
                <ExerciseDetailCard
                    exercise={openExerciseView.exercise}
                    onClose={() => setOpenExerciseId(null)}
                    nextInGroup={nextInSameGroup(
                        openExerciseView.exercise,
                        openExerciseView.siblings,
                    )}
                    onSelectExercise={(exercise) =>
                        setOpenExerciseId(exercise.id)
                    }
                    // readOnly: anotações e registro de carga do card são
                    // "/me/..." — do usuário logado, o personal. A prescrição
                    // do aluno sai pelos callbacks e pelo editor abaixo.
                    readOnly
                    onPrescribeSeries={(patch) =>
                        patchExercise(openExerciseView.raw.id, patch)
                    }
                    onPrescribeWeight={(weightKg) =>
                        patchExercise(openExerciseView.raw.id, {
                            load_kg: weightKg > 0 ? weightKg : undefined,
                        })
                    }
                    editor={
                        <ExerciseInlineEditor
                            // Um editor por exercício: navegar dentro do
                            // bi-set não pode levar o rascunho do anterior.
                            key={openExerciseView.raw.id}
                            exercise={openExerciseView.raw}
                            onSave={(patch) =>
                                patchExercise(openExerciseView.raw.id, patch)
                            }
                        />
                    }
                    // Trocar grava na hora e não entra na fila offline (ver
                    // trainingEditPatch.ts): sem rede, sem o botão.
                    onReplace={
                        isOfflineData
                            ? undefined
                            : () =>
                                  setPicker({
                                      mode: 'replace',
                                      exerciseId: openExerciseView.raw.id,
                                  })
                    }
                />
            )}

            {picker && (
                <Modal
                    open
                    onClose={() => setPicker(null)}
                    title={
                        picker.mode === 'add'
                            ? `Adicionar ao treino ${selectedTraining?.reference ?? ''}`
                            : 'Trocar exercício'
                    }
                >
                    {picker.mode === 'add' ? (
                        <ExercisePicker
                            onPickMany={(items, groupTechnique) =>
                                void addExercises(items, groupTechnique)
                            }
                            onClose={() => setPicker(null)}
                        />
                    ) : (
                        <ExercisePicker
                            onPick={(item) =>
                                void replaceExercise(picker.exerciseId, item)
                            }
                            onClose={() => setPicker(null)}
                        />
                    )}
                </Modal>
            )}

            {pendingDelete && (
                <Modal
                    open
                    onClose={() => setPendingDelete(null)}
                    title={
                        pendingDelete.kind === 'training'
                            ? 'Excluir treino?'
                            : 'Excluir exercício?'
                    }
                    footer={
                        <div className={s.confirmActions}>
                            <button
                                type="button"
                                className={s.btnBack}
                                onClick={() => setPendingDelete(null)}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                className={s.btnDanger}
                                onClick={() => void confirmDelete()}
                            >
                                <FiX /> Excluir
                            </button>
                        </div>
                    }
                >
                    <p className={s.confirmText}>
                        {pendingDelete.kind === 'training' ? (
                            <>
                                <strong>{pendingDelete.name}</strong> e todos
                                os exercícios dele saem do plano do aluno. O
                                que ele já registrou continua no histórico,
                                mas o treino deixa de aparecer para ele.
                            </>
                        ) : (
                            <>
                                <strong>{pendingDelete.name}</strong> sai do
                                treino {selectedTraining?.reference} do aluno.
                                As cargas que ele já registrou continuam no
                                histórico, mas o exercício deixa de aparecer no
                                treino.
                            </>
                        )}
                    </p>
                </Modal>
            )}

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

function toCircuitExercise(ex: ExerciseResponse): CircuitExercise {
    return {
        name: ex.name,
        series: ex.series ?? [],
        timed: ex.timed,
        series_label: ex.series_label,
        rest: ex.rest_seconds,
    };
}

/** Cabeçalho de um bi-set/tri-set na tela de edição: troca a variante do
 * bloco ou o desfaz. Só existe aqui (personal, online) — o aluno vê o rótulo
 * fixo. */
function GroupHeader({
    size,
    technique,
    busy,
    onChange,
    onUngroup,
    recoverySeconds,
    onChangeRecovery,
}: {
    size: number;
    technique?: string;
    busy: boolean;
    onChange: (value: string) => void;
    onUngroup: () => void;
    /** Recuperação do circuito (tabata) — gravada no plano, o aluno segue. */
    recoverySeconds: number;
    onChangeRecovery: (seconds: number) => void;
}) {
    return (
        <div className={s.groupHeader}>
            <select
                value={technique ?? ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={busy}
                className="form-control form-control-sm"
                aria-label="Tipo de agrupamento do bloco"
            >
                <option value="">{comboGroupLabel(size)} (sem tipo definido)</option>
                {GROUP_TECHNIQUE_CATALOG.map((gt) => (
                    <option
                        key={gt.value}
                        value={gt.value}
                        disabled={!isGroupTechniqueValidForSize(gt.value, size)}
                    >
                        {gt.label}
                    </option>
                ))}
            </select>
            <GroupRecoverySelect
                value={recoverySeconds}
                onChange={onChangeRecovery}
                disabled={busy}
                className="form-control form-control-sm"
            />
            <button
                type="button"
                className={s.btnBack}
                onClick={onUngroup}
                disabled={busy}
                title="Separar os exercícios deste bloco"
            >
                Desagrupar
            </button>
            <span className={s.groupLabel}>
                {recoverySeconds > 0
                    ? `${recoverySeconds} s de recuperação entre os exercícios`
                    : 'Sem descanso entre os exercícios'}
            </span>
        </div>
    );
}
