import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import TimerSoundToggle from './index';
import { preloadTimerSounds } from '@/libs/timerSounds';

vi.mock('@/libs/timerSounds', () => ({
    playTimerSound: vi.fn(),
    preloadTimerSounds: vi.fn(),
}));

const stored = () =>
    JSON.parse(window.localStorage.getItem('venafit.circuit.settings') ?? '{}');

/**
 * Escolha do som dos cronômetros: voz, bipe ou nenhum — uma preferência só
 * no aparelho, refletida em todos os cronômetros abertos.
 */
describe('TimerSoundToggle', () => {
    beforeEach(() => {
        window.localStorage.clear();
        vi.mocked(preloadTimerSounds).mockClear();
    });
    afterEach(() => cleanup());

    it('completo: voz por padrão, troca para bipe e desliga', () => {
        render(<TimerSoundToggle />);
        const voice = screen.getByRole('button', { name: 'Voz' });
        const beep = screen.getByRole('button', { name: 'Bipe' });
        expect(voice.getAttribute('aria-pressed')).toBe('true');

        fireEvent.click(beep);
        expect(beep.getAttribute('aria-pressed')).toBe('true');
        expect(preloadTimerSounds).toHaveBeenCalledWith('beep');
        expect(stored()).toEqual({ sound: true, soundStyle: 'beep' });

        fireEvent.click(screen.getByRole('button', { name: 'Desligar sons' }));
        expect(stored()).toMatchObject({ sound: false });
        // Desligado, a escolha voz/bipe some — e volta com a de antes.
        expect(screen.queryByRole('group', { name: 'Tipo de som' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Ligar sons' }));
        expect(
            screen
                .getByRole('button', { name: 'Bipe' })
                .getAttribute('aria-pressed'),
        ).toBe('true');
    });

    it('compacto: um botão que alterna voz → bipe → sem som → voz', () => {
        render(<TimerSoundToggle variant="compact" />);
        const btn = () =>
            screen.getByRole('button', { name: /Som do cronômetro/ });
        expect(btn().getAttribute('aria-label')).toMatch(
            /^Som do cronômetro: voz/,
        );
        fireEvent.click(btn());
        expect(btn().getAttribute('aria-label')).toMatch(
            /^Som do cronômetro: bipe/,
        );
        expect(stored()).toEqual({ sound: true, soundStyle: 'beep' });
        fireEvent.click(btn());
        expect(btn().getAttribute('aria-label')).toMatch(
            /^Som do cronômetro: sem som/,
        );
        expect(stored()).toMatchObject({ sound: false });
        fireEvent.click(btn());
        expect(stored()).toEqual({ sound: true, soundStyle: 'voice' });
    });

    it('a escolha feita num cronômetro aparece em todos os da tela', () => {
        render(
            <>
                <TimerSoundToggle />
                <TimerSoundToggle variant="compact" />
                <TimerSoundToggle variant="compact" />
            </>,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Bipe' }));
        const compacts = screen.getAllByRole('button', {
            name: /Som do cronômetro/,
        });
        expect(compacts).toHaveLength(2);
        for (const c of compacts) {
            expect(c.getAttribute('aria-label')).toMatch(
                /^Som do cronômetro: bipe/,
            );
        }
        fireEvent.click(compacts[0]);
        expect(screen.queryByRole('group', { name: 'Tipo de som' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Ligar sons' })).toBeTruthy();
    });
});
