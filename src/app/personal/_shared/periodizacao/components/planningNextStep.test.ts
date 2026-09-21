import { describe, expect, it } from 'vitest';
import type { MacrocycleResponse } from '@/libs/planningService';
import { nextPlanningStep } from './PlanningNextStep';

/** Macrociclo mínimo — só o que a função lê. */
function macro(
    mesocycles: {
        name: string;
        trainings?: { reference: string; exercises: unknown[] }[];
    }[],
): MacrocycleResponse {
    return {
        mesocycles: mesocycles.map((m, i) => ({
            id: `meso-${i}`,
            name: m.name,
            trainings: m.trainings ?? [],
        })),
    } as unknown as MacrocycleResponse;
}

describe('nextPlanningStep', () => {
    it('plano vazio pede a primeira fase', () => {
        const step = nextPlanningStep(macro([]), false);
        expect(step.done).toBe(false);
        expect(step.action).toBe('Criar primeira fase');
    });

    it('no modo simples fala em semana, não em fase', () => {
        const step = nextPlanningStep(macro([]), true);
        expect(step.message).toMatch(/treinos da semana/i);
    });

    it('fase sem treino é apontada pelo nome', () => {
        const step = nextPlanningStep(macro([{ name: 'Base' }]), false);
        expect(step.done).toBe(false);
        expect(step.message).toContain('Base');
    });

    it('treino sem exercício é apontado pela referência', () => {
        const step = nextPlanningStep(
            macro([
                {
                    name: 'Base',
                    trainings: [{ reference: 'B', exercises: [] }],
                },
            ]),
            false,
        );
        expect(step.done).toBe(false);
        expect(step.message).toContain('treino B');
    });

    it('no modo simples o treino vazio não fala em fase nem em letra', () => {
        const step = nextPlanningStep(
            macro([
                {
                    name: 'Treinos da semana',
                    trainings: [{ reference: 'B', exercises: [] }],
                },
            ]),
            true,
        );
        expect(step.done).toBe(false);
        expect(step.message).not.toMatch(/fase|treino B/i);
    });

    it('no modo simples o plano pronto conta treinos, não fases', () => {
        const step = nextPlanningStep(
            macro([
                {
                    name: 'Treinos da semana',
                    trainings: [
                        { reference: 'A', exercises: [{}] },
                        { reference: 'B', exercises: [{}, {}] },
                    ],
                },
            ]),
            true,
        );
        expect(step.done).toBe(true);
        expect(step.message).toContain('2 treinos');
        expect(step.message).toContain('3 exercícios');
        expect(step.message).not.toMatch(/fase/i);
    });

    it('plano completo vira confirmação, com a contagem de exercícios', () => {
        const step = nextPlanningStep(
            macro([
                {
                    name: 'Base',
                    trainings: [
                        { reference: 'A', exercises: [{}, {}] },
                        { reference: 'B', exercises: [{}] },
                    ],
                },
            ]),
            false,
        );
        expect(step.done).toBe(true);
        expect(step.message).toContain('3 exercícios');
    });
});
