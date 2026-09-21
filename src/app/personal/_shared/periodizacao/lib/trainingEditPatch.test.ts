import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
    ExerciseLibraryItem,
    ExerciseResponse,
    MesocycleRequest,
    MesocycleResponse,
} from '@/libs/planningService';
import { mesoToRequest, relabelByPosition } from './mesocycleTransforms';
import {
    addExercisesToTraining,
    addTrainingToMeso,
    removeExerciseFromTraining,
    removeTrainingFromMeso,
    replaceExerciseInTraining,
    saveTrainingEdit,
} from './trainingEditPatch';

/**
 * Adicionar, excluir e trocar exercício pela tela do treino do aluno. O que
 * pode dar errado de verdade, e é o que estes testes cobrem:
 *
 * - os IDs dos exercícios que NÃO foram mexidos precisam sobreviver (histórico
 *   de carga e anotações do aluno apontam por eles);
 * - o trocado precisa PERDER o id, senão herda o histórico do anterior;
 * - excluir metade de um bi-set não pode deixar um "bloco" de um exercício;
 * - sem rede nada vai ao servidor, e o erro diz isso.
 */
function ex(id: string, extra: Partial<ExerciseResponse> = {}): ExerciseResponse {
    return {
        id,
        name: id,
        series: [10, 10, 10],
        variations: '',
        video_url: '',
        video_thumb: '',
        timed: false,
        ...extra,
    };
}

function meso(exercises: ExerciseResponse[]): MesocycleResponse {
    return {
        id: 'meso-1',
        order: 1,
        name: 'Fase',
        phase: 'Base',
        duration_weeks: 1,
        methodology: 'Linear',
        trainings: [{ id: 't-a', reference: 'A', exercises }],
        microcycles: [],
    } as unknown as MesocycleResponse;
}

function item(id: string, name: string): ExerciseLibraryItem {
    return {
        id,
        name,
        muscle_group: 'costas',
        category: '',
        video_url: `https://v/${id}.mp4`,
        video_thumb: '',
        description: '',
        tags: [],
        created_at: '',
        updated_at: '',
    };
}

const ids = (req: MesocycleRequest) =>
    req.trainings[0].exercises.map((e) => e.id);

describe('addExercisesToTraining', () => {
    it('acrescenta no fim, sem id, vinculado à biblioteca e com 3 × 10', () => {
        const req = mesoToRequest(meso([ex('ex-1')]));
        addExercisesToTraining(req, 't-a', [item('lib-9', 'Remada')]);

        expect(ids(req)).toEqual(['ex-1', undefined]);
        const added = req.trainings[0].exercises[1];
        expect(added.exercise_library_id).toBe('lib-9');
        expect(added.name).toBe('Remada');
        expect(added.series).toEqual([10, 10, 10]);
        expect(added.video_url).toBe('https://v/lib-9.mp4');
        expect(added.group_id).toBeUndefined();
    });

    it('com técnica de grupo, os selecionados formam UM bloco', () => {
        const req = mesoToRequest(meso([ex('ex-1')]));
        addExercisesToTraining(
            req,
            't-a',
            [item('a', 'A'), item('b', 'B')],
            'biset',
        );
        const [, a, b] = req.trainings[0].exercises;
        expect(a.group_id).toBeTruthy();
        expect(b.group_id).toBe(a.group_id);
        expect(a.group_technique).toBe('biset');
    });

    it('um exercício só não vira bloco, mesmo com técnica escolhida', () => {
        const req = mesoToRequest(meso([]));
        addExercisesToTraining(req, 't-a', [item('a', 'A')], 'biset');
        expect(req.trainings[0].exercises[0].group_id).toBeUndefined();
    });
});

describe('removeExerciseFromTraining', () => {
    it('tira só o escolhido e preserva o id dos outros', () => {
        const req = mesoToRequest(meso([ex('ex-1'), ex('ex-2'), ex('ex-3')]));
        removeExerciseFromTraining(req, 't-a', 'ex-2');
        expect(ids(req)).toEqual(['ex-1', 'ex-3']);
    });

    it('desfaz o bi-set que ficaria com um exercício só', () => {
        const req = mesoToRequest(
            meso([
                ex('ex-1', { group_id: 'g', group_technique: 'biset' }),
                ex('ex-2', { group_id: 'g', group_technique: 'biset' }),
            ]),
        );
        removeExerciseFromTraining(req, 't-a', 'ex-2');
        expect(req.trainings[0].exercises[0].group_id).toBeUndefined();
        expect(req.trainings[0].exercises[0].group_technique).toBeUndefined();
    });

    it('mantém o tri-set que continua com dois', () => {
        const g = { group_id: 'g', group_technique: 'triset' };
        const req = mesoToRequest(
            meso([ex('ex-1', g), ex('ex-2', g), ex('ex-3', g)]),
        );
        removeExerciseFromTraining(req, 't-a', 'ex-3');
        expect(req.trainings[0].exercises.map((e) => e.group_id)).toEqual([
            'g',
            'g',
        ]);
    });

    it('exercício que não existe mais é erro, não exclusão silenciosa', () => {
        const req = mesoToRequest(meso([ex('ex-1')]));
        expect(() => removeExerciseFromTraining(req, 't-a', 'x')).toThrow(
            /não está mais/,
        );
    });
});

