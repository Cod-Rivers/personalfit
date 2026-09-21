import axios from 'axios';
import type {
    MesocycleRequest,
    MesocycleResponse,
} from '@/libs/planningService';
import { mesoToRequest } from './mesocycleTransforms';
import { describeSaveError } from './exercisePatch';

/**
 * Reordenar treinos de uma fase, ou exercícios de um treino, direto das telas
 * de visualização (periodização e /acompanhar) — sem abrir o editor.
 *
 * Mesmo contrato de `saveExercisePatch`: reenvia a FASE inteira a partir de
 * `mesoToRequest`, que preserva os IDs de treino, exercício e microciclo. A
 * ordem no plano É a ordem do array (ver ExerciseResponse.group_id), então
 * reordenar é só embaralhar as listas — nenhum campo novo.
 *
 * Diferença importante: isto NÃO entra na fila offline. A fila
 * (prescriptionQueue) guarda patch de UM exercício; uma ordem pendente
 * aplicada horas depois, por cima de um plano que o personal pode ter editado
 * no meio tempo, embaralharia o treino do aluno sem ninguém pedir. Sem rede a
 * ordem simplesmente não muda, e a tela diz isso.
 */
interface OrderTarget {
    meso: MesocycleResponse;
    /** Grava a fase e REJEITA em erro — a tela mostra o resultado. */
    persist: (req: MesocycleRequest) => Promise<unknown>;
}

const OFFLINE_NOT_SAVED =
    'Sem conexão — a ordem NÃO foi alterada. Tente de novo quando a internet voltar.';

/** Reordena `items` segundo `ids`; o que não estiver na lista fica no fim, na
 * ordem em que estava (um treino criado em outra aba, por exemplo, não some). */
export function reorderById<T extends { id: string }>(
    items: T[],
    ids: string[],
): T[] {
    const byId = new Map(items.map((i) => [i.id, i] as const));
    const ordered = ids
        .map((id) => byId.get(id))
        .filter((i): i is T => i !== undefined);
    const seen = new Set(ordered.map((i) => i.id));
    return [...ordered, ...items.filter((i) => !seen.has(i.id))];
}

async function persistOrder(
    target: OrderTarget,
    mutate: (req: MesocycleRequest) => void,
): Promise<void> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error(OFFLINE_NOT_SAVED);
    }
    const req = mesoToRequest(target.meso);
    mutate(req);
    try {
        await target.persist(req);
    } catch (err) {
        if (axios.isAxiosError(err) && !err.response) {
            throw new Error(OFFLINE_NOT_SAVED);
        }
        throw new Error(describeSaveError(err));
    }
}

/** Nova ordem dos treinos da fase (ids de treino, na ordem final). */
export async function saveTrainingOrder(
    target: OrderTarget,
    trainingIds: string[],
): Promise<void> {
    await persistOrder(target, (req) => {
        const byId = new Map(
            req.trainings.map((t) => [t.id ?? '', t] as const),
        );
        const ordered = trainingIds
            .map((id) => byId.get(id))
            .filter((t): t is (typeof req.trainings)[number] => !!t);
        const seen = new Set(trainingIds);
        req.trainings = [
            ...ordered,
            ...req.trainings.filter((t) => !seen.has(t.id ?? '')),
        ];
    });
}

/** Nova ordem dos exercícios de UM treino (ids de exercício, na ordem final —
 * blocos de bi-set já achatados pelo chamador). */
export async function saveExerciseOrder(
    target: OrderTarget,
    trainingId: string,
    exerciseIds: string[],
): Promise<void> {
    await persistOrder(target, (req) => {
        const training = req.trainings.find((t) => t.id === trainingId);
        if (!training) {
            throw new Error(
                'Este treino não está mais nesta fase. Recarregue a página.',
            );
        }
        const byId = new Map(
            training.exercises.map((e) => [e.id ?? '', e] as const),
        );
        const ordered = exerciseIds
            .map((id) => byId.get(id))
            .filter((e): e is (typeof training.exercises)[number] => !!e);
        const seen = new Set(exerciseIds);
        training.exercises = [
            ...ordered,
            ...training.exercises.filter((e) => !seen.has(e.id ?? '')),
        ];
    });
}
