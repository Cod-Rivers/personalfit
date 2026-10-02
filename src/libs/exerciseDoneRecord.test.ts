import { describe, expect, it } from 'vitest';
import { doneExerciseSeries, studentDoneLoadKg } from './exerciseDoneRecord';

describe('exerciseDoneRecord', () => {
    describe('doneExerciseSeries', () => {
        it('uma série por série prescrita, com as reps da prescrição e a carga do momento', () => {
            expect(
                doneExerciseSeries({ id: 'ex', name: 'Supino', series: [12, 10, 8], group_id: 'g1' }, 30, 8),
            ).toEqual([
                { series: 1, reps: 12, load_kg: 30, rpe: 8, group_id: 'g1' },
                { series: 2, reps: 10, load_kg: 30, rpe: 8, group_id: 'g1' },
                { series: 3, reps: 8, load_kg: 30, rpe: 8, group_id: 'g1' },
            ]);
        });

        it('prescrição sem séries numéricas vira uma série só, sem inventar reps', () => {
            expect(doneExerciseSeries({ id: 'ex', name: 'Prancha', series: null }, 0, 7)).toEqual([
                { series: 1, reps: 0, load_kg: 0, rpe: 7, group_id: undefined },
            ]);
        });
    });

    describe('studentDoneLoadKg', () => {
        it('a carga que o aluno registrou no card vence a sugestão e a prescrição', () => {
            expect(studentDoneLoadKg({ registeredKg: 22, suggestedKg: 25, plannedKg: 20 })).toBe(22);
        });

        it('sem carga registrada, usa a sugestão do dia', () => {
            expect(studentDoneLoadKg({ registeredKg: null, suggestedKg: 25, plannedKg: 20 })).toBe(25);
        });

        it('sem sugestão, usa a prescrita com o ajuste da autorregulação, arredondada a 0,5 kg', () => {
            expect(
                studentDoneLoadKg({ registeredKg: null, suggestedKg: null, plannedKg: 21, loadAdjustPct: -5 }),
            ).toBe(20);
        });

        it('sem nada, peso corporal (0)', () => {
            expect(studentDoneLoadKg({ registeredKg: 0, suggestedKg: null, plannedKg: undefined })).toBe(0);
        });
    });
});