describe('replaceExerciseInTraining', () => {
    it('troca no mesmo lugar, zera o id e mantém prescrição e bloco', () => {
        const req = mesoToRequest(
            meso([
                ex('ex-1'),
                ex('ex-2', {
                    series: [12, 10, 8],
                    load_kg: 40,
                    group_id: 'g',
                    technique: 'dropset',
                }),
            ]),
        );
        const pos = replaceExerciseInTraining(
            req,
            't-a',
            'ex-2',
            item('lib-7', 'Puxada'),
        );

        expect(pos).toBe(1);
        expect(ids(req)).toEqual(['ex-1', undefined]);
        const swapped = req.trainings[0].exercises[1];
        expect(swapped.name).toBe('Puxada');
        expect(swapped.exercise_library_id).toBe('lib-7');
        expect(swapped.series).toEqual([12, 10, 8]);
        expect(swapped.load_kg).toBe(40);
        expect(swapped.group_id).toBe('g');
        expect(swapped.technique).toBe('dropset');
    });
});

describe('saveTrainingEdit', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('grava a fase com a mutação aplicada e devolve a resposta', async () => {
        const persist = vi.fn(async (req: MesocycleRequest) => ids(req));
        const out = await saveTrainingEdit(
            { meso: meso([ex('ex-1'), ex('ex-2')]), persist },
            (req) => removeExerciseFromTraining(req, 't-a', 'ex-1'),
        );
        expect(persist).toHaveBeenCalledTimes(1);
        expect(out).toEqual(['ex-2']);
    });

    it('sem rede não chama o servidor e avisa que não salvou', async () => {
        vi.stubGlobal('navigator', { onLine: false });
        const persist = vi.fn();
        await expect(
            saveTrainingEdit({ meso: meso([ex('ex-1')]), persist }, () => {}),
        ).rejects.toThrow(/NÃO foi alterado/);
        expect(persist).not.toHaveBeenCalled();
    });
});

describe('addTrainingToMeso / removeTrainingFromMeso', () => {
    function twoTrainings(): MesocycleRequest {
        const m = meso([ex('ex-1')]);
        m.trainings.push({ id: 't-b', reference: 'B', exercises: [ex('ex-2')] });
        return mesoToRequest(m);
    }

    it('cria o próximo rótulo livre, vazio e sem id', () => {
        const req = twoTrainings();
        const pos = addTrainingToMeso(req, { autoWeekday: false });
        expect(pos).toBe(2);
        expect(req.trainings[2]).toMatchObject({
            reference: 'C',
            exercises: [],
        });
        expect(req.trainings[2].id).toBeUndefined();
        expect(req.trainings[2].weekday).toBeUndefined();
    });

    it('no modo por dia da semana, nasce num dia livre', () => {
        const req = mesoToRequest(meso([]));
        req.trainings[0].weekday = 1;
        addTrainingToMeso(req, { autoWeekday: true });
        expect(req.trainings[1].weekday).toBeDefined();
        expect(req.trainings[1].weekday).not.toBe(1);
    });

    it('exclui o treino e preserva o id dos outros', () => {
        const req = twoTrainings();
        removeTrainingFromMeso(req, 't-a');
        expect(req.trainings.map((t) => t.id)).toEqual(['t-b']);
        expect(req.trainings[0].exercises[0].id).toBe('ex-2');
    });

    it('não deixa a fase sem nenhum treino', () => {
        const req = mesoToRequest(meso([ex('ex-1')]));
        expect(() => removeTrainingFromMeso(req, 't-a')).toThrow(
            /pelo menos um treino/,
        );
    });
});


describe('a letra acompanha a posição', () => {
    const refs = (list: { reference: string }[]) =>
        list.map((t) => t.reference);

    it('depois de arrastar, o primeiro volta a ser A', () => {
        const out = relabelByPosition([
            { id: 'b', reference: 'B' },
            { id: 'a', reference: 'A' },
            { id: 'c', reference: 'C' },
        ]);
        expect(refs(out)).toEqual(['A', 'B', 'C']);
        // O treino é o mesmo, só a letra mudou.
        expect(out.map((t) => t.id)).toEqual(['b', 'a', 'c']);
    });

    it('nunca sobrescreve um nome digitado pelo personal', () => {
        const list = [
            { reference: 'Peito' },
            { reference: 'A' },
        ];
        expect(relabelByPosition(list)).toBe(list);
    });

    it('excluir o B com relabel faz o C virar B', () => {
        const m = meso([ex('ex-1')]);
        m.trainings.push(
            { id: 't-b', reference: 'B', exercises: [] },
            { id: 't-c', reference: 'C', exercises: [] },
        );
        const req = mesoToRequest(m);
        removeTrainingFromMeso(req, 't-b', { relabel: true });
        expect(req.trainings.map((t) => [t.id, t.reference])).toEqual([
            ['t-a', 'A'],
            ['t-c', 'B'],
        ]);
    });

    it('sem relabel (modo por dia da semana), as letras ficam', () => {
        const m = meso([ex('ex-1')]);
        m.trainings.push(
            { id: 't-b', reference: 'B', exercises: [] },
            { id: 't-c', reference: 'C', exercises: [] },
        );
        const req = mesoToRequest(m);
        removeTrainingFromMeso(req, 't-b');
        expect(refs(req.trainings)).toEqual(['A', 'C']);
    });
});
