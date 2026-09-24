'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    FiCheck,
    FiPause,
    FiPlay,
    FiRotateCcw,
    FiSkipForward,
} from 'react-icons/fi';
import { formatCountdown } from '@/hooks/useRestCountdown';
import {
    buildCircuitPlan,
    type CircuitExercise,
    type CircuitStep,
} from '@/libs/circuitPlan';
import styles from './styles.module.css';

function vibrate(pattern: number[]) {
    try {
        navigator.vibrate?.(pattern);
    } catch {
        /* sem vibração (iOS, alguns WebViews) */
    }
}

/**
 * Cronômetro de um bloco agrupado executado como circuito (ver
 * libs/circuitPlan.ts): uma série de cada exercício em sequência, sem
 * descanso entre eles, descanso no fim da rodada, próxima rodada.
 *
 * Passo por tempo termina sozinho e já emenda o seguinte — no meio do
 * circuito ninguém quer largar o exercício para tocar na tela. Passo por
 * repetições espera o "Feito". Conta pelo instante de término (como
 * useRestCountdown), para não atrasar com a tela bloqueada.
 *
 * Quem chama deve passar `key` com a assinatura da prescrição: mudou o
 * bloco, o circuito recomeça do zero.
 */
export default function CircuitTimer({
    exercises,
}: {
    exercises: CircuitExercise[];
}) {
    // Pela assinatura: quem chama monta o array a cada render, e um plano
    // novo reiniciaria o intervalo do relógio a cada tick.
    const signature = JSON.stringify(exercises);
    const plan = useMemo(
        () => buildCircuitPlan(JSON.parse(signature) as CircuitExercise[]),
        [signature],
    );
    const { steps, rounds } = plan;

    const [index, setIndex] = useState(0);
    const [started, setStarted] = useState(false);
    const [running, setRunning] = useState(false);
    const [remaining, setRemaining] = useState(steps[0]?.seconds ?? 0);
    const endAtRef = useRef<number | null>(null);

    const step: CircuitStep | undefined = steps[index];
    const finished = started && index >= steps.length;

    /** Vai para o passo `i`. Passo cronometrado já começa a contar quando
     * `autostart`; passo manual fica esperando o "Feito". */
    const goTo = useCallback(
        (i: number, autostart: boolean) => {
            setIndex(i);
            const next = steps[i];
            const secs = next?.seconds ?? 0;
            setRemaining(secs);
            if (next && secs > 0 && autostart) {
                endAtRef.current = Date.now() + secs * 1000;
                setRunning(true);
            } else {
                endAtRef.current = null;
                setRunning(false);
            }
            if (!next) vibrate([300, 150, 300, 150, 300]);
        },
        [steps],
    );

    useEffect(() => {
        if (!running) return;
        const tick = () => {
            const endAt = endAtRef.current;
            if (endAt == null) return;
            const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
            setRemaining(left);
            if (left === 0) {
                endAtRef.current = null;
                vibrate([200, 100, 200]);
                goTo(index + 1, true);
            }
        };
        tick();
        const id = window.setInterval(tick, 250);
        return () => window.clearInterval(id);
    }, [running, index, goTo]);

    const start = () => {
        setStarted(true);
        goTo(0, true);
    };

    const resume = () => {
        if (!step?.seconds || remaining <= 0) return;
        endAtRef.current = Date.now() + remaining * 1000;
        setRunning(true);
    };

    const pause = () => {
        const endAt = endAtRef.current;
        if (endAt != null) {
            setRemaining(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
        }
        endAtRef.current = null;
        setRunning(false);
    };

    const restart = () => {
        setStarted(false);
        goTo(0, false);
    };

    if (steps.length === 0) return null;

    const state = finished
        ? 'done'
        : step?.kind === 'rest'
          ? 'rest'
          : running
            ? 'running'
            : 'idle';

    // Exercícios da rodada atual (ou da próxima, durante o descanso), para a
    // fila com o que já foi, o atual e o que falta.
    const queueRound =
        step?.kind === 'rest' ? step.round + 1 : (step?.round ?? 1);
    const queue = steps.filter(
        (s): s is Extract<CircuitStep, { kind: 'work' }> =>
            s.kind === 'work' && s.round === queueRound,
    );
    const currentPos = step?.kind === 'work' ? step.position : -1;

    return (
        <div className={styles.wrap} data-state={state}>
            <div className={styles.head}>
                <span className={styles.label}>Circuito</span>
                <span className={styles.meta}>
                    {finished
                        ? `${rounds} ${rounds === 1 ? 'rodada' : 'rodadas'} concluídas`
                        : `Rodada ${Math.min(queueRound, rounds)} de ${rounds}`}
                </span>
            </div>

            {!started ? (
                <p className={styles.hint}>
                    {rounds} {rounds === 1 ? 'rodada' : 'rodadas'} de{' '}
                    {queue.length} exercícios em sequência, sem descanso entre
                    eles. O descanso vem no fim de cada rodada.
                </p>
            ) : finished ? (
                <p className={styles.current}>
                    <FiCheck /> Circuito concluído!
                </p>
            ) : step?.kind === 'rest' ? (
                <div>
                    <p className={styles.current}>Descanso</p>
                    <p className={styles.sub}>
                        Próxima: rodada {step.round + 1} de {rounds}
                    </p>
                </div>
            ) : step ? (
                <div>
                    <p className={styles.current}>{step.name}</p>
                    <p className={styles.sub}>
                        Exercício {step.position + 1} de {step.roundSize} ·{' '}
                        {step.roundSize - step.position === 1
                            ? 'último da rodada'
                            : `faltam ${step.roundSize - step.position} na rodada`}
                    </p>
                </div>
            ) : null}

            {!finished && (
                <ol className={styles.queue} aria-label="Exercícios da rodada">
                    {queue.map((s) => {
                        const status =
                            !started || step?.kind === 'rest'
                                ? 'next'
                                : s.position < currentPos
                                  ? 'done'
                                  : s.position === currentPos
                                    ? 'current'
                                    : 'next';
                        return (
                            <li
                                key={s.position}
                                className={styles.queueItem}
                                data-status={status}
                            >
                                {status === 'done' && <FiCheck aria-hidden />}
                                <span>{s.name}</span>
                                <span className={styles.queueValue}>
                                    {s.seconds
                                        ? formatCountdown(s.seconds)
                                        : (s.target ?? '—')}
                                </span>
                            </li>
                        );
                    })}
                </ol>
            )}

            <div className={styles.row}>
                {started && !finished && step && (
                    <span className={styles.time} role="timer" aria-live="off">
                        {step.seconds
                            ? formatCountdown(remaining)
                            : (step.kind === 'work' && step.target) || 'Livre'}
                    </span>
                )}
                <div className={styles.controls}>
                    {!started ? (
                        <button
                            type="button"
                            className={`${styles.btn} ${styles.btnPrimary}`}
                            onClick={start}
                        >
                            <FiPlay /> Iniciar circuito
                        </button>
                    ) : finished ? (
                        <button
                            type="button"
                            className={styles.btn}
                            onClick={restart}
                        >
                            <FiRotateCcw /> Recomeçar
                        </button>
                    ) : (
                        <>
                            {!step?.seconds ? (
                                <button
                                    type="button"
                                    className={`${styles.btn} ${styles.btnPrimary}`}
                                    onClick={() => goTo(index + 1, true)}
                                >
                                    <FiCheck /> Feito
                                </button>
                            ) : running ? (
                                <button
                                    type="button"
                                    className={styles.btn}
                                    onClick={pause}
                                >
                                    <FiPause /> Pausar
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className={`${styles.btn} ${styles.btnPrimary}`}
                                    onClick={resume}
                                >
                                    <FiPlay /> Continuar
                                </button>
                            )}
                            {step?.seconds ? (
                                <button
                                    type="button"
                                    className={styles.btn}
                                    onClick={() => goTo(index + 1, true)}
                                    aria-label={
                                        step.kind === 'rest'
                                            ? 'Pular descanso'
                                            : 'Pular para o próximo'
                                    }
                                    title="Pular"
                                >
                                    <FiSkipForward />
                                </button>
                            ) : null}
                            <button
                                type="button"
                                className={styles.btn}
                                onClick={restart}
                                aria-label="Recomeçar circuito"
                                title="Recomeçar"
                            >
                                <FiRotateCcw />
                            </button>
                        </>
                    )}
                </div>
            </div>
            <span className={styles.srOnly} aria-live="polite">
                {finished
                    ? 'Circuito concluído'
                    : started && step
                      ? step.kind === 'rest'
                          ? `Descanso antes da rodada ${step.round + 1}`
                          : `${step.name}, exercício ${step.position + 1} de ${step.roundSize}`
                      : ''}
            </span>
        </div>
    );
}
