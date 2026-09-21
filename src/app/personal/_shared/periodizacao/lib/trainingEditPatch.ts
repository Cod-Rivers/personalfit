import axios from 'axios';
import type {
    ExerciseLibraryItem,
    ExerciseRequest,
    MesocycleRequest,
    MesocycleResponse,
    TrainingRequest,
} from '@/libs/planningService';
import {
    NEXT_REF,
    genId,
    mesoToRequest,
    nextFreeWeekday,
    relabelByPosition,
} from './mesocycleTransforms';
import { describeSaveError } from './exercisePatch';

/**
 * Adicionar, excluir e trocar exercício direto da tela do treino do aluno
 * (/acompanhar), sem abrir o editor da fase.
 *
 * Mesmo contrato de `saveExercisePatch` e `saveExerciseOrder`: reenvia a FASE
 * inteira a partir de `mesoToRequest`, que preserva os IDs de treino,
 * exercício e microciclo.
 *
 * E, como a ordem (ver reorderPatch.ts), isto NÃO entra na fila offline: a
 * fila guarda patch de campos de UM exercício que já existe. Um exercício
 * incluído ou apagado horas depois, por cima de um plano que pode ter mudado
 * no meio tempo, mexeria no treino do aluno sem ninguém pedir. Sem rede a
 * operação simplesmente não acontece, e a tela diz isso.
 *
 * Os mutadores são funções puras sobre o request, separadas da gravação, para
 * serem testadas sem rede.
 */
export interface TrainingEditTarget<T> {
    meso: MesocycleResponse;
    /** Grava a fase e REJEITA em erro. O retorno é repassado ao chamador —
     * trocar um exercício muda o id dele, e quem chamou precisa da fase como
     * o servidor devolveu para reabrir o card no exercício novo. */
    persist: (req: MesocycleRequest) => Promise<T>;
}

const OFFLINE_NOT_SAVED =
    'Sem conexão — o treino NÃO foi alterado. Tente de novo quando a internet voltar.';

export async function saveTrainingEdit<T>(
    target: TrainingEditTarget<T>,
    mutate: (req: MesocycleRequest) => void,
): Promise<T> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error(OFFLINE_NOT_SAVED);
    }
    const req = mesoToRequest(target.meso);
    mutate(req);
    try {
        return await target.persist(req);
    } catch (err) {
        if (axios.isAxiosError(err) && !err.response) {
            throw new Error(OFFLINE_NOT_SAVED);
        }
        throw new Error(describeSaveError(err));
    }
}

function findTraining(
    req: MesocycleRequest,
    trainingId: string,
): TrainingRequest {
    const training = req.trainings.find((t) => t.id === trainingId);
    if (!training) {
        throw new Error(
            'Este treino não está mais nesta fase. Recarregue a página.',
        );
    }
    return training;
}

function findExerciseIndex(training: TrainingRequest, exerciseId: string) {
    const idx = training.exercises.findIndex((e) => e.id === exerciseId);
    if (idx === -1) {
        throw new Error(
            'Este exercício não está mais neste treino. Recarregue a página.',
        );
    }
    return idx;
}

/** Exercício novo vindo da biblioteca, com a mesma prescrição inicial do
 * editor da fase (3 × 10 — ver blankExercise em MesocycleFormModal). Sem
 * `id`: o servidor dá a identidade. */
export function exerciseFromLibrary(
    item: ExerciseLibraryItem,
    group: { group_id?: string; group_technique?: string } = {},
): ExerciseRequest {
    return {
        exercise_library_id: item.id,
        name: item.name,
        series: [10, 10, 10],
        variations: '',
        comments: '',
        video_url: item.video_url ?? '',
        video_thumb: item.video_thumb ?? '',
        timed: false,
        muscle_group: item.muscle_group || undefined,
        ...group,
    };
}

/** Acrescenta os exercícios no fim do treino. `groupTechnique` presente = os
 * selecionados formam UM bloco (bi-set, tri-set…): mesmo group_id, e são
 * consecutivos, que é o que partitionExerciseGroups exige. */
