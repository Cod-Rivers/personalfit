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
 * - "Editar treino" continua para o que é do treino, não de um exercício:
 *   agrupar em bi-set, prescrição geral, nome/dia do treino.
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
    FiEdit2,
    FiPlus,
    FiRepeat,
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
import { formatSeries } from '@/libs/seriesPrescription';
import {
    comboGroupLabel,
    partitionExerciseGroups,
} from '@/libs/trainingTechniques';
import ExerciseThumbnail from '@/components/features/ExerciseThumbnail';
import WorkoutLogger from '@/components/features/WorkoutLogger';
import ExerciseDetailCard from '@/components/features/ExerciseDetailCard';
import type { ExerciseLog } from '@/components/features/types';
import PersonalAnamnesisQuickView from '@/components/features/PersonalAnamnesisQuickView';
import { toExerciseLog } from '@/libs/exerciseLog';
import MesocycleFormModal from '@/app/personal/_shared/periodizacao/components/MesocycleFormModal';
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
    removeExerciseFromTraining,
    replaceExerciseInTraining,
    saveTrainingEdit,
} from '@/app/personal/_shared/periodizacao/lib/trainingEditPatch';
import ExercisePicker from '@/app/personal/_shared/periodizacao/components/ExercisePicker';
import ExerciseInlineEditor from '@/app/personal/_shared/periodizacao/components/ExerciseInlineEditor';
import Modal from '@/components/system/Modal';
import { SortableItem, SortableList } from '@/components/system/SortableList';
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
    /** Editor da fase aberto num treino — agrupar, prescrição geral, nome. */
    const [editorFocus, setEditorFocus] = useState<{
        trainingId: string;
    } | null>(null);
    /** Biblioteca aberta: para acrescentar exercícios ao treino, ou para
     * trocar um deles. */
    const [picker, setPicker] = useState<
        { mode: 'add' } | { mode: 'replace'; exerciseId: string } | null
    >(null);
    /** Exercício esperando a confirmação de exclusão. */
    const [pendingDelete, setPendingDelete] = useState<{
        id: string;
        name: string;
    } | null>(null);
    const [busy, setBusy] = useState(false);
    /** Edição pendente no editor embutido no card: fechar o card, ou pular
     * para outro exercício, sem salvar pede confirmação. */
    const editorDirtyRef = useRef(false);

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

    /* ── Gravação ──
     * Mesmo contrato da periodização: a fase inteira vai ao servidor e a
     * resposta substitui o macrociclo desta tela (e o cache offline). */
    const onPersistMeso = useCallback(
        async (req: MesocycleRequest) => {
            if (!macro) return null;
            const updated = req.id
                ? await updateMesocycle(studentId, macro.id, req.id, req)
                : await createMesocycle(studentId, macro.id, req);
            setMacro(updated);
            void cachePersonalMacrocycle(studentId, updated);
            return pickSavedMesocycle(updated, req.id);
        },
        [studentId, macro],
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
                return next;
            });
        },
        [studentId],
    );

    const reorderTrainings = async (ids: string[]) => {
        if (!cycle) return;
        setTrainingOrder(ids);
        try {
            await saveTrainingOrder(
                { meso: cycle.meso, persist: onPersistMeso },
                ids,
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
            await saveExerciseOrder(
                { meso: cycle.meso, persist: onPersistMeso },
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

    /** Troca o exercício aberto no card (ou fecha, com `null`), perguntando
     * antes se o editor embutido tem alteração não salva. */
    const switchOpenExercise = (id: string | null) => {
        if (
            editorDirtyRef.current &&
            !confirm(
                'Há alterações neste exercício que ainda não foram salvas. Sair sem salvar?',
            )
        ) {
            return;
        }
        editorDirtyRef.current = false;
        setOpenExerciseId(id);
    };

    const onEditorDirtyChange = useCallback((dirty: boolean) => {
        editorDirtyRef.current = dirty;
    }, []);

    /** Adicionar, excluir e trocar exercício: a fase inteira vai ao servidor
     * e a resposta substitui o plano da tela (ver trainingEditPatch.ts). */
    const editTraining = async (
        mutate: Parameters<typeof saveTrainingEdit>[1],
    ): Promise<MesocycleResponse | null> => {
        if (!cycle) return null;
        setBusy(true);
        try {
            return await saveTrainingEdit(
                { meso: cycle.meso, persist: onPersistMeso },
                mutate,
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

    const confirmDelete = async () => {
        if (!selectedTraining || !pendingDelete) return;
        const target = pendingDelete;
        setPendingDelete(null);
        try {
            await editTraining((req) =>
                removeExerciseFromTraining(req, selectedTraining.id, target.id),
            );
            if (openExerciseId === target.id) {
                editorDirtyRef.current = false;
                setOpenExerciseId(null);
            }
            showSuccess(`${target.name} excluído do treino.`);
        } catch (e) {
            showError((e as Error).message);
        }
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
                editorDirtyRef.current = false;
                setOpenExerciseId(newId ?? null);
            }
            showSuccess(`Trocado por ${item.name}.`);
        } catch (e) {
            showError((e as Error).message);
        }
    };

    /** Gravação do editor embutido no card: o exercício inteiro, pelo mesmo
     * caminho do ajuste rápido — inclusive a fila offline. */
    const saveOpenExercise = async (patch: ExerciseRequest) => {
        await patchOpenExercise(patch);
    };

    const patchOpenExercise = async (patch: Partial<ExerciseRequest>) => {
        if (!cycle || !selectedTraining || !openExerciseId || !macro) return;
        await saveExercisePatch(
            {
                meso: cycle.meso,
                trainingId: selectedTraining.id,
                exerciseId: openExerciseId,
                persist: onPersistMeso,
                studentId,
                planningId: macro.id,
                onQueued: onPrescriptionQueued,
            },
            patch,
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
                        <h2 className={s.sectionTitle}>Treino de hoje</h2>
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
                                            <span className={s.trainingMeta}>
                                                {t.exercises?.length ?? 0}{' '}
                                                {(t.exercises?.length ?? 0) ===
                                                1
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
                                    </SortableItem>
                                );
                            })}
                        </SortableList>

                        {selectedTraining && (
                            <>
                                <div className={s.sectionHeader}>
                                    <h2 className={s.sectionTitle}>
                                        Série prescrita
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
                                            <button
                                                type="button"
                                                className={s.btnBack}
                                                onClick={() =>
                                                    setEditorFocus({
                                                        trainingId:
                                                            selectedTraining.id,
                                                    })
                                                }
                                                title="Agrupar em bi-set, prescrição geral, nome e dia do treino"
                                            >
                                                <FiEdit2 /> Editar treino
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <p className={s.hint}>
                                    Toque no exercício para ver e editar tudo
                                    nele. <FiRepeat aria-hidden /> troca pelo
                                    da biblioteca, <FiX aria-hidden /> exclui, e
                                    a alça ⠿ muda a ordem.
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
                                                    <button
                                                        type="button"
                                                        className={
                                                            s.exerciseOpen
                                                        }
                                                        onClick={() =>
                                                            switchOpenExercise(
                                                                ex.id,
                                                            )
                                                        }
                                                        aria-label={`Abrir ${ex.name}`}
                                                    >
                                                        <ExerciseThumbnail
                                                            name={ex.name}
                                                            videoThumb={
                                                                ex.video_thumb
                                                            }
                                                            videoUrl={
                                                                ex.video_url
                                                            }
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
                                                                        {
                                                                            ex.load_kg
                                                                        }
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
                                                    </button>
                                                    {!isOfflineData && (
                                                        <div
                                                            className={
                                                                s.rowActions
                                                            }
                                                        >
                                                            <button
                                                                type="button"
                                                                className={
                                                                    s.iconBtn
                                                                }
                                                                onClick={() =>
                                                                    setPicker({
                                                                        mode: 'replace',
                                                                        exerciseId:
                                                                            ex.id,
                                                                    })
                                                                }
                                                                disabled={busy}
                                                                aria-label={`Trocar ${ex.name}`}
                                                                title="Trocar por outro exercício da biblioteca, mantendo séries, carga e posição"
                                                            >
                                                                <FiRepeat />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className={`${s.iconBtn} ${s.iconBtnDanger}`}
                                                                onClick={() =>
                                                                    setPendingDelete(
                                                                        {
                                                                            id: ex.id,
                                                                            name: ex.name,
                                                                        },
                                                                    )
                                                                }
                                                                disabled={busy}
                                                                aria-label={`Excluir ${ex.name}`}
                                                                title="Excluir do treino"
                                                            >
                                                                <FiX />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
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
                                            >
                                                {block.length === 1 ? (
                                                    rows[0]
                                                ) : (
                                                    <div
                                                        className={s.groupBlock}
                                                    >
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
                                                            — sem descanso entre
                                                            os exercícios
                                                        </span>
                                                        {rows}
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
                    onClose={() => switchOpenExercise(null)}
                    nextInGroup={nextInSameGroup(
                        openExerciseView.exercise,
                        openExerciseView.siblings,
                    )}
                    onSelectExercise={(exercise) =>
                        switchOpenExercise(exercise.id)
                    }
                    // readOnly: anotações e registro de carga do card são
                    // "/me/..." — do usuário logado, o personal. A prescrição
                    // do aluno sai pelos callbacks e pelo editor abaixo.
                    readOnly
                    onPrescribeSeries={(patch) => patchOpenExercise(patch)}
                    onPrescribeWeight={(weightKg) =>
                        patchOpenExercise({
                            load_kg: weightKg > 0 ? weightKg : undefined,
                        })
                    }
                    editor={
                        <ExerciseInlineEditor
                            // Um editor por exercício: navegar dentro do
                            // bi-set não pode levar o rascunho do anterior.
                            key={openExerciseView.raw.id}
                            exercise={openExerciseView.raw}
                            onSave={saveOpenExercise}
                            onDirtyChange={onEditorDirtyChange}
                            // Trocar grava na hora e não entra na fila
                            // offline (ver trainingEditPatch.ts).
                            onReplace={
                                isOfflineData
                                    ? undefined
                                    : () =>
                                          setPicker({
                                              mode: 'replace',
                                              exerciseId:
                                                  openExerciseView.raw.id,
                                          })
                            }
                        />
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
                    title="Excluir exercício?"
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
                        <strong>{pendingDelete.name}</strong> sai do treino{' '}
                        {selectedTraining?.reference} do aluno. As cargas que
                        ele já registrou continuam no histórico, mas o
                        exercício deixa de aparecer no treino.
                    </p>
                </Modal>
            )}

            {editorFocus && cycle && (
                <MesocycleFormModal
                    mode="edit"
                    meso={cycle.meso}
                    order={cycle.meso.order}
                    focus={editorFocus}
                    onClose={() => setEditorFocus(null)}
                    onPersist={onPersistMeso}
                    simpleMode={macro.planning_mode === 'simple'}
                    dayLabelStyle={
                        macro.simple_day_label === 'number'
                            ? 'number'
                            : 'weekday'
                    }
                />
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
