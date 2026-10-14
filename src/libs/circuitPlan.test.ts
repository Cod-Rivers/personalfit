import { describe, it, expect } from 'vitest';
import { blockRestLabel, buildCircuitPlan, circuitGuides } from './circuitPlan';

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
                ...Array(5).fill('work'),
                'rest',
                ...Array(5).fill('work'),
                'rest',
                ...Array(5).fill('work'),
                'rest',
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

describe('buildCircuitPlan — modo tabata', () => {
    it('recuperação entre os exercícios da rodada, não depois do último', () => {
        const plan = buildCircuitPlan(
            [
                timed('A', 2, 20, 60),
                timed('B', 2, 20, 60),
                timed('C', 2, 20, 60),
            ],
            { recoverySeconds: 10 },
        );
        const round1 = plan.steps.filter((s) => s.round === 1);
        expect(round1.map((s) => s.kind)).toEqual([
            'work',
            'recover',
            'work',
            'recover',
            'work',
            'rest',
        ]);
        expect(round1[1]).toEqual({
            kind: 'recover',
            round: 1,
            seconds: 10,
            next: 'B',
        });
        // Última rodada: sem recuperação após o último nem descanso.
        const round2 = plan.steps.filter((s) => s.round === 2);
        expect(round2.map((s) => s.kind)).toEqual([
            'work',
            'recover',
            'work',
            'recover',
            'work',
        ]);
    });

    it('0 ou ausente não muda o plano', () => {
        const exs = [timed('A', 2, 20, 30), timed('B', 2, 20, 30)];
        expect(buildCircuitPlan(exs, { recoverySeconds: 0 })).toEqual(
            buildCircuitPlan(exs),
        );
    });

    it('exercício que sai das últimas rodadas não deixa recuperação órfã', () => {
        const plan = buildCircuitPlan([timed('A', 2, 20), timed('B', 1, 20)], {
            recoverySeconds: 10,
        });
        const round2 = plan.steps.filter((s) => s.round === 2);
        expect(round2.map((s) => s.kind)).toEqual(['work']);
    });
});

describe('circuitGuides', () => {
    it('abre com algum exercício por tempo num bloco de 2+', () => {
        expect(circuitGuides([timed('A', 3, 30), timed('B', 3, 30)])).toBe(
            true,
        );
        expect(circuitGuides([timed('A', 3, 30)])).toBe(false);
    });

    it('abre em bloco só de repetições com rodadas e descanso', () => {
        // Escada: 5 degraus, descanso de 90 s no último exercício.
        expect(
            circuitGuides([
                { name: 'Puxada', series: [1, 2, 3, 2, 1] },
                { name: 'Leg', series: [5, 10, 15, 10, 5], rest: 90 },
            ]),
        ).toBe(true);
    });

    it('não abre sem descanso ou com uma rodada só', () => {
        expect(
            circuitGuides([
                { name: 'A', series: [10, 10] },
                { name: 'B', series: [10, 10] },
            ]),
        ).toBe(false);
        expect(
            circuitGuides([
                { name: 'A', series: [10] },
                { name: 'B', series: [10], rest: 60 },
            ]),
        ).toBe(false);
    });

    it('monta as rodadas de repetições com descanso entre elas', () => {
        const plan = buildCircuitPlan([
            { name: 'Puxada', series: [1, 2, 1] },
            { name: 'Leg', series: [5, 10, 5], rest: 90 },
        ]);
        expect(plan.rounds).toBe(3);
        expect(plan.steps.filter((st) => st.kind === 'rest')).toHaveLength(2);
        const work = plan.steps.filter((st) => st.kind === 'work');
        expect(work.map((w) => (w.kind === 'work' ? w.target : ''))).toEqual([
            '1 reps',
            '5 reps',
            '2 reps',
            '10 reps',
            '1 reps',
            '5 reps',
        ]);
    });
});

describe('blockRestLabel', () => {
    const ladder = [
        { name: 'Puxada', series: [1, 2, 1] },
        { name: 'Leg', series: [5, 10, 5], rest: 90 },
    ];
    it('mostra a pausa entre exercícios e o descanso entre rodadas', () => {
        expect(blockRestLabel(ladder, 0)).toBe(
            'sem pausa entre os exercícios · 90 s de descanso entre as rodadas',
        );
        expect(blockRestLabel(ladder, 20)).toBe(
            '20 s de recuperação entre os exercícios · 90 s de descanso entre as rodadas',
        );
    });
    it('sem descanso entre rodadas fala só da pausa', () => {
        expect(
            blockRestLabel(
                [
                    { name: 'A', series: [10] },
                    { name: 'B', series: [10] },
                ],
                0,
            ),
        ).toBe('sem pausa entre os exercícios');
    });
});
