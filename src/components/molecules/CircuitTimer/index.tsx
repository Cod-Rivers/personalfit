'use client';

import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    FiCheck,
    FiPause,
    FiPlay,
    FiRotateCcw,
    FiSkipForward,
    FiVolume2,
    FiVolumeX,
} from 'react-icons/fi';
import { formatCountdown } from '@/hooks/useRestCountdown';
import {
    buildCircuitPlan,
    type CircuitExercise,
    type CircuitStep,
} from '@/libs/circuitPlan';
import {
    DEFAULT_CIRCUIT_SETTINGS,
    loadCircuitSettings,
    saveCircuitSettings,
    type CircuitSettings,
} from '@/libs/circuitSettings';
import {
    playCircuitSound,
    preloadCircuitSounds,
    type CircuitSound,
} from '@/libs/circuitSounds';
import styles from './styles.module.css';

function vibrate(pattern: number[]) {
    try {
        navigator.vibrate?.(pattern);
    } catch {
        /* sem vibração (iOS, alguns WebViews) */
    }
}

/** Som que marca a ENTRADA em cada tipo de passo. */
const SOUND_OF_STEP: Record<CircuitStep['kind'], CircuitSound> = {
    work: 'go',
    recover: 'recover',
    rest: 'rest',
};

/** Últimos segundos de um passo avisam com um bip por segundo. */
const TICK_FROM = 3;

/** O que a página pode pedir ao cronômetro de fora — o atalho "Iniciar
 * circuito" do card do exercício (ExerciseDetailCard) usa isto para começar
 * o circuito sem a pessoa ter que rolar a tela até o bloco. */
export type CircuitTimerHandle = {
    /** Começa do 1º passo (se ainda não começou) e rola o cronômetro para a
     * tela. Chamar dentro do clique: o som de entrada precisa do gesto. */
    start: () => void;
};

/**
 * Cronômetro de um bloco agrupado executado como circuito (ver
 * libs/circuitPlan.ts): uma série de cada exercício em sequência, sem
 * descanso entre eles, descanso no fim da rodada, próxima rodada.
 *
 * Modo tabata: recuperação curta entre um exercício e outro da rodada,
 * PRESCRITA pelo personal no bloco (group_recovery_seconds) — o aluno segue o
 * que foi gravado, em qualquer aparelho. Só o som é escolha de quem executa.
 *
 * Passo por tempo termina sozinho e já emenda o seguinte — no meio do
 * circuito ninguém quer largar o exercício para tocar na tela. Passo por
 * repetições espera o "Feito". Conta pelo instante de término (como
 * useRestCountdown), para não atrasar com a tela bloqueada.
 *
 * Quem chama deve passar `key` com a assinatura da prescrição: mudou o
 * bloco, o circuito recomeça do zero.
 */
const CircuitTimer = forwardRef<
    CircuitTimerHandle,
    {
        exercises: CircuitExercise[];
        /** Recuperação prescrita entre os exercícios do bloco; 0 = emendados. */
        recoverySeconds?: number;
    }
