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
    it('descanso: aplica a todos; em branco mantém o de cada exercício', () => {
        const withRest = applyBulkPrescription(ex(), {
            ...EMPTY_BULK_FIELDS,
            rest_seconds: '90',
        });
        expect(withRest.rest_seconds).toBe('90');
        const untouched = applyBulkPrescription(ex(), {
            ...EMPTY_BULK_FIELDS,
            series_sets: '4',
        });
        expect(untouched.rest_seconds).toBe('60');
    });

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

    it('tipo Tempo: troca todos para por tempo, valor em segundos', () => {
        const fields = {
            ...EMPTY_BULK_FIELDS,
            series_mode: 'time' as const,
            series_sets: '3',
            series_reps: '90',
        };
        const fromReps = applyBulkPrescription(ex(), fields);
        expect([
            fromReps.series_mode,
            fromReps.timed,
            fromReps.series_sets,
            fromReps.series_value,
        ]).toEqual(['time', true, '3', '90']);
        const fromFree = applyBulkPrescription(
            ex({ series_mode: 'free', series_free: '12-10-8' }),
            fields,
        );
        expect([fromFree.series_mode, fromFree.series_value]).toEqual([
            'time',
            '90',
        ]);
    });

    it('tipo Repetições: volta um exercício por tempo para reps', () => {
        const out = applyBulkPrescription(
            ex({ series_mode: 'time', timed: true, series_value: '30' }),
            { ...EMPTY_BULK_FIELDS, series_mode: 'reps', series_reps: '12' },
        );
        expect([out.series_mode, out.timed, out.series_value]).toEqual([
            'reps',
            false,
            '12',
        ]);
    });

    it('tipo sem valor: troca o modo e mantém o valor que já tinha', () => {
        const out = applyBulkPrescription(ex({ series_value: '10' }), {
            ...EMPTY_BULK_FIELDS,
            series_mode: 'time',
        });
        expect([out.series_mode, out.series_value]).toEqual(['time', '10']);
    });
});
