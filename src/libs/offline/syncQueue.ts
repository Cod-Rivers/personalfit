import axios from 'axios';
import {
    completeNewWorkoutLog,
    skipNewWorkoutLog,
    completeWorkoutSession,
    createNewWorkoutLog,
    CompleteWorkoutLogRequest,
} from '@/libs/workoutLogService';
import { getOfflineDB, PendingMutation } from './db';

const QUEUE_EVENT = 'venafit:queue-changed';

function notifyQueueChanged() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(QUEUE_EVENT));
    }
}

/** Assina mudanças na fila (mutação enfileirada, sincronizada ou falhada). Retorna unsubscribe. */
export function onQueueChanged(cb: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener(QUEUE_EVENT, cb);
    return () => window.removeEventListener(QUEUE_EVENT, cb);
}

type NewMutation = Omit<PendingMutation, 'id' | 'createdAt' | 'status' | 'retryCount'>;

async function enqueue(mutation: NewMutation): Promise<void> {
    const db = await getOfflineDB();
    await db.add('pendingMutations', {
        ...mutation,
        createdAt: new Date().toISOString(),
        status: 'pending',
        retryCount: 0,
    });
    notifyQueueChanged();
    if (typeof navigator !== 'undefined' && navigator.onLine) {
        void processQueue();
    }
}

export function enqueueCompletion(
    mutation: Omit<NewMutation, 'type' | 'skipReason' | 'sessionBody' | 'clientMutationId'>,
): Promise<void> {
    return enqueue({ ...mutation, type: 'complete' });
}

export function enqueueSkip(
    mutation: Omit<NewMutation, 'type' | 'completeBody' | 'sessionBody' | 'clientMutationId'>,
): Promise<void> {
    return enqueue({ ...mutation, type: 'skip' });
}

/** Enfileira uma sessão completa (endpoint novo POST .../workout-log/session,
 * Sprint 3) — cria-ou-conclui numa chamada só, sem depender de um
 * `PendingWorkoutLogId` pré-criado. `workoutLogId` não existe ainda neste
 * ponto (o log só nasce no servidor), então passamos string vazia: nenhum
 * dos caminhos de processamento de `type:'session'` lê esse campo. */
export function enqueueSession(
    mutation: Omit<
        NewMutation,
        'type' | 'completeBody' | 'skipReason' | 'clientMutationId' | 'workoutLogId'
    > & { workoutLogId?: string },
): Promise<void> {
    return enqueue({
        ...mutation,
        workoutLogId: mutation.workoutLogId ?? '',
        type: 'session',
        // Gerado UMA vez, aqui, e nunca regenerado num retry — é a chave de
        // idempotência que o servidor casa com `client_mutation_id`.
        // Regenerar a cada tentativa transformaria cada retry num registro
        // novo, exatamente o bug que essa chave existe para impedir.
        clientMutationId: crypto.randomUUID(),
    });
}

// RN-40: só `failed` expira (o servidor já recusou o corpo por validação —
// reenviar idêntico nunca vai passar). `pending` nunca expira, por mais
// tempo que fique esperando rede — é a distinção que preserva "nada que o
// aluno preencheu se perde" por falta de sinal.
const FAILED_EXPIRATION_DAYS = 45;
const FAILED_EXPIRATION_WARNING_DAYS = 7; // mostra o prazo a partir do dia 38 (45-7)
const DAY_MS = 24 * 60 * 60 * 1000;

function isExpiredFailure(row: PendingMutation): boolean {
    if (row.status !== 'failed' || !row.firstFailedAt) return false;
    return Date.now() - new Date(row.firstFailedAt).getTime() >= FAILED_EXPIRATION_DAYS * DAY_MS;
}

/** Dias restantes antes da mutação `failed` expirar (RN-40), ou `null` se
 * ainda não é hora de mostrar (antes do dia 38) ou se a mutação não está
 * `failed`. Puro — não lê nem escreve o banco, só para a UI decidir o que
 * exibir na lista de pendências. */
