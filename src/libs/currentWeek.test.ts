import { describe, expect, it } from 'vitest';
import {
    currentCycle,
    currentMicrocycleOf,
    localDateKey,
    logsOfWeek,
    performedAt,
    startOfWeek,
    trainedDays,
    weeklyProgress,
    weeklyTargetDays,
    type WeekLog,
} from './currentWeek';
import type {
    MacrocycleResponse,
    MesocycleResponse,
    MicrocycleResponse,
} from './planningService';

// Datas em hora LOCAL: as regras usam o dia do aparelho, e o teste precisa
// valer em qualquer fuso em que a suíte rodar.
const at = (y: number, m: number, d: number, h = 10) =>
    new Date(y, m - 1, d, h, 0, 0);

function micro(week: number, status = 'pending'): MicrocycleResponse {
    return { id: `m${week}`, week_number: week, status };
}

function meso(
    id: string,
    order: number,
    weeks: number,
    trainings = 3,
    extra: Partial<MesocycleResponse> = {},
): MesocycleResponse {
    return {
        id,
        order,
        name: id,
        phase: 'hypertrophy',
        duration_weeks: weeks,
        methodology: 'linear',
        trainings: Array.from({ length: trainings }, (_, i) => ({
            id: `${id}-t${i}`,
            reference: String.fromCharCode(65 + i),
            exercises: [],
        })),
        microcycles: Array.from({ length: weeks }, (_, i) => ({
            ...micro(i + 1),
            id: `${id}-w${i + 1}`,
        })),
        ...extra,
    };
}

function macro(
    mesocycles: MesocycleResponse[],
    extra: Partial<MacrocycleResponse> = {},
): MacrocycleResponse {
    return {
        id: 'macro',
        personal_id: 'p',
        student_id: 's',
        name: 'Plano',
        goal: '',
        status: 'active',
        mesocycles,
        created_at: '2026-09-01 12:00:00 +0000 UTC',
        updated_at: '2026-09-01 12:00:00 +0000 UTC',
        ...extra,
    };
}

function done(when: Date): WeekLog {
    return { status: 'completed', client_completed_at: when.toISOString() };
}

describe('localDateKey', () => {
    it('usa o dia local, não o de UTC', () => {
        expect(localDateKey(at(2026, 9, 27, 23))).toBe('2026-09-27');
        expect(localDateKey(at(2026, 9, 28, 0))).toBe('2026-09-28');
    });
});

describe('startOfWeek', () => {
    it('recua até a segunda-feira', () => {
        // 27/09/2026 é domingo; 28/09, segunda.
        expect(localDateKey(startOfWeek(at(2026, 9, 27)))).toBe('2026-09-21');
        expect(localDateKey(startOfWeek(at(2026, 9, 28)))).toBe('2026-09-28');
        expect(localDateKey(startOfWeek(at(2026, 10, 1)))).toBe('2026-09-28');
    });
});

describe('currentMicrocycleOf', () => {
    // Plano começando na segunda 07/09/2026, fase de 4 semanas.
    const m = meso('f1', 1, 4);
    const plan = macro([m], { start_date: '2026-09-07' });

    it('avança pela data, não pelo status', () => {
        expect(currentMicrocycleOf(plan, m, at(2026, 9, 7))?.week_number).toBe(1);
        expect(currentMicrocycleOf(plan, m, at(2026, 9, 13))?.week_number).toBe(1);
        expect(currentMicrocycleOf(plan, m, at(2026, 9, 14))?.week_number).toBe(2);
        expect(currentMicrocycleOf(plan, m, at(2026, 9, 28))?.week_number).toBe(4);
    });

    it('antes do início fica na semana 1; depois do fim, na última', () => {
        expect(currentMicrocycleOf(plan, m, at(2026, 8, 20))?.week_number).toBe(1);
        expect(currentMicrocycleOf(plan, m, at(2026, 12, 1))?.week_number).toBe(4);
    });

    it('status "concluído" da semana 1 não empurra o registro para a 2', () => {
        const closed = {
            ...m,
            microcycles: m.microcycles.map((mc, i) =>
                i === 0 ? { ...mc, status: 'completed' } : mc,
            ),
        };
        expect(
            currentMicrocycleOf(plan, closed, at(2026, 9, 9))?.week_number,
        ).toBe(1);
    });

    it('sem start_date ancora no created_at do plano', () => {
        // created_at 01/09/2026 (terça) → semana 1 = 31/08 a 06/09.
        const noStart = macro([m]);
        expect(currentMicrocycleOf(noStart, m, at(2026, 9, 7))?.week_number).toBe(2);
    });

    it('semana 1 começa na semana do início da fase, mesmo no meio dela', () => {
        // Início numa quinta: a semana vira na segunda seguinte.
        const thursday = macro([m], { start_date: '2026-09-10' });
        expect(currentMicrocycleOf(thursday, m, at(2026, 9, 13))?.week_number).toBe(1);
        expect(currentMicrocycleOf(thursday, m, at(2026, 9, 14))?.week_number).toBe(2);
    });
});

