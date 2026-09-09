import axios from 'axios';
import { compressImageToBlob } from '@/libs/imageCompression';
import {
    confirmCheckInPhoto,
    requestCheckInPhotoUploadUrl,
} from '@/libs/workoutLogService';
import {
    deleteResolvedSessionLogId,
    getOfflineDB,
    getResolvedSessionLogId,
    PendingMedia,
} from './db';
import {
    computeNextAttemptAt,
    FAILED_EXPIRATION_DAYS,
    isEligibleNow,
    onQueueChanged,
} from './syncQueue';

/**
 * Fila de upload de foto de check-in (Sprint 4, S4.3). Roda DEPOIS da fila
 * principal de mutações (syncQueue.ts): a foto só faz sentido sobre um log
 * que já existe no servidor.
 *
 * ── API pública (para WorkoutCheckIn.tsx, S4.4, consumir) ──
 *
 *   enqueuePhoto({ target, studentId, planningId, mesocycleId, microcycleId, file })
 *     -> Promise<number | null>
 *   Comprime a imagem, guarda no IndexedDB (`pendingMedia`) e dispara o
 *   processamento se já estiver online. `target` é OU `{ logId }` (o
 *   registro já tem ID real do servidor) OU `{ clientMutationId }` (o MESMO
 *   valor devolvido por `enqueueSession` em syncQueue.ts, usado quando o
 *   treino ainda está passando pela fila principal e o ID real só vai
 *   existir depois de sincronizar). Devolve o `id` da linha criada, ou
 *   `null` se nem deu para guardar local (ex.: cota de armazenamento
 *   estourada — o check-in em si nunca é revertido por causa disso, só a
 *   foto se perde; quem chamou decide como avisar o aluno a partir do
 *   `null`).
 *
 *   getPendingMedia() -> Promise<PendingMediaView[]>
 *   Lista para UI de status. `displayStatus` inclui `'waiting_workout_sync'`
 *   (derivado on-the-fly, não é um `status` gravado no banco) para a UI
 *   distinguir "esperando o treino sincronizar" de "esperando rede para
 *   subir a foto em si".
 *
 *   discardPendingPhoto(id) -> Promise<void>
 *   Descarta uma foto `failed` sem tentar de novo — mesmo padrão de
 *   `discardMutation` em syncQueue.ts.
 *
 *   onMediaQueueChanged(cb) -> unsubscribe
 *   Mesmo padrão de `onQueueChanged`: CustomEvent (`venafit:media-queue-changed`),
 *   sem Context.
 *
 *   processMediaQueue() -> Promise<void>
 *   Roda a fila agora. Chamada automaticamente por `enqueuePhoto` (se
 *   online) e pelos gatilhos de `setupMediaSyncTriggers`.
 *
 *   setupMediaSyncTriggers() -> () => void (cleanup)
 *   Registra 'online'/'visibilitychange' (mesmo padrão de
 *   `setupSyncTriggers`) MAIS `onQueueChanged(syncQueue)` — chame uma vez no
 *   bootstrap do app, ao lado de `setupSyncTriggers()`.
 *
 * ── PORQUÊ `target` tem duas variantes ──
 * No fluxo offline-first (Sprint 3) o treino é enfileirado via POST
 * .../workout-log/session ANTES de ter um ID real — o servidor só atribui o
 * ID quando a mutação sincroniza. Se a foto tivesse que esperar por esse ID
 * para sequer ENTRAR na fila, ela nunca seria guardada a tempo num avião —
 * violaria "nunca bloqueia o check-in". Por isso o chamador pode enfileirar
 * a foto imediatamente com só o `clientMutationId` que ele já tem (o mesmo
 * gerado por `enqueueSession`), e esta fila resolve o ID real sozinha assim
 * que `syncQueue.ts` terminar de sincronizar aquela sessão especificamente
 * (ver `setResolvedSessionLogId`/`getResolvedSessionLogId` em db.ts).
 */

const MEDIA_QUEUE_EVENT = 'venafit:media-queue-changed';

function notifyMediaQueueChanged() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(MEDIA_QUEUE_EVENT));
    }
}

/** Assina mudanças na fila de mídia. Retorna unsubscribe. */
export function onMediaQueueChanged(cb: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener(MEDIA_QUEUE_EVENT, cb);
    return () => window.removeEventListener(MEDIA_QUEUE_EVENT, cb);
}

