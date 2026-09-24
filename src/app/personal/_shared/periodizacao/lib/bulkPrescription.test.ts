import { describe, expect, it } from 'vitest';
import { EMPTY_BULK_FIELDS } from '../components/fields/PrescriptionFields';
import type { LocalExercise } from './mesocycleTransforms';
import { applyBulkPrescription } from './bulkPrescription';

function ex(extra: Partial<LocalExercise> = {}): LocalExercise {
    return {
        _id: 'e1',
        name: 'Supino',
        series_mode: 'reps',
        series_sets: '3',
        series_value: '10',
        series_free: '',
        observations: '',
        variations: '',
        rest_seconds: '60',
        load_kg: '',
        load_percentage: '',
        tempo_seconds: '',
        rpe_target: '',
        muscle_group: '',
        timed: false,
        video_url: '',
        video_thumb: '',
        ...extra,
    } as LocalExercise;
}

describe('applyBulkPrescription', () => {
    it('3 × 20: sem teto de repetições', () => {
        const out = applyBulkPrescription(ex(), {
            ...EMPTY_BULK_FIELDS,
            series_sets: '3',
            series_reps: '20',
        });
        expect([out.series_sets, out.series_value]).toEqual(['3', '20']);
    });

    it('só repetições: mantém as séries de cada exercício', () => {
        const out = applyBulkPrescription(ex({ series_sets: '4' }), {
            ...EMPTY_BULK_FIELDS,
            series_reps: '15',
        });
        expect([out.series_sets, out.series_value]).toEqual(['4', '15']);
    });

    it('exercício por tempo: séries mudam, os segundos não viram reps', () => {
        const out = applyBulkPrescription(
            ex({ series_mode: 'time', series_value: '30' }),
            { ...EMPTY_BULK_FIELDS, series_sets: '5', series_reps: '20' },
        );
        expect([out.series_mode, out.series_sets, out.series_value]).toEqual([
            'time',
            '5',
            '30',
        ]);
    });

    it('texto livre (pirâmide) não é sobrescrito pelas repetições', () => {
        const out = applyBulkPrescription(
            ex({ series_mode: 'free', series_free: '12-10-8' }),
            { ...EMPTY_BULK_FIELDS, series_reps: '20' },
        );
        expect([out.series_mode, out.series_free]).toEqual(['free', '12-10-8']);
    });

    it('campo em branco não altera; os demais continuam sendo copiados', () => {
        const out = applyBulkPrescription(ex({ load_kg: '40' }), {
            ...EMPTY_BULK_FIELDS,
            rpe_target: '8',
        });
        expect([out.load_kg, out.rpe_target, out.series_value]).toEqual([
            '40',
            '8',
            '10',
        ]);
    });
});
