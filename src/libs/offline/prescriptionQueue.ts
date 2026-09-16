import axios from 'axios';
import { getMacrocycle, updateMesocycle } from '@/libs/planningService';
import { mesoToRequest } from '@/app/personal/_shared/periodizacao/lib/mesocycleTransforms';
import { getOfflineDB, PendingPrescriptionPatch } from './db';
import { computeNextAttemptAt, isEligibleNow, FAILED_EXPIRATION_DAYS } from './syncQueue';

/**
 * Fila offline da edição de série/carga do PERSONAL (ExerciseDetailCard no
 * card de exercício da periodização — ver MesocycleSection.tsx). Mesma
 * ARQUITETURA da fila do aluno (syncQueue.ts: IndexedDB, backoff exponencial
 * com jitter, gatilhos 'online'/visibilitychange, 409 idempotente), mas em
 * store própria e reprocessada de um jeito diferente: em vez de reenviar um
 * payload gravado no momento da edição, cada linha guarda só a INTENÇÃO
 * (qual exercício, qual patch) e busca a fase atual no servidor no momento
 * de sincronizar — ver processPrescriptionQueue.
 *
 * Por que não reenviar o payload congelado: o endpoint de salvamento por
 * card (PUT .../mesocycle/:mesoId) SUBSTITUI a fase inteira. Se o personal
 * ficasse offline por horas, um payload capturado no início da edição
 * apagaria qualquer mudança que a fase tivesse recebido nesse meio tempo
 * (outro card salvo em outro aparelho, ou um microciclo que avançou de
 * status porque o aluno completou treinos enquanto o personal estava sem
 * rede). Buscar a fase de novo na hora de sincronizar elimina essa janela.
 */

/** Sinaliza que uma edição de prescrição foi gravada localmente (IndexedDB)
 * em vez de enviada ao servidor — não é uma falha real, é o card avisando
 * "salvo neste dispositivo, sincroniza quando a rede voltar" em vez de
 * "erro ao salvar". Quem chama `enqueuePrescriptionPatch` no meio de um
 * fluxo de salvamento (ver MesocycleSection.tsx) lança esta classe depois
 * de enfileirar, e o card (ExerciseDetailCard.tsx) a distingue de um erro de
 * verdade só com `instanceof`. */
export class PrescriptionQueuedOfflineError extends Error {
    constructor(
        message = 'Sem conexão — salvo neste dispositivo, será enviado ao aluno quando a internet voltar.',
    ) {
        super(message);
        this.name = 'PrescriptionQueuedOfflineError';
    }
}

const QUEUE_EVENT = 'venafit:prescription-queue-changed';

function notifyQueueChanged() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(QUEUE_EVENT));
    }
}

/** Assina mudanças na fila (patch enfileirado, sincronizado ou falhado). Retorna unsubscribe. */
export function onPrescriptionQueueChanged(cb: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener(QUEUE_EVENT, cb);
    return () => window.removeEventListener(QUEUE_EVENT, cb);
}

export interface EnqueuePrescriptionPatchInput {
    studentId: string;
    planningId: string;
    mesocycleId: string;
    trainingId: string;
    exerciseId: string;
    exerciseName: string;
    patch: PendingPrescriptionPatch['patch'];
}

/** Grava a edição no IndexedDB e tenta sincronizar de imediato se já há
 * rede (mesmo padrão de enqueue() em syncQueue.ts). */
export async function enqueuePrescriptionPatch(
    input: EnqueuePrescriptionPatchInput,
): Promise<void> {
    const db = await getOfflineDB();
    await db.add('pendingPrescriptionPatches', {
        ...input,
        createdAt: new Date().toISOString(),
        status: 'pending',
        retryCount: 0,
    });
    notifyQueueChanged();
    if (typeof navigator !== 'undefined' && navigator.onLine) {
        void processPrescriptionQueue();
    }
}

export async function discardPrescriptionPatch(id: number): Promise<void> {
    const db = await getOfflineDB();
    await db.delete('pendingPrescriptionPatches', id);
    notifyQueueChanged();
}

// RN-40 (mesma política de pendingMutations, reaproveitada): só 'failed'
// expira — o servidor já recusou o corpo por validação, reenviar idêntico
// nunca vai passar. 'pending' nunca expira, não importa quanto tempo o
// personal fique sem rede.
const DAY_MS = 24 * 60 * 60 * 1000;

function isExpiredFailure(row: PendingPrescriptionPatch): boolean {
    if (row.status !== 'failed' || !row.firstFailedAt) return false;
    return Date.now() - new Date(row.firstFailedAt).getTime() >= FAILED_EXPIRATION_DAYS * DAY_MS;
}

async function expireOldFailedPatches(
    db: Awaited<ReturnType<typeof getOfflineDB>>,
    rows: PendingPrescriptionPatch[],
): Promise<PendingPrescriptionPatch[]> {
    const kept: PendingPrescriptionPatch[] = [];
    let changed = false;
    for (const row of rows) {
        if (isExpiredFailure(row) && row.id !== undefined) {
            await db.delete('pendingPrescriptionPatches', row.id);
            changed = true;
            continue;
        }
        kept.push(row);
    }
    if (changed) notifyQueueChanged();
    return kept;
}

