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
import Modal from '@/components/system/Modal';
import {
    partitionExerciseGroups,
    comboGroupLabel,
} from '@/libs/trainingTechniques';
import {
    getWorkoutStart,
    computeElapsedMinutes,
    clearWorkoutStart,
} from '@/libs/workoutSessionTimer';
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
const OFFLINE_NO_PRECREATED_LOG_MESSAGE_SKIP =
    'Sem conexão e este treino não foi baixado para uso offline. Baixe o plano em "Meus Treinos" enquanto estiver online para poder pular o treino sem internet.';

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
                planned_date: new Date().toISOString().split('T')[0],
                duration_minutes: duration ?? undefined,
                notes,
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
            await enqueueSession({
                studentId,
                planningId,
                mesocycleId: mesocycle.id,
                microcycleId: microcycle.id,
                trainingRef: training.reference,
                sessionBody,
            });
            clearWorkoutStart(microcycle.id, training.reference);
            onQueued();
        } catch (err) {
            // Só chega aqui se a própria escrita no IndexedDB falhar (quota,
            // navegador sem suporte) — não é mais possível um erro de rede
            // aparecer neste ponto, porque a rede não é mais tentada aqui.
            setError('Erro ao salvar workout. Tente novamente.');
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
                                        {seriesGridHeader}
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
                                <div className={s.seriesGrid}>
                                    {seriesGridHeader}
                                    {rows}
                                </div>
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
                            {duration !== null && (
                                <span className={s.durationHint}>
                                    Calculado a partir de quando você abriu o
                                    1º exercício. Ajuste se pausou o treino
                                    por muito tempo.
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
        </Modal>
    );
};

export default WorkoutLogger;