export type PendingPhotoTarget = { logId: string } | { clientMutationId: string };

export interface EnqueuePhotoParams {
    target: PendingPhotoTarget;
    studentId: string;
    planningId: string;
    mesocycleId: string;
    microcycleId: string;
    /** Aceita `File` (input de arquivo) ou `Blob` (captura direta de
     * câmera/canvas) — compressImageToBlob aceita os dois. */
    file: File | Blob;
}

/** Comprime e guarda a foto localmente; dispara o upload se já estiver
 * online. Nunca lança para o chamador em caso de falha de compressão ou de
 * cota de armazenamento estourada — devolve `null` nesses casos, porque a
 * foto é sempre secundária ao check-in (que já foi enfileirado por outro
 * caminho, em syncQueue.ts, e continua intacto). */
export async function enqueuePhoto(params: EnqueuePhotoParams): Promise<number | null> {
    let blob: Blob;
    try {
        blob = await compressImageToBlob(params.file);
    } catch (err) {
        console.error('[mediaQueue] Falha ao comprimir a foto de check-in', err);
        return null;
    }

    const row: Omit<PendingMedia, 'id'> = {
        blob,
        contentType: 'image/jpeg',
        createdAt: new Date().toISOString(),
        status: 'pending',
        retryCount: 0,
        studentId: params.studentId,
        planningId: params.planningId,
        mesocycleId: params.mesocycleId,
        microcycleId: params.microcycleId,
        ...('logId' in params.target
            ? { logId: params.target.logId }
            : { clientMutationId: params.target.clientMutationId }),
    };

    try {
        const db = await getOfflineDB();
        const id = await db.add('pendingMedia', row as PendingMedia);
        notifyMediaQueueChanged();
        if (typeof navigator !== 'undefined' && navigator.onLine) {
            void processMediaQueue();
        }
        return id;
    } catch (err) {
        // Cenário "cota de armazenamento estourada" (spec, cenário 8): grava
        // o registro do treino sem a foto, NUNCA o contrário. O check-in já
        // foi enfileirado por outro caminho (syncQueue.ts) e não depende
        // deste `try` — só a foto se perde aqui, e quem chamou decide como
        // avisar o aluno a partir do retorno `null`.
        console.error('[mediaQueue] Falha ao guardar a foto localmente (cota?)', err);
        return null;
    }
}

export interface PendingMediaView extends PendingMedia {
    displayStatus: 'pending' | 'uploading' | 'waiting_workout_sync' | 'failed';
}

type OfflineDB = Awaited<ReturnType<typeof getOfflineDB>>;

function isExpiredFailure(row: PendingMedia): boolean {
    if (row.status !== 'failed' || !row.firstFailedAt) return false;
    const DAY_MS = 24 * 60 * 60 * 1000;
    return Date.now() - new Date(row.firstFailedAt).getTime() >= FAILED_EXPIRATION_DAYS * DAY_MS;
}

/** Mesma política de RN-40 (syncQueue.ts), aplicada a `pendingMedia`: só
 * `failed` expira, depois de 45 dias — evita a store crescer sem limite com
 * fotos que nunca vão conseguir subir (ex.: log bloqueado por rewrite P-8). */
async function expireOldFailedMedia(
    db: OfflineDB,
    rows: PendingMedia[],
): Promise<PendingMedia[]> {
    const survivors: PendingMedia[] = [];
    let changed = false;
    for (const row of rows) {
        if (row.id !== undefined && isExpiredFailure(row)) {
            await db.delete('pendingMedia', row.id);
            changed = true;
            continue;
        }
        survivors.push(row);
    }
    if (changed) notifyMediaQueueChanged();
    return survivors;
}

/** Lista para UI de status/pendências. */
export async function getPendingMedia(): Promise<PendingMediaView[]> {
    const db = await getOfflineDB();
    const rows = await expireOldFailedMedia(db, await db.getAll('pendingMedia'));

    const out: PendingMediaView[] = [];
    for (const row of rows) {
        let displayStatus: PendingMediaView['displayStatus'] = row.status;
        if (row.status === 'pending' && !row.logId && row.clientMutationId) {
            const resolved = await getResolvedSessionLogId(db, row.clientMutationId);
            if (!resolved) displayStatus = 'waiting_workout_sync';
        }
        out.push({ ...row, displayStatus });
    }
    return out;
}

