'use client';

import { FiPause, FiPlay, FiRotateCcw } from 'react-icons/fi';
import {
    formatCountdown,
    useRestCountdown,
    type CountdownSounds,
} from '@/hooks/useRestCountdown';
import TimerSoundToggle from '@/components/molecules/TimerSoundToggle';
import styles from './styles.module.css';

/** Descanso: no fim, "3, 2, 1, Ready, Go!" — a próxima série começa. Série
 * avulsa por tempo: "Go!" ao iniciar, "Time over" no fim. */
const SOUNDS: Record<'rest' | 'series', CountdownSounds> = {
    rest: { finish: { kind: 'transition', cue: 'go' } },
    series: {
        start: { kind: 'transition', cue: 'go' },
        finish: { kind: 'transition', cue: 'recover' },
    },
};

/**
 * Cronômetro de descanso compacto: tempo + iniciar/pausar + zerar + som,
 * numa linha só. Feito para caber dentro de uma linha de exercício (tela de
 * acompanhar), onde o personal cronometra o descanso sem abrir o card.
 *
 * A lógica mora em useRestCountdown, a mesma do descanso do card do
 * exercício (ExerciseDetailCard), sem herdar este visual.
 */
export default function RestTimer({
    seconds,
    exerciseName,
    kind = 'rest',
    className,
}: {
    /** Duração prescrita, em segundos. */
    seconds: number;
    /** 'rest' = descanso entre séries; 'series' = a própria série por tempo
     * (só muda os rótulos acessíveis). */
    kind?: 'rest' | 'series';
    /** Só para os rótulos acessíveis ("Iniciar descanso de Leg Press"). */
    exerciseName?: string;
    className?: string;
}) {
    const { remaining, running, finished, start, pause, reset } =
        useRestCountdown(seconds, SOUNDS[kind]);
    const noun = kind === 'series' ? 'série' : 'descanso';
    const of = exerciseName ? ` de ${exerciseName}` : '';
    const state = finished ? 'done' : running ? 'running' : 'idle';

    return (
        <div
            className={[styles.timer, className].filter(Boolean).join(' ')}
            data-state={state}
        >
            <span className={styles.time} role="timer" aria-live="off">
                {finished
                    ? kind === 'series'
                        ? 'Tempo!'
                        : 'Pronto'
                    : formatCountdown(remaining)}
            </span>
            {running ? (
                <button
                    type="button"
                    className={styles.btn}
                    onClick={pause}
                    aria-label={`Pausar ${noun}${of}`}
                    title="Pausar"
                >
                    <FiPause />
                </button>
            ) : (
                <button
                    type="button"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={start}
                    aria-label={`Iniciar ${noun}${of}`}
                    title={`Iniciar ${noun}`}
                >
                    <FiPlay />
                </button>
            )}
            <button
                type="button"
                className={styles.btn}
                onClick={reset}
                disabled={!running && !finished && remaining === seconds}
                aria-label={`Zerar ${noun}${of}`}
                title="Zerar"
            >
                <FiRotateCcw />
            </button>
            <TimerSoundToggle variant="compact" />
            {/* Anúncio só no fim — ler cada segundo seria ruído. */}
            <span className={styles.srOnly} aria-live="polite">
                {finished
                    ? `${kind === 'series' ? 'Série' : 'Descanso'}${of} concluído`
                    : ''}
            </span>
        </div>
    );
}
