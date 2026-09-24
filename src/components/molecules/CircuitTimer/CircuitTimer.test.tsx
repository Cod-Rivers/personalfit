import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from '@testing-library/react';
import CircuitTimer from './index';
import { playCircuitSound } from '@/libs/circuitSounds';

// Howler não toca em jsdom: os sons são espiados no módulo.
vi.mock('@/libs/circuitSounds', () => ({
    playCircuitSound: vi.fn(),
    preloadCircuitSounds: vi.fn(),
}));

/**
 * Circuito de um bloco agrupado: exercícios da rodada em sequência sem
 * descanso, descanso só no fim da rodada, e a rodada seguinte.
 */
describe('CircuitTimer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.mocked(playCircuitSound).mockClear();
        window.localStorage.clear();
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

    describe('modo tabata e sons', () => {
        const pair = [
            { name: 'A', series: [20, 20], timed: true, rest: 30 },
            { name: 'B', series: [20, 20], timed: true, rest: 30 },
        ];
        const sounds = () =>
            vi.mocked(playCircuitSound).mock.calls.map((c) => c[0]);

        it('recuperação prescrita entra entre os exercícios da rodada', () => {
            render(<CircuitTimer exercises={pair} recoverySeconds={10} />);
            expect(screen.getByText('Tabata · 10 s')).toBeTruthy();
            fireEvent.click(
                screen.getByRole('button', { name: /Iniciar circuito/ }),
            );
            tick(20_000);
            expect(screen.getByText('Recuperação')).toBeTruthy();
            expect(screen.getByText('Próximo: B')).toBeTruthy();
            expect(screen.getByRole('timer').textContent).toBe('0:10');
            tick(10_000);
            expect(screen.getByText(/Exercício 2 de 2/)).toBeTruthy();
        });

        it('sem recuperação prescrita os exercícios emendam, e não há como mudar no aparelho', () => {
            render(<CircuitTimer exercises={pair} />);
            expect(screen.queryByText(/Tabata/)).toBeNull();
            expect(
                screen.queryByRole('button', { name: 'Configurar circuito' }),
            ).toBeNull();
            fireEvent.click(
                screen.getByRole('button', { name: /Iniciar circuito/ }),
            );
            tick(20_000);
            expect(screen.getByText(/Exercício 2 de 2/)).toBeTruthy();
        });

        it('toca um som por transição: vai, bips da contagem, recuperação, descanso, fim', () => {
            render(<CircuitTimer exercises={pair} recoverySeconds={10} />);
            fireEvent.click(
                screen.getByRole('button', { name: /Iniciar circuito/ }),
            );
            expect(sounds()).toEqual(['go']);
            tick(20_000); // A termina
            const afterA = sounds();
            expect(afterA.filter((n) => n === 'tick')).toHaveLength(3);
            expect(afterA[afterA.length - 1]).toBe('recover');
            tick(10_000); // recuperação (10 s) termina -> B
            expect(sounds().pop()).toBe('go');
            tick(20_000); // B termina -> descanso da rodada
            expect(sounds().pop()).toBe('rest');
        });

        it('com o som desligado não toca nada', () => {
            window.localStorage.setItem(
                'venafit.circuit.settings',
                JSON.stringify({ sound: false }),
            );
            render(<CircuitTimer exercises={pair} />);
            fireEvent.click(
                screen.getByRole('button', { name: /Iniciar circuito/ }),
            );
            tick(20_000);
            expect(playCircuitSound).not.toHaveBeenCalled();
        });
    });
});
