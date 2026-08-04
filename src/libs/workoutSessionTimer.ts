import { WORKOUT_START_CACHE_PREFIX, getUser } from '@/libs/session';

function sessionKey(microcycleId: string, trainingRef: string): string | null {
    const userId = getUser()?.id;
    if (!userId) return null;
    return `${WORKOUT_START_CACHE_PREFIX}${userId}:${microcycleId}:${trainingRef}`;
}

/**
 * Marca o início do treino na 1ª vez que o aluno abre um exercício da
 * sessão (idempotente — chamadas seguintes não sobrescrevem o timestamp).
 */
export function markWorkoutStartIfNeeded(microcycleId: string, trainingRef: string): void {
    if (typeof window === 'undefined') return;
    const key = sessionKey(microcycleId, trainingRef);
    if (!key || localStorage.getItem(key)) return;
    localStorage.setItem(key, String(Date.now()));
}

export function getWorkoutStart(microcycleId: string, trainingRef: string): number | null {
    if (typeof window === 'undefined') return null;
    const key = sessionKey(microcycleId, trainingRef);
    const raw = key && localStorage.getItem(key);
    if (!raw) return null;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
}

export function clearWorkoutStart(microcycleId: string, trainingRef: string): void {
    if (typeof window === 'undefined') return;
    const key = sessionKey(microcycleId, trainingRef);
    if (key) localStorage.removeItem(key);
}

/** Minutos decorridos desde o início, com piso de 1 (evita mostrar "0"). */
export function computeElapsedMinutes(startMs: number): number {
    return Math.max(1, Math.round((Date.now() - startMs) / 60000));
}
