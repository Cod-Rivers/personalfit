import { describe, it, expect } from 'vitest';
import { buildCircuitPlan, circuitHasTimedWork } from './circuitPlan';

const timed = (name: string, sets: number, secs: number, rest?: number) => ({
    name,
    series: Array(sets).fill(secs),
    timed: true,
    rest,
});

describe('buildCircuitPlan', () => {
    it('superssérie de 5 × 4 séries: rodadas de 5, descanso só entre rodadas', () => {
        const plan = buildCircuitPlan([
            timed('Polichinelo', 4, 60, 60),
            timed('Burpee', 4, 60, 60),
            timed('Agachamento', 4, 60, 60),
            timed('Prancha', 4, 60, 60),
            timed('Skipping', 4, 60, 90),
        ]);
        expect(plan.rounds).toBe(4);
        // 4 rodadas × 5 exercícios + 3 descansos (nenhum depois da última).
        expect(plan.steps).toHaveLength(23);
        const kinds = plan.steps.map((s) => s.kind).join(',');
        expect(kinds).toBe(
            [
                ...Array(5).fill('work'), 'rest',
                ...Array(5).fill('work'), 'rest',
                ...Array(5).fill('work'), 'rest',
                ...Array(5).fill('work'),
            ].join(','),
        );
        // Descanso é o do ÚLTIMO exercício do bloco.
        expect(plan.steps[5]).toEqual({ kind: 'rest', round: 1, seconds: 90 });
        expect(plan.steps[0]).toMatchObject({
            kind: 'work',
            round: 1,
            position: 0,
            roundSize: 5,
            name: 'Polichinelo',
            seconds: 60,
        });
    });

    it('exercício com menos séries sai das últimas rodadas', () => {
        const plan = buildCircuitPlan([
            timed('A', 3, 30),
            timed('B', 2, 45, 60),
        ]);
        const round3 = plan.steps.filter((s) => s.round === 3);
        expect(round3).toEqual([
            {
                kind: 'work',
                round: 3,
                position: 0,
                roundSize: 1,
                name: 'A',
                seconds: 30,
                target: undefined,
            },
        ]);
    });

    it('série por repetições vira passo manual com o alvo', () => {
        const plan = buildCircuitPlan([
            timed('Prancha', 2, 40),
            { name: 'Flexão', series: [12, 10], rest: 60 },
        ]);
        expect(plan.steps[1]).toMatchObject({
            name: 'Flexão',
            seconds: null,
            target: '12 reps',
        });
        expect(plan.steps[4]).toMatchObject({ target: '10 reps' });
    });

    it('sem descanso prescrito, as rodadas emendam', () => {
        const plan = buildCircuitPlan([timed('A', 2, 30), timed('B', 2, 30)]);
        expect(plan.steps.every((s) => s.kind === 'work')).toBe(true);
    });
});

describe('circuitHasTimedWork', () => {
    it('só com algum exercício por tempo num bloco de 2+', () => {
        expect(circuitHasTimedWork([timed('A', 3, 30), timed('B', 3, 30)])).toBe(true);
        expect(
            circuitHasTimedWork([
                { name: 'A', series: [10] },
                { name: 'B', series: [10] },
            ]),
        ).toBe(false);
        expect(circuitHasTimedWork([timed('A', 3, 30)])).toBe(false);
    });
});
