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
    clientCompletedAtNow,
    skipNewWorkoutLog,
    WorkoutSessionRequest,
    NewWorkoutLogResponse,
} from '@/libs/workoutLogService';
import { getPendingWorkoutLogId } from '@/libs/offline/downloadManager';
import { enqueueSession, enqueueSkip } from '@/libs/offline/syncQueue';
import { enqueuePhoto } from '@/libs/offline/mediaQueue';
import Modal from '@/components/system/Modal';
import WorkoutCheckIn from './WorkoutCheckIn';
import {
    partitionExerciseGroups,
    comboGroupLabel,
} from '@/libs/trainingTechniques';
import {
    getWorkoutStart,
    computeElapsedMinutes,
    clearWorkoutStart,
} from '@/libs/workoutSessionTimer';
import NavRow, { NavRowGroup } from '@/components/molecules/NavRow';
import { useCardStack } from '@/hooks/useCardStack';
import {
    describeSeries,
    reviewProgress,
} from '@/libs/workoutLogSummary';
import HelpTooltip from '@/components/atoms/HelpTooltip';
import { getGlossaryTerm } from '@/libs/glossaryContent';
import s from './WorkoutLogger.module.css';

// Só se aplica ao "Pular Treino" (handleSkip): o endpoint novo de sessão
// (POST .../workout-log/session) só sabe criar-ou-concluir, não tem
// equivalente a pular — então esse fluxo específico ainda depende do log
// pré-criado (ver ensurePendingWorkoutLogs em downloadManager.ts) para
// funcionar offline. Completar o treino (handleComplete) não usa mais esta
// mensagem: com o endpoint de sessão, completar funciona offline com ou sem
// log pré-criado (US-01 critério 5 / cenário S-2 do spec).
/**
 * Cards do registro de treino. O aluno vê a lista de exercícios e entra em um
 * de cada vez — antes, seis exercícios de três séries punham ~78 controles na
 * mesma rolagem, sem nenhuma indicação de onde ele estava.
 */
type LoggerCard = { card: 'list' } | { card: 'block'; blockKey: string };

const OFFLINE_NO_PRECREATED_LOG_MESSAGE_SKIP =
    'Sem conexão e este treino não foi baixado para uso offline. Baixe o plano em "Meus Treinos" enquanto estiver online para poder pular o treino sem internet.';