export function daysUntilExpiration(row: PendingMutation): number | null {
    if (row.status !== 'failed' || !row.firstFailedAt) return null;
    const elapsedDays = (Date.now() - new Date(row.firstFailedAt).getTime()) / DAY_MS;
    const remaining = Math.ceil(FAILED_EXPIRATION_DAYS - elapsedDays);
    if (remaining > FAILED_EXPIRATION_WARNING_DAYS || remaining < 0) return null;
    return remaining;
}

/** Descarta silenciosamente as mutações `failed` que passaram dos 45 dias
 * (RN-40). Roda embutida em `getPendingMutations` — assim a expiração é
 * aplicada mesmo se o aparelho nunca mais ficar online para `processQueue`
 * rodar (a limpeza não depende de rede, só de relógio local). */
async function expireOldFailedMutations(
    db: Awaited<ReturnType<typeof getOfflineDB>>,
    rows: PendingMutation[],
): Promise<PendingMutation[]> {
    const survivors: PendingMutation[] = [];
    let changed = false;
    for (const row of rows) {
        if (row.id !== undefined && isExpiredFailure(row)) {
            await db.delete('pendingMutations', row.id);
            changed = true;
            continue;
        }
        survivors.push(row);
    }
    if (changed) notifyQueueChanged();
    return survivors;
}

/** Lista completa da fila, para telas que precisam distinguir mutações
 * realmente pendentes (aguardando conexão) das que já falharam de vez (ex:
 * 400 de validação — reenviar o mesmo corpo nunca vai funcionar, ver
 * discardMutation). */
export async function getPendingMutations(): Promise<PendingMutation[]> {
    const db = await getOfflineDB();
    const rows = await db.getAll('pendingMutations');
    return expireOldFailedMutations(db, rows);
}

/** Remove uma mutação da fila sem reenviá-la — usado quando uma mutação
 * 'failed' (rejeição de validação, não falta de conexão) nunca vai ter
 * sucesso ao ser reenviada como está, e ficaria pendurada na fila para
 * sempre do contrário. O aluno perde esse registro específico e precisa
 * refazer o treino manualmente. */
export async function discardMutation(id: number): Promise<void> {
    const db = await getOfflineDB();
    await db.delete('pendingMutations', id);
    notifyQueueChanged();
}

const MAX_BACKOFF_MINUTES = 60;

/** Backoff exponencial com jitter (spec §4.3):
 *
 *   nextAttemptAt = agora + min(2^retryCount, 60) minutos × jitter(0.8…1.2)
 *
 * O jitter evita que várias mutações (do mesmo aparelho, ou de vários
 * aparelhos que perderam rede no mesmo instante) reintentem todas no mesmo
 * segundo quando a rede volta — sem teto de tentativas: uma mutação nunca é
 * descartada sozinha por backoff, só por `discardMutation` manual. */
function computeNextAttemptAt(retryCount: number): string {
    const baseMinutes = Math.min(2 ** retryCount, MAX_BACKOFF_MINUTES);
    const jitter = 0.8 + Math.random() * 0.4;
    const delayMs = baseMinutes * 60_000 * jitter;
    return new Date(Date.now() + delayMs).toISOString();
}

/** Uma linha é elegível para reenvio agora se nunca falhou com backoff
 * agendado, ou se o instante agendado já passou. Não conta como erro pular
 * uma linha ainda em espera — é o comportamento normal do backoff. */
function isEligibleNow(row: PendingMutation): boolean {
    if (!row.nextAttemptAt) return true;
    return Date.now() >= new Date(row.nextAttemptAt).getTime();
}

type OfflineDB = Awaited<ReturnType<typeof getOfflineDB>>;

/** P-8 (spec §9.4 — rollback do endpoint de sessão): se
 * `ADHERENCE_CHECKIN_ENABLED` for desligado em produção com mutações
 * `type:'session'` já na fila de algum aparelho, `POST .../session` passa a
 * devolver 404 nativo do gin (a rota nem existe mais). Em vez de deixar a
 * mutação `failed` para sempre — perdendo o registro do aluno por uma
 * decisão de infraestrutura —, reescrevemos a MESMA linha (mesmo `id`, sem
 * criar uma segunda entrada) para o par create+complete antigo, que
 * continua existindo e nunca sai do ar. Na próxima passada da fila ela é
 * processada normalmente pelo caminho `'complete'` já existente. */
