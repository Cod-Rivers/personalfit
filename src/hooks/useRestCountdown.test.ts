import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useRestCountdown, type CountdownSounds } from './useRestCountdown';
import { playTimerSound, type TimerSoundEvent } from '@/libs/timerSounds';

// Howler não toca em jsdom: os sons são espiados no módulo.
vi.mock('@/libs/timerSounds', () => ({
    playTimerSound: vi.fn(),
    preloadTimerSounds: vi.fn(),
}));

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
const styles = () => vi.mocked(playTimerSound).mock.calls.map((c) => c[1]);

const REST: CountdownSounds = { finish: { kind: 'transition', cue: 'go' } };

/**
 * Sons do descanso entre séries (card do exercício, RestTimer) e da série
 * por tempo: contagem nos três últimos segundos e a frase do fim, conforme
 * a preferência do aparelho.
 */
describe('useRestCountdown — sons', () => {
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

    it('fim do descanso: "3, 2, 1, Ready" e "Go!", na voz por padrão', () => {
        const { result } = renderHook(() => useRestCountdown(10, REST));
        act(() => result.current.start());
        expect(heard()).toEqual([]);
        tick(10_000);
        expect(heard()).toEqual(['3', '2', '1+ready', 'go']);
        expect(new Set(styles())).toEqual(new Set(['voice']));
        expect(result.current.finished).toBe(true);
    });

    it('série com fim que não começa outra: contagem sem "Ready"', () => {
        const { result } = renderHook(() =>
            useRestCountdown(10, {
                start: { kind: 'transition', cue: 'go' },
                finish: { kind: 'transition', cue: 'recover' },
            }),
        );
        act(() => result.current.start());
        expect(heard()).toEqual(['go']);
        tick(10_000);
        expect(heard()).toEqual(['go', '3', '2', '1', 'recover']);
    });

    it('descanso de 3 s ou menos não conta, só avisa o fim', () => {
        const { result } = renderHook(() => useRestCountdown(3, REST));
        act(() => result.current.start());
        tick(3_000);
        expect(heard()).toEqual(['go']);
    });

    it('pausado não conta; retomado, segue de onde parou', () => {
        const { result } = renderHook(() => useRestCountdown(10, REST));
        act(() => result.current.start());
        tick(5_000);
        act(() => result.current.pause());
        tick(20_000);
        expect(heard()).toEqual([]);
        act(() => result.current.start());
        tick(5_000);
        expect(heard()).toEqual(['3', '2', '1+ready', 'go']);
    });

    it('segue a preferência do aparelho: bipe, ou nada com o som desligado', () => {
        window.localStorage.setItem(
            'venafit.circuit.settings',
            JSON.stringify({ sound: true, soundStyle: 'beep' }),
        );
        const { result, unmount } = renderHook(() => useRestCountdown(5, REST));
        act(() => result.current.start());
        tick(5_000);
        expect(new Set(styles())).toEqual(new Set(['beep']));
        unmount();

        vi.mocked(playTimerSound).mockClear();
        window.localStorage.setItem(
            'venafit.circuit.settings',
            JSON.stringify({ sound: false, soundStyle: 'voice' }),
        );
        const off = renderHook(() => useRestCountdown(5, REST));
        act(() => off.result.current.start());
        tick(5_000);
        expect(playTimerSound).not.toHaveBeenCalled();
        expect(off.result.current.finished).toBe(true);
    });

    it('sem sons configurados o cronômetro é mudo', () => {
        const { result } = renderHook(() => useRestCountdown(5));
        act(() => result.current.start());
        tick(5_000);
        expect(playTimerSound).not.toHaveBeenCalled();
    });
});
