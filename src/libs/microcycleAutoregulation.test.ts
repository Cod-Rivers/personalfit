import { describe, expect, it } from 'vitest';
import { computeAutoregulationDecision } from './microcycleAutoregulation';

describe('computeAutoregulationDecision', () => {
    it('detects supercompensação when balance is high and RPE stayed at/under target', () => {
        const decision = computeAutoregulationDecision({
            readinessScore: 9,
            sleepHours: 8,
            stressScore: 2,
            sorenessScore: 2,
            previousRPE: 5,
            hrvDeltaMs: 10,
            targetRPE: 7,
        });

        expect(decision.zone).toBe('supercompensacao');
        expect(decision.balance).toBe(89);
        expect(decision.volumeAdjustPct).toBe(8);
        expect(decision.intensityAdjustPct).toBe(3);
        expect(decision.intraSessionLoadAdjustPct).toBe(3);
        expect(decision.triggerDeload).toBe(false);
        expect(decision.reasons).toEqual(['VFC acima do basal']);
    });

    it('detects fadiga with deload trigger when balance collapses and fatigue days pile up', () => {
        const decision = computeAutoregulationDecision({
            readinessScore: 3,
            sleepHours: 4,
            stressScore: 9,
            sorenessScore: 9,
            previousRPE: 9,
            hrvDeltaMs: -15,
            targetRPE: 7,
            consecutiveHighFatigueDays: 3,
        });

        expect(decision.zone).toBe('fadiga');
        expect(decision.balance).toBe(-217);
        expect(decision.volumeAdjustPct).toBe(-20);
        expect(decision.intensityAdjustPct).toBe(-7);
        expect(decision.intraSessionLoadAdjustPct).toBe(-7);
        expect(decision.triggerDeload).toBe(true);
        expect(decision.message).toContain('Gatilho de deload');
        expect(decision.reasons).toEqual([
            'VFC abaixo do basal',
            'RPE prévio muito alto',
            'estresse elevado',
            'dor muscular elevada',
            'sono insuficiente',
        ]);
    });

    it('stays in manutenção and keeps the planned adjustments when signals are neutral', () => {
        const decision = computeAutoregulationDecision({
            readinessScore: 6,
            sleepHours: 7,
            stressScore: 4,
            sorenessScore: 4,
            previousRPE: 6,
            hrvDeltaMs: 0,
            targetRPE: 7,
        });

        expect(decision.zone).toBe('manutencao');
        expect(decision.balance).toBe(0);
        expect(decision.volumeAdjustPct).toBe(0);
        expect(decision.intensityAdjustPct).toBe(0);
        expect(decision.intraSessionLoadAdjustPct).toBe(0);
        expect(decision.triggerDeload).toBe(false);
        expect(decision.reasons).toEqual([]);
        expect(decision.message).toBe('Manter plano do microciclo.');
    });

    it('flags fadiga from a stalled HRV + high relative RPE even when the raw balance is positive', () => {
        const decision = computeAutoregulationDecision({
            readinessScore: 8,
            sleepHours: 8,
            stressScore: 3,
            sorenessScore: 3,
            previousRPE: 8,
            hrvDeltaMs: 0,
            targetRPE: 5,
        });

        expect(decision.balance).toBeGreaterThan(0);
        expect(decision.zone).toBe('fadiga');
        expect(decision.triggerDeload).toBe(false);
    });

    it('only triggers deload once fatigue days or RPE cross their own thresholds', () => {
        const base = {
            readinessScore: 3,
            sleepHours: 4,
            stressScore: 9,
            sorenessScore: 9,
            previousRPE: 7,
            hrvDeltaMs: -15,
            targetRPE: 7,
        };

        const withoutStreak = computeAutoregulationDecision({
            ...base,
            consecutiveHighFatigueDays: 1,
        });
        expect(withoutStreak.zone).toBe('fadiga');
        expect(withoutStreak.triggerDeload).toBe(false);

        const withStreak = computeAutoregulationDecision({
            ...base,
            consecutiveHighFatigueDays: 2,
        });
        expect(withStreak.triggerDeload).toBe(true);
    });

    it('clamps out-of-range inputs to the same decision as their clamped equivalents', () => {
        const extreme = computeAutoregulationDecision({
            readinessScore: 999,
            sleepHours: -40,
            stressScore: -20,
            sorenessScore: 40,
            previousRPE: 0,
            hrvDeltaMs: 500,
        });
        const clamped = computeAutoregulationDecision({
            readinessScore: 10,
            sleepHours: 0,
            stressScore: 1,
            sorenessScore: 10,
            previousRPE: 1,
            hrvDeltaMs: 30,
        });

        expect(extreme).toEqual(clamped);
    });

    it('defaults targetRPE to 7 and planned adjustments to 0 when omitted', () => {
        const withDefaults = computeAutoregulationDecision({
            readinessScore: 6,
            sleepHours: 7,
            stressScore: 4,
            sorenessScore: 4,
            previousRPE: 6,
            hrvDeltaMs: 0,
        });
        const explicit = computeAutoregulationDecision({
            readinessScore: 6,
            sleepHours: 7,
            stressScore: 4,
            sorenessScore: 4,
            previousRPE: 6,
            hrvDeltaMs: 0,
            targetRPE: 7,
            plannedVolumeAdjustPct: 0,
            plannedIntensityAdjustPct: 0,
        });

        expect(withDefaults).toEqual(explicit);
    });
});
