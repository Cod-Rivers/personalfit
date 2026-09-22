import { describe, expect, it } from 'vitest';
import {
    MAX_SETS,
    formatSeries,
    formatSeriesCompact,
    fromSeriesDraft,
    seriesSignature,
    toSeriesDraft,
} from './seriesPrescription';

describe('toSeriesDraft', () => {
    it('reads N séries × M repetições from a uniform series array', () => {
        expect(toSeriesDraft({ series: [10, 10, 10] })).toEqual({
            mode: 'reps',
            sets: '3',
            value: '10',
            free: '',
        });
    });

    it('reads séries × segundos when the exercise is timed', () => {
        expect(toSeriesDraft({ series: [30, 30], timed: true })).toEqual({
            mode: 'time',
            sets: '2',
            value: '30',
            free: '',
        });
    });

    it('falls back to free text for non-uniform series, like the phase editor does', () => {
        const draft = toSeriesDraft({ series: [12, 10, 8] });
        expect(draft.mode).toBe('free');
        expect(draft.free).toBe('12 × 10 × 8');
    });

    it('gives series_label priority over the numeric array', () => {
        const draft = toSeriesDraft({
            series: [10, 10],
            series_label: '3-4 × 10-12',
        });
        expect(draft.mode).toBe('free');
        expect(draft.free).toBe('3-4 × 10-12');
    });

    it('reads the set count alongside free text when one was saved', () => {
        const draft = toSeriesDraft({
            series: [0, 0, 0],
            series_label: '8 a 10',
        });
        expect(draft.sets).toBe('3');
    });

    it('leaves the set count blank for free text that never had one', () => {
        const draft = toSeriesDraft({ series: [], series_label: '8 a 10' });
        expect(draft.sets).toBe('');
    });
});

describe('fromSeriesDraft', () => {
    it('expands séries × repetições into one entry per set', () => {
        expect(
            fromSeriesDraft({ mode: 'reps', sets: '4', value: '8', free: '' }),
        ).toEqual({ series: [8, 8, 8, 8], timed: false, series_label: undefined });
    });

    it('marks the exercise as timed without touching the numbers', () => {
        const patch = fromSeriesDraft({
            mode: 'time',
            sets: '3',
            value: '45',
            free: '',
        });
        expect(patch.timed).toBe(true);
        expect(patch.series).toEqual([45, 45, 45]);
    });

    it('clears series_label when leaving free mode', () => {
        // Sem isso o aluno continuaria vendo o rótulo antigo: series_label
        // tem prioridade sobre o array na exibição.
        const patch = fromSeriesDraft({
            mode: 'reps',
            sets: '3',
            value: '12',
            free: 'texto antigo',
        });
        expect(patch.series_label).toBeUndefined();
    });

    it('stores free text and drops the numeric values, keeping only a set count', () => {
        expect(
            fromSeriesDraft({
                mode: 'free',
                sets: '3',
                value: '10',
                free: '  3-4 × 10-12  ',
            }),
        ).toEqual({
            series: [0, 0, 0],
            timed: false,
            series_label: '3-4 × 10-12',
        });
    });

    it('leaves the set count out when the field is blank — the text stands alone', () => {
        expect(
            fromSeriesDraft({ mode: 'free', sets: '', value: '10', free: '8 a 10' })
                .series,
        ).toEqual([]);
    });

    it('turns empty free text into undefined, not an empty label', () => {
        expect(
            fromSeriesDraft({ mode: 'free', sets: '3', value: '10', free: '   ' })
                .series_label,
        ).toBeUndefined();
    });

    it('caps the number of sets so a typo cannot prescribe hundreds of series', () => {
        const patch = fromSeriesDraft({
            mode: 'reps',
            sets: '900',
            value: '10',
            free: '',
        });
        expect(patch.series).toHaveLength(MAX_SETS);
    });

    it('keeps at least one set when the field is emptied', () => {
        const patch = fromSeriesDraft({
            mode: 'reps',
            sets: '',
            value: '10',
            free: '',
        });
        expect(patch.series).toEqual([10]);
    });
});

describe('round trip', () => {
    it('leaves an untouched prescription byte-identical', () => {
        const original = { series: [10, 10, 10], timed: false };
        const patch = fromSeriesDraft(toSeriesDraft(original));
        expect(seriesSignature(patch)).toBe(seriesSignature(original));
    });

    it('leaves an untouched free-text prescription identical', () => {
        const original = { series: [], series_label: '3 × falha', timed: false };
        const patch = fromSeriesDraft(toSeriesDraft(original));
        expect(seriesSignature(patch)).toBe(seriesSignature(original));
    });
});

describe('formatSeries', () => {
    it('suffixes seconds for timed exercises', () => {
        expect(formatSeries({ series: [30, 30], timed: true })).toBe('30s - 30s');
    });

    it('shows the free-text label verbatim when no set count was saved', () => {
        expect(formatSeries({ series: [], series_label: '3-4 × 10-12' })).toBe(
            '3-4 × 10-12',
        );
    });

    it('prefixes the set count when one was saved alongside the free text', () => {
        expect(
            formatSeries({ series: [0, 0, 0], series_label: '8 a 10' }),
        ).toBe('3 × 8 a 10');
    });

    it('shows a dash when there is no prescription at all', () => {
        expect(formatSeries({ series: [] })).toBe('—');
    });
});

describe('formatSeriesCompact', () => {
    it('collapses equal sets into sets × reps', () => {
        expect(formatSeriesCompact({ series: [10, 10, 10, 10] })).toBe('4 × 10');
    });

    it('keeps the seconds suffix for timed exercises', () => {
        expect(formatSeriesCompact({ series: [30, 30, 30], timed: true })).toBe(
            '3 × 30s',
        );
    });

    it('falls back to the full list for pyramids', () => {
        expect(formatSeriesCompact({ series: [12, 10, 8] })).toBe('12 - 10 - 8');
    });

    it('keeps single (non-label) sets as they are', () => {
        expect(formatSeriesCompact({ series: [15] })).toBe('15');
    });

    it('defers to formatSeries for free text, count prefix included', () => {
        expect(
            formatSeriesCompact({
                series: [0, 0],
                series_label: '8 a 10 + falha',
            }),
        ).toBe('2 × 8 a 10 + falha');
    });
});
