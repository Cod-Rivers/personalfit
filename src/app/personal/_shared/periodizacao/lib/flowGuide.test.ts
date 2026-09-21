import { describe, expect, it } from 'vitest';
import {
    completedSteps,
    editorHint,
    editorStepOf,
    editorSteps,
    guideHelpHref,
    selfMadeStep,
    type GuideContext,
} from './flowGuide';

function ctx(overrides: Partial<GuideContext> = {}): GuideContext {
    return {
        card: 'trainings',
        audience: 'personal',
        trainings: [],
        activeExerciseCount: 0,
        replacing: false,
        phaseValid: true,
        ...overrides,
    };
}

describe('editorSteps / editorStepOf', () => {
    it('modo simples não tem a etapa de fase', () => {
        expect(editorSteps(true).map((s) => s.id)).toEqual([
            'treinos',
            'exercicios',
            'series',
        ]);
        expect(editorSteps(false)[0].id).toBe('fase');
    });

    it('todo card do editor cai numa etapa que existe', () => {
        const ids = editorSteps(false).map((s) => s.id);
        (
            [
                'phase',
                'trainings',
                'training',
                'exercise',
                'picker',
                'bulkPrescription',
                'weeks',
                'week',
            ] as const
        ).forEach((card) => expect(ids).toContain(editorStepOf(card)));
    });

    it('picker é etapa de exercícios; prescrição geral é de séries', () => {
        expect(editorStepOf('picker')).toBe('exercicios');
        expect(editorStepOf('bulkPrescription')).toBe('series');
    });
});

describe('completedSteps', () => {
    it('exercícios só conta com TODOS os treinos preenchidos', () => {
        const partial = completedSteps(
            [
                { label: 'A', exerciseCount: 2 },
                { label: 'B', exerciseCount: 0 },
            ],
            true,
        );
        expect(partial.has('treinos')).toBe(true);
        expect(partial.has('exercicios')).toBe(false);

        const full = completedSteps([{ label: 'A', exerciseCount: 1 }], true);
        expect(full.has('exercicios')).toBe(true);
    });

    it('séries nunca é marcada (todo exercício nasce 3×10)', () => {
        const done = completedSteps([{ label: 'A', exerciseCount: 5 }], true);
        expect(done.has('series')).toBe(false);
    });

    it('fase inválida não conta como feita', () => {
        expect(completedSteps([], false).has('fase')).toBe(false);
    });
});

describe('selfMadeStep', () => {
    it('sem plano: etapa de criar', () => {
        expect(selfMadeStep(false, []).current).toBe('criar');
    });

    it('plano sem treinos: etapa de treinos, criar feito', () => {
        const step = selfMadeStep(true, []);
        expect(step.current).toBe('treinos');
        expect(step.done.has('criar')).toBe(true);
    });

    it('treino vazio segura na etapa de exercícios', () => {
        const step = selfMadeStep(true, [
            { label: 'A', exerciseCount: 3 },
            { label: 'B', exerciseCount: 0 },
        ]);
        expect(step.current).toBe('exercicios');
    });

    it('tudo preenchido: vai treinar', () => {
        const step = selfMadeStep(true, [{ label: 'A', exerciseCount: 3 }]);
        expect(step.current).toBe('treinar');
        expect(step.done.has('exercicios')).toBe(true);
    });
});

describe('editorHint', () => {
    it('sem treinos manda adicionar, com texto por público', () => {
        const personal = editorHint(ctx());
        const student = editorHint(ctx({ audience: 'student' }));
        expect(personal?.key).toBe('trainings-empty');
        expect(personal?.text).toContain('do aluno');
        expect(student?.text).toContain('sua ficha');
        expect(student?.text).not.toContain('do aluno');
    });

    it('aponta o treino vazio pelo rótulo que a pessoa vê', () => {
        const hint = editorHint(
            ctx({
                trainings: [
                    { label: 'Segunda', exerciseCount: 4 },
                    { label: 'Quarta', exerciseCount: 0 },
                ],
            }),
        );
        expect(hint?.key).toBe('trainings-one-empty');
        expect(hint?.text).toContain('Quarta');
    });

    it('vários vazios viram contagem', () => {
        const hint = editorHint(
            ctx({
                trainings: [
                    { label: 'A', exerciseCount: 0 },
                    { label: 'B', exerciseCount: 0 },
                ],
            }),
        );
        expect(hint?.key).toBe('trainings-some-empty');
        expect(hint?.text).toMatch(/^2 treinos/);
    });

    it('treino vazio manda à biblioteca; com exercícios, à prescrição', () => {
        expect(
            editorHint(ctx({ card: 'training', activeExerciseCount: 0 }))?.key,
        ).toBe('training-empty');
        expect(
            editorHint(ctx({ card: 'training', activeExerciseCount: 2 }))?.key,
        ).toBe('training-has-exercises');
    });

    it('picker distingue trocar de adicionar', () => {
        expect(editorHint(ctx({ card: 'picker' }))?.key).toBe('picker-add');
        expect(
            editorHint(ctx({ card: 'picker', replacing: true }))?.key,
        ).toBe('picker-replace');
    });

    it('fase incompleta avisa que não salva', () => {
        const hint = editorHint(ctx({ card: 'phase', phaseValid: false }));
        expect(hint?.key).toBe('phase-incomplete');
    });

    it('cards que se explicam sozinhos não têm dica', () => {
        expect(editorHint(ctx({ card: 'bulkPrescription' }))).toBeNull();
        expect(editorHint(ctx({ card: 'weeks' }))).toBeNull();
    });
});

describe('guideHelpHref', () => {
    it('cada público vai para a sua seção da Central de Ajuda', () => {
        expect(guideHelpHref('student')).toBe('/ajuda#montar-meu-treino');
        expect(guideHelpHref('personal')).toBe('/ajuda#montar-treino');
    });
});