/** Lista completa da fila, para o badge distinguir edições realmente
 * pendentes (aguardando conexão) das que já falharam de vez (ver
 * discardPrescriptionPatch). Aplica a expiração de 45 dias na leitura, não
 * só durante processPrescriptionQueue — mesmo padrão de getPendingMutations
 * em syncQueue.ts. */
export async function getPendingPrescriptionPatches(): Promise<
    PendingPrescriptionPatch[]
> {
    const db = await getOfflineDB();
    const rows = await db.getAll('pendingPrescriptionPatches');
    return expireOldFailedPatches(db, rows);
}

let isProcessing = false;

/** Reenvia os patches pendentes ao backend. Silenciosa: chame de novo mais
 * tarde (evento 'online', app voltando ao foreground) se ainda estiver
 * offline. */
export async function processPrescriptionQueue(): Promise<void> {
    if (isProcessing) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    isProcessing = true;
    try {
        const db = await getOfflineDB();
        const rows = await expireOldFailedPatches(
            db,
            await db.getAll('pendingPrescriptionPatches'),
        );

        for (const row of rows) {
            if (row.id === undefined || row.status === 'syncing') continue;
            if (!isEligibleNow(row)) continue;

            await db.put('pendingPrescriptionPatches', {
                ...row,
                status: 'syncing',
            });

            try {
                // Busca a fase ATUAL no servidor — não reenvia um retrato
                // velho (ver comentário no topo do arquivo).
                const macro = await getMacrocycle(row.studentId, row.planningId);
                const meso = macro.mesocycles?.find(
                    (m) => m.id === row.mesocycleId,
                );
                if (!meso) {
                    throw new Error(
                        'Esta fase do plano não existe mais — a edição não pôde ser aplicada.',
                    );
                }
                const req = mesoToRequest(meso);
                const training = req.trainings.find(
                    (t) => t.id === row.trainingId,
                );
                const target = training?.exercises.find(
                    (e) => e.id === row.exerciseId,
                );
                if (!target) {
                    throw new Error(
                        'Este exercício não existe mais nesta fase — a edição não pôde ser aplicada.',
                    );
                }
                Object.assign(target, row.patch);
                await updateMesocycle(row.studentId, row.planningId, meso.id, req);
                await db.delete('pendingPrescriptionPatches', row.id);
            } catch (err) {
                // Sem resposta = sem rede: não é falha do personal nem do
                // patch, mantém 'pending' e para a passada inteira (as
                // próximas também vão falhar por falta de rede).
                if (axios.isAxiosError(err) && !err.response) {
                    await db.put('pendingPrescriptionPatches', {
                        ...row,
                        status: 'pending',
                        nextAttemptAt: undefined,
                    });
                    break;
                }

                const status = axios.isAxiosError(err)
                    ? err.response?.status
                    : undefined;
                const retryCount = row.retryCount + 1;
                const lastError =
                    err instanceof Error ? err.message : 'Erro desconhecido';

                if (status !== undefined && status >= 500) {
                    // 5xx é passageiro — volta para 'pending' com backoff,
                    // a fila tenta de novo sozinha.
                    await db.put('pendingPrescriptionPatches', {
                        ...row,
                        status: 'pending',
                        retryCount,
                        nextAttemptAt: computeNextAttemptAt(retryCount),
                        lastError,
                    });
                } else {
                    // 4xx (validação, fase/exercício apagado) ou erro
                    // não-HTTP: reenviar o mesmo corpo nunca resolve sozinho.
                    // 'failed' para o badge oferecer descartar.
                    await db.put('pendingPrescriptionPatches', {
                        ...row,
                        status: 'failed',
                        retryCount,
                        nextAttemptAt: computeNextAttemptAt(retryCount),
                        lastError,
                        firstFailedAt: row.firstFailedAt ?? new Date().toISOString(),
                    });
                }
                // Uma linha problemática não bloqueia as demais.
                continue;
            }
        }
    } finally {
        isProcessing = false;
        notifyQueueChanged();
    }
}

/** Registra os gatilhos de sincronização automática. Chame uma vez no
 * carregamento do app (ServiceWorkerRegistrar). Retorna uma função de
 * cleanup. Mesmo padrão de setupSyncTriggers em syncQueue.ts. */
export function setupPrescriptionSyncTriggers(): () => void {
    if (typeof window === 'undefined') return () => {};

    const onOnline = () => void processPrescriptionQueue();
    const onVisibility = () => {
        if (document.visibilityState === 'visible') void processPrescriptionQueue();
    };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibility);

    if (navigator.onLine) void processPrescriptionQueue();

    return () => {
        window.removeEventListener('online', onOnline);
        document.removeEventListener('visibilitychange', onVisibility);
    };
}
