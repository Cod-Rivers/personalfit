import { describe, expect, it } from 'vitest';
import type { TrainingResponse } from '@/libs/planningService';
import {
    responseToLocal,
    localToMesoRequest,
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
