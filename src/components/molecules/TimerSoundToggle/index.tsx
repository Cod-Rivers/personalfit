'use client';

import { FiBell, FiMic, FiVolume2, FiVolumeX } from 'react-icons/fi';
import {
    setTimerSoundSettings,
    useTimerSoundSettings,
} from '@/libs/timerSoundSettings';
import { preloadTimerSounds, type TimerSoundStyle } from '@/libs/timerSounds';
import styles from './styles.module.css';

const STYLES: { value: TimerSoundStyle; label: string; title: string }[] = [
    {
        value: 'voice',
        label: 'Voz',
        title: 'Locutora: "3, 2, 1, Ready, Go!"',
    },
    { value: 'beep', label: 'Bipe', title: 'Bipes curtos' },
];

type Mode = 'voice' | 'beep' | 'off';

const MODE_NAME: Record<Mode, string> = {
    voice: 'voz',
    beep: 'bipe',
    off: 'sem som',
};
const NEXT_MODE: Record<Mode, Mode> = {
    voice: 'beep',
    beep: 'off',
    off: 'voice',
};

/**
 * Escolha do som dos cronômetros (voz, bipe ou nenhum). A preferência é uma
 * só no aparelho (libs/timerSoundSettings.ts): mudar aqui muda em todos os
 * cronômetros abertos.
 *
 * - full: botão de som + "Voz | Bipe" lado a lado (cabeçalho do circuito,
 *   série por tempo, descanso do card).
 * - compact: um botão só, do tamanho dos botões do RestTimer, que alterna
 *   voz → bipe → sem som — a linha do exercício não comporta mais que isso.
 */
export default function TimerSoundToggle({
    variant = 'full',
    className,
}: {
    variant?: 'full' | 'compact';
    className?: string;
}) {
    const { sound, soundStyle } = useTimerSoundSettings();

    const choose = (mode: Mode) => {
        if (mode === 'off') {
            setTimerSoundSettings({ sound: false });
            return;
        }
        preloadTimerSounds(mode);
        setTimerSoundSettings({ sound: true, soundStyle: mode });
    };

    if (variant === 'compact') {
        const mode: Mode = sound ? soundStyle : 'off';
        const next = NEXT_MODE[mode];
        const label = `Som do cronômetro: ${MODE_NAME[mode]}. Tocar para ${MODE_NAME[next]}`;
        return (
            <button
                type="button"
                className={[styles.compact, className]
                    .filter(Boolean)
                    .join(' ')}
                data-mode={mode}
                onClick={() => choose(next)}
                aria-label={label}
                title={label}
            >
                {mode === 'voice' ? (
                    <FiMic />
                ) : mode === 'beep' ? (
                    <FiBell />
                ) : (
                    <FiVolumeX />
                )}
            </button>
        );
    }

    const soundLabel = sound ? 'Desligar sons' : 'Ligar sons';
    return (
        <span className={[styles.full, className].filter(Boolean).join(' ')}>
            {sound && (
                <span
                    className={styles.styleToggle}
                    role="group"
                    aria-label="Tipo de som"
                >
                    {STYLES.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className={styles.styleOption}
                            onClick={() => choose(option.value)}
                            aria-pressed={soundStyle === option.value}
                            title={option.title}
                        >
                            {option.label}
                        </button>
                    ))}
                </span>
            )}
            <button
                type="button"
                className={styles.iconBtn}
                onClick={() => (sound ? choose('off') : choose(soundStyle))}
                aria-pressed={sound}
                aria-label={soundLabel}
                title={soundLabel}
            >
                {sound ? <FiVolume2 /> : <FiVolumeX />}
            </button>
        </span>
    );
}
