import { describe, expect, it } from 'vitest';
import { computeLoadSuggestion } from './loadSuggestion';
import { DEFAULT_AUTOREGULATION_POLICY } from './autoregulationPolicy';

describe('computeLoadSuggestion', () => {
    it('uses the prescribed load as-is when there is no execution history', () => {
        const result = computeLoadSuggestion({
            prescribedKg: 40,
            history: [],
            targetRPE: 8,
            autoregulationAdjustPct: 0,
        });

        expect(result.source).toBe('personal');
        expect(result.suggestedKg).toBe(40);
        expect(result.abovePrescribed).toBe(false);
    });

    it('progresses from the student history when there is no prescription', () => {
        const result = computeLoadSuggestion({
            prescribedKg: null,
            history: [{ date: '2026-07-20', loadKg: 30, reps: 8, rpe: 6 }],
            targetRPE: 8,
            autoregulationAdjustPct: 0,
        });

        expect(result.source).toBe('aluno');
        // RPE folgou 2 pontos do alvo -> progressUpBigPct (5%) -> 30 * 1.05 = 31.5 -> arredonda p/ 32
        expect(result.suggestedKg).toBe(32);
        expect(result.reason).toContain('+5%');
    });

    it('blends prescribed and history when both exist, weighted by session count', () => {
        const result = computeLoadSuggestion({
            prescribedKg: 50,
            history: [{ date: '2026-07-20', loadKg: 48, reps: 8, rpe: 7 }],
            targetRPE: 7,
            autoregulationAdjustPct: 0,
        });

        expect(result.source).toBe('ambos');
        expect(result.baseKg).toBe(49); // 0.5*50 + 0.5*48
        expect(result.suggestedKg).toBe(49);
        expect(result.deltaPct).toBe(-2);
    });

    it('returns no suggestion when there is neither prescription nor history', () => {
        const result = computeLoadSuggestion({
            prescribedKg: null,
            history: [],
            targetRPE: 7,
            autoregulationAdjustPct: 0,
        });

        expect(result.suggestedKg).toBeNull();
        expect(result.source).toBe('nenhuma');
    });

    it('never applies a positive autoregulation adjustment during deload, only reductions', () => {
        const withoutDeload = computeLoadSuggestion({
            prescribedKg: 40,
            history: [{ date: '2026-07-20', loadKg: 38, reps: 8, rpe: 5 }],
            targetRPE: 8,
            autoregulationAdjustPct: 3,
            isDeload: false,
        });
        const withDeload = computeLoadSuggestion({
            prescribedKg: 40,
            history: [{ date: '2026-07-20', loadKg: 38, reps: 8, rpe: 5 }],
            targetRPE: 8,
            autoregulationAdjustPct: 3,
            isDeload: true,
        });

        expect(withoutDeload.suggestedKg).toBeGreaterThan(
            withDeload.suggestedKg ?? 0,
        );
        // Em deload, um ajuste positivo do dia é zerado, não invertido.
        expect(withDeload.suggestedKg).toBe(40);
    });

    it('caps the suggestion within weeklyCapPct of the prescribed load even with an aggressive history', () => {
        const result = computeLoadSuggestion({
            prescribedKg: 40,
            history: [{ date: '2026-07-20', loadKg: 60, reps: 8, rpe: 5 }],
            targetRPE: 8,
            autoregulationAdjustPct: 0,
        });

        // Teto padrão de 10%: 40 * 1.10 = 44
        expect(result.suggestedKg).toBe(44);
        expect(result.abovePrescribed).toBe(false);
    });

    it('respects a custom policy passed by the caller instead of the app default', () => {
        const customPolicy = {
            ...DEFAULT_AUTOREGULATION_POLICY,
            progressUpBigPct: 10,
            weeklyCapPct: 20,
            abovePrescribedTolerancePct: 15,
        };

        const result = computeLoadSuggestion({
            prescribedKg: 40,
            history: [{ date: '2026-07-20', loadKg: 60, reps: 8, rpe: 5 }],
            targetRPE: 8,
            autoregulationAdjustPct: 0,
            policy: customPolicy,
        });

        expect(result.suggestedKg).toBe(48); // teto de 20%: 40 * 1.2
        expect(result.abovePrescribed).toBe(true); // acima da tolerância de 15%: 40 * 1.15 = 46
    });
});