async function rewriteSessionAsCreateThenComplete(
    db: OfflineDB,
    row: PendingMutation,
): Promise<void> {
    const body = row.sessionBody;
    if (!body || row.id === undefined) return;

    const created = await createNewWorkoutLog(
        row.studentId,
        row.planningId,
        row.mesocycleId,
        row.microcycleId,
        {
            planned_date: body.planned_date,
            training_ref: body.training_ref,
        },
    );

    const completeBody: CompleteWorkoutLogRequest = {
        duration_minutes: body.duration_minutes,
        notes: body.notes,
        // client_completed_at é obrigatório em WorkoutSessionRequest, então
        // sempre existe aqui — preserva a verdade temporal original do
        // aluno mesmo depois da reescrita (RN-11/RN-14: tempo na fila, e
        // agora também tempo esperando o rollback, nunca vira atraso dele).
        client_completed_at: body.client_completed_at,
        exercises: body.exercises.map((e) => ({
            exercise_id: e.exercise_id,
            series: e.series,
            reps: e.reps,
            load_kg: e.load_kg,
            rpe: e.rpe,
            notes: e.notes,
            group_id: e.group_id,
        })),
    };

    await db.put('pendingMutations', {
        ...row,
        type: 'complete',
        workoutLogId: created.id,
        completeBody,
        sessionBody: undefined,
        status: 'pending',
        nextAttemptAt: undefined,
    });
}

let isProcessing = false;

/** Reenvia as mutações pendentes ao backend. Silenciosa: chame de novo mais
 * tarde (evento 'online', app voltando ao foreground) se ainda estiver offline. */
