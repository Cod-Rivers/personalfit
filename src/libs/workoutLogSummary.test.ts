import { describe, expect, it } from 'vitest';
import { describeSeries, reviewProgress } from './workoutLogSummary';

/**
 * O resumo é o que permite o exercício virar uma LINHA no registro de treino.
 * Se ele mentir, o aluno confia num valor errado e não abre o exercício para
 * corrigir — por isso os casos de faixa e de campo vazio têm teste próprio.
 */

describe('describeSeries', () => {
    it('resume séries idênticas como valor único', () => {
        expect(
            describeSeries([
                { reps: 10, loadKg: 80 },
                { reps: 10, loadKg: 80 },
                { reps: 10, loadKg: 80 },
            ]),
        ).toBe('3 séries · 10 reps · 80 kg');
    });

    it('resume séries diferentes como faixa', () => {
        expect(
            describeSeries([
                { reps: 12, loadKg: 60 },
                { reps: 10, loadKg: 70 },
                { reps: 8, loadKg: 80 },
            ]),
        ).toBe('3 séries · 8-12 reps · 60-80 kg');
    });

    it('carga zerada vira "sem carga", não "0 kg"', () => {
        // Peso corporal, ou o aluno ainda não preencheu. "0 kg" seria uma
        // afirmação falsa sobre o que ele registrou.
        expect(describeSeries([{ reps: 15, loadKg: 0 }])).toBe(
            '1 série · 15 reps · sem carga',
        );
    });

    it('ignora zeros ao calcular a faixa', () => {
        expect(
            describeSeries([
                { reps: 10, loadKg: 40 },
                { reps: 0, loadKg: 0 },
            ]),
        ).toBe('2 séries · 10 reps · 40 kg');
    });

    it('carga fracionada usa vírgula, como o resto do app', () => {
        expect(describeSeries([{ reps: 5, loadKg: 72.5 }])).toBe(
            '1 série · 5 reps · 72,5 kg',
        );
    });

    it('sem nenhuma série preenchida, não inventa números', () => {
        expect(describeSeries([{ reps: 0, loadKg: 0 }])).toBe(
            '1 série · sem carga',
        );
        expect(describeSeries([])).toBe('Nenhuma série');
    });
});

describe('reviewProgress', () => {
    it('conta os exercícios abertos, não os preenchidos', () => {
        // As séries nascem preenchidas com a prescrição: contar por
        // preenchimento marcaria tudo como pronto ao abrir a tela.
        expect(reviewProgress(6, new Set())).toBe('6 exercícios para conferir');
        expect(reviewProgress(6, new Set(['a', 'b', 'c']))).toBe(
            '3 de 6 exercícios conferidos',
        );
        expect(reviewProgress(2, new Set(['a', 'b']))).toBe(
            'Todos os exercícios conferidos',
        );
    });

    it('não passa do total mesmo com visitas a blocos que sumiram', () => {
        expect(reviewProgress(2, new Set(['a', 'b', 'antigo']))).toBe(
            'Todos os exercícios conferidos',
        );
    });

    it('treino sem exercício não vira "0 de 0"', () => {
        expect(reviewProgress(0, new Set())).toBe(
            'Nenhum exercício neste treino',
        );
    });
});