>(function CircuitTimer({ exercises, recoverySeconds = 0 }, ref) {
    // Preferência de som do aparelho. Lida depois de montar (no servidor não
    // há localStorage, e ler antes daria diferença de hidratação).
    const [settings, setSettings] = useState<CircuitSettings>(
        DEFAULT_CIRCUIT_SETTINGS,
    );
    const soundRef = useRef(settings.sound);
    soundRef.current = settings.sound;

    useEffect(() => {
        setSettings(loadCircuitSettings());
        preloadCircuitSounds();
    }, []);

    const updateSettings = (patch: Partial<CircuitSettings>) => {
        setSettings((prev) => {
            const next = { ...prev, ...patch };
            saveCircuitSettings(next);
            return next;
        });
    };

    const play = useCallback((name: CircuitSound) => {
        if (soundRef.current) playCircuitSound(name);
    }, []);

    // Pela assinatura: quem chama monta o array a cada render, e um plano
    // novo reiniciaria o intervalo do relógio a cada tick.
    const signature = JSON.stringify(exercises);
    const plan = useMemo(
        () =>
            buildCircuitPlan(JSON.parse(signature) as CircuitExercise[], {
                recoverySeconds,
            }),
        [signature, recoverySeconds],
    );
    const { steps, rounds } = plan;

    const [index, setIndex] = useState(0);
    const [started, setStarted] = useState(false);
    const [running, setRunning] = useState(false);
    const [remaining, setRemaining] = useState(steps[0]?.seconds ?? 0);
    const endAtRef = useRef<number | null>(null);
    const lastTickRef = useRef<number | null>(null);

    const step: CircuitStep | undefined = steps[index];
    const finished = started && index >= steps.length;

    /** Vai para o passo `i`. Passo cronometrado já começa a contar quando
     * `autostart`; passo manual fica esperando o "Feito". O som da entrada
     * só toca quando a pessoa está de fato seguindo (autostart). */
    const goTo = useCallback(
        (i: number, autostart: boolean) => {
            setIndex(i);
            lastTickRef.current = null;
            const next = steps[i];
            const secs = next && next.seconds != null ? next.seconds : 0;
            setRemaining(secs);
            if (next && secs > 0 && autostart) {
                endAtRef.current = Date.now() + secs * 1000;
                setRunning(true);
            } else {
                endAtRef.current = null;
                setRunning(false);
            }
            if (autostart) play(next ? SOUND_OF_STEP[next.kind] : 'done');
            if (!next) vibrate([300, 150, 300, 150, 300]);
        },
        [steps, play],
    );

    // O personal mudou a recuperação antes de começar: volta ao 1º passo.
    useEffect(() => {
        if (started) return;
        setIndex(0);
        setRemaining(steps[0]?.seconds ?? 0);
    }, [steps, started]);

    useEffect(() => {
        if (!running) return;
        const tick = () => {
            const endAt = endAtRef.current;
            if (endAt == null) return;
            const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
            setRemaining(left);
            const current = steps[index];
            if (
                left > 0 &&
                left <= TICK_FROM &&
                lastTickRef.current !== left &&
                (current?.seconds ?? 0) > TICK_FROM
            ) {
                lastTickRef.current = left;
                play('tick');
            }
            if (left === 0) {
                endAtRef.current = null;
                vibrate([200, 100, 200]);
                goTo(index + 1, true);
            }
        };
        tick();
        const id = window.setInterval(tick, 250);
        return () => window.clearInterval(id);
    }, [running, index, goTo, steps, play]);

    const start = () => {
        setStarted(true);
        goTo(0, true);
    };

    const wrapRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => ({
        start: () => {
            // Em andamento: só mostra — recomeçar apagaria a rodada atual.
            if (!started || finished) start();
            // Espera o modal fechar e devolver a rolagem da página.
            window.setTimeout(() => {
                wrapRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            }, 80);
        },
    }));

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
          : step?.kind === 'recover'
            ? 'recover'
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
    // Posição do exercício em andamento — ou, na recuperação, do que acabou
    // de terminar (o próximo é o que vem depois dele).
    const positionNow = (() => {
        if (!started || !step || step.kind === 'rest') return -1;
        if (step.kind === 'work') return step.position;
        const before = steps
            .slice(0, index)
            .filter((s) => s.kind === 'work' && s.round === step.round);
        return before.length - 1;
    })();

    const soundLabel = settings.sound ? 'Desligar sons' : 'Ligar sons';

    return (
        <div ref={wrapRef} className={styles.wrap} data-state={state}>
            <div className={styles.head}>
                <span className={styles.label}>
                    Circuito
                    {recoverySeconds > 0 && (
                        <span className={styles.badge}>
                            Tabata · {recoverySeconds} s
                        </span>
                    )}
                </span>
                <span className={styles.headRight}>
                    <span className={styles.meta}>
                        {finished
                            ? `${rounds} ${rounds === 1 ? 'rodada' : 'rodadas'} concluídas`
                            : `Rodada ${Math.min(queueRound, rounds)} de ${rounds}`}
                    </span>
                    <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => updateSettings({ sound: !settings.sound })}
                        aria-pressed={settings.sound}
                        aria-label={soundLabel}
                        title={soundLabel}
                    >
                        {settings.sound ? <FiVolume2 /> : <FiVolumeX />}
                    </button>
                </span>
            </div>

            {!started ? (
                <p className={styles.hint}>
                    {rounds} {rounds === 1 ? 'rodada' : 'rodadas'} de{' '}
                    {queue.length} exercícios em sequência
                    {recoverySeconds > 0
                        ? `, com ${recoverySeconds} s de recuperação entre eles`
                        : ', sem descanso entre eles'}
                    . O descanso vem no fim de cada rodada.
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
            ) : step?.kind === 'recover' ? (
                <div>
                    <p className={styles.current}>Recuperação</p>
                    <p className={styles.sub}>Próximo: {step.next}</p>
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
                            positionNow < 0
                                ? 'next'
                                : s.position < positionNow ||
                                    (step?.kind === 'recover' &&
                                        s.position === positionNow)
                                  ? 'done'
                                  : s.position === positionNow
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
                            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnStart}`}
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
                                        step.kind === 'work'
                                            ? 'Pular para o próximo'
                                            : 'Pular a pausa'
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
                          : step.kind === 'recover'
                            ? `Recuperação. Próximo: ${step.next}`
                            : `${step.name}, exercício ${step.position + 1} de ${step.roundSize}`
                      : ''}
            </span>
        </div>
    );
});

export default CircuitTimer;
