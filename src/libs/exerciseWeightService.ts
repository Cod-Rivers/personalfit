import { Api } from '@/libs/api';
import { EXERCISE_WEIGHT_CACHE_PREFIX, getUser } from '@/libs/session';

export interface ExerciseWeightPreferenceResponse {
    exercise_id: string;
    weight_kg: number;
    updated_at?: string;
}

function cacheKey(exerciseId: string): string | null {
    const userId = getUser()?.id;
    if (!userId) return null;
    return `${EXERCISE_WEIGHT_CACHE_PREFIX}${userId}:${exerciseId}`;
}

/** Lê a última carga salva localmente (preenchimento otimista/offline). */
export function getCachedWeight(exerciseId: string): number | null {
    if (typeof window === 'undefined') return null;
    const key = cacheKey(exerciseId);
    const raw = key && localStorage.getItem(key);
    if (!raw) return null;
    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : null;
}

/** Espelha a carga no cache local, namespaced por usuário (ver clearSession). */
export function setCachedWeight(exerciseId: string, weightKg: number): void {
    if (typeof window === 'undefined') return;
    const key = cacheKey(exerciseId);
    if (!key) return;
    localStorage.setItem(key, String(weightKg));
}

export async function getExerciseWeight(
    exerciseId: string,
): Promise<ExerciseWeightPreferenceResponse> {
    const { data } = await Api.get<ExerciseWeightPreferenceResponse>(
        `/me/exercise-weight/${exerciseId}`,
    );
    return data;
}

export async function saveExerciseWeight(
    exerciseId: string,
    weightKg: number,
): Promise<ExerciseWeightPreferenceResponse> {
    const { data } = await Api.put<ExerciseWeightPreferenceResponse>(
        `/me/exercise-weight/${exerciseId}`,
        { weight_kg: weightKg },
    );
    return data;
}
