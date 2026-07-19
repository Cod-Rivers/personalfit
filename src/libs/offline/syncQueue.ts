import axios from 'axios';
import { completeNewWorkoutLog, skipNewWorkoutLog } from '@/libs/workoutLogService';
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
    mutation: Omit<NewMutation, 'type' | 'skipReason'>,
): Promise<void> {
    return enqueue({ ...mutation, type: 'complete' });
}

export function enqueueSkip(mutation: Omit<NewMutation, 'type' | 'completeBody'>): Promise<void> {
    return enqueue({ ...mutation, type: 'skip' });
}

export async function getPendingMutationsCount(): Promise<number> {
    const db = await getOfflineDB();
    return db.count('pendingMutations');
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
        const rows = await db.getAll('pendingMutations');

        for (const row of rows) {
            if (row.id === undefined || row.status === 'syncing') continue;

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
                }
                await db.delete('pendingMutations', row.id);
            } catch (err) {
                // 409 "já foi completado": a tentativa anterior já teve sucesso no
                // servidor, só a resposta não chegou de volta ao aparelho —
                // tratar como sincronizado, não como falha.
                if (axios.isAxiosError(err) && err.response?.status === 409) {
                    await db.delete('pendingMutations', row.id);
                    continue;
                }
                // Erro de rede (sem resposta): ainda offline, tenta de novo depois
                // sem incrementar retryCount nem marcar como 'failed'.
                if (axios.isAxiosError(err) && !err.response) {
                    await db.put('pendingMutations', { ...row, status: 'pending' });
                    break;
                }
                await db.put('pendingMutations', {
                    ...row,
                    status: 'failed',
                    retryCount: row.retryCount + 1,
                    lastError: err instanceof Error ? err.message : 'Erro desconhecido',
                });
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
