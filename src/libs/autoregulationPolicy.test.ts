import { describe, expect, it } from 'vitest';
import {
    DEFAULT_AUTOREGULATION_POLICY,
    resolveAutoregulationPolicy,
} from './autoregulationPolicy';

describe('resolveAutoregulationPolicy', () => {
    it('falls back entirely to the app default when no layer is provided', () => {
        const { policy, sources } = resolveAutoregulationPolicy({});
        expect(policy).toEqual(DEFAULT_AUTOREGULATION_POLICY);
        expect(sources.progressUpBigPct).toBe('app');
    });

    it('resolves only the fields the personal defined, leaving the rest at default', () => {
        const { policy, sources } = resolveAutoregulationPolicy({
            personal: { progressUpBigPct: 3 },
        });

        expect(policy.progressUpBigPct).toBe(3);
        expect(sources.progressUpBigPct).toBe('personal');

        expect(policy.progressUpSmallPct).toBe(
            DEFAULT_AUTOREGULATION_POLICY.progressUpSmallPct,
        );
        expect(sources.progressUpSmallPct).toBe('app');
        expect(policy.weeklyCapPct).toBe(DEFAULT_AUTOREGULATION_POLICY.weeklyCapPct);
    });

    it('respects an explicit 0 defined by the personal instead of falling back to default', () => {
        const { policy, sources } = resolveAutoregulationPolicy({
            personal: { progressDownPct: 0 },
        });

        expect(policy.progressDownPct).toBe(0);
        expect(sources.progressDownPct).toBe('personal');
    });

    it('lets micro override macro override personal, field by field, with partial layers', () => {
        const { policy, sources } = resolveAutoregulationPolicy({
            personal: { progressDownPct: -8, weeklyCapPct: 12 },
            macro: { weeklyCapPct: 6 },
            micro: { progressDownPct: -12 },
        });

        expect(policy.progressDownPct).toBe(-12);
        expect(sources.progressDownPct).toBe('micro');

        expect(policy.weeklyCapPct).toBe(6);
        expect(sources.weeklyCapPct).toBe('macro');

        // Campo não tocado em nenhum nível continua no padrão do app.
        expect(policy.fatigueVolumePct).toBe(
            DEFAULT_AUTOREGULATION_POLICY.fatigueVolumePct,
        );
        expect(sources.fatigueVolumePct).toBe('app');
    });

    it('treats null/undefined layers the same as an absent layer', () => {
        const { policy } = resolveAutoregulationPolicy({
            personal: null,
            macro: undefined,
        });
        expect(policy).toEqual(DEFAULT_AUTOREGULATION_POLICY);
    });
});
