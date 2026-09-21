import axios from 'axios';
import type {
    ExerciseRequest,
    MacrocycleResponse,
    MesocycleRequest,
    MesocycleResponse,
} from '@/libs/planningService';
import {
    enqueuePrescriptionPatch,
    PrescriptionQueuedOfflineError,
} from '@/libs/offline/prescriptionQueue';
import { mesoToRequest } from './mesocycleTransforms';

/**
 * Ajuste pontual de UM exercício feito direto no card (séries, carga), sem
 * abrir o editor da fase.
 *
 * Mora aqui, e não dentro de um componente, porque duas telas fazem a mesma
 * coisa — a periodização (MesocycleSection) e o treino do aluno
 * (/personal/aluno/[id]/acompanhar) — e as duas precisam das mesmas garantias:
 *
 * - Reenvia a FASE inteira, que é o contrato de `UpsertMesocycleHandler`
 *   (o endpoint substitui o mesociclo pelo payload). Por isso parte de
 *   `mesoToRequest(meso)`, que preserva os IDs de treino, exercício e
 *   microciclo; perder um deles órfã o histórico de séries e as anotações do
 *   aluno.
 * - Sem rede (detectada antes ou pela falha da chamada), a edição vai para a
 *   fila offline e sincroniza sozinha depois — ver prescriptionQueue.ts. Isso
 *   é sinalizado com `PrescriptionQueuedOfflineError`, que o card trata como
 *   "salvo neste dispositivo", não como erro.
 */
export interface ExercisePatchTarget {
    meso: MesocycleResponse;
    trainingId: string;
    exerciseId: string;
    /** Grava a fase e REJEITA em erro — o card mostra o resultado. */
    persist: (req: MesocycleRequest) => Promise<unknown>;
    /** Sem aluno (telas de template) não há fila: sem rede vira erro. */
    studentId?: string;
    planningId?: string;
    /** Chamado depois que a fila aceitou a edição, para a tela exibir o valor
     * novo — o `meso` em memória só muda com a resposta do servidor, que
     * offline nunca chega. */
    onQueued?: (
        mesocycleId: string,
        trainingId: string,
        exerciseId: string,
        patch: Partial<ExerciseRequest>,
    ) => void;
}

const OFFLINE_NOT_SAVED =
    'Sem conexão — a alteração NÃO foi salva. Tente de novo quando a internet voltar.';

/** Mensagem de erro de uma gravação de prescrição. Sem rede é um caso
 * diferente de erro do servidor, e aqui a distinção importa: o personal está
 * na academia, e precisa saber se a alteração chegou ao aluno ou não. */
export function describeSaveError(err: unknown): string {
    if (axios.isAxiosError(err) && !err.response) {
        return OFFLINE_NOT_SAVED;
    }
    const message = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)?.message
        : undefined;
    return message || 'Não foi possível salvar a alteração. Tente novamente.';
}

export async function saveExercisePatch(
    target: ExercisePatchTarget,
    patch: Partial<ExerciseRequest>,
): Promise<void> {
    const { meso, trainingId, exerciseId, persist } = target;
    const exerciseName =
        meso.trainings
            .find((t) => t.id === trainingId)
            ?.exercises.find((e) => e.id === exerciseId)?.name ?? 'Exercício';

    const queueOffline = async (): Promise<never> => {
        if (!target.studentId || !target.planningId) {
            throw new Error(OFFLINE_NOT_SAVED);
        }
        await enqueuePrescriptionPatch({
            studentId: target.studentId,
            planningId: target.planningId,
            mesocycleId: meso.id,
            trainingId,
            exerciseId,
            exerciseName,
            patch,
        });
        // Só depois de a fila aceitar a edição: o valor novo aparece na tela
        // porque ele já está guardado, não porque "deu certo".
        target.onQueued?.(meso.id, trainingId, exerciseId, patch);
        throw new PrescriptionQueuedOfflineError();
    };

    // Sem rede detectada ANTES de tentar: evita esperar o timeout de uma
    // requisição que já se sabe que vai falhar.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await queueOffline();
    }

    const req = mesoToRequest(meso);
    const exerciseReq = req.trainings
        .find((t) => t.id === trainingId)
        ?.exercises.find((e) => e.id === exerciseId);
    if (!exerciseReq) {
        throw new Error(
            'Este exercício não está mais nesta fase. Recarregue a página.',
        );
    }
    Object.assign(exerciseReq, patch);
    try {
        await persist(req);
    } catch (err) {
        if (axios.isAxiosError(err) && !err.response) {
            // Sem resposta do servidor = sem rede, mesmo que
            // navigator.onLine ainda não tivesse percebido.
            await queueOffline();
        }
        throw new Error(describeSaveError(err));
    }
}

/** Aplica no macrociclo em memória uma edição que foi para a fila offline. */
export function applyExercisePatch(
    macro: MacrocycleResponse,
    mesocycleId: string,
    trainingId: string,
    exerciseId: string,
    patch: Partial<ExerciseRequest>,
): MacrocycleResponse {
    return {
        ...macro,
        mesocycles: (macro.mesocycles ?? []).map((meso) =>
            meso.id !== mesocycleId
                ? meso
                : {
                      ...meso,
                      trainings: (meso.trainings ?? []).map((t) =>
                          t.id !== trainingId
                              ? t
                              : {
                                    ...t,
                                    exercises: (t.exercises ?? []).map((ex) =>
                                        ex.id !== exerciseId
                                            ? ex
                                            : { ...ex, ...patch },
                                    ),
                                },
                      ),
                  },
        ),
    };
}
