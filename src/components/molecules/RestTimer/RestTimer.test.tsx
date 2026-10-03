import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from '@testing-library/react';
import RestTimer from './index';
import { playTimerSound, type TimerSoundEvent } from '@/libs/timerSounds';

vi.mock('@/libs/timerSounds', () => ({
    playTimerSound: vi.fn(),
    preloadTimerSounds: vi.fn(),
}));

const label = (e: TimerSoundEvent) =>
    e.kind === 'count' ? `${e.n}${e.ready ? '+ready' : ''}` : `${e.cue}`;
const heard = () =>
    vi.mocked(playTimerSound).mock.calls.map((c) => label(c[0]));

/** Cronômetro compacto da linha do exercício (/acompanhar, registro). */
describe('RestTimer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.mocked(playTimerSound).mockClear();
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

    it('descanso: conta, avisa "Ready, Go" no fim e mostra "Pronto"', () => {
        render(<RestTimer seconds={60} exerciseName="Supino" />);
        fireEvent.click(
            screen.getByRole('button', { name: 'Iniciar descanso de Supino' }),
        );
        tick(60_000);
        expect(screen.getByRole('timer').textContent).toBe('Pronto');
        expect(heard()).toEqual(['3', '2', '1+ready', 'go']);
    });

    it('série avulsa por tempo: "Go!" ao iniciar e "Time over" no fim', () => {
        render(<RestTimer seconds={30} kind="series" exerciseName="Prancha" />);
        fireEvent.click(
            screen.getByRole('button', { name: 'Iniciar série de Prancha' }),
        );
        expect(heard()).toEqual(['go']);
        tick(30_000);
        expect(screen.getByRole('timer').textContent).toBe('Tempo!');
        expect(heard()).toEqual(['go', '3', '2', '1', 'recover']);
    });

    it('o botão de som da linha desliga o som deste e dos outros cronômetros', () => {
        render(
            <>
                <RestTimer seconds={10} exerciseName="Supino" />
                <RestTimer seconds={10} exerciseName="Remada" />
            </>,
        );
        const [first] = screen.getAllByRole('button', {
            name: /Som do cronômetro: voz/,
        });
        fireEvent.click(first); // voz -> bipe
        fireEvent.click(
            screen.getAllByRole('button', {
                name: /Som do cronômetro: bipe/,
            })[1],
        ); // bipe -> sem som, pela outra linha
        expect(
            screen.getAllByRole('button', {
                name: /Som do cronômetro: sem som/,
            }),
        ).toHaveLength(2);
        fireEvent.click(
            screen.getByRole('button', { name: 'Iniciar descanso de Remada' }),
        );
        tick(10_000);
        expect(playTimerSound).not.toHaveBeenCalled();
    });
});
