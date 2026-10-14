import { describe, expect, it } from 'vitest';
import type { TrainingResponse } from '@/libs/planningService';
import {
    responseToLocal,
    localToMesoRequest,
    exerciseToLocal,
    localExerciseToRequest,
    type MesoPhaseFormData,
} from './mesocycleTransforms';

// Achado do convention-guard na Sprint 5: a conversão tri-estado
// (null/ausente/true/false) de non_substitutable não tinha nenhum teste
// automatizado, ao contrário do equivalente no backend — um bug aqui
// inverteria silenciosamente um override explícito do personal (ex.:
// 'false' virando undefined, que o backend reabre como "sem decisão").
// Testa pela API pública (responseToLocal → localToMesoRequest), não pelos
// helpers internos triBoolToField/fieldToTriBool (não exportados de propósito).

function makeTraining(nonSubstitutable: boolean | null | undefined): TrainingResponse {
    return {
        id: 't1',
        reference: 'A',
        weekday: 1,
        exercises: [
            {
                id: 'ex1',
                name: 'Supino reto',
                series: [10, 10, 10],
                variations: '',
                video_url: '',
                video_thumb: '',
                timed: false,
                non_substitutable: nonSubstitutable,
            },
        ],
    };
}

const mesoData: MesoPhaseFormData = {
    name: 'Meso 1',
    phase: 'base',
    duration_weeks: 1,
    methodology: 'linear',
};

describe('mesocycleTransforms — round-trip de non_substitutable (tri-estado)', () => {
    it.each([
        ['true explícito (nunca substituível)', true, true],
        ['false explícito (sempre substituível)', false, false],
        ['ausente (sem opinião)', undefined, undefined],
        ['null (sem opinião)', null, undefined],
    ] as const)('%s sobrevive a responseToLocal → localToMesoRequest', (_label, input, expected) => {
        const local = responseToLocal([makeTraining(input)]);
        const request = localToMesoRequest(mesoData, local, [], 0);

        expect(request.trainings[0].exercises[0].non_substitutable).toBe(expected);
    });

    it('não confunde false explícito com ausência em nenhuma direção', () => {
        const localFalse = responseToLocal([makeTraining(false)]);
        const localAbsent = responseToLocal([makeTraining(undefined)]);

        // '' representa "sem opinião" e nunca deve coincidir com o valor que
        // representa false explícito.
        expect(localFalse[0].exercises[0].non_substitutable).toBe('false');
        expect(localAbsent[0].exercises[0].non_substitutable).toBe('');
        expect(localFalse[0].exercises[0].non_substitutable).not.toBe(
            localAbsent[0].exercises[0].non_substitutable,
        );
    });
});

describe('recuperação do circuito (group_recovery_seconds) no editor', () => {
    const base = {
        id: 'e1',
        name: 'Burpee',
        series: [60, 60],
        variations: '',
        video_url: '',
        video_thumb: '',
        timed: true,
        group_id: 'g',
    };

    it('ida e volta pelo editor preserva o valor', () => {
        const local = exerciseToLocal({ ...base, group_recovery_seconds: 10 });
        expect(local.group_recovery_seconds).toBe('10');
        expect(localExerciseToRequest(local).group_recovery_seconds).toBe(10);
    });

    it('sem recuperação vai como ausente, não como 0', () => {
        const local = exerciseToLocal(base);
        expect(local.group_recovery_seconds).toBe('');
        expect(localExerciseToRequest(local).group_recovery_seconds).toBeUndefined();
    });
});

describe('séries por série (escada, pirâmide)', () => {
    const ladder = {
        id: 'e2',
        name: 'Puxada',
        series: [1, 2, 3, 2, 1],
        variations: '',
        video_url: '',
        video_thumb: '',
        timed: false,
    };

    it('abre série não uniforme no modo por série, sem texto livre', () => {
        const local = exerciseToLocal(ladder);
        expect(local.series_mode).toBe('per_set');
        expect(local.series_sets).toBe('5');
        expect(local.series_per_set).toBe('1,2,3,2,1');
    });

    it('ida e volta pelo editor preserva cada série', () => {
        // Antes o save gravava series_label "1 × 2 × 3 × 2 × 1" e zeros.
        const req = localExerciseToRequest(exerciseToLocal(ladder));
        expect(req.series).toEqual([1, 2, 3, 2, 1]);
        expect(req.series_label).toBeUndefined();
        expect(req.timed).toBe(false);
    });

    it('mudar a quantidade de séries repete o último valor', () => {
        const local = { ...exerciseToLocal(ladder), series_sets: '7' };
        expect(localExerciseToRequest(local).series).toEqual([1, 2, 3, 2, 1, 1, 1]);
    });

    it('texto livre gravado antes continua texto livre', () => {
        const local = exerciseToLocal({ ...ladder, series: [0, 0], series_label: '8 a 10' });
        expect(local.series_mode).toBe('free');
    });
});
