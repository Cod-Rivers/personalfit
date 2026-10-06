import { describe, expect, it } from 'vitest';
import { needsNewPlan, studentPlanStatus } from './studentPlanStatus';

const today = new Date(2026, 9, 6, 22, 30); // 06/10, noite (fuso local)
const plan = (end_date?: string, ended?: boolean) => ({
    id: 'p',
    name: 'Treino',
    end_date,
    ended,
});

describe('studentPlanStatus', () => {
    it('sem plano', () => {
        expect(studentPlanStatus(undefined, today)).toEqual({ state: 'none' });
    });

    it('sem término nunca vence', () => {
        expect(studentPlanStatus(plan(), today)).toEqual({ state: 'ok' });
    });

    it('o dia do término ainda vale (vence hoje = 0 dias)', () => {
        expect(studentPlanStatus(plan('2026-10-06T00:00:00Z'), today)).toEqual({
            state: 'expiring',
            daysLeft: 0,
        });
    });

    it('avisa até 7 dias antes', () => {
        expect(studentPlanStatus(plan('2026-10-13T00:00:00Z'), today)).toEqual({
            state: 'expiring',
            daysLeft: 7,
        });
        expect(studentPlanStatus(plan('2026-10-14T00:00:00Z'), today)).toEqual({
            state: 'ok',
        });
    });

    it('passou do término: vencido', () => {
        expect(studentPlanStatus(plan('2026-10-05T00:00:00Z'), today)).toEqual({
            state: 'expired',
            endDate: '2026-10-05',
        });
    });

    it('arquivado pelo término no servidor: vencido e pede treino novo', () => {
        const p = plan('2026-09-30T00:00:00Z', true);
        expect(studentPlanStatus(p, today).state).toBe('expired');
        expect(needsNewPlan(p)).toBe(true);
        expect(needsNewPlan(plan('2026-09-30T00:00:00Z'))).toBe(false);
        expect(needsNewPlan(undefined)).toBe(true);
    });
});