// Exercícios importados de PDF (ver TrainingPdfReviewScreen.tsx:41) chegam
// com series_label (texto livre, ex.: "8 a 10") em vez do array numérico
// `series` — não há como saber quantas séries o personal prescreveu de
// verdade. Sem um valor padrão aqui, o mapeamento abaixo gerava zero linhas
// e o aluno não tinha nada pra preencher (o treino "desaparecia"). O aluno
// ajusta com os botões de adicionar/remover série.
const DEFAULT_SERIES_ROWS_WHEN_UNSPECIFIED = 3;

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
     * foi enfileirada localmente para sincronizar depois. `photoDiscarded`
     * avisa que o aluno anexou foto no check-in, mas ela nem chegou a ser
     * guardada localmente (cota de armazenamento estourada ou falha ao
     * comprimir) — o treino em si está enfileirado normalmente, só a foto
     * se perdeu; quem chama decide como avisar. */
    onQueued: (info?: { photoDiscarded?: boolean }) => void;
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
                series: (
                    ex.series.length > 0
                        ? ex.series
                        : Array(DEFAULT_SERIES_ROWS_WHEN_UNSPECIFIED).fill(0)
                ).map((plannedReps, i) => ({
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

    // Pré-preenchido a partir de quando o aluno abriu o 1º exercício da
    // sessão (ver workoutSessionTimer.ts); permanece editável para o aluno
    // corrigir se pausou o treino por muito tempo.
    const [duration, setDuration] = useState<number | null>(() => {
        const start = getWorkoutStart(microcycle.id, training.reference);
        return start ? computeElapsedMinutes(start) : null;
    });
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Passo de check-in (US-03 critério 1): "Completar Treino" não enfileira
    // mais direto — primeiro troca o CONTEÚDO deste mesmo Modal pela tela de
    // confirmação (WorkoutCheckIn), sem empilhar um segundo Modal por cima.
    // `checkInDraft` carrega só o que o check-in precisa saber ANTES da
    // confirmação (a data planejada, para estimar o aviso de tardio) —
    // calculada no instante em que o aluno pede para completar, não antes.
    const [step, setStep] = useState<'form' | 'checkin'>('form');

    /* Navegação por cards dentro do MESMO modal (ver useCardStack): abrir um
     * segundo Modal por exercício empilharia backdrop e trava de scroll sem
     * necessidade, e o Escape fecharia a folha errada. */
    const stack = useCardStack<LoggerCard>({ card: 'list' });
    const current = stack.current;

    /** Exercícios que o aluno já abriu. Alimenta o contador de progresso — que
     * NÃO pode ser medido por campo preenchido, já que as séries nascem com a
     * prescrição dentro (ver reviewProgress). */
    const [visited, setVisited] = useState<ReadonlySet<string>>(
        () => new Set(),
    );
    const [checkInDraft, setCheckInDraft] = useState<{
        plannedDate: string;
    } | null>(null);

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

    // Só usados no bloco avulso (ver renderização abaixo): quando o número de
    // séries vem de um chute (DEFAULT_SERIES_ROWS_WHEN_UNSPECIFIED) ou quando
    // o aluno simplesmente fez mais/menos séries do que o planejado, ele
    // ajusta aqui em vez de ficar preso a um número fixo.
    const addSeriesRow = useCallback((exIdx: number) => {
        setLogs((prev) => {
            const newLogs = [...prev];
            const exSeries = newLogs[exIdx].series;
            const last = exSeries[exSeries.length - 1];
            newLogs[exIdx] = {
                ...newLogs[exIdx],
                series: [
                    ...exSeries,
                    {
                        seriesNum: exSeries.length + 1,
                        reps: last?.reps ?? 0,
                        loadKg: last?.loadKg ?? 0,
                        rpe: last?.rpe ?? 7,
                        notes: '',
                    },
                ],
            };
            return newLogs;
        });
    }, []);

    const removeSeriesRow = useCallback((exIdx: number, seriesIdx: number) => {
        setLogs((prev) => {
            const newLogs = [...prev];
            const remaining = newLogs[exIdx].series
                .filter((_, i) => i !== seriesIdx)
                .map((sr, i) => ({ ...sr, seriesNum: i + 1 }));
            newLogs[exIdx] = { ...newLogs[exIdx], series: remaining };
            return newLogs;
        });
    }, []);

    // Chamado só depois que o aluno confirma no passo de check-in
    // (WorkoutCheckIn) — nunca direto do botão "Completar Treino" (ver
    // `goToCheckIn` abaixo). `checkIn` traz o instante confirmado e a foto
    // opcional, já escolhidos na tela anterior.
    const handleComplete = useCallback(
        async (checkIn: {
            confirmedAt: string;
            photoFile: File | null;
            poseChallengeId?: string;
            poseId?: string;
        }) => {
            try {
                setLoading(true);
                setError(null);

                // Sempre pelo endpoint novo (POST .../workout-log/session, Sprint
                // 3): cria-ou-conclui numa chamada só, então funciona offline com
                // ou sem log pré-criado — é literalmente o motivo desta sprint
                // existir (US-01 critério 5, cenário S-2 do spec). O
                // client_mutation_id é gerado UMA vez aqui, antes de qualquer
                // tentativa de rede, e reaproveitado se cair para a fila —
                // regenerar no enfileiramento criaria um segundo registro no
                // servidor a partir do mesmo treino.
                const sessionBody: WorkoutSessionRequest = {
                    client_mutation_id: crypto.randomUUID(),
                    // Carimbado AQUI, no instante em que o aluno finaliza, e não
                    // na hora do envio: se a conclusão for parar na fila offline,
                    // é este valor que o servidor usa para decidir se o registro
                    // foi tardio. Usar o relógio do servidor no momento da
                    // sincronização transformaria falta de rede em atraso do aluno.
                    client_completed_at: clientCompletedAtNow(),
                    training_ref: training.reference,
                    planned_date:
                        checkInDraft?.plannedDate ??
                        new Date().toISOString().split('T')[0],
                    duration_minutes: duration ?? undefined,
                    notes,
                    // check_in é o que torna esta conclusão um CHECK-IN
                    // explícito (US-03 critério 1) — `confirmed_at` é o
                    // instante em que o aluno apertou "Confirmar" na tela
                    // anterior, não o instante em que a fila conseguir
                    // sincronizar.
                    check_in: {
                        confirmed_at: checkIn.confirmedAt,
                        // Prova de pose: o cliente só DECLARA de qual
                        // desafio e qual carta recebeu. Quem sorteia e
                        // gera o código é o servidor, que compara e
                        // decide entre "com prova" e "sem prova".
                        pose_challenge_id: checkIn.poseChallengeId,
                        pose_id: checkIn.poseId,
                    },
                    exercises: logs.flatMap((ex) =>
                        ex.series.map((s) => ({
                            exercise_id: ex.exerciseId,
                            name: ex.name,
                            series: s.seriesNum,
                            reps: s.reps,
                            load_kg: s.loadKg,
                            rpe: s.rpe,
                            notes: s.notes,
                            group_id: ex.groupId,
                        })),
                    ),
                };

                // RN-09/RN-10 (spec): toda conclusão passa pela fila local ANTES
                // de qualquer tentativa de envio, e a confirmação ao aluno não
                // espera resposta do servidor. `enqueueSession` só grava no
                // IndexedDB e sai — quem decide se tenta a rede agora ou mais
                // tarde é o próprio `syncQueue.ts` (dispara `processQueue()` em
                // segundo plano quando `navigator.onLine`, sem bloquear este
                // `await`). Chamar `completeWorkoutSession` direto aqui e só
                // enfileirar no `catch` (padrão antigo) é o bug que este
                // comentário substitui: `navigator.onLine` mente em wifi de
                // academia (conectado, sem internet real), e nesse caso a
                // chamada direta fica pendurada até o timeout — se o aluno
                // fechar a aba antes do `catch` rodar, o registro nunca chega a
                // ser escrito no IndexedDB (a perda que US-02 existe pra evitar).
                //
                // `enqueueSession` devolve o `clientMutationId` gerado — é a
                // ÚNICA referência estável para anexar a foto agora: o log
                // real ainda não existe no servidor neste ponto.
                const clientMutationId = await enqueueSession({
                    studentId,
                    planningId,
                    mesocycleId: mesocycle.id,
                    microcycleId: microcycle.id,
                    trainingRef: training.reference,
                    sessionBody,
                });

                // Foto é OPCIONAL e NUNCA bloqueia (RN-20/22, US-03
                // critérios 2 e 4): o check-in acima já está enfileirado e
                // vale por si só. `enqueuePhoto` já comprime a imagem
                // internamente (mediaQueue.ts) e nunca lança — se cota ou
                // compressão falharem, devolve `null`. Isso não afeta o
                // registro já confirmado, mas é o ÚNICO caso em que a foto
                // nem chega a virar uma linha em `pendingMedia` (pendência
                // -19): sem aviso aqui, não há mais nenhum lugar (nem o
                // badge de sincronização) onde essa perda algum dia
                // apareceria — por isso, diferente de uma foto que falha
                // DEPOIS de enfileirada (essa sim visível via
                // SyncPendingBadge), aqui o aluno precisa saber agora.
                let photoDiscarded = false;
                if (checkIn.photoFile) {
                    const mediaId = await enqueuePhoto({
                        target: { clientMutationId },
                        studentId,
                        planningId,
                        mesocycleId: mesocycle.id,
                        microcycleId: microcycle.id,
                        file: checkIn.photoFile,
                    });
                    photoDiscarded = mediaId === null;
                }

                clearWorkoutStart(microcycle.id, training.reference);
                onQueued(photoDiscarded ? { photoDiscarded: true } : undefined);
            } catch (err) {
                // Só chega aqui se a própria escrita no IndexedDB falhar (quota,
                // navegador sem suporte) — não é mais possível um erro de rede
                // aparecer neste ponto, porque a rede não é mais tentada aqui.
                setError('Erro ao salvar workout. Tente novamente.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        },
        [
            studentId,
            planningId,
            mesocycle,
            microcycle,
            training,
            duration,
            notes,
            logs,
            checkInDraft,
            onQueued,
        ],
    );

    /** Troca o conteúdo do Modal para a tela de check-in (WorkoutCheckIn) —
     * substitui o clique direto em "Completar Treino" de antes desta
     * sprint. `plannedDate` é calculada aqui (não antes) para refletir o
     * instante em que o aluno decidiu concluir, não o de quando abriu o
     * formulário. */
    const goToCheckIn = useCallback(() => {
        setCheckInDraft({ plannedDate: new Date().toISOString().split('T')[0] });
        setStep('checkin');
    }, []);

    const backToForm = useCallback(() => {
        setStep('form');
        setError(null);
    }, []);

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
                    clearWorkoutStart(microcycle.id, training.reference);
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
                        clearWorkoutStart(microcycle.id, training.reference);
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
            clearWorkoutStart(microcycle.id, training.reference);
            onComplete(skipped);
        } catch (err) {
            if (axios.isAxiosError(err) && !err.response) {
                setError(OFFLINE_NO_PRECREATED_LOG_MESSAGE_SKIP);
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

    /** Chave estável do bloco: o id do primeiro exercício dele. Serve de rota
     * do card e de marca de "já conferi este". Não usar o índice — remover uma
     * série reindexa nada, mas o índice não sobrevive a uma mudança de ordem. */
    const blockKey = (block: { idx: number }[]) =>
        logs[block[0].idx].exerciseId;

    const activeBlock =
        current.card === 'block'
            ? (blocks.find((b) => blockKey(b) === current.blockKey) ?? null)
            : null;

    const openBlock = (block: { idx: number }[]) => {
        const key = blockKey(block);
        // Marca ao ABRIR, não ao sair: o que o contador responde é "já olhei
        // este exercício?", e olhar acontece na abertura. Marcar na saída
        // deixaria de contar quem fecha o modal a partir do card.
        setVisited((prev) => new Set(prev).add(key));
        stack.push({ card: 'block', blockKey: key });
    };

    const seriesGridHeader = (
        <div className={s.gridHeader}>
            <span className={s.gridHeaderLabel}>Reps</span>
            <span className={s.gridHeaderLabel}>Kg</span>
            <span className={s.gridHeaderLabel}>
                RPE
                <HelpTooltip
                    text={getGlossaryTerm('rpe').short}
                    href="/ajuda#glossario-rpe"
                    label="Ajuda sobre RPE"
                />
            </span>
            <span className={s.gridHeaderLabel}>Notas</span>
        </div>
    );

    const renderSeriesRow = (
        exIdx: number,
        seriesIdx: number,
        sr: ExerciseLog['series'][number],
        label: React.ReactNode,
        onRemove?: () => void,
    ) => (
        <div key={`${exIdx}-${seriesIdx}`} className={s.seriesRow}>
            <label className={s.label}>
                {label}
                {onRemove && (
                    <button
                        type="button"
                        className={s.removeSeriesBtn}
                        onClick={onRemove}
                        disabled={loading}
                        aria-label={`Remover série ${sr.seriesNum}`}
                    >
                        <FiX />
                    </button>
                )}
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

    /** Card de UM bloco: só as séries dele. Um exercício avulso de 3 séries
     * são 13 controles; o mesmo bloco dentro da lista antiga competia com os
     * outros cinco exercícios pela mesma tela. */
    const renderBlockCard = (block: { idx: number }[]) => {
        if (block.length === 1) {
            const exIdx = block[0].idx;
            const ex = logs[exIdx];
            return (
                <div className={s.content}>
                    <p className={s.blockHeader}>
                        {ex.plannedSeries.length > 0
                            ? `Prescrito: ${ex.plannedSeries.join(' / ')} reps`
                            : 'Sem prescrição de séries — ajuste como você fez'}
                    </p>
                    <div className={s.seriesGrid}>
                        {seriesGridHeader}
                        {ex.series.map((sr, seriesIdx) =>
                            renderSeriesRow(
                                exIdx,
                                seriesIdx,
                                sr,
                                `Série ${sr.seriesNum}`,
                                ex.series.length > 1
                                    ? () => removeSeriesRow(exIdx, seriesIdx)
                                    : undefined,
                            ),
                        )}
                    </div>
                    <button
                        type="button"
                        className={s.addSeriesBtn}
                        onClick={() => addSeriesRow(exIdx)}
                        disabled={loading}
                    >
                        + Adicionar série
                    </button>
                </div>
            );
        }

        // Bloco combinado: séries intercaladas por rodada (Série 1 de A,
        // Série 1 de B, Série 2 de A, ...) — é assim que bi-set/triset/
        // superset são executados de fato, sem descanso entre os exercícios
        // do bloco. O bloco inteiro é UM card justamente por isso: separar os
        // exercícios em cards diferentes desfaria a ordem de execução.
        const members = block.map((b) => logs[b.idx]);
        const maxRounds = Math.max(...members.map((m) => m.series.length));
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
                            <span className={s.comboSeriesLabel}>
                                {ex.name}
                            </span>{' '}
                            · Série {sr.seriesNum}
                        </>,
                    ),
                );
            });
        }

        return (
            <div className={s.content}>
                <p className={s.blockHeaderCombo}>
                    <FiLink />{' '}
                    {members.map((m) => m.name).join(' + ')} — sem descanso
                    entre as séries abaixo
                </p>
                <div className={s.seriesGrid}>
                    {seriesGridHeader}
                    {rows}
                </div>
            </div>
        );
    };

    /** Card raiz: um exercício por linha, mais duração e notas. Oito controles
     * contra os ~78 que a lista antiga exibia de uma vez. */
    const renderListCard = () => (
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
                    Sugestão de hoje: {autoregulation.message} (RPE e carga já
                    pré-preenchidos — ajuste livremente).
                </p>
            )}

            <div className={s.progressLine}>
                <span className={s.progressCount}>
                    {reviewProgress(blocks.length, visited)}
                </span>
                <span>Toque num exercício para conferir as séries</span>
            </div>

            <NavRowGroup>
                {blocks.map((block) => {
                    const key = blockKey(block);
                    const done = visited.has(key);
                    if (block.length === 1) {
                        const ex = logs[block[0].idx];
                        return (
                            <NavRow
                                key={key}
                                title={ex.name}
                                summary={describeSeries(ex.series)}
                                tone={done ? 'done' : 'default'}
                                onClick={() => openBlock(block)}
                            />
                        );
                    }
                    const members = block.map((b) => logs[b.idx]);
                    return (
                        <NavRow
                            key={key}
                            title={comboGroupLabel(
                                block.length,
                                members[0].groupTechnique,
                            )}
                            leading={<FiLink />}
                            summary={members.map((m) => m.name).join(' + ')}
                            tone={done ? 'done' : 'default'}
                            onClick={() => openBlock(block)}
                        />
                    );
                })}
            </NavRowGroup>

            <div className={s.footerSection}>
                <label>
                    Duração (minutos):
                    <input
                        type="number"
                        value={duration ?? ''}
                        onChange={(e) =>
                            setDuration(parseInt(e.target.value) || null)
                        }
                        disabled={loading}
                    />
                    {duration !== null && (
                        <span className={s.durationHint}>
                            Calculado a partir de quando você abriu o 1º
                            exercício. Ajuste se pausou o treino por muito
                            tempo.
                        </span>
                    )}
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
    );

    // Sem footer próprio no passo de check-in: WorkoutCheckIn já tem os
    // botões dele (Voltar/Confirmar) dentro do próprio conteúdo — repetir um
    // footer aqui duplicaria ações na mesma tela.
    //
    // No card de um exercício o rodapé só volta para a lista: concluir ou
    // pular o treino são decisões sobre o treino INTEIRO e ficam na raiz, onde
    // o aluno vê o que já conferiu antes de finalizar.
    const footer =
        step === 'checkin' ? null : activeBlock ? (
            <div className={s.actions}>
                <button
                    type="button"
                    className={s.btnDoneBlock}
                    onClick={() => stack.pop()}
                    disabled={loading}
                >
                    <FiCheck /> Concluir exercício
                </button>
            </div>
        ) : (
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
                    onClick={goToCheckIn}
                    disabled={loading}
                >
                    <FiCheck /> Completar Treino
                </button>
            </div>
        );

    // Dentro de um exercício o título do modal passa a ser o NOME dele — é o
    // que substitui o <h3> que a lista antiga repetia por bloco, e o que diz
    // ao aluno onde ele está depois de entrar.
    const title =
        step === 'form' && activeBlock ? (
            activeBlock.length === 1 ? (
                logs[activeBlock[0].idx].name
            ) : (
                comboGroupLabel(
                    activeBlock.length,
                    logs[activeBlock[0].idx].groupTechnique,
                )
            )
        ) : (
            <>
                Registrar Treino{' '}
                <span className={s.ref}>{training.reference}</span>
            </>
        );

    return (
        <Modal
            open
            onClose={onClose}
            // Voltar só existe dentro de um exercício. No check-in quem manda
            // é o botão "Voltar" do próprio WorkoutCheckIn.
            onBack={step === 'form' && activeBlock ? stack.pop : undefined}
            title={title}
            footer={footer}
        >
            {step === 'checkin' && checkInDraft ? (
                <div className={s.content}>
                    <WorkoutCheckIn
                        plannedDate={checkInDraft.plannedDate}
                        loading={loading}
                        error={error}
                        onConfirm={handleComplete}
                        onCancel={backToForm}
                    />
                </div>
            ) : activeBlock ? (
                renderBlockCard(activeBlock)
            ) : (
                renderListCard()
            )}
        </Modal>
    );
};

export default WorkoutLogger;