describe('currentCycle', () => {
    it('encadeia as fases pela duração', () => {
        const f1 = meso('f1', 1, 2);
        const f2 = meso('f2', 2, 3);
        const plan = macro([f2, f1], { start_date: '2026-09-07' });
        expect(currentCycle(plan, at(2026, 9, 15))?.meso.id).toBe('f1');
        const c = currentCycle(plan, at(2026, 9, 22));
        expect(c?.meso.id).toBe('f2');
        expect(c?.micro.week_number).toBe(1);
    });

    it('respeita a data própria da fase', () => {
        const f1 = meso('f1', 1, 2);
        const f2 = meso('f2', 2, 2, 3, { start_date: '2026-10-05', end_date: '2026-10-19' });
        const plan = macro([f1, f2], { start_date: '2026-09-07' });
        // Entre o fim da fase 1 (20/09) e o início da 2: segue na última
        // semana da fase 1.
        const gap = currentCycle(plan, at(2026, 9, 29));
        expect(gap?.meso.id).toBe('f1');
        expect(gap?.micro.week_number).toBe(2);
        expect(currentCycle(plan, at(2026, 10, 6))?.meso.id).toBe('f2');
    });

    it('fase que começou mas ainda está vazia não tira o treino da tela', () => {
        const f1 = meso('f1', 1, 1);
        const f2 = meso('f2', 2, 2, 0);
        const plan = macro([f1, f2], { start_date: '2026-09-07' });
        expect(currentCycle(plan, at(2026, 9, 16))?.meso.id).toBe('f1');
    });
});

describe('performedAt', () => {
    it('prefere a hora do aparelho', () => {
        const d = at(2026, 9, 27, 22);
        const log: WeekLog = {
            status: 'completed',
            client_completed_at: d.toISOString(),
            completed_date: '2026-09-29 12:00:00',
        };
        expect(performedAt(log)?.getTime()).toBe(d.getTime());
    });

    it('lê completed_date como UTC', () => {
        const log: WeekLog = {
            status: 'completed',
            completed_date: '2026-09-28 01:00:00',
        };
        expect(performedAt(log)?.getTime()).toBe(Date.UTC(2026, 8, 28, 1));
    });

    it('não concluído não tem instante de treino', () => {
        expect(performedAt({ status: 'skipped', updated_at: '2026-09-28T10:00:00Z' })).toBeNull();
    });
});

describe('logsOfWeek', () => {
    it('o "Concluído" da semana passada some na segunda-feira', () => {
        const logs = [done(at(2026, 9, 22)), done(at(2026, 9, 27, 22))];
        expect(logsOfWeek(logs, at(2026, 9, 27, 23))).toHaveLength(2);
        expect(logsOfWeek(logs, at(2026, 9, 28, 6))).toHaveLength(0);
    });

    it('pulado e pendente contam pela última alteração', () => {
        const skipped: WeekLog = {
            status: 'skipped',
            updated_at: at(2026, 9, 29).toISOString(),
        };
        expect(logsOfWeek([skipped], at(2026, 10, 1))).toHaveLength(1);
        expect(logsOfWeek([skipped], at(2026, 10, 6))).toHaveLength(0);
    });
});

describe('meta semanal', () => {
    it('conta dias distintos, não treinos', () => {
        expect(
            trainedDays([
                done(at(2026, 9, 28, 7)),
                done(at(2026, 9, 28, 18)),
                done(at(2026, 9, 29)),
            ]),
        ).toBe(2);
    });

    it('usa a meta do personal e, sem ela, os treinos da fase', () => {
        const m = meso('f1', 1, 4, 5);
        expect(weeklyTargetDays(macro([m]), m)).toBe(5);
        expect(weeklyTargetDays(macro([m], { weekly_target_days: 3 }), m)).toBe(3);
        expect(weeklyTargetDays(macro([m]), meso('big', 1, 1, 9))).toBe(7);
    });

    it('fecha a semana ao atingir a meta e zera na segunda', () => {
        const logs = [done(at(2026, 9, 21)), done(at(2026, 9, 23)), done(at(2026, 9, 25))];
        expect(weeklyProgress(logs, 3, at(2026, 9, 26))).toEqual({
            done: 3,
            target: 3,
            completed: true,
        });
        expect(weeklyProgress(logs, 3, at(2026, 9, 28))).toEqual({
            done: 0,
            target: 3,
            completed: false,
        });
    });
});
