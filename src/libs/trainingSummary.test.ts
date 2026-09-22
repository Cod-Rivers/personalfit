import { describe, expect, it } from 'vitest';
import type { ExerciseResponse } from './planningService';
import { summarizeTraining } from './trainingSummary';

const ex = (over: Partial<ExerciseResponse>): ExerciseResponse =>
    ({ name: 'X', series: [10, 10, 10], ...over }) as ExerciseResponse;

describe('summarizeTraining — duração estimada', () => {
    it('exercício por tempo usa os segundos de cada série, não a cadência', () => {
        // 10 × (300 s + 60 s de descanso) = 60 min. Com a cadência (3 s)
        // no lugar da duração, dava 10 × 63 s ≈ 11 min.
        const plank = ex({
            timed: true,
            series: Array(10).fill(300),
            tempo_seconds: 3,
            rest_seconds: 60,
        });
        expect(summarizeTraining([plank]).estimatedMinutes).toBe(60);
    });

    it('série por tempo sem valor cai no padrão de 30 s', () => {
        const e = ex({ timed: true, series: Array(20).fill(0), rest_seconds: 60 });
        expect(summarizeTraining([e]).estimatedMinutes).toBe(30);
    });

    it('exercício por repetições segue com 35 s ativos por série', () => {
        const e = ex({ series: Array(20).fill(10), rest_seconds: 55 });
        expect(summarizeTraining([e]).estimatedMinutes).toBe(30);
    });
});
