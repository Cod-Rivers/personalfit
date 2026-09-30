import { EXERCISE_DONE_CACHE_PREFIX, getUser } from '@/libs/session';

/**
 * "Exercício feito" do aluno durante o treino: o checkbox ao lado do nome, na
 * lista e no card do exercício de /meus-treinos/[id]/[trainingId]. É só a
 * lista de conferência da sessão — não vai ao servidor e não entra no
 * registro do treino (séries e carga continuam sendo do WorkoutLogger).
 *
 * Fica no localStorage, por microciclo + treino (mesma chave de
 * workoutSessionTimer.ts), para sobreviver ao que interrompe um treino no
 * meio: a WebView recarregar, o aluno sair do app para responder mensagem.
 * Vence sozinho MAX_AGE_MS depois da última marcação — as marcações de um
 * treino abandonado não podem aparecer como feitas na próxima vez que o
 * aluno abrir o mesmo treino. É apagado ao finalizar o treino e no logout.
 */
export const EXERCISE_DONE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

interface StoredMarks {
    ids: string[];
    updatedAt: number;
}

function storageKey(microcycleId: string, trainingRef: string): string | null {
    const userId = getUser()?.id;
    if (!userId || !microcycleId || !trainingRef) return null;
    return `${EXERCISE_DONE_CACHE_PREFIX}${userId}:${microcycleId}:${trainingRef}`;
}

export function readExerciseDoneMarks(
    microcycleId: string,
    trainingRef: string,
    now: number = Date.now(),
): Set<string> {
    if (typeof window === 'undefined') return new Set();
    const key = storageKey(microcycleId, trainingRef);
    if (!key) return new Set();
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return new Set();
        const stored = JSON.parse(raw) as Partial<StoredMarks>;
        const fresh =
            typeof stored.updatedAt === 'number' &&
            now - stored.updatedAt <= EXERCISE_DONE_MAX_AGE_MS;
        if (!fresh || !Array.isArray(stored.ids)) {
            localStorage.removeItem(key);
            return new Set();
        }
        return new Set(stored.ids.filter((id) => typeof id === 'string'));
    } catch {
        // JSON corrompido ou armazenamento bloqueado: a conferência é
        // conveniência, nunca pode derrubar a tela do treino.
        return new Set();
    }
}

export function writeExerciseDoneMarks(
    microcycleId: string,
    trainingRef: string,
    ids: Iterable<string>,
    now: number = Date.now(),
): void {
    if (typeof window === 'undefined') return;
    const key = storageKey(microcycleId, trainingRef);
    if (!key) return;
    const list = [...ids];
    try {
        if (list.length === 0) {
            localStorage.removeItem(key);
            return;
        }
        const stored: StoredMarks = { ids: list, updatedAt: now };
        localStorage.setItem(key, JSON.stringify(stored));
    } catch {
        /* melhor-esforço — ver readExerciseDoneMarks */
    }
}

export function clearExerciseDoneMarks(microcycleId: string, trainingRef: string): void {
    if (typeof window === 'undefined') return;
    const key = storageKey(microcycleId, trainingRef);
    if (!key) return;
    try {
        localStorage.removeItem(key);
    } catch {
        /* melhor-esforço */
    }
}
