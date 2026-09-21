import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
    MacrocycleResponse,
    MesocycleRequest,
    MesocycleResponse,
} from '@/libs/planningService';

vi.mock('@/libs/offline/prescriptionQueue', () => {
    class PrescriptionQueuedOfflineError extends Error {}
    return {
        enqueuePrescriptionPatch: vi.fn().mockResolvedValue(undefined),
        PrescriptionQueuedOfflineError,
    };
});

import {
    enqueuePrescriptionPatch,
    PrescriptionQueuedOfflineError,
} from '@/libs/offline/prescriptionQueue';
import { applyExercisePatch, saveExercisePatch } from './exercisePatch';

/**
 * O ajuste rápido do card é usado por duas telas (periodização e treino do
 * aluno). O risco é o de sempre neste editor: o endpoint substitui a FASE
 * inteira, então o payload precisa levar todos os treinos e exercícios com
 * os IDs de origem, ou o histórico de séries do aluno fica órfão.
 */
function meso(): MesocycleResponse {
    return {
        id: 'meso-1',
        order: 1,
        name: 'Fase',
        phase: 'Base',
        duration_weeks: 1,
        methodology: 'Linear',
        trainings: [
            {
                id: 't-a',
                reference: 'A',
                exercises: [
                    {
                        id: 'ex-1',
                        name: 'Supino',
                        series: [10, 10, 10],
                        variations: '',
                        video_url: '',
                        video_thumb: '',
                        timed: false,
                    },
                    {
                        id: 'ex-2',
                        name: 'Remada',
                        series: [12, 12],
                        variations: '',
                        video_url: '',
                        video_thumb: '',
                        timed: false,
                    },
                ],
            },
            {
                id: 't-b',
                reference: 'B',
                exercises: [
                    {
                        id: 'ex-3',
                        name: 'Agachamento',
                        series: [8],
                        variations: '',
                        video_url: '',
                        video_thumb: '',
                        timed: false,
                    },
                ],
            },
        ],
        microcycles: [],
    };
}

const setOnline = (value: boolean) =>
    Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        get: () => value,
    });

describe('saveExercisePatch', () => {
    beforeEach(() => setOnline(true));
    afterEach(() => vi.clearAllMocks());

    it('reenvia a fase inteira com os IDs e só o exercício alvo alterado', async () => {
        const persist = vi.fn<(req: MesocycleRequest) => Promise<unknown>>()
            .mockResolvedValue(undefined);

        await saveExercisePatch(
            { meso: meso(), trainingId: 't-a', exerciseId: 'ex-2', persist },
            { load_kg: 40 },
        );

        const req = persist.mock.calls[0][0];
        expect(req.id).toBe('meso-1');
        expect(req.trainings.map((t) => t.id)).toEqual(['t-a', 't-b']);
        const [ex1, ex2] = req.trainings[0].exercises;
        expect(ex1.id).toBe('ex-1');
        expect(ex1.load_kg).toBeUndefined();
        expect(ex2.id).toBe('ex-2');
        expect(ex2.load_kg).toBe(40);
        expect(req.trainings[1].exercises[0].id).toBe('ex-3');
    });

    it('sem rede vai para a fila e avisa a tela, sem chamar o servidor', async () => {
        setOnline(false);
        const persist = vi.fn();
        const onQueued = vi.fn();

        await expect(
            saveExercisePatch(
                {
                    meso: meso(),
                    trainingId: 't-a',
                    exerciseId: 'ex-1',
                    persist,
                    studentId: 'st-1',
                    planningId: 'plan-1',
                    onQueued,
                },
                { load_kg: 50 },
            ),
        ).rejects.toBeInstanceOf(PrescriptionQueuedOfflineError);

        expect(persist).not.toHaveBeenCalled();
        expect(enqueuePrescriptionPatch).toHaveBeenCalledWith(
            expect.objectContaining({
                studentId: 'st-1',
                planningId: 'plan-1',
                mesocycleId: 'meso-1',
                trainingId: 't-a',
                exerciseId: 'ex-1',
                exerciseName: 'Supino',
                patch: { load_kg: 50 },
            }),
        );
        expect(onQueued).toHaveBeenCalledWith('meso-1', 't-a', 'ex-1', {
            load_kg: 50,
        });
    });

    it('recusa exercício que não existe mais na fase', async () => {
        await expect(
            saveExercisePatch(
                {
                    meso: meso(),
                    trainingId: 't-a',
                    exerciseId: 'sumiu',
                    persist: vi.fn(),
                },
                { load_kg: 1 },
            ),
        ).rejects.toThrow('não está mais nesta fase');
    });
});

describe('applyExercisePatch', () => {
    it('altera só o exercício alvo', () => {
        const macro = {
            id: 'plan-1',
            mesocycles: [meso()],
        } as unknown as MacrocycleResponse;

        const next = applyExercisePatch(macro, 'meso-1', 't-a', 'ex-2', {
            load_kg: 30,
        });

        const exercises = next.mesocycles![0].trainings[0].exercises;
        expect(exercises[1].load_kg).toBe(30);
        expect(exercises[0].load_kg).toBeUndefined();
        // Imutável: o original fica como estava.
        expect(macro.mesocycles![0].trainings[0].exercises[1].load_kg).toBeUndefined();
    });
});