/** Descarta uma foto `failed` sem tentar de novo — mesmo padrão de
 * `discardMutation` em syncQueue.ts. */
export async function discardPendingPhoto(id: number): Promise<void> {
    const db = await getOfflineDB();
    await db.delete('pendingMedia', id);
    notifyMediaQueueChanged();
}

/** PUT direto ao R2 com a URL presigned — de propósito NÃO usa `Api`
 * (axios): a URL já contém a assinatura, e mandar o Authorization Bearer do
 * Venafit por cima seria inútil (e potencialmente rejeitado pelo R2). É
 * isso que a URL presigned existe para evitar: nenhum byte de imagem passa
 * pelo backend. */
class R2UploadError extends Error {
    status?: number;
    constructor(message: string, status?: number) {
        super(message);
        this.name = 'R2UploadError';
        this.status = status;
    }
}

async function putToR2(uploadUrl: string, blob: Blob, contentType: string): Promise<void> {
    const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: blob,
    });
    if (!res.ok) {
        throw new R2UploadError(`PUT ao R2 falhou (${res.status})`, res.status);
    }
}

/** `fetch` rejeita com `TypeError` quando a rede cai no meio do envio — sem
 * nenhuma resposta HTTP, o mesmo caso "erro sem `response`" que o resto da
 * fila (syncQueue.ts) já trata como "ainda offline", não como falha
 * definitiva (requisito 7 da Sprint 4). */
function isNetworkFailure(err: unknown): boolean {
    if (axios.isAxiosError(err) && !err.response) return true;
    if (err instanceof TypeError) return true;
    return false;
}

function extractStatus(err: unknown): number | undefined {
    if (axios.isAxiosError(err)) return err.response?.status;
    if (err instanceof R2UploadError) return err.status;
    return undefined;
}

type LogIdResolution = { logId: string } | { blocked: string } | null;

/** Descobre o `logId` real para esta foto, ou explica por que nunca vai
 * existir. `null` = ainda esperando (não é erro, só backoff natural de
 * "o treino ainda não sincronizou"). */
async function resolveLogId(db: OfflineDB, row: PendingMedia): Promise<LogIdResolution> {
    if (row.logId) return { logId: row.logId };
    if (!row.clientMutationId) return null; // não deveria acontecer (enqueuePhoto sempre grava um dos dois)

    const resolved = await getResolvedSessionLogId(db, row.clientMutationId);
    if (resolved) return { logId: resolved };

    const mutations = await db.getAll('pendingMutations');
    const match = mutations.find((m) => m.clientMutationId === row.clientMutationId);
    if (!match) return null; // ainda não sincronizou (ou a foto foi enfileirada um instante antes da mutação — corrida benigna, próxima passada resolve)

    if (match.type === 'complete') {
        // P-8 (rollback do endpoint de sessão): a mutação original foi
        // reescrita de 'session' para create+complete porque
        // ADHERENCE_CHECKIN_ENABLED foi desligado no meio do caminho. O
        // endpoint /complete legado NÃO carrega check_in — o servidor nunca
        // vai ter CheckIn != nil neste log, e check-in-photo.go exige isso
        // (retorna 400 senão). A foto nunca teria como ser anexada por este
        // caminho: falha explícita agora em vez de esperar para sempre.
        return {
            blocked:
                'O check-in não foi confirmado nesta sessão (registrado por uma rota sem suporte a foto); a foto não pôde ser anexada.',
        };
    }

    return null; // ainda 'session', esperando sincronizar
}

let isProcessingMedia = false;

/** Reenvia as fotos pendentes. Silenciosa: chame de novo mais tarde (evento
 * 'online', app voltando ao foreground, mudança na fila principal) se ainda
 * estiver esperando por rede ou pelo treino sincronizar. */
