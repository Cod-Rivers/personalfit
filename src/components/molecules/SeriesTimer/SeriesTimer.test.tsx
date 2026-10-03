import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from '@testing-library/react';
import SeriesTimer from './index';
import { playTimerSound, type TimerSoundEvent } from '@/libs/timerSounds';

// Howler não toca em jsdom: os sons são espiados no módulo.
vi.mock('@/libs/timerSounds', () => ({
    playTimerSound: vi.fn(),
    preloadTimerSounds: vi.fn(),
}));

/**
 * Contador regressivo das séries por tempo. Cobre o que o aluno/personal
 * vê: a duração de CADA série (podem ser diferentes), a passagem para a
 * próxima só depois de zerar, e o fim de todas as séries.
 */
describe('SeriesTimer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.mocked(playTimerSound).mockClear();
        window.localStorage.clear();
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

    it('séries de mesma duração: a próxima começa zerada, sem pular nenhuma', () => {
        render(<SeriesTimer durations={[30, 30, 30]} exerciseName="Prancha" />);
        fireEvent.click(
            screen.getByRole('button', { name: /Iniciar série 1/ }),
        );
        act(() => {
            vi.advanceTimersByTime(30_000);
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Ir para a série 2/ }),
        );
        expect(screen.getByText('Série 2 de 3')).toBeTruthy();
        expect(screen.getByRole('timer').textContent).toBe('0:30');
        expect(
            screen.getByRole('button', { name: /Iniciar série 2/ }),
        ).toBeTruthy();
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

    describe('sons (série = rodada, como no circuito)', () => {
        const label = (e: TimerSoundEvent) => {
            if (e.kind === 'count') return e.ready ? `${e.n}+ready` : `${e.n}`;
            const round = e.roundCall
                ? e.roundCall.final
                    ? 'final'
                    : `round${e.roundCall.round}`
                : null;
            return [e.cue, round].filter(Boolean).join('+');
        };
        const heard = () =>
            vi.mocked(playTimerSound).mock.calls.map((c) => label(c[0]));
        const run = (n: number, seconds: number) => {
            fireEvent.click(
                screen.getByRole('button', {
                    name: new RegExp(`Iniciar série ${n}`),
                }),
            );
            act(() => {
                vi.advanceTimersByTime(seconds * 1000);
            });
        };

        it('"Go!" ao iniciar; o fim anuncia a próxima série e a última fecha', () => {
            render(
                <SeriesTimer durations={[10, 10, 10]} exerciseName="Prancha" />,
            );
            run(1, 10);
            expect(heard()).toEqual(['go', '3', '2', '1', 'rest+round2']);

            vi.mocked(playTimerSound).mockClear();
            fireEvent.click(
                screen.getByRole('button', { name: /Ir para a série 2/ }),
            );
            run(2, 10);
            expect(heard()).toEqual(['go', '3', '2', '1', 'rest+final']);

            vi.mocked(playTimerSound).mockClear();
            fireEvent.click(
                screen.getByRole('button', { name: /Ir para a série 3/ }),
            );
            run(3, 10);
            expect(heard()).toEqual(['go', '3', '2', '1', 'done']);
        });

        it('série única termina com o fim de tudo', () => {
            render(<SeriesTimer durations={[20]} />);
            run(1, 20);
            expect(heard().pop()).toBe('done');
        });

        it('tem a escolha voz/bipe/sem som no cabeçalho', () => {
            render(<SeriesTimer durations={[20]} />);
            expect(
                screen.getByRole('group', { name: 'Tipo de som' }),
            ).toBeTruthy();
            fireEvent.click(
                screen.getByRole('button', { name: 'Desligar sons' }),
            );
            run(1, 20);
            expect(playTimerSound).not.toHaveBeenCalled();
        });
    });

    it('sem duração prescrita não renderiza nada', () => {
        const { container } = render(<SeriesTimer durations={[]} />);
        expect(container.textContent).toBe('');
    });
});
