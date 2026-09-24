import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from '@testing-library/react';
import SeriesTimer from './index';

/**
 * Contador regressivo das séries por tempo. Cobre o que o aluno/personal
 * vê: a duração de CADA série (podem ser diferentes), a passagem para a
 * próxima só depois de zerar, e o fim de todas as séries.
 */
describe('SeriesTimer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it('mostra a série atual, o tempo prescrito e conta regressivamente', () => {
        render(<SeriesTimer durations={[30, 45]} exerciseName="Prancha" />);
        expect(screen.getByText('Série 1 de 2')).toBeTruthy();
        expect(screen.getByRole('timer').textContent).toBe('0:30');

        fireEvent.click(
            screen.getByRole('button', { name: /Iniciar série 1/ }),
        );
        act(() => {
            vi.advanceTimersByTime(10_000);
        });
        expect(screen.getByRole('timer').textContent).toBe('0:20');
    });

    it('ao zerar oferece a próxima série, com a duração dela', () => {
        render(<SeriesTimer durations={[30, 45]} exerciseName="Prancha" />);
        fireEvent.click(
            screen.getByRole('button', { name: /Iniciar série 1/ }),
        );
        act(() => {
            vi.advanceTimersByTime(31_000);
        });
        expect(screen.getByRole('timer').textContent).toBe('Tempo!');

        fireEvent.click(
            screen.getByRole('button', { name: /Ir para a série 2/ }),
        );
        expect(screen.getByText('Série 2 de 2')).toBeTruthy();
        expect(screen.getByRole('timer').textContent).toBe('0:45');
    });

    it('na última série, ao zerar oferece recomeçar', () => {
        render(<SeriesTimer durations={[5]} />);
        fireEvent.click(
            screen.getByRole('button', { name: /Iniciar série 1/ }),
        );
        act(() => {
            vi.advanceTimersByTime(6_000);
        });
        expect(screen.queryByText(/Próxima série/)).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /Recomeçar/ }));
        expect(screen.getByRole('timer').textContent).toBe('0:05');
    });

    it('sem duração prescrita não renderiza nada', () => {
        const { container } = render(<SeriesTimer durations={[]} />);
        expect(container.textContent).toBe('');
    });
});
