'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiCheck, FiAlertCircle, FiLoader } from 'react-icons/fi';
import type {
    ExerciseLibraryItem,
    MesocycleRequest,
    MesocycleResponse,
} from '@/libs/planningService';
import {
    NEXT_REF,
    SIMPLE_MODE_DEFAULTS,
    adoptSavedIds,
    genId,
    localExerciseToLog,
    makeDefaultMicrocycles,
    nextFreeWeekday,
    relabelByPosition,
    responseMicroToLocal,
    responseToLocal,
    syncMicrocyclesByDuration,
    localToMesoRequest,
    type LocalExercise,
    type LocalMicrocycle,
    type LocalTraining,
    type MesoPhaseFormData,
} from '../lib/mesocycleTransforms';
import {
    CARD_OF_FIELD,
    rootCard,
    type EditorCard,
    type ExerciseTab,
} from '../lib/editorNavigation';
import { useCardStack } from '@/hooks/useCardStack';
import { useSaveQueue } from '@/hooks/useSaveQueue';
import Modal from '@/components/system/Modal';
import ExerciseDetailCard from '@/components/features/ExerciseDetailCard';
import type { ExerciseLog } from '@/components/features/types';
import ExercisePicker from './ExercisePicker';
import type { ResolvedVideoLink } from '@/libs/exerciseVideoService';
import PhaseCard from './cards/PhaseCard';
import TrainingsListCard from './cards/TrainingsListCard';
import TrainingCard from './cards/TrainingCard';
import ExerciseCard from './cards/ExerciseCard';
import BulkPrescriptionCard from './cards/BulkPrescriptionCard';
import { WeeksListCard, WeekCard } from './cards/WeekCards';
import { trainingFullLabel } from './fields/PrescriptionFields';
import type { BulkPrescriptionFields } from './fields/PrescriptionFields';
import s from '../builder.module.css';

const mesoSchema = z.object({
    name: z.string().min(1, 'Nome obrigatório'),
    phase: z.string().min(1, 'Fase obrigatória'),
    duration_weeks: z.number().min(1, 'Mínimo 1 semana').max(52),
    methodology: z.string().min(1, 'Metodologia obrigatória'),
});

/** Como o campo obrigatório em falta é descrito no rodapé do editor. */
const BLOCKED_FIELD_LABEL: Record<string, string> = {
    name: 'o nome da fase',
    phase: 'a fase',
    duration_weeks: 'a duração',
    methodology: 'a metodologia',
};

/** Exercício novo em branco — os campos string vazios são o "não preenchido"
 * que vira omitempty no backend (ver LocalExercise). */
function blankExercise(overrides: Partial<LocalExercise> = {}): LocalExercise {
    return {
        _id: genId(),
        name: '',
        series_mode: 'reps',
        series_sets: '3',
        series_value: '10',
        series_free: '',
        observations: '',
        variations: '',
        rest_seconds: '',
        load_kg: '',
        load_percentage: '',
        tempo_seconds: '',
        rpe_target: '',
        muscle_group: '',
        timed: false,
        video_url: '',
        video_thumb: '',
        technique: '',
        technique_rounds: '',
        technique_reduction_pct: '',
        technique_pause_seconds: '',
        technique_extra_reps: '',
        technique_hold_seconds: '',
        non_substitutable: '',
        ...overrides,
    };
}

interface Props {
    mode: 'add' | 'edit';
    meso: MesocycleResponse | null;
    order: number;
    onClose: () => void;
    /**
     * Persiste a fase INTEIRA (uma requisição por card concluído) e devolve o
     * mesociclo como ficou no servidor. O modal adota daí os IDs de treino,
     * exercício e microciclo — sem isso o próximo card recriaria tudo.
     *
     * Quem decide entre criar e atualizar é o chamador, pelo `id` do payload:
     * plano de aluno e template têm endpoints diferentes.
     */
    onPersist: (req: MesocycleRequest) => Promise<MesocycleResponse | null>;
    /** Modo simples: esconde nome/fase/duração/metodologia e usa valores fixos (SIMPLE_MODE_DEFAULTS). */
    simpleMode?: boolean;
    /** "weekday" (padrão) ou "number" — só relevante quando simpleMode=true. */
    dayLabelStyle?: 'weekday' | 'number';
    /** Repassados ao card do exercício e daí ao campo de vídeo. O aluno que
     * monta o próprio treino usa endpoint e regra de plano próprios (ver
     * resolveMyVideoLink); ausentes, valem os do personal. */
    resolveVideoLink?: (videoUrl: string) => Promise<ResolvedVideoLink>;
    videoPlanHint?: string;
    /** Abre o editor direto num treino (e, opcionalmente, num exercício dele),
     * pelos IDs do servidor. O treino vira a raiz: "Fechar" nele salva e sai,
     * sem passar pelos cards da fase. É o que a tela de treino do aluno usa
     * para ajustes pontuais com o aluno do lado. */
    focus?: { trainingId: string; exerciseId?: string };
}

