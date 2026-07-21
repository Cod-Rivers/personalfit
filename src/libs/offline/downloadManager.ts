import {
    MacrocycleResponse,
    MesocycleResponse,
    MicrocycleResponse,
    getMyActiveMacrocycle,
} from '@/libs/planningService';
import {
    NewWorkoutLogResponse,
    createNewWorkoutLog,
    getNewWorkoutLogs,
} from '@/libs/workoutLogService';
import { getOfflineDB, pendingWorkoutLogKey, StoredMacrocycle } from './db';

// Deve ficar em sincronia com GIF_CACHE em public/sw.js — Cache Storage é
// compartilhada entre a página e o service worker por esse nome.
const GIF_CACHE_NAME = 'venafit-gifs-v1';

export interface DownloadProgress {
    done: number;
    total: number;
}

export interface DownloadResult {
    macrocycle: MacrocycleResponse;
    mediaTotal: number;
    mediaCached: number;
}

function collectMediaUrls(macro: MacrocycleResponse): string[] {
    const urls = new Set<string>();
    for (const meso of macro.mesocycles ?? []) {
        for (const training of meso.trainings ?? []) {
            for (const ex of training.exercises ?? []) {
                if (ex.video_url) urls.add(ex.video_url);
                if (ex.video_thumb) urls.add(ex.video_thumb);
            }
        }
    }
    return [...urls];
}

/** Mesma heurística usada na tela de treino para achar o microciclo "atual". */
function pickCurrentMicrocycle(meso: MesocycleResponse): MicrocycleResponse | null {
    return (
        meso.microcycles?.find((m) => m.status === 'in_progress') ??
        meso.microcycles?.find((m) => m.status === 'pending') ??
        meso.microcycles?.[meso.microcycles.length - 1] ??
        null
    );
}

function pickCurrentMesocycle(macro: MacrocycleResponse): MesocycleResponse | null {
    const mesos = macro.mesocycles ?? [];
    if (mesos.length === 0) return null;
    return (
        mesos.find((m) => m.microcycles?.some((mc) => mc.status === 'in_progress')) ??
        mesos.find((m) => m.microcycles?.some((mc) => mc.status === 'pending')) ??
        mesos[mesos.length - 1]
    );
}

/**
 * Garante que exista um workout-log "pending" para cada treino (A/B/C/D) do
 * microciclo atual, criando-o online se necessário. Isso permite que
 * WorkoutLogger complete/pule o treino offline mais tarde só com um PATCH
 * contra um ID já conhecido, sem precisar criar (POST) sem conexão — ver
 * plano de implementação para o racional completo. Best-effort: falhas aqui
 * não interrompem o download, apenas fazem o WorkoutLogger cair de volta no
 * fluxo online de criar-então-completar quando não houver ID pré-criado.
 */
async function ensurePendingWorkoutLogs(
    studentId: string,
    macro: MacrocycleResponse,
): Promise<void> {
    const meso = pickCurrentMesocycle(macro);
    const micro = meso ? pickCurrentMicrocycle(meso) : null;
    if (!meso || !micro) return;

    let existing: NewWorkoutLogResponse[] = [];
    try {
        existing = await getNewWorkoutLogs(studentId, macro.id, meso.id, micro.id);
    } catch {
        return;
    }

    const db = await getOfflineDB();

    for (const training of meso.trainings ?? []) {
        const key = pendingWorkoutLogKey(micro.id, training.reference);
        const already = existing.find(
            (l) => l.training_ref === training.reference && l.status !== 'completed',
        );

        if (already) {
            await db.put('pendingWorkoutLogIds', {
                key,
                microcycleId: micro.id,
                trainingRef: training.reference,
                logId: already.id,
            });
            continue;
        }

        try {
            const created = await createNewWorkoutLog(studentId, macro.id, meso.id, micro.id, {
                planned_date: new Date().toISOString().split('T')[0],
                training_ref: training.reference,
            });
            await db.put('pendingWorkoutLogIds', {
                key,
                microcycleId: micro.id,
                trainingRef: training.reference,
                logId: created.id,
            });
        } catch {
            // Sem ID pré-criado para este treino — WorkoutLogger cai no fluxo
            // online normal (create-then-complete) quando houver conexão.
        }
    }
}

/**
 * Baixa o macrociclo ativo do aluno (dados + GIFs dos exercícios) para uso
 * offline. Ação explícita disparada pelo botão "Baixar para offline" —
 * nunca roda em background sem o usuário pedir.
 */
export async function downloadActivePlanForOffline(
    onProgress?: (p: DownloadProgress) => void,
): Promise<DownloadResult> {
    const macro = await getMyActiveMacrocycle();
    if (!macro) {
        throw new Error('Nenhum macrociclo ativo para baixar.');
    }

    const mediaUrls = collectMediaUrls(macro);
    let done = 0;
    let cached = 0;
    onProgress?.({ done, total: mediaUrls.length });

    if (mediaUrls.length > 0 && 'caches' in window) {
        const cache = await caches.open(GIF_CACHE_NAME);
        await Promise.all(
            mediaUrls.map(async (url) => {
                try {
                    const existing = await cache.match(url);
                    if (existing) {
                        cached += 1;
                    } else {
                        const response = await fetch(url, { mode: 'cors' });
                        if (response.ok) {
                            await cache.put(url, response);
                            cached += 1;
                        }
                    }
                } catch (err) {
                    console.warn('[offline] Falha ao cachear mídia:', url, err);
                } finally {
                    done += 1;
                    onProgress?.({ done, total: mediaUrls.length });
                }
            }),
        );
    }

    const db = await getOfflineDB();
    await db.put('macrocycles', {
        id: macro.id,
        data: macro,
        serverUpdatedAt: macro.updated_at,
        downloadedAt: new Date().toISOString(),
    });

    const studentId = getLoggedStudentId();
    if (studentId) {
        await ensurePendingWorkoutLogs(studentId, macro).catch((err) => {
            console.warn('[offline] Falha ao pré-criar logs de treino pendentes:', err);
        });
    }

    if (navigator.storage?.persist) {
        navigator.storage.persist().catch(() => {});
    }

    return { macrocycle: macro, mediaTotal: mediaUrls.length, mediaCached: cached };
}

function getLoggedStudentId(): string {
    if (typeof window === 'undefined') return '';
    try {
        const raw = localStorage.getItem('user');
        return raw ? JSON.parse(raw).id ?? '' : '';
    } catch {
        return '';
    }
}

export async function getOfflineMacrocycle(id: string): Promise<StoredMacrocycle | undefined> {
    const db = await getOfflineDB();
    return db.get('macrocycles', id);
}

export async function getAllOfflineMacrocycles(): Promise<StoredMacrocycle[]> {
    const db = await getOfflineDB();
    return db.getAll('macrocycles');
}

export async function hasOfflineMacrocycle(id: string): Promise<boolean> {
    return Boolean(await getOfflineMacrocycle(id));
}

export function isMacrocycleStale(stored: StoredMacrocycle, remoteUpdatedAt: string): boolean {
    return stored.serverUpdatedAt !== remoteUpdatedAt;
}

export async function getPendingWorkoutLogId(
    microcycleId: string,
    trainingRef: string,
): Promise<string | undefined> {
    const db = await getOfflineDB();
    const row = await db.get('pendingWorkoutLogIds', pendingWorkoutLogKey(microcycleId, trainingRef));
    return row?.logId;
}