export function addExercisesToTraining(
    req: MesocycleRequest,
    trainingId: string,
    items: ExerciseLibraryItem[],
    groupTechnique?: string,
): void {
    const training = findTraining(req, trainingId);
    const group =
        groupTechnique && items.length > 1
            ? { group_id: genId(), group_technique: groupTechnique }
            : {};
    training.exercises = [
        ...training.exercises,
        ...items.map((item) => exerciseFromLibrary(item, group)),
    ];
}

/** Remove o exercício. Se ele fazia parte de um bloco e só sobrar um
 * companheiro, o bloco se desfaz — um "bi-set" de um exercício só esconderia
 * o descanso dele (mesma regra de removeLastFromGroup no editor). */
export function removeExerciseFromTraining(
    req: MesocycleRequest,
    trainingId: string,
    exerciseId: string,
): void {
    const training = findTraining(req, trainingId);
    const idx = findExerciseIndex(training, exerciseId);
    const groupId = training.exercises[idx].group_id;
    const remaining = training.exercises.filter((_, i) => i !== idx);
    if (groupId) {
        const left = remaining.filter((e) => e.group_id === groupId);
        if (left.length === 1) {
            left[0].group_id = undefined;
            left[0].group_technique = undefined;
        }
    }
    training.exercises = remaining;
}

/**
 * Troca o exercício por outro da biblioteca no MESMO lugar: posição, bloco,
 * prescrição e técnica ficam; muda o que identifica o movimento.
 *
 * `id: undefined` é deliberado, igual ao replaceExercise do editor: o
 * histórico de carga e as anotações do aluno apontam pelo id, e mantê-lo
 * faria o histórico do supino virar a base de sugestão do exercício novo.
 *
 * Devolve a posição, que é como o chamador acha o exercício novo na resposta.
 */
export function replaceExerciseInTraining(
    req: MesocycleRequest,
    trainingId: string,
    exerciseId: string,
    item: ExerciseLibraryItem,
): number {
    const training = findTraining(req, trainingId);
    const idx = findExerciseIndex(training, exerciseId);
    training.exercises[idx] = {
        ...training.exercises[idx],
        id: undefined,
        exercise_library_id: item.id,
        name: item.name,
        muscle_group: item.muscle_group || undefined,
        video_url: item.video_url ?? '',
        video_thumb: item.video_thumb ?? '',
    };
    return idx;
}

/** Treino novo e vazio no fim da fase, com o próximo rótulo livre (A, B, C…)
 * — a mesma regra do editor da fase. No modo por dia da semana o rótulo é o
 * dia: nasce no próximo dia ainda livre. Devolve a posição, que é como o
 * chamador acha o treino novo na resposta (ele nasce sem id).
 *
 * Reaproveitar a letra de um treino excluído é seguro: o servidor marca o
 * histórico dele como "(excluído)" (ver training-ref-renames.go). */
export function addTrainingToMeso(
    req: MesocycleRequest,
    opts: { autoWeekday: boolean },
): number {
    const usedRefs = req.trainings.map((t) => t.reference);
    const reference =
        NEXT_REF.find((r) => !usedRefs.includes(r)) ??
        String(req.trainings.length + 1);
    req.trainings = [
        ...req.trainings,
        {
            reference,
            weekday: opts.autoWeekday
                ? nextFreeWeekday(req.trainings.map((t) => t.weekday))
                : undefined,
            exercises: [],
        },
    ];
    return req.trainings.length - 1;
}

/** Remove o treino inteiro. A fase não pode ficar sem nenhum: a tela do
 * aluno não teria de onde abrir um treino nem onde adicionar outro. */
export function removeTrainingFromMeso(
    req: MesocycleRequest,
    trainingId: string,
    opts: { relabel?: boolean } = {},
): void {
    findTraining(req, trainingId);
    if (req.trainings.length <= 1) {
        throw new Error('A fase precisa ter pelo menos um treino.');
    }
    req.trainings = req.trainings.filter((t) => t.id !== trainingId);
    // Excluir o B deixa A, C: com letras, o C vira B (ver relabelByPosition).
    if (opts.relabel) req.trainings = relabelByPosition(req.trainings);
}
