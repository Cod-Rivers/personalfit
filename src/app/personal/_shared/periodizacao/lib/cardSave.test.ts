import { describe, expect, it } from 'vitest';
import type {
    MacrocycleResponse,
    MesocycleResponse,
    TrainingResponse,
} from '@/libs/planningService';
import {
    adoptSavedIds,
    pickSavedMesocycle,
    responseToLocal,
    localToMesoRequest,
    makeDefaultMicrocycles,
    type MesoPhaseFormData,
} from './mesocycleTransforms';

/**
 * Cobre o que o salvamento POR CARD introduziu de risco novo.
 *
 * Cada card concluído dispara um save; se os IDs devolvidos pelo servidor não
 * forem adotados no estado local, o save seguinte reenvia tudo sem id e o
 * backend cria ObjectIDs novos a cada toque — órfãando o histórico de séries
 * (ExercisePerformance) e as anotações do aluno. É o mesmo churn de ID que já
 * apareceu três vezes neste editor, agora multiplicado pela frequência.
 */

function trainingResponse(
    id: string,
    exerciseIds: string[],
): TrainingResponse {
    return {
        id,
        reference: 'A',
        exercises: exerciseIds.map((exId) => ({
            id: exId,
            name: `Exercício ${exId}`,
            series: [10, 10, 10],
            variations: '',
            video_url: '',
            video_thumb: '',
            timed: false,
        })),
    };
}

function savedMesocycle(
    trainings: TrainingResponse[],
    microIds: string[] = [],
): MesocycleResponse {
    return {
        id: 'meso-1',
        order: 1,
        name: 'Fase',
        phase: 'Base',
        duration_weeks: microIds.length || 1,
        methodology: 'Linear',
        trainings,
        microcycles: microIds.map((id, i) => ({
            id,
            week_number: i + 1,
            status: 'completed',
        })),
    };
}

const phaseData: MesoPhaseFormData = {
    name: 'Fase',
    phase: 'Base',
    duration_weeks: 1,
    methodology: 'Linear',
};

describe('adoptSavedIds', () => {
    it('adota os ids de treino, exercício e microciclo devolvidos pelo servidor', () => {
        const local = responseToLocal([trainingResponse('', ['', ''])]).map(
            (t) => ({
                ...t,
                id: undefined,
                exercises: t.exercises.map((e) => ({ ...e, id: undefined })),
            }),
        );
        const microcycles = makeDefaultMicrocycles(1);

        const { trainings, microcycles: micros } = adoptSavedIds(
            local,
            microcycles,
            savedMesocycle(
                [trainingResponse('t-server', ['ex-1', 'ex-2'])],
                ['micro-1'],
            ),
        );

        expect(trainings[0].id).toBe('t-server');
        expect(trainings[0].exercises.map((e) => e.id)).toEqual([
            'ex-1',
            'ex-2',
        ]);
        expect(micros[0].id).toBe('micro-1');
    });

    it('o id adotado volta no próximo payload — é isso que evita o churn', () => {
        const local = responseToLocal([trainingResponse('', [''])]).map((t) => ({
            ...t,
            id: undefined,
            exercises: t.exercises.map((e) => ({ ...e, id: undefined })),
        }));

        const { trainings } = adoptSavedIds(
            local,
            [],
            savedMesocycle([trainingResponse('t-server', ['ex-1'])]),
        );
        const request = localToMesoRequest(phaseData, trainings, [], 1, 'meso-1');

        expect(request.trainings[0].id).toBe('t-server');
        expect(request.trainings[0].exercises[0].id).toBe('ex-1');
    });

    it('não adota nada quando a estrutura mudou durante o save', () => {
        // O personal removeu um exercício enquanto a requisição estava em voo:
        // casar por índice daria o histórico de um exercício para outro.
        const local = responseToLocal([trainingResponse('', [''])]).map((t) => ({
            ...t,
            id: undefined,
            exercises: t.exercises.map((e) => ({ ...e, id: undefined })),
        }));

        const { trainings } = adoptSavedIds(
            local,
            [],
            savedMesocycle([trainingResponse('t-server', ['ex-1', 'ex-2'])]),
        );

        expect(trainings[0].exercises[0].id).toBeUndefined();
        expect(trainings[0].id).toBeUndefined();
    });

    it('não sobrescreve mídia digitada durante o save, mas aceita a da biblioteca', () => {
        const local = responseToLocal([trainingResponse('t1', ['ex-1'])]);
        local[0].exercises[0].video_url = 'https://digitado-agora.example/v.mp4';

        const saved = savedMesocycle([trainingResponse('t1', ['ex-1'])]);
        saved.trainings[0].exercises[0].video_url =
            'https://biblioteca.example/antigo.mp4';
        saved.trainings[0].exercises[0].video_thumb =
            'https://biblioteca.example/capa.jpg';

        const { trainings } = adoptSavedIds(local, [], saved);

        expect(trainings[0].exercises[0].video_url).toBe(
            'https://digitado-agora.example/v.mp4',
        );
        // A capa estava vazia no estado local: aí sim vale a da biblioteca.
        expect(trainings[0].exercises[0].video_thumb).toBe(
            'https://biblioteca.example/capa.jpg',
        );
    });

    it('reflete o status real da semana, que o servidor deriva dos treinos feitos', () => {
        const microcycles = makeDefaultMicrocycles(1);
        expect(microcycles[0].status).toBe('pending');

        const { microcycles: micros } = adoptSavedIds(
            [],
            microcycles,
            savedMesocycle([], ['micro-1']),
        );

        expect(micros[0].status).toBe('completed');
    });
});

describe('pickSavedMesocycle', () => {
    const macro = {
        id: 'macro-1',
        mesocycles: [
            savedMesocycle([trainingResponse('t1', [])]),
            { ...savedMesocycle([]), id: 'meso-2' },
        ],
    } as unknown as MacrocycleResponse;

    it('casa pelo id numa edição', () => {
        expect(pickSavedMesocycle(macro, 'meso-1')?.id).toBe('meso-1');
    });

    it('numa criação pega a última fase, que é onde o backend anexa', () => {
        expect(pickSavedMesocycle(macro)?.id).toBe('meso-2');
    });

    it('devolve null quando a fase pedida não está mais lá', () => {
        expect(pickSavedMesocycle(macro, 'meso-removida')).toBeNull();
    });
});
