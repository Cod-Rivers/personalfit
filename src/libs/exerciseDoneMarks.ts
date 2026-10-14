import { EXERCISE_DONE_CACHE_PREFIX, getUser } from '@/libs/session';

/**
 * "Exercício feito" durante o treino: o círculo ao lado do nome, na lista e
 * no card do exercício — em /meus-treinos/[id]/[trainingId] (aluno) e em
 * /personal/aluno/[id]/acompanhar (personal, `studentId` preenchido). Aqui
 * fica só a MARCAÇÃO na tela; a carga do exercício marcado vai ao histórico
 * por outro caminho (libs/exerciseDoneRecord.ts, fila offline).
 *
 * Fica no localStorage, por microciclo + treino (mesma chave de
 * workoutSessionTimer.ts), e só sai quando alguém desmarca ou quando o treino
 * é finalizado (clearExerciseDoneMarks) — sair da tela, recarregar ou fechar
 * o app não apaga. Não vence por tempo: até 10/2026 vencia em 12 h e o dono
 * pediu que só saísse de propósito. A troca de semana já isola sozinha,
 * porque a chave é pelo microciclo. Limpo no logout.
 */

interface StoredMarks {
    ids: string[];
    updatedAt: number;
}

function storageKey(
    microcycleId: string,
    trainingRef: string,
    studentId?: string,
): string | null {
    const userId = getUser()?.id;
    if (!userId || !microcycleId || !trainingRef) return null;
    // Personal acompanhando: separa por aluno, para a marcação de um não
    // aparecer no treino de mesmo nome de outro.
    const owner = studentId && studentId !== userId ? `${userId}>${studentId}` : userId;
    return `${EXERCISE_DONE_CACHE_PREFIX}${owner}:${microcycleId}:${trainingRef}`;
}

export function readExerciseDoneMarks(
    microcycleId: string,
    trainingRef: string,
    studentId?: string,
): Set<string> {
    if (typeof window === 'undefined') return new Set();
    const key = storageKey(microcycleId, trainingRef, studentId);
    if (!key) return new Set();
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return new Set();
        const stored = JSON.parse(raw) as Partial<StoredMarks>;
        if (!Array.isArray(stored.ids)) {
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
    studentId?: string,
): void {
    if (typeof window === 'undefined') return;
    const key = storageKey(microcycleId, trainingRef, studentId);
    if (!key) return;
    const list = [...ids];
    try {
        if (list.length === 0) {
            localStorage.removeItem(key);
            return;
        }
        const stored: StoredMarks = { ids: list, updatedAt: Date.now() };
        localStorage.setItem(key, JSON.stringify(stored));
    } catch {
        /* melhor-esforço — ver readExerciseDoneMarks */
    }
}

export function clearExerciseDoneMarks(
    microcycleId: string,
    trainingRef: string,
    studentId?: string,
): void {
    if (typeof window === 'undefined') return;
    const key = storageKey(microcycleId, trainingRef, studentId);
    if (!key) return;
    try {
        localStorage.removeItem(key);
    } catch {
        /* melhor-esforço */
    }
}
