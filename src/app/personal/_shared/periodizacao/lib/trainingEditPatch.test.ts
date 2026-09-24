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
    groupExercisesInTraining,
    removeExerciseFromTraining,
    removeTrainingFromMeso,
    replaceExerciseInTraining,
    saveTrainingEdit,
    setGroupRecoveryInTraining,
    setGroupTechniqueInTraining,
    ungroupInTraining,
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

describe('groupExercisesInTraining', () => {
    const group = (req: MesocycleRequest) =>
        req.trainings[0].exercises.map((e) => [e.id, e.group_id ?? null]);

    it('junta exercícios já incluídos num bloco, na posição do primeiro', () => {
        const req = mesoToRequest(
            meso([ex('ex-1'), ex('ex-2'), ex('ex-3'), ex('ex-4')]),
        );
        groupExercisesInTraining(req, 't-a', ['ex-4', 'ex-2'], 'biset');
        expect(ids(req)).toEqual(['ex-1', 'ex-2', 'ex-4', 'ex-3']);
        const [, a, b] = req.trainings[0].exercises;
        expect(a.group_id).toBeTruthy();
        expect(b.group_id).toBe(a.group_id);
        expect(a.group_technique).toBe('biset');
        expect(req.trainings[0].exercises[0].group_id).toBeUndefined();
    });

    it('tirar um exercício de um bi-set desfaz o bloco que sobrou com um só', () => {
        const req = mesoToRequest(
            meso([
                ex('ex-1', { group_id: 'g', group_technique: 'biset' }),
                ex('ex-2', { group_id: 'g', group_technique: 'biset' }),
                ex('ex-3'),
            ]),
        );
        groupExercisesInTraining(req, 't-a', ['ex-2', 'ex-3'], 'superset');
        const [first] = req.trainings[0].exercises;
        expect(first.id).toBe('ex-1');
        expect(first.group_id).toBeUndefined();
        expect(first.group_technique).toBeUndefined();
    });

    it('tri-set que perde um exercício continua bloco, sem a variante', () => {
        const req = mesoToRequest(
            meso([
                ex('ex-1', { group_id: 'g', group_technique: 'triset' }),
                ex('ex-2', { group_id: 'g', group_technique: 'triset' }),
                ex('ex-3', { group_id: 'g', group_technique: 'triset' }),
                ex('ex-4'),
            ]),
        );
        groupExercisesInTraining(req, 't-a', ['ex-3', 'ex-4']);
        const [a, b] = req.trainings[0].exercises;
        expect(a.group_id).toBe('g');
        expect(b.group_id).toBe('g');
        expect(a.group_technique).toBeUndefined();
    });

    it('mantém os ids (o histórico do aluno aponta por eles)', () => {
        const req = mesoToRequest(meso([ex('ex-1'), ex('ex-2')]));
        groupExercisesInTraining(req, 't-a', ['ex-1', 'ex-2'], 'superset');
        expect(ids(req)).toEqual(['ex-1', 'ex-2']);
        expect(group(req)[0][1]).toBe(group(req)[1][1]);
    });

    it('recusa menos de 2, variante que não cabe e id que sumiu', () => {
        const req = mesoToRequest(meso([ex('ex-1'), ex('ex-2'), ex('ex-3')]));
        expect(() => groupExercisesInTraining(req, 't-a', ['ex-1'])).toThrow(
            /pelo menos 2/,
        );
        expect(() =>
            groupExercisesInTraining(req, 't-a', ['ex-1', 'ex-2', 'ex-3'], 'biset'),
        ).toThrow(/não combina/);
        expect(() =>
            groupExercisesInTraining(req, 't-a', ['ex-1', 'ex-9']),
        ).toThrow(/Recarregue/);
        expect(group(req).every(([, g]) => g === null)).toBe(true);
    });
});

describe('ungroupInTraining / setGroupTechniqueInTraining', () => {
    const grouped = () =>
        mesoToRequest(
            meso([
                ex('ex-1', { group_id: 'g', group_technique: 'biset' }),
                ex('ex-2', { group_id: 'g', group_technique: 'biset' }),
                ex('ex-3'),
            ]),
        );

    it('desagrupar mantém a ordem e limpa o bloco', () => {
        const req = grouped();
        ungroupInTraining(req, 't-a', 'g');
        expect(ids(req)).toEqual(['ex-1', 'ex-2', 'ex-3']);
        expect(
            req.trainings[0].exercises.every(
                (e) => !e.group_id && !e.group_technique,
            ),
        ).toBe(true);
    });

    it('troca a variante do bloco e recusa a que não cabe', () => {
        const req = grouped();
        setGroupTechniqueInTraining(req, 't-a', 'g', 'superset');
        expect(
            req.trainings[0].exercises.slice(0, 2).map((e) => e.group_technique),
        ).toEqual(['superset', 'superset']);
        expect(() =>
            setGroupTechniqueInTraining(req, 't-a', 'g', 'triset'),
        ).toThrow(/não combina/);
    });
});

/**
 * Recuperação do circuito (tabata) prescrita pelo personal: grava em todo o
 * bloco, chega ao request pelo mesmo caminho do resto da fase (mesoToRequest)
 * e sai junto quando o bloco se desfaz.
 */
describe('setGroupRecoveryInTraining', () => {
    const grouped = (recovery?: number) =>
        mesoToRequest(
            meso([
                ex('ex-1', { group_id: 'g', group_recovery_seconds: recovery }),
                ex('ex-2', { group_id: 'g', group_recovery_seconds: recovery }),
                ex('ex-3'),
            ]),
        );
    const recoveries = (req: MesocycleRequest) =>
        req.trainings[0].exercises.map((e) => e.group_recovery_seconds);

    it('grava a mesma recuperação em todos os exercícios do bloco', () => {
        const req = grouped();
        setGroupRecoveryInTraining(req, 't-a', 'g', 10);
        expect(recoveries(req)).toEqual([10, 10, undefined]);
    });

    it('0 tira a recuperação; valor acima do teto é limitado', () => {
        const req = grouped(10);
        setGroupRecoveryInTraining(req, 't-a', 'g', 0);
        expect(recoveries(req)).toEqual([undefined, undefined, undefined]);
        setGroupRecoveryInTraining(req, 't-a', 'g', 999);
        expect(recoveries(req)).toEqual([120, 120, undefined]);
    });

    it('a recuperação já gravada sobrevive ao reenvio da fase', () => {
        expect(recoveries(grouped(15))).toEqual([15, 15, undefined]);
    });

    it('desagrupar e excluir metade do bloco apagam a recuperação', () => {
        const a = grouped(10);
        ungroupInTraining(a, 't-a', 'g');
        expect(recoveries(a)).toEqual([undefined, undefined, undefined]);
        const b = grouped(10);
        removeExerciseFromTraining(b, 't-a', 'ex-1');
        expect(recoveries(b)).toEqual([undefined, undefined]);
    });

    it('bloco que não existe mais dá erro legível', () => {
        expect(() =>
            setGroupRecoveryInTraining(grouped(), 't-a', 'x', 10),
        ).toThrow(/não está mais/);
    });
});
