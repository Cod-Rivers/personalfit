import { Api } from '@/libs/api';
import { EXERCISE_NOTE_CACHE_PREFIX, getUser } from '@/libs/session';

export interface ExerciseAnnotationResponse {
    exercise_id: string;
    note: string;
    updated_at?: string;
}

function cacheKey(exerciseId: string): string | null {
    const userId = getUser()?.id;
    if (!userId) return null;
    return `${EXERCISE_NOTE_CACHE_PREFIX}${userId}:${exerciseId}`;
}

/** Lê a última nota salva localmente (preenchimento otimista/offline). */
export function getCachedAnnotationNote(exerciseId: string): string {
    if (typeof window === 'undefined') return '';
    const key = cacheKey(exerciseId);
    return (key && localStorage.getItem(key)) || '';
}

/** Espelha a nota no cache local, namespaced por usuário (ver clearSession). */
export function setCachedAnnotationNote(exerciseId: string, note: string): void {
    if (typeof window === 'undefined') return;
    const key = cacheKey(exerciseId);
    if (!key) return;
    localStorage.setItem(key, note);
}

export async function getExerciseAnnotation(
    exerciseId: string,
): Promise<ExerciseAnnotationResponse> {
    const { data } = await Api.get<ExerciseAnnotationResponse>(
        `/me/exercise-notes/${exerciseId}`,
    );
    return data;
}

export async function saveExerciseAnnotation(
    exerciseId: string,
    note: string,
): Promise<ExerciseAnnotationResponse> {
    const { data } = await Api.put<ExerciseAnnotationResponse>(
        `/me/exercise-notes/${exerciseId}`,
        { note },
    );
    return data;
}