export async function processQueue(): Promise<void> {
    if (isProcessing) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    isProcessing = true;
    try {
        const db = await getOfflineDB();
        // getAll percorre a store em ordem crescente de chave — como
        // `id` é autoIncrement monotônico, isso já é "mais antigo primeiro"
        // (spec §4.4) sem precisar ordenar manualmente.
        const rows = await expireOldFailedMutations(db, await db.getAll('pendingMutations'));

        for (const row of rows) {
            if (row.id === undefined || row.status === 'syncing') continue;
            // Ainda em backoff — pula sem contar como erro (spec §4.4).
            if (!isEligibleNow(row)) continue;

            await db.put('pendingMutations', { ...row, status: 'syncing' });

            try {
                if (row.type === 'complete' && row.completeBody) {
                    await completeNewWorkoutLog(
                        row.studentId,
                        row.planningId,
                        row.mesocycleId,
                        row.microcycleId,
                        row.workoutLogId,
                        row.completeBody,
                    );
                } else if (row.type === 'skip') {
                    await skipNewWorkoutLog(
                        row.studentId,
                        row.planningId,
                        row.mesocycleId,
                        row.microcycleId,
                        row.workoutLogId,
                        row.skipReason ?? '',
                    );
                } else if (row.type === 'session' && row.sessionBody) {
                    await completeWorkoutSession(
                        row.studentId,
                        row.planningId,
                        row.mesocycleId,
                        row.microcycleId,
                        row.sessionBody,
                    );
                }
                await db.delete('pendingMutations', row.id);
            } catch (err) {
                // 409 é sucesso terminal idempotente nos dois endpoints: no
                // legado, "já foi completado"; no endpoint de sessão novo,
                // `code: "workout_log_already_completed"` (C-2, corpo com o
                // documento vigente). Em ambos os casos o servidor já tem o
                // dado — apaga da fila e segue para a próxima (RN-16: uma
                // mutação problemática não pode bloquear as seguintes).
                if (axios.isAxiosError(err) && err.response?.status === 409) {
                    await db.delete('pendingMutations', row.id);
                    continue;
                }

                // P-8: rota de sessão desligada depois que a mutação já
                // estava na fila do aparelho — reescreve para create+complete
                // em vez de perder o registro. Se a própria reescrita falhar
                // (ex.: ainda sem rede no meio dela), cai no tratamento de
                // erro genérico abaixo na próxima passada.
                if (
                    row.type === 'session' &&
                    axios.isAxiosError(err) &&
                    err.response?.status === 404
                ) {
                    try {
                        await rewriteSessionAsCreateThenComplete(db, row);
                    } catch (rewriteErr) {
                        await db.put('pendingMutations', {
                            ...row,
                            status: 'pending',
                            retryCount: row.retryCount,
                            lastError:
                                rewriteErr instanceof Error
                                    ? rewriteErr.message
                                    : 'Erro desconhecido',
                        });
                    }
                    continue;
                }

                // Erro de rede (sem resposta): ainda offline, não é falha do
                // aluno nem do payload (RN-14) — mantém retryCount como está e
                // limpa nextAttemptAt (não é caso de backoff, é falta de
                // rede). Interrompe a passada inteira: sem rede, as próximas
                // mutações também vão falhar, tentar seria só desperdício de
                // bateria (spec §4.4 — este `break`, ao contrário do de
                // baixo, continua correto).
                if (axios.isAxiosError(err) && !err.response) {
                    await db.put('pendingMutations', {
                        ...row,
                        status: 'pending',
                        nextAttemptAt: undefined,
                    });
                    break;
                }

                const status = axios.isAxiosError(err) ? err.response?.status : undefined;
                const retryCount = row.retryCount + 1;
                const lastError = err instanceof Error ? err.message : 'Erro desconhecido';

                if (status !== undefined && status >= 500) {
                    // 5xx é passageiro (indisponibilidade momentânea do
                    // servidor) — volta para 'pending' com backoff agendado,
                    // a fila continua tentando sozinha sem intervenção do
                    // aluno. Reservamos 'failed' só para 4xx não-terminal
                    // (branch abaixo), onde reenviar o MESMO corpo nunca
                    // resolve e é a UI quem precisa oferecer descartar.
                    await db.put('pendingMutations', {
                        ...row,
                        status: 'pending',
                        retryCount,
                        nextAttemptAt: computeNextAttemptAt(retryCount),
                        lastError,
                    });
                } else {
                    // 4xx não-terminal (validação etc.) ou erro não-HTTP:
                    // reenviar o mesmo corpo nunca vai funcionar sozinho.
                    // Fica 'failed' para a UI (SyncPendingBadge) oferecer
                    // discardMutation; ainda assim agenda nextAttemptAt para
                    // não martelar o servidor caso o aluno não descarte.
                    await db.put('pendingMutations', {
                        ...row,
                        status: 'failed',
                        retryCount,
                        nextAttemptAt: computeNextAttemptAt(retryCount),
                        lastError,
                        // RN-40: marca só na PRIMEIRA falha definitiva — se a
                        // linha já estava 'failed' antes (retentativa
                        // automática que falhou de novo), preserva a data
                        // original. É dela que os 45 dias contam, não da
                        // falha mais recente.
                        firstFailedAt: row.firstFailedAt ?? new Date().toISOString(),
                    });
                }
                // RN-16: um registro problemático não bloqueia os seguintes
                // — segue para a próxima mutação da fila (spec §4.4, corrige
                // o `break` que existia aqui antes desta sprint).
                continue;
            }
        }
    } finally {
        isProcessing = false;
        notifyQueueChanged();
    }
}

/** Registra os gatilhos de sincronização automática. Chame uma vez no
 * carregamento do app. Retorna uma função de cleanup. */
export function setupSyncTriggers(): () => void {
    if (typeof window === 'undefined') return () => {};

    const onOnline = () => void processQueue();
    const onVisibility = () => {
        if (document.visibilityState === 'visible') void processQueue();
    };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibility);

    if (navigator.onLine) void processQueue();

    return () => {
        window.removeEventListener('online', onOnline);
        document.removeEventListener('visibilitychange', onVisibility);
    };
}