/**
 * Editor de mesociclo por CARDS: um card por decisão, cada um cabendo numa
 * tela, com salvamento a cada card concluído.
 *
 * Antes, isto era um formulário único que empilhava os campos da fase, o
 * editor de treinos inteiro e um card por semana — um treino de 6 exercícios
 * rendia ~48 controles num scroll só, e nada era gravado até o botão final.
 *
 * Este componente é a CASCA: ele é o dono do estado local, da fila de
 * salvamento e da pilha de navegação. Os cards são apresentacionais.
 */
export default function MesocycleFormModal({
    mode,
    meso,
    order,
    onClose,
    onPersist,
    simpleMode,
    dayLabelStyle,
    resolveVideoLink,
    videoPlanHint,
    focus,
}: Props) {
    const isNumbered = simpleMode && dayLabelStyle === 'number';

    const [localTrainings, setLocalTrainings] = useState<LocalTraining[]>(() =>
        meso ? responseToLocal(meso.trainings) : [],
    );
    const [localMicrocycles, setLocalMicrocycles] = useState<LocalMicrocycle[]>(
        () =>
            meso
                ? responseMicroToLocal(meso.microcycles, meso.duration_weeks)
                : makeDefaultMicrocycles(4),
    );
    /** ID da fase no servidor. Nasce vazio numa fase nova e é preenchido pela
     * resposta do primeiro save — é o que faz o segundo card virar update em
     * vez de criar uma fase duplicada. */
    const [mesoId, setMesoId] = useState<string | undefined>(meso?.id);

    /** A ordem da fase precisa ser estável durante a sessão de edição.
     * A prop `order` é derivada da lista do macrociclo do PAI; assim que o
     * primeiro card cria a fase, essa lista cresce e a prop vira length+1 de
     * novo — o save seguinte mandaria a fase recém-criada para o fim da
     * periodização. Fixamos no que veio na abertura e, depois, no que o
     * servidor confirmou. */
    const orderRef = useRef(order);

    /** Cards de abertura quando há `focus`. Os cards endereçam pelo `_id`
     * LOCAL, então o ID do servidor é traduzido aqui, sobre o estado inicial. */
    const [initialCards] = useState<{ root: EditorCard; above: EditorCard[] }>(
        () => {
            const training = focus
                ? localTrainings.find((t) => t.id === focus.trainingId)
                : undefined;
            if (!training) return { root: rootCard(simpleMode), above: [] };
            const exercise = focus?.exerciseId
                ? training.exercises.find((e) => e.id === focus.exerciseId)
                : undefined;
            return {
                root: { card: 'training', trainingId: training._id },
                above: exercise
                    ? [
                          {
                              card: 'exercise',
                              trainingId: training._id,
                              exerciseId: exercise._id,
                              tab: 'serie',
                          },
                      ]
                    : [],
            };
        },
    );
    const stack = useCardStack<EditorCard>(
        initialCards.root,
        initialCards.above,
    );
    /** localId é o _id do exercício no estado do editor. ExerciseLog.id carrega
     * o id do BACKEND quando existe (ver localExerciseToLog), então usar ele
     * para achar o exercício local faz a carga prescrita pelo preview sumir em
     * todo exercício já salvo. */
    const [preview, setPreview] = useState<{
        exercise: ExerciseLog;
        siblings: ExerciseLog[];
        localId: string;
    } | null>(null);

    const {
        register,
        setValue,
        watch,
        getValues,
        trigger,
        formState: { errors },
    } = useForm<MesoPhaseFormData>({
        resolver: zodResolver(mesoSchema),
        defaultValues: simpleMode
            ? SIMPLE_MODE_DEFAULTS
            : meso
              ? {
                    name: meso.name,
                    phase: meso.phase,
                    duration_weeks: meso.duration_weeks,
                    methodology: meso.methodology,
                }
              : { name: '', phase: '', duration_weeks: 4, methodology: '' },
    });
    const durationWeeksWatch = watch('duration_weeks');

    useEffect(() => {
        setLocalMicrocycles((prev) =>
            syncMicrocyclesByDuration(prev, durationWeeksWatch || 1),
        );
    }, [durationWeeksWatch]);

    /* ── Salvamento por card ───────────────────────────────────────────────
     * Um contador em vez de chamar a fila direto do handler: o payload precisa
     * ser montado DEPOIS do re-render provocado pela edição, senão o save leva
     * o estado anterior. O efeito roda exatamente nesse ponto. */
    const [saveToken, setSaveToken] = useState(0);
    const requestSave = useCallback(() => setSaveToken((t) => t + 1), []);

    const stateRef = useRef({ localTrainings, localMicrocycles });
    stateRef.current = { localTrainings, localMicrocycles };

    const buildRequest = useCallback(
        (data: MesoPhaseFormData): MesocycleRequest =>
            localToMesoRequest(
                data,
                stateRef.current.localTrainings,
                stateRef.current.localMicrocycles,
                orderRef.current,
                mesoId,
            ),
        [mesoId],
    );

    const queue = useSaveQueue<MesocycleRequest, MesocycleResponse | null>({
        persist: onPersist,
        onSuccess: (saved) => {
            if (!saved) return;
            setMesoId(saved.id);
            if (saved.order) orderRef.current = saved.order;
            const { trainings, microcycles } = adoptSavedIds(
                stateRef.current.localTrainings,
                stateRef.current.localMicrocycles,
                saved,
            );
            setLocalTrainings(trainings);
            setLocalMicrocycles(microcycles);
        },
    });

    const queueRef = useRef(queue);
    queueRef.current = queue;

    /** Campo obrigatório em branco que está impedindo o autosave. O editor
     * não pode gravar uma fase sem nome/fase/duração/metodologia — o backend
     * recusa — e o personal precisa saber disso sem ficar olhando um "Salvo"
     * que nunca aparece. */
    const [blockedField, setBlockedField] = useState<string | null>(null);

    /**
     * Valida a identidade da fase e enfileira o save.
     *
     * `navigateOnInvalid` separa os dois motivos de salvar: num autosave de
     * card concluído, arrastar o personal de volta para o card da fase no meio
     * da edição seria um sequestro de navegação — basta avisar. Já num pedido
     * EXPLÍCITO (fechar, ou "tentar de novo"), levá-lo até o campo que falta é
     * justamente o que evita um botão que parece morto.
     */
    const trySave = useCallback(
        async (navigateOnInvalid = false): Promise<boolean> => {
            const parsed = mesoSchema.safeParse(getValues());
            if (!parsed.success) {
                const field = parsed.error.issues[0]?.path[0] as
                    | keyof MesoPhaseFormData
                    | undefined;
                setBlockedField(field ?? null);
                if (navigateOnInvalid) {
                    // trigger() marca os erros nos inputs da tela de destino.
                    void trigger();
                    if (field && CARD_OF_FIELD[field]) {
                        stack.resetTo(CARD_OF_FIELD[field]);
                    }
                }
                return false;
            }
            setBlockedField(null);
            queueRef.current.save(buildRequest(parsed.data));
            return true;
        },
        [getValues, trigger, stack, buildRequest],
    );

    const trySaveRef = useRef(trySave);
    trySaveRef.current = trySave;

    /* Some com o aviso assim que o campo que faltava é preenchido. Usa a
     * assinatura de CALLBACK do watch, que observa sem provocar re-render a
     * cada tecla — o aviso ficar na tela depois de resolvido faria o personal
     * achar que ainda está travado. */
    useEffect(() => {
        const subscription = watch(() =>
            setBlockedField((prev) =>
                prev && mesoSchema.safeParse(getValues()).success ? null : prev,
            ),
        );
        return () => subscription.unsubscribe();
    }, [watch, getValues]);

    useEffect(() => {
        if (saveToken === 0) return;
        void trySaveRef.current(false);
    }, [saveToken]);

    /* ── Navegação ── */
    const goBack = useCallback(() => {
        requestSave();
        stack.pop();
    }, [requestSave, stack]);

    const handleClose = useCallback(() => {
        const parsed = mesoSchema.safeParse(getValues());
        if (!parsed.success) {
            const hasContent =
                localTrainings.length > 0 || mode === 'edit' || !!mesoId;
            if (
                hasContent &&
                !confirm(
                    'Esta fase ainda não foi salva porque faltam campos obrigatórios (nome, fase, duração e metodologia). Sair mesmo assim e perder o que foi preenchido?',
                )
            ) {
                void trySave(true);
                return;
            }
            onClose();
            return;
        }
        // Enfileira o estado final antes de desmontar: a requisição segue em
        // voo e o pai continua montado para receber a resposta.
        queueRef.current.save(buildRequest(parsed.data));
        onClose();
    }, [
        getValues,
        localTrainings.length,
        mode,
        mesoId,
        onClose,
        buildRequest,
        trySave,
    ]);

    /* ── Microcycle CRUD ── */
    const updateMicrocycle = useCallback(
        (
            microId: string,
            field: keyof Omit<LocalMicrocycle, '_id' | 'week_number'>,
            value: string | boolean,
        ) => {
            setLocalMicrocycles((prev) =>
                prev.map((m) =>
                    m._id === microId ? { ...m, [field]: value } : m,
                ),
            );
        },
        [],
    );

    /* ── Training CRUD ── */
    // No modo por dia da semana o dia faz o papel do A/B/C: cada treino novo
    // já nasce rotulado (Seg, Ter…), senão todos ficariam iguais até o
    // personal escolher o dia um a um.
    const autoWeekday = Boolean(simpleMode) && dayLabelStyle !== 'number';

    const addTraining = useCallback(() => {
        const newId = genId();
        setLocalTrainings((prev) => {
            const usedRefs = prev.map((t) => t.reference);
            const nextRef =
                NEXT_REF.find((r) => !usedRefs.includes(r)) ??
                String(prev.length + 1);
            return [
                ...prev,
                {
                    _id: newId,
                    reference: nextRef,
                    weekday: autoWeekday
                        ? nextFreeWeekday(prev.map((t) => t.weekday))
                        : undefined,
                    exercises: [],
                },
            ];
        });
        // Abre o treino recém-criado: criar e cair de volta na lista obrigaria
        // um toque a mais só para começar a preencher.
        stack.push({ card: 'training', trainingId: newId });
    }, [autoWeekday, stack]);

    const removeTraining = useCallback(
        (tid: string) => {
            setLocalTrainings((prev) => {
                const rest = prev.filter((t) => t._id !== tid);
                // Por dia da semana o rótulo que vale é o dia (ver
                // relabelByPosition).
                return autoWeekday ? rest : relabelByPosition(rest);
            });
            requestSave();
        },
        [autoWeekday, requestSave],
    );

    const duplicateTraining = useCallback(
        (tid: string) => {
            setLocalTrainings((prev) => {
                const source = prev.find((t) => t._id === tid);
                if (!source) return prev;
                const usedRefs = prev.map((t) => t.reference);
                const nextRef =
                    NEXT_REF.find((r) => !usedRefs.includes(r)) ??
                    String(prev.length + 1);
                return [
                    ...prev,
                    {
                        _id: genId(),
                        // Sem id: a cópia precisa nascer como treino NOVO no
                        // servidor. Reaproveitar o id do original faria as duas
                        // gravarem no mesmo documento — e o mesmo vale para os
                        // exercícios, que carregam histórico de séries do aluno.
                        id: undefined,
                        reference: nextRef,
                        // A cópia vai para o próximo dia livre — repetir o dia
                        // da origem criaria dois treinos com o mesmo rótulo.
                        weekday: autoWeekday
                            ? nextFreeWeekday(prev.map((t) => t.weekday))
                            : source.weekday,
                        exercises: source.exercises.map((ex) => ({
                            ...ex,
                            _id: genId(),
                            id: undefined,
                        })),
                    },
                ];
            });
            requestSave();
        },
        [autoWeekday, requestSave],
    );

    const updateTrainingRef = useCallback(
        (tid: string, ref: string) =>
            setLocalTrainings((prev) =>
                prev.map((t) => (t._id === tid ? { ...t, reference: ref } : t)),
            ),
        [],
    );

    const updateTrainingWeekday = useCallback(
        (tid: string, weekday: number | undefined) =>
            setLocalTrainings((prev) =>
                prev.map((t) => (t._id === tid ? { ...t, weekday } : t)),
            ),
        [],
    );

    /* ── Exercise CRUD ── */
    const addExercise = useCallback(
        (tid: string, exercise: LocalExercise) => {
            setLocalTrainings((prev) =>
                prev.map((t) =>
                    t._id !== tid
                        ? t
                        : { ...t, exercises: [...t.exercises, exercise] },
                ),
            );
        },
        [],
    );

    const removeExercise = useCallback(
        (tid: string, eid: string) => {
            setLocalTrainings((prev) =>
                prev.map((t) =>
                    t._id !== tid
                        ? t
                        : {
                              ...t,
                              exercises: t.exercises.filter(
                                  (e) => e._id !== eid,
                              ),
                          },
                ),
            );
            requestSave();
        },
        [requestSave],
    );

    /**
     * Troca o exercício por outro da biblioteca, no MESMO lugar: posição,
     * bloco (bi-set…), prescrição e técnica ficam; muda o que identifica o
     * movimento (nome, vínculo, grupo muscular, mídia).
     *
     * `id: undefined` é deliberado: o servidor dá identidade nova ao exercício.
     * ExercisePerformance e ExerciseAnnotation apontam pelo id, então manter o
     * antigo faria o histórico de carga do supino virar a base de sugestão do
     * agachamento que entrou no lugar dele.
     */
    const replaceExercise = useCallback(
        (tid: string, eid: string, item: ExerciseLibraryItem) => {
            setLocalTrainings((prev) =>
                prev.map((t) =>
                    t._id !== tid
                        ? t
                        : {
                              ...t,
                              exercises: t.exercises.map((e) =>
                                  e._id !== eid
                                      ? e
                                      : {
                                            ...e,
                                            id: undefined,
                                            exercise_library_id: item.id,
                                            name: item.name,
                                            muscle_group: item.muscle_group ?? '',
                                            video_url: item.video_url ?? '',
                                            video_thumb: item.video_thumb ?? '',
                                        },
                              ),
                          },
                ),
            );
            requestSave();
        },
        [requestSave],
    );

    const updateExercise = useCallback(
        (
            tid: string,
            eid: string,
            field: keyof Omit<LocalExercise, '_id'>,
            value: string | boolean,
        ) =>
            setLocalTrainings((prev) =>
                prev.map((t) =>
                    t._id !== tid
                        ? t
                        : {
                              ...t,
                              exercises: t.exercises.map((e) =>
                                  e._id !== eid ? e : { ...e, [field]: value },
                              ),
                          },
                ),
            ),
        [],
    );

    /* ── Combinar exercícios (bissérie/trissérie/superssérie) ── */
    const combineWithPrevious = useCallback(
        (tid: string, eid: string) => {
            setLocalTrainings((prev) =>
                prev.map((t) => {
                    if (t._id !== tid) return t;
                    const idx = t.exercises.findIndex((e) => e._id === eid);
                    if (idx <= 0) return t;
                    const groupId = t.exercises[idx - 1].group_id ?? genId();
                    return {
                        ...t,
                        exercises: t.exercises.map((e, i) =>
                            i === idx - 1 || i === idx
                                ? { ...e, group_id: groupId }
                                : e,
                        ),
                    };
                }),
            );
            requestSave();
        },
        [requestSave],
    );

    const ungroupExercises = useCallback(
        (tid: string, groupId: string) => {
            setLocalTrainings((prev) =>
                prev.map((t) =>
                    t._id !== tid
                        ? t
                        : {
                              ...t,
                              exercises: t.exercises.map((e) =>
                                  e.group_id === groupId
                                      ? { ...e, group_id: undefined }
                                      : e,
                              ),
                          },
                ),
            );
            requestSave();
        },
        [requestSave],
    );

    const removeLastFromGroup = useCallback(
        (tid: string, eid: string) => {
            setLocalTrainings((prev) =>
                prev.map((t) => {
                    if (t._id !== tid) return t;
                    const target = t.exercises.find((e) => e._id === eid);
                    const groupId = target?.group_id;
                    if (!groupId) return t;
                    const membersLeft = t.exercises.filter(
                        (e) => e._id !== eid && e.group_id === groupId,
                    );
                    // Se só sobrar 1 exercício no bloco, desfaz o bloco inteiro
                    // (um "grupo" de 1 exercício não faz sentido).
                    const clearAlso =
                        membersLeft.length === 1 ? membersLeft[0]._id : null;
                    return {
                        ...t,
                        exercises: t.exercises.map((e) =>
                            e._id === eid || e._id === clearAlso
                                ? { ...e, group_id: undefined }
                                : e,
                        ),
                    };
                }),
            );
            requestSave();
        },
        [requestSave],
    );

    /* ── Ordenação por arrastar e soltar ── */
    const reorderTrainings = useCallback(
        (order: string[]) => {
            setLocalTrainings((prev) => {
                const byId = new Map(prev.map((t) => [t._id, t]));
                const ordered = order
                    .map((id) => byId.get(id))
                    .filter((t): t is LocalTraining => Boolean(t));
                return autoWeekday ? ordered : relabelByPosition(ordered);
            });
            requestSave();
        },
        [autoWeekday, requestSave],
    );

    const reorderExercises = useCallback(
        (tid: string, exerciseIds: string[]) => {
            setLocalTrainings((prev) =>
                prev.map((t) => {
                    if (t._id !== tid) return t;
                    const byId = new Map(t.exercises.map((e) => [e._id, e]));
                    return {
                        ...t,
                        exercises: exerciseIds
                            .map((id) => byId.get(id))
                            .filter((e): e is LocalExercise => Boolean(e)),
                    };
                }),
            );
            requestSave();
        },
        [requestSave],
    );

    /* ── Prescrição geral do treino ── */
    const bulkFillPrescription = useCallback(
        (tid: string, fields: BulkPrescriptionFields) => {
            setLocalTrainings((prev) =>
                prev.map((t) => {
                    if (t._id !== tid) return t;
                    const entries = (
                        Object.entries(fields) as [
                            keyof BulkPrescriptionFields,
                            string,
                        ][]
                    ).filter(([, value]) => value !== '');
                    if (entries.length === 0) return t;
                    return {
                        ...t,
                        exercises: t.exercises.map((e) => ({
                            ...e,
                            ...Object.fromEntries(entries),
                        })),
                    };
                }),
            );
            requestSave();
        },
        [requestSave],
    );

    /* ── Derivados para os resumos dos cards ── */
    const totalExercises = localTrainings.reduce(
        (acc, t) => acc + t.exercises.length,
        0,
    );
    const trainingsSummary =
        localTrainings.length === 0
            ? 'Nenhum treino ainda'
            : `${localTrainings.length} treino${localTrainings.length === 1 ? '' : 's'} · ${totalExercises} exercício${totalExercises === 1 ? '' : 's'}`;

    const deloadCount = localMicrocycles.filter((m) => m.is_deload).length;
    const weeksSummary = simpleMode
        ? 'RPE, volume, intensidade e foco da semana'
        : `${localMicrocycles.length} semana${localMicrocycles.length === 1 ? '' : 's'}${deloadCount > 0 ? ` · ${deloadCount} deload` : ''}`;

    // Aviso leve (não bloqueia salvar): fases longas sem nenhuma semana de
    // deload marcada são um sinal comum de risco de overtraining — ver
    // diretrizes de periodização (Bompa/Fleck: deload a cada 4-6 semanas).
    const deloadWarning =
        !simpleMode && durationWeeksWatch >= 5 && deloadCount === 0;

    const current = stack.current;
    const activeTraining = useMemo(() => {
        if (
            current.card !== 'training' &&
            current.card !== 'exercise' &&
            current.card !== 'picker' &&
            current.card !== 'bulkPrescription'
        )
            return null;
        return (
            localTrainings.find((t) => t._id === current.trainingId) ?? null
        );
    }, [current, localTrainings]);
    const activeTrainingIndex = activeTraining
        ? localTrainings.indexOf(activeTraining)
        : -1;

    const activeExercise =
        current.card === 'exercise' && activeTraining
            ? (activeTraining.exercises.find(
                  (e) => e._id === current.exerciseId,
              ) ?? null)
            : null;

    const activeMicro =
        current.card === 'week'
            ? (localMicrocycles.find((m) => m._id === current.microId) ?? null)
            : null;

    /* Um card que deixou de existir (treino removido de outra tela, semana que
     * sumiu ao encurtar a fase) não pode deixar o modal em branco. */
    useEffect(() => {
        if (current.card === 'week' && !activeMicro) stack.pop();
        if (
            (current.card === 'training' ||
                current.card === 'exercise' ||
                current.card === 'picker' ||
                current.card === 'bulkPrescription') &&
            !activeTraining
        )
            stack.resetTo({ card: 'trainings' });
        if (current.card === 'exercise' && activeTraining && !activeExercise)
            stack.pop();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current, activeTraining, activeExercise, activeMicro]);

    const openPreview = useCallback(
        (exercise: LocalExercise, siblings: LocalExercise[]) =>
            setPreview({
                exercise: localExerciseToLog(exercise),
                siblings: siblings.map(localExerciseToLog),
                localId: exercise._id,
            }),
        [],
    );

    const previewNextInGroup = (): ExerciseLog | null => {
        if (!preview) return null;
        const { exercise, siblings } = preview;
        const idx = siblings.findIndex((e) => e.id === exercise.id);
        if (idx === -1) return null;
        const next = siblings[idx + 1];
        if (next && exercise.group_id && next.group_id === exercise.group_id) {
            return next;
        }
        return null;
    };

    /* ── Título e corpo do card atual ── */
    const cardTitle = (): string => {
        switch (current.card) {
            case 'phase':
                return mode === 'add'
                    ? 'Nova fase (mesociclo)'
                    : `Editar: ${meso?.name ?? 'fase'}`;
            case 'trainings':
                return simpleMode ? 'Treinos da semana' : 'Treinos da fase';
            case 'training':
                return activeTraining
                    ? trainingFullLabel(
                          activeTraining,
                          activeTrainingIndex,
                          simpleMode,
                          isNumbered,
                      )
                    : 'Treino';
            case 'exercise':
                return activeExercise?.name || 'Exercício';
            case 'picker':
                return current.replaceExerciseId
                    ? 'Trocar exercício'
                    : 'Escolher exercício';
            case 'bulkPrescription':
                return 'Prescrição geral';
            case 'weeks':
                return simpleMode ? 'Ajustes da semana' : 'Ajustes semanais';
            case 'week':
                return activeMicro
                    ? simpleMode
                        ? 'Semana de treino'
                        : `Semana ${activeMicro.week_number}`
                    : 'Semana';
        }
    };

    const cardBody = () => {
        switch (current.card) {
            case 'phase':
                return (
                    <PhaseCard
                        register={register}
                        errors={errors}
                        setValue={setValue}
                        durationWeeks={durationWeeksWatch}
                        trainingsSummary={trainingsSummary}
                        weeksSummary={weeksSummary}
                        deloadWarning={deloadWarning}
                        onOpenTrainings={() =>
                            stack.push({ card: 'trainings' })
                        }
                        onOpenWeeks={() => stack.push({ card: 'weeks' })}
                    />
                );

            case 'trainings':
                return (
                    <TrainingsListCard
                        trainings={localTrainings}
                        simpleMode={simpleMode}
                        isNumbered={isNumbered}
                        onOpenTraining={(trainingId) =>
                            stack.push({ card: 'training', trainingId })
                        }
                        onAddTraining={addTraining}
                        onDuplicateTraining={duplicateTraining}
                        onRemoveTraining={removeTraining}
                        onReorderTrainings={reorderTrainings}
                    />
                );

            case 'training':
                if (!activeTraining) return null;
                return (
                    <TrainingCard
                        training={activeTraining}
                        index={activeTrainingIndex}
                        simpleMode={simpleMode}
                        isNumbered={isNumbered}
                        onUpdateRef={(ref) =>
                            updateTrainingRef(activeTraining._id, ref)
                        }
                        onUpdateWeekday={(weekday) =>
                            updateTrainingWeekday(activeTraining._id, weekday)
                        }
                        onOpenExercise={(exerciseId) =>
                            stack.push({
                                card: 'exercise',
                                trainingId: activeTraining._id,
                                exerciseId,
                                tab: 'serie',
                            })
                        }
                        onOpenPicker={() =>
                            stack.push({
                                card: 'picker',
                                trainingId: activeTraining._id,
                            })
                        }
                        onOpenBulkPrescription={() =>
                            stack.push({
                                card: 'bulkPrescription',
                                trainingId: activeTraining._id,
                            })
                        }
                        onAddManualExercise={() => {
                            const exercise = blankExercise();
                            addExercise(activeTraining._id, exercise);
                            stack.push({
                                card: 'exercise',
                                trainingId: activeTraining._id,
                                exerciseId: exercise._id,
                                tab: 'serie',
                            });
                        }}
                        onRemoveExercise={(eid) =>
                            removeExercise(activeTraining._id, eid)
                        }
                        onUpdateExercise={(eid, field, value) =>
                            updateExercise(activeTraining._id, eid, field, value)
                        }
                        onReorderExercises={(ids) =>
                            reorderExercises(activeTraining._id, ids)
                        }
                        onCombineWithPrevious={(eid) =>
                            combineWithPrevious(activeTraining._id, eid)
                        }
                        onUngroupExercises={(groupId) =>
                            ungroupExercises(activeTraining._id, groupId)
                        }
                        onRemoveLastFromGroup={(eid) =>
                            removeLastFromGroup(activeTraining._id, eid)
                        }
                        onPreviewExercise={(ex) =>
                            openPreview(ex, activeTraining.exercises)
                        }
                    />
                );

            case 'exercise':
                if (!activeTraining || !activeExercise) return null;
                return (
                    <ExerciseCard
                        exercise={activeExercise}
                        tab={current.tab}
                        onTabChange={(tab: ExerciseTab) =>
                            stack.replace({ ...current, tab })
                        }
                        onUpdate={(field, value) =>
                            updateExercise(
                                activeTraining._id,
                                activeExercise._id,
                                field,
                                value,
                            )
                        }
                        onSetVideo={(url, thumb) => {
                            // Link e capa andam juntos (ver ExerciseVideoField);
                            // o setState do dono é funcional, então as duas
                            // chamadas se acumulam no mesmo render.
                            updateExercise(
                                activeTraining._id,
                                activeExercise._id,
                                'video_url',
                                url,
                            );
                            updateExercise(
                                activeTraining._id,
                                activeExercise._id,
                                'video_thumb',
                                thumb,
                            );
                        }}
                        onPreview={() =>
                            openPreview(
                                activeExercise,
                                activeTraining.exercises,
                            )
                        }
                        onReplace={() =>
                            stack.push({
                                card: 'picker',
                                trainingId: activeTraining._id,
                                replaceExerciseId: activeExercise._id,
                            })
                        }
                        resolveVideoLink={resolveVideoLink}
                        videoPlanHint={videoPlanHint}
                    />
                );

            case 'picker':
                if (!activeTraining) return null;
                if (current.replaceExerciseId) {
                    const replaceId = current.replaceExerciseId;
                    return (
                        <ExercisePicker
                            onPick={(item: ExerciseLibraryItem) => {
                                replaceExercise(
                                    activeTraining._id,
                                    replaceId,
                                    item,
                                );
                                // Volta para o card do exercício (o _id local
                                // não muda), já com o movimento novo.
                                stack.pop();
                            }}
                            onClose={() => stack.pop()}
                        />
                    );
                }
                return (
                    <ExercisePicker
                        onPickMany={(
                            items: ExerciseLibraryItem[],
                            groupTechnique?: string,
                        ) => {
                            // Combinados na seleção: mesmo group_id novo para
                            // todos — são consecutivos (entram no fim da lista),
                            // que é o que partitionExerciseGroups exige.
                            const group = groupTechnique
                                ? {
                                      group_id: genId(),
                                      group_technique: groupTechnique,
                                  }
                                : {};
                            const exercises = items.map((item) =>
                                blankExercise({
                                    ...group,
                                    // Vem da biblioteca: já nasce vinculado, é
                                    // o que permite propagar mídia depois.
                                    exercise_library_id: item.id,
                                    name: item.name,
                                    muscle_group: item.muscle_group ?? '',
                                    video_url: item.video_url ?? '',
                                    video_thumb: item.video_thumb ?? '',
                                }),
                            );
                            // setState funcional: as chamadas se acumulam.
                            exercises.forEach((ex) =>
                                addExercise(activeTraining._id, ex),
                            );
                            if (exercises.length === 1) {
                                // Um só: segue direto para a prescrição dele,
                                // como era antes da multi-seleção.
                                stack.replace({
                                    card: 'exercise',
                                    trainingId: activeTraining._id,
                                    exerciseId: exercises[0]._id,
                                    tab: 'serie',
                                });
                            } else {
                                // Lote: volta para a lista do treino, onde a
                                // "prescrição geral" preenche todos de uma vez.
                                goBack();
                            }
                        }}
                        onClose={goBack}
                    />
                );

            case 'bulkPrescription':
                if (!activeTraining) return null;
                return (
                    <BulkPrescriptionCard
                        exerciseCount={activeTraining.exercises.length}
                        onApply={(fields) => {
                            bulkFillPrescription(activeTraining._id, fields);
                            stack.pop();
                        }}
                    />
                );

            case 'weeks':
                return (
                    <WeeksListCard
                        microcycles={localMicrocycles}
                        simpleMode={simpleMode}
                        deloadWarning={deloadWarning}
                        onOpenWeek={(microId) =>
                            stack.push({ card: 'week', microId })
                        }
                    />
                );

            case 'week':
                if (!activeMicro) return null;
                return (
                    <WeekCard
                        micro={activeMicro}
                        simpleMode={simpleMode}
                        onUpdate={(field, value) =>
                            updateMicrocycle(activeMicro._id, field, value)
                        }
                    />
                );
        }
    };

    const saveIndicator = () => {
        if (blockedField)
            return (
                <span className={s.saveStatusError} role="status">
                    <FiAlertCircle /> Falta preencher{' '}
                    {BLOCKED_FIELD_LABEL[blockedField] ?? 'um campo obrigatório'}{' '}
                    para salvar
                </span>
            );
        if (queue.status === 'saving')
            return (
                <span className={s.saveStatus}>
                    <FiLoader /> Salvando…
                </span>
            );
        if (queue.status === 'error')
            return (
                <span className={s.saveStatusError} role="alert">
                    <FiAlertCircle /> {queue.errorMessage}
                </span>
            );
        if (queue.status === 'saved')
            return (
                <span className={s.saveStatusOk}>
                    <FiCheck /> Salvo
                </span>
            );
        return (
            <span className={s.saveStatus}>
                As alterações são salvas a cada bloco concluído
            </span>
        );
    };

    return (
        <>
            <Modal
                open
                onClose={handleClose}
                onBack={stack.depth > 0 ? goBack : undefined}
                title={cardTitle()}
                closeOnBackdrop={false}
                footer={
                    <>
                        {saveIndicator()}
                        {(queue.status === 'error' || blockedField) && (
                            <button
                                type="button"
                                className={s.btnSmall}
                                onClick={() => void trySave(true)}
                            >
                                {blockedField ? 'Preencher' : 'Tentar de novo'}
                            </button>
                        )}
                        <button
                            type="button"
                            className={s.btnEdit}
                            onClick={stack.depth > 0 ? goBack : handleClose}
                            style={{ padding: '8px 24px', fontSize: '0.9rem' }}
                        >
                            {stack.depth > 0 ? 'Concluir' : 'Fechar'}
                        </button>
                    </>
                }
            >
                {cardBody()}
            </Modal>

            {/* Pré-visualização do exercício (o mesmo card que o aluno vê).
                readOnly: anotações e o registro de carga do próprio aluno não
                aparecem aqui (essas telas são "/me/..."). A carga PRESCRITA
                continua editável direto pelo preview. */}
            {preview && activeTraining && (
                <ExerciseDetailCard
                    exercise={preview.exercise}
                    onClose={() => setPreview(null)}
                    nextInGroup={previewNextInGroup()}
                    onSelectExercise={(exercise) =>
                        setPreview({
                            exercise,
                            siblings: preview.siblings,
                            // Navegar dentro de um bloco troca o exercício em
                            // foco: o _id local vem do treino ativo, casando
                            // pelo id que o ExerciseLog carrega.
                            localId:
                                activeTraining.exercises.find(
                                    (e) => (e.id ?? e._id) === exercise.id,
                                )?._id ?? preview.localId,
                        })
                    }
                    readOnly
                    onPrescribeWeight={(weightKg) =>
                        updateExercise(
                            activeTraining._id,
                            preview.localId,
                            'load_kg',
                            String(weightKg),
                        )
                    }
                />
            )}
        </>
    );
}
