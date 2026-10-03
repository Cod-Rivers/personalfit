'use client';

import { useState } from 'react';
import { FiChevronRight, FiPause, FiPlay, FiRotateCcw } from 'react-icons/fi';
import { formatCountdown, useRestCountdown } from '@/hooks/useRestCountdown';
import TimerSoundToggle from '@/components/molecules/TimerSoundToggle';
import styles from './styles.module.css';

/**
 * Contador regressivo das séries de um exercício POR TEMPO (prancha, isometria,
 * cardio em minutos…). Mostra "Série 2 de 3", o tempo restante, e ao zerar
 * oferece a próxima série — que pode ter outra duração (série 1 = 30 s, série
 * 2 = 45 s). Serve o aluno e o personal: nenhum dos dois precisa de um
 * cronômetro à parte.
 *
 * O relógio é o useRestCountdown (conta pelo instante de término, vibra ao
 * fim); o descanso ENTRE séries segue no cronômetro de descanso do card.
 *
 * Voz, no mesmo sentido do circuito (série = rodada): "Go!" ao iniciar; no
 * fim, "3, 2, 1, Level up, Round 2" (ou "Final round") anuncia a próxima
 * série, e a última fecha com "Time over, Congratulations, You win!".
 */
export default function SeriesTimer({
    durations,
    exerciseName,
}: {
    /** Segundos de cada série, na ordem prescrita. */
    durations: number[];
    exerciseName?: string;
}) {
    const [index, setIndex] = useState(0);
    const safeIndex = Math.min(index, durations.length - 1);
    const seconds = durations[safeIndex] ?? 0;
    const hasNext = safeIndex < durations.length - 1;
    const nextRound = safeIndex + 2;
    const { remaining, running, finished, start, pause, reset } =
        useRestCountdown(seconds, {
            start: { kind: 'transition', cue: 'go' },
            finish: hasNext
                ? {
                      kind: 'transition',
                      cue: 'rest',
                      roundCall: {
                          round: nextRound,
                          final: nextRound === durations.length,
                      },
                  }
                : { kind: 'transition', cue: 'done' },
        });
    const of = exerciseName ? ` de ${exerciseName}` : '';
    const state = finished ? 'done' : running ? 'running' : 'idle';

    // reset(): o hook só zera sozinho quando a DURAÇÃO muda. Séries iguais
    // (3 × 30 s) deixavam o "Tempo!" da anterior na tela, e o botão já
    // oferecia a série seguinte — a 2ª era pulada.
    const goNext = () => {
        setIndex(safeIndex + 1);
        reset();
    };
    const restart = () => {
        setIndex(0);
        reset();
    };

    if (durations.length === 0 || seconds <= 0) return null;

    return (
        <div className={styles.wrap} data-state={state}>
            <div className={styles.head}>
                <span className={styles.label}>
                    Série {safeIndex + 1} de {durations.length}
                </span>
                <span className={styles.headRight}>
                    <span className={styles.total}>
                        prescrito: {formatCountdown(seconds)}
                    </span>
                    <TimerSoundToggle />
                </span>
            </div>
            <div className={styles.row}>
                <span className={styles.time} role="timer" aria-live="off">
                    {finished ? 'Tempo!' : formatCountdown(remaining)}
                </span>
                <div className={styles.controls}>
                    {running ? (
                        <button
                            type="button"
                            className={styles.btn}
                            onClick={pause}
                            aria-label={`Pausar série${of}`}
                        >
                            <FiPause /> Pausar
                        </button>
                    ) : finished ? (
                        hasNext ? (
                            <button
                                type="button"
                                className={`${styles.btn} ${styles.btnPrimary}`}
                                onClick={goNext}
                                aria-label={`Ir para a série ${safeIndex + 2}${of}`}
                            >
                                Próxima série <FiChevronRight />
                            </button>
                        ) : (
                            <button
                                type="button"
                                className={styles.btn}
                                onClick={restart}
                            >
                                <FiRotateCcw /> Recomeçar
                            </button>
                        )
                    ) : (
                        <button
                            type="button"
                            className={`${styles.btn} ${styles.btnPrimary}`}
                            onClick={start}
                            aria-label={`Iniciar série ${safeIndex + 1}${of}`}
                        >
                            <FiPlay /> Iniciar
                        </button>
                    )}
                    {!finished && (
                        <button
                            type="button"
                            className={styles.btn}
                            onClick={reset}
                            disabled={!running && remaining === seconds}
                            aria-label={`Zerar série${of}`}
                            title="Zerar"
                        >
                            <FiRotateCcw />
                        </button>
                    )}
                </div>
            </div>
            <span className={styles.srOnly} aria-live="polite">
                {finished
                    ? `Série ${safeIndex + 1}${of} concluída${hasNext ? '' : '. Todas as séries feitas'}`
                    : ''}
            </span>
        </div>
    );
}
