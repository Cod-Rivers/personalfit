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
        expect(result.progressionGated).toBe(false);
        expect(result.weeklyCapped).toBe(false);
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

    // ── Regra 2-for-2 (ACSM 2009; NSCA "Essentials of Strength Training and
    // Conditioning"): um aumento só é liberado após N sessões CONSECUTIVAS
    // dentro da meta, não a cada sessão isolada. Reduções continuam imediatas.
    describe('regra 2-for-2 (progressão gated por sessões consecutivas)', () => {
        it('holds a would-be increase on the very first logged session (not enough streak yet)', () => {
            const result = computeLoadSuggestion({
                prescribedKg: null,
                history: [{ date: '2026-08-01', loadKg: 30, reps: 8, rpe: 6 }],
                targetRPE: 8, // gap de 2 -> progressUpBigPct qualificaria, mas falta streak
                autoregulationAdjustPct: 0,
            });

            expect(result.progressionGated).toBe(true);
            expect(result.suggestedKg).toBe(30); // mantém a última carga, sem progredir ainda
            expect(result.reason).toContain('2-for-2');
        });

        it('releases the increase once minConsecutiveSessionsBeforeIncrease qualifying sessions are logged', () => {
            const result = computeLoadSuggestion({
                prescribedKg: null,
                history: [
                    { date: '2026-07-25', loadKg: 30, reps: 8, rpe: 6 },
                    { date: '2026-08-01', loadKg: 30, reps: 8, rpe: 6 },
                ],
                targetRPE: 8,
                autoregulationAdjustPct: 0,
                referenceDate: '2026-08-01',
            });

            expect(result.progressionGated).toBe(false);
            // 30 * 1.05 (progressUpBigPct) = 31.5 -> arredonda p/ 32
            expect(result.suggestedKg).toBe(32);
        });

        it('never gates a decrease — reductions stay immediate regardless of streak', () => {
            const result = computeLoadSuggestion({
                prescribedKg: null,
                history: [{ date: '2026-08-01', loadKg: 40, reps: 8, rpe: 9 }],
                targetRPE: 7, // RPE acima do alvo -> redução, sempre imediata
                autoregulationAdjustPct: 0,
            });

            expect(result.progressionGated).toBe(false);
            expect(result.suggestedKg).toBeLessThan(40);
        });

        it('also requires hitting the planned rep target (double progression), not just RPE', () => {
            const result = computeLoadSuggestion({
                prescribedKg: null,
                history: [
                    { date: '2026-07-25', loadKg: 30, reps: 8, rpe: 6 },
                    { date: '2026-08-01', loadKg: 30, reps: 8, rpe: 6 },
                ],
                targetRPE: 8,
                plannedReps: 10, // reps executadas (8) ficaram abaixo do topo da faixa (10)
                autoregulationAdjustPct: 0,
                referenceDate: '2026-08-01',
            });

            expect(result.progressionGated).toBe(true);
            expect(result.suggestedKg).toBe(30);
        });

        it('policy override minConsecutiveSessionsBeforeIncrease=1 restores immediate per-session progression', () => {
            const result = computeLoadSuggestion({
                prescribedKg: null,
                history: [{ date: '2026-08-01', loadKg: 30, reps: 8, rpe: 6 }],
                targetRPE: 8,
                autoregulationAdjustPct: 0,
                policy: {
                    ...DEFAULT_AUTOREGULATION_POLICY,
                    minConsecutiveSessionsBeforeIncrease: 1,
                },
            });

            expect(result.progressionGated).toBe(false);
            expect(result.suggestedKg).toBe(32); // mesmo resultado do teste "libera" acima, sem exigir 2ª sessão
        });
    });

    // ── Teto de progressão semanal: janela móvel de 7 dias corridos. Não é um
    // número da literatura (que gateia por evento, não por calendário) — é
    // uma tradução de engenharia da faixa de evento (2-10%) para uma janela.
    describe('teto de progressão semanal (janela de 7 dias)', () => {
        it('caps the suggestion when the load already jumped a lot within the last 7 days', () => {
            const result = computeLoadSuggestion({
                prescribedKg: null,
                history: [
                    { date: '2026-07-31', loadKg: 28, reps: 8, rpe: 6 }, // 10 dias antes da referência
                    { date: '2026-08-09', loadKg: 35, reps: 8, rpe: 6 }, // 1 dia antes
                ],
                targetRPE: 8,
                autoregulationAdjustPct: 0,
                referenceDate: '2026-08-10',
            });

            expect(result.weeklyCapped).toBe(true);
            // teto padrão de 5%: 28 * 1.05 = 29.4 -> arredonda p/ 29
            expect(result.suggestedKg).toBe(29);
            expect(result.reason).toContain('teto de progressão semanal');
        });

        it('does not cap when there is not yet a full 7-day window of history', () => {
            const result = computeLoadSuggestion({
                prescribedKg: null,
                history: [
                    { date: '2026-08-08', loadKg: 28, reps: 8, rpe: 6 }, // 2 dias antes só
                    { date: '2026-08-09', loadKg: 35, reps: 8, rpe: 6 },
                ],
                targetRPE: 8,
                autoregulationAdjustPct: 0,
                referenceDate: '2026-08-10',
            });

            expect(result.weeklyCapped).toBe(false);
        });
    });

    describe('teto de desvio do prescrito (antigo weeklyCapPct, sem dimensão de tempo)', () => {
        it('caps the suggestion within maxDeviationFromPrescribedPct of the prescribed load even with an aggressive single session', () => {
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
                maxDeviationFromPrescribedPct: 20,
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

        it('applies a custom progressUpBigPct once the 2-for-2 gate is satisfied', () => {
            const customPolicy = {
                ...DEFAULT_AUTOREGULATION_POLICY,
                progressUpBigPct: 10,
                // Afrouxa o teto semanal para isolar o efeito de progressUpBigPct
                // neste teste (o padrão de 5%/semana bloquearia os 10%).
                weeklyProgressionCapPct: 20,
            };

            const result = computeLoadSuggestion({
                prescribedKg: null,
                history: [
                    { date: '2026-07-25', loadKg: 30, reps: 8, rpe: 6 },
                    { date: '2026-08-01', loadKg: 30, reps: 8, rpe: 6 },
                ],
                targetRPE: 8,
                autoregulationAdjustPct: 0,
                referenceDate: '2026-08-01',
                policy: customPolicy,
            });

            // 30 * 1.10 = 33
            expect(result.suggestedKg).toBe(33);
        });
    });

    it('never applies a positive autoregulation adjustment during deload, only reductions', () => {
        const history = [
            { date: '2026-07-22', loadKg: 38, reps: 8, rpe: 5 }, // >=7 dias antes da referência
            { date: '2026-08-04', loadKg: 38, reps: 8, rpe: 5 },
        ];
        const withoutDeload = computeLoadSuggestion({
            prescribedKg: 40,
            history,
            targetRPE: 8,
            autoregulationAdjustPct: 3,
            isDeload: false,
            referenceDate: '2026-08-05',
        });
        const withDeload = computeLoadSuggestion({
            prescribedKg: 40,
            history,
            targetRPE: 8,
            autoregulationAdjustPct: 3,
            isDeload: true,
            referenceDate: '2026-08-05',
        });

        expect(withoutDeload.progressionGated).toBe(false);
        expect(withoutDeload.suggestedKg).toBeGreaterThan(
            withDeload.suggestedKg ?? 0,
        );
        // Em deload, um ajuste positivo do dia é zerado, não invertido.
        expect(withDeload.suggestedKg).toBe(40);
    });
});