export async function processMediaQueue(): Promise<void> {
    if (isProcessingMedia) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    isProcessingMedia = true;
    try {
        const db = await getOfflineDB();
        const rows = await expireOldFailedMedia(db, await db.getAll('pendingMedia'));

        for (const row of rows) {
            if (row.id === undefined || row.status === 'uploading') continue;
            if (!isEligibleNow(row)) continue;

            const resolution = await resolveLogId(db, row);
            if (!resolution) continue; // ainda esperando o treino sincronizar — não conta como erro

            if ('blocked' in resolution) {
                await db.put('pendingMedia', {
                    ...row,
                    status: 'failed',
                    lastError: resolution.blocked,
                    firstFailedAt: row.firstFailedAt ?? new Date().toISOString(),
                });
                continue;
            }

            const logId = resolution.logId;
            await db.put('pendingMedia', { ...row, status: 'uploading' });

            try {
                const { photo_key, upload_url } = await requestCheckInPhotoUploadUrl(
                    row.studentId,
                    row.planningId,
                    row.mesocycleId,
                    row.microcycleId,
                    logId,
                    row.contentType,
                );

                await putToR2(upload_url, row.blob, row.contentType);

                await confirmCheckInPhoto(
                    row.studentId,
                    row.planningId,
                    row.mesocycleId,
                    row.microcycleId,
                    logId,
                    photo_key,
                );

                // Apaga o blob local só DEPOIS do PUT+PATCH confirmados —
                // nunca antes (requisito 4 da Sprint 4): perder a foto por
                // uma queda de rede no meio do caminho seria pior do que
                // mantê-la local até ter certeza de que o servidor já a tem.
                await db.delete('pendingMedia', row.id);
                if (row.clientMutationId) {
                    await deleteResolvedSessionLogId(db, row.clientMutationId);
                }
            } catch (err) {
                if (isNetworkFailure(err)) {
                    // Sem rede: mantém 'pending' sem contar tentativa (mesma
                    // regra de syncQueue.ts) e interrompe a passada — as
                    // próximas fotos também vão falhar por falta de rede.
                    await db.put('pendingMedia', {
                        ...row,
                        status: 'pending',
                        nextAttemptAt: undefined,
                    });
                    break;
                }

                const status = extractStatus(err);
                const retryCount = row.retryCount + 1;
                const lastError = err instanceof Error ? err.message : 'Erro desconhecido';

                if (status !== undefined && status >= 500) {
                    // 5xx é passageiro — volta a 'pending' com backoff.
                    await db.put('pendingMedia', {
                        ...row,
                        status: 'pending',
                        retryCount,
                        nextAttemptAt: computeNextAttemptAt(retryCount),
                        lastError,
                    });
                } else {
                    // 4xx (ex.: foto grande demais, MIME não suportado) ou
                    // erro não-HTTP: reenviar a MESMA foto não vai resolver
                    // sozinho. Fica 'failed' para a UI oferecer
                    // discardPendingPhoto; ainda agenda nextAttemptAt para
                    // não martelar o servidor se o aluno não descartar.
                    await db.put('pendingMedia', {
                        ...row,
                        status: 'failed',
                        retryCount,
                        nextAttemptAt: computeNextAttemptAt(retryCount),
                        lastError,
                        firstFailedAt: row.firstFailedAt ?? new Date().toISOString(),
                    });
                }
                continue; // uma foto problemática não bloqueia as seguintes
            }
        }
    } finally {
        isProcessingMedia = false;
        notifyMediaQueueChanged();
    }
}

/** Registra os gatilhos automáticos da fila de mídia. Chame uma vez no
 * bootstrap do app, ao lado de `setupSyncTriggers()`. Retorna cleanup. */
export function setupMediaSyncTriggers(): () => void {
    if (typeof window === 'undefined') return () => {};

    const onOnline = () => void processMediaQueue();
    const onVisibility = () => {
        if (document.visibilityState === 'visible') void processMediaQueue();
    };
    // A foto depende do logId real, que só existe depois que syncQueue.ts
    // sincroniza a sessão correspondente — reavaliar a cada mudança na fila
    // principal (requisito 2 da Sprint 4) é o que evita a foto ficar parada
    // esperando um evento ('online'/foco) que já aconteceu antes dela
    // "acordar" para verificar se o logId já foi resolvido.
    const unsubscribeQueue = onQueueChanged(() => void processMediaQueue());

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibility);

    if (navigator.onLine) void processMediaQueue();

    return () => {
        window.removeEventListener('online', onOnline);
        document.removeEventListener('visibilitychange', onVisibility);
        unsubscribeQueue();
    };
}
