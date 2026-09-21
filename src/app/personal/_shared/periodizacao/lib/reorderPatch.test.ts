import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
    MesocycleRequest,
    MesocycleResponse,
} from '@/libs/planningService';
import {
    reorderById,
    saveExerciseOrder,
    saveTrainingOrder,
} from './reorderPatch';

/**
 * Arrastar e soltar grava a FASE inteira, como todo o resto do editor. Os
 * riscos aqui são dois, e são os dois que estes testes cobrem:
 *
 * - perder um ID no caminho órfã o histórico de séries e as anotações do
 *   aluno, que apontam para o exercício por ele;
 * - sem rede a ordem NÃO pode ir para a fila offline (ver reorderPatch.ts),
 *   então o servidor não pode ser chamado e o erro precisa dizer isso.
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
                        series: [10],
                        variations: '',
                        video_url: '',
                        video_thumb: '',
                        timed: false,
                    },
                    {
                        id: 'ex-2',
                        name: 'Remada',
                        series: [12],
                        variations: '',
                        video_url: '',
                        video_thumb: '',
                        timed: false,
                    },
                    {
                        id: 'ex-3',
                        name: 'Rosca',
                        series: [15],
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
                        id: 'ex-4',
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
        microcycles: [{ id: 'mc-1', week_number: 1, status: 'active' }],
    };
}

const setOnline = (value: boolean) =>
    Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        get: () => value,
    });

describe('reorderById', () => {
    it('põe no fim, na ordem original, o que não veio na lista de ids', () => {
        const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
        // 'c' não está nos ids (chegou de outra aba, por exemplo) e não pode
        // simplesmente sumir da tela.
        expect(reorderById(items, ['b', 'a']).map((i) => i.id)).toEqual([
            'b',
            'a',
            'c',
        ]);
    });

    it('ignora id que não existe mais', () => {
        const items = [{ id: 'a' }, { id: 'b' }];
        expect(reorderById(items, ['b', 'zz', 'a']).map((i) => i.id)).toEqual([
            'b',
            'a',
        ]);
    });
});

describe('saveTrainingOrder', () => {
    beforeEach(() => setOnline(true));

    it('reenvia a fase inteira, só com os treinos em outra ordem', async () => {
        const persist =
            vi.fn<(req: MesocycleRequest) => Promise<unknown>>()
                .mockResolvedValue(undefined);

        await saveTrainingOrder({ meso: meso(), persist }, ['t-b', 't-a']);

        const req = persist.mock.calls[0][0];
        expect(req.id).toBe('meso-1');
        expect(req.trainings.map((t) => t.id)).toEqual(['t-b', 't-a']);
        // IDs de exercício e microciclo intactos: é deles que dependem o
        // histórico de séries e os registros de treino já feitos.
        expect(req.trainings[1].exercises.map((e) => e.id)).toEqual([
            'ex-1',
            'ex-2',
            'ex-3',
        ]);
        expect(req.microcycles?.map((m) => m.id)).toEqual(['mc-1']);
    });

    it('sem rede não chama o servidor e explica que a ordem não mudou', async () => {
        setOnline(false);
        const persist = vi.fn();

        await expect(
            saveTrainingOrder({ meso: meso(), persist }, ['t-b', 't-a']),
        ).rejects.toThrow(/Sem conexão/);
        expect(persist).not.toHaveBeenCalled();
    });
});

describe('saveExerciseOrder', () => {
    beforeEach(() => setOnline(true));

    it('reordena só o treino alvo, preservando os IDs', async () => {
        const persist =
            vi.fn<(req: MesocycleRequest) => Promise<unknown>>()
                .mockResolvedValue(undefined);

        await saveExerciseOrder({ meso: meso(), persist }, 't-a', [
            'ex-3',
            'ex-1',
            'ex-2',
        ]);

        const req = persist.mock.calls[0][0];
        expect(req.trainings[0].exercises.map((e) => e.id)).toEqual([
            'ex-3',
            'ex-1',
            'ex-2',
        ]);
        expect(req.trainings[0].exercises.map((e) => e.name)).toEqual([
            'Rosca',
            'Supino',
            'Remada',
        ]);
        expect(req.trainings[1].exercises.map((e) => e.id)).toEqual(['ex-4']);
    });

    it('exercício que sumiu do treino não apaga os outros', async () => {
        const persist =
            vi.fn<(req: MesocycleRequest) => Promise<unknown>>()
                .mockResolvedValue(undefined);

        // O personal arrastou com a tela desatualizada: 'ex-9' não existe e
        // 'ex-2' ficou de fora da lista. Nada pode ser descartado.
        await saveExerciseOrder({ meso: meso(), persist }, 't-a', [
            'ex-9',
            'ex-3',
        ]);

        const req = persist.mock.calls[0][0];
        expect(req.trainings[0].exercises.map((e) => e.id)).toEqual([
            'ex-3',
            'ex-1',
            'ex-2',
        ]);
    });

    it('treino que não está mais na fase vira erro claro', async () => {
        const persist = vi.fn();

        await expect(
            saveExerciseOrder({ meso: meso(), persist }, 't-zz', ['ex-1']),
        ).rejects.toThrow(/não está mais nesta fase/);
        expect(persist).not.toHaveBeenCalled();
    });
});
