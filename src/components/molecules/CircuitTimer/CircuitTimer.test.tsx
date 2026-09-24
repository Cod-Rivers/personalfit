import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from '@testing-library/react';
import CircuitTimer from './index';

/**
 * Circuito de um bloco agrupado: exercícios da rodada em sequência sem
 * descanso, descanso só no fim da rodada, e a rodada seguinte.
 */
describe('CircuitTimer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    const tick = (ms: number) =>
        act(() => {
            vi.advanceTimersByTime(ms);
        });

    it('emenda os exercícios da rodada e só descansa no fim dela', () => {
        render(
            <CircuitTimer
                exercises={[
                    { name: 'Polichinelo', series: [60, 60], timed: true, rest: 30 },
                    { name: 'Burpee', series: [60, 60], timed: true, rest: 30 },
                ]}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: /Iniciar circuito/ }));
        expect(screen.getByText('Rodada 1 de 2')).toBeTruthy();
        expect(screen.getByText(/Exercício 1 de 2 · faltam 2 na rodada/)).toBeTruthy();

        tick(60_000);
        // Sem descanso entre os exercícios: já está no Burpee, contando.
        expect(screen.getByText(/Exercício 2 de 2 · último da rodada/)).toBeTruthy();
        expect(screen.getByRole('timer').textContent).toBe('1:00');

        tick(60_000);
        expect(screen.getByText('Descanso')).toBeTruthy();
        expect(screen.getByRole('timer').textContent).toBe('0:30');

        tick(30_000);
        expect(screen.getByText('Rodada 2 de 2')).toBeTruthy();
        expect(screen.getByText(/Exercício 1 de 2/)).toBeTruthy();

        tick(60_000);
        tick(60_000);
        // Última rodada não tem descanso depois.
        expect(screen.getByText("Circuito concluído!")).toBeTruthy();
    });

    it('série por repetições espera o "Feito"', () => {
        render(
            <CircuitTimer
                exercises={[
                    { name: 'Prancha', series: [40], timed: true },
                    { name: 'Flexão', series: [12] },
                ]}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: /Iniciar circuito/ }));
        tick(40_000);
        expect(screen.getByRole('timer').textContent).toBe('12 reps');
        tick(60_000);
        expect(screen.getByRole('timer').textContent).toBe('12 reps');

        fireEvent.click(screen.getByRole('button', { name: /Feito/ }));
        expect(screen.getByText("Circuito concluído!")).toBeTruthy();
    });
});
