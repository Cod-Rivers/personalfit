import { describe, expect, it } from 'vitest';
import {
    defaultPlanName,
    endDateForWeeks,
    matchingShortcut,
    planKindLabel,
} from './routineDefaults';

describe('routineDefaults', () => {
    it('nomeia o plano pelo modo e pelo mês', () => {
        const oct = new Date(2026, 9, 5);
        expect(defaultPlanName('simple', oct)).toBe('Rotina de outubro');
        expect(defaultPlanName('periodized', oct)).toBe(
            'Periodização de outubro',
        );
        expect(planKindLabel(undefined)).toBe('Periodização');
    });

    it('conta o dia do início: 4 semanas de segunda terminam num domingo', () => {
        // 2026-10-05 é segunda-feira.
        expect(endDateForWeeks('2026-10-05', 4)).toBe('2026-11-01');
        expect(endDateForWeeks('2026-10-05', 1)).toBe('2026-10-11');
    });

    it('atravessa a virada do ano em data local', () => {
        expect(endDateForWeeks('2026-12-20', 4)).toBe('2027-01-16');
    });

    it('reconhece o atalho escolhido e ignora datas soltas', () => {
        expect(matchingShortcut('2026-10-05', '2026-11-29')).toBe(8);
        expect(matchingShortcut('2026-10-05', '2026-11-30')).toBeNull();
        expect(matchingShortcut('2026-10-05', '')).toBeNull();
    });
});
