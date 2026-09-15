import { describe, expect, it } from 'vitest';
import { applySubstitutability, toExerciseLog } from './exerciseLog';
import type { ExerciseResponse } from './planningService';

const prescribed: ExerciseResponse = {
    id: 'ex-1',
    name: 'Cadeira extensora',
    series: [12, 12, 12],
    variations: '',
    video_url: '',
    video_thumb: '',
    timed: false,
    muscle_group: 'Quadríceps',
};

describe('applySubstitutability', () => {
    // O caso que a tela não mostrava: o personal não marcou nada, mas a dor
    // relatada pelo aluno trava a substituição. Antes, o aluno só descobria
    // ao tocar em substituir e receber o erro.
    it('marca a trava derivada da dor com o motivo', () => {
        const log = applySubstitutability(toExerciseLog(prescribed), {
            source: 'derivado',
            reason: 'dor em joelho',
        });
        expect(log.non_substitutable).toBe(true);
        expect(log.non_substitutable_source).toBe('derivado');
        expect(log.non_substitutable_reason).toBe('dor em joelho');
    });

    it('marca a trava do personal sem motivo', () => {
        const log = applySubstitutability(
            toExerciseLog({ ...prescribed, non_substitutable: true }),
            { source: 'personal' },
        );
        expect(log.non_substitutable).toBe(true);
        expect(log.non_substitutable_source).toBe('personal');
        expect(log.non_substitutable_reason).toBeUndefined();
    });

    it('sem entrada no mapa, mantém o exercício como veio', () => {
        const base = toExerciseLog({ ...prescribed, non_substitutable: false });
        expect(applySubstitutability(base, undefined)).toBe(base);
    });
});
