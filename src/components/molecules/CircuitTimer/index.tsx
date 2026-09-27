'use client';

import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import {
    FiCheck,
    FiPause,
    FiPlay,
    FiRotateCcw,
    FiSkipBack,
    FiSkipForward,
    FiVolume2,
    FiVolumeX,
} from 'react-icons/fi';
import { formatCountdown } from '@/hooks/useRestCountdown';
import { useWakeLock } from '@/hooks/useWakeLock';
import {
    buildCircuitPlan,
    type CircuitExercise,
    type CircuitStep,
} from '@/libs/circuitPlan';
import {
    backCircuit,
    canGoBack,
    clockRemaining,
    pauseCircuit,
    PREP_SECONDS,
    reopenCircuit,
    restartCircuit,
    restartCurrentStep,
    resumeCircuit,
    skipCircuit,
    startCircuit,
    tickCircuit,
    type CircuitRunState,
    type CircuitTransition,
} from '@/libs/circuitRunner';
import {
    loadCircuitProgress,
    saveCircuitProgress,
} from '@/libs/circuitProgress';
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

/** Últimos segundos de uma contagem avisam com um bip por segundo. */
const TICK_FROM = 3;

/** O que a página pode pedir ao cronômetro de fora — o atalho "Iniciar
 * circuito" do card do exercício (ExerciseDetailCard) usa isto para começar
 * o circuito sem a pessoa ter que rolar a tela até o bloco. */
export type CircuitTimerHandle = {
    /** Começa do 1º passo (se não estiver em andamento) e rola o cronômetro
     * para a tela. Chamar dentro do clique: o som precisa do gesto. */
    start: () => void;
};

type CircuitTimerProps = {
    exercises: CircuitExercise[];
    /** Recuperação prescrita entre os exercícios do bloco; 0 = emendados. */
    recoverySeconds?: number;
    /** Guarda o andamento no aparelho sob esta chave (ver
     * libs/circuitProgress.ts). Sem ela o circuito não é retomado. */
    storageKey?: string;
    /** O circuito começou (ex.: carimbar o início da sessão de treino). */
    onStart?: () => void;
    /** Todas as rodadas feitas — também ao reabrir um circuito já concluído,
     * então quem ouve precisa ser idempotente. */
    onComplete?: () => void;
    /** Próxima ação oferecida no fim (ex.: "Registrar treino"). */
    doneAction?: ReactNode;
};

/**
 * Cronômetro de um bloco agrupado executado como circuito (roteiro em
 * libs/circuitPlan.ts; execução em libs/circuitRunner.ts). Este componente
 * só desenha, liga o relógio e toca os sons.
 *
 * Modo tabata: recuperação curta entre um exercício e outro da rodada,
 * PRESCRITA pelo personal no bloco (group_recovery_seconds). Só o som é
 * escolha de quem executa.
 *
 * Controles (relato de aluno, 09-26): o ↺ refaz só o passo atual, como nos
 * outros cronômetros do app; "Recomeçar circuito" fica à parte e pede
 * confirmação. Voltar desfaz um Pular acidental.
 *
 * Quem chama deve passar `key` com a assinatura da prescrição: mudou o
 * bloco, o circuito recomeça do zero.
 */
const CircuitTimer = forwardRef<CircuitTimerHandle, CircuitTimerProps>(
    function CircuitTimer(
        {
            exercises,
            recoverySeconds = 0,
            storageKey,
            onStart,
            onComplete,
            doneAction,
        },
        ref,
    ) {
        // Preferência de som do aparelho. Lida depois de montar (no servidor
        // não há localStorage, e ler antes daria diferença de hidratação).
        const [settings, setSettings] = useState<CircuitSettings>(
            DEFAULT_CIRCUIT_SETTINGS,
        );
        const soundRef = useRef(settings.sound);
        soundRef.current = settings.sound;

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
        // novo reiniciaria o relógio a cada tick.
        const signature = JSON.stringify(exercises);
        const planSignature = `${signature}|${recoverySeconds}`;
        const plan = useMemo(
            () =>
                buildCircuitPlan(JSON.parse(signature) as CircuitExercise[], {
                    recoverySeconds,
                }),
            [signature, recoverySeconds],
        );
        const { steps, rounds } = plan;

        const [run, setRun] = useState<CircuitRunState>({ phase: 'idle' });
        const [now, setNow] = useState(() => Date.now());
        /** Reaberto do aparelho: avisa que continua de onde parou. */
        const [reopened, setReopened] = useState(false);
        const [confirmingRestart, setConfirmingRestart] = useState(false);
        const runRef = useRef(run);
        runRef.current = run;
        const lastTickRef = useRef<string | null>(null);
        const onCompleteRef = useRef(onComplete);
        onCompleteRef.current = onComplete;

        /** Aplica uma transição da máquina: estado, som, vibração e aviso de
         * conclusão. `auto` = o relógio avançou sozinho (vibra para quem
         * está longe da tela). */
        const apply = useCallback(
            (t: CircuitTransition, auto = false) => {
                if (t.state === runRef.current) return;
                runRef.current = t.state;
                setRun(t.state);
                setNow(Date.now());
                lastTickRef.current = null;
                if (t.cue) play(t.cue);
                if (t.cue === 'done') {
                    vibrate([300, 150, 300, 150, 300]);
                    onCompleteRef.current?.();
                } else if (auto) {
                    vibrate([200, 100, 200]);
                }
            },
            [play],
        );

        // Montagem: preferência de som, sons pré-carregados e andamento
        // guardado. `hydrated` segura o salvamento até a leitura acontecer —
        // senão o 'idle' inicial apagaria o que estava guardado.
        const hydratedRef = useRef(false);
        useEffect(() => {
            setSettings(loadCircuitSettings());
            preloadCircuitSounds();
            if (storageKey) {
                const saved = loadCircuitProgress(storageKey, planSignature);
                if (saved) {
                    const state = reopenCircuit(saved, steps, Date.now());
                    runRef.current = state;
                    setRun(state);
                    if (state.phase === 'step') setReopened(true);
                    if (state.phase === 'done') onCompleteRef.current?.();
                }
            }
            hydratedRef.current = true;
            // Só na montagem: mudança de prescrição remonta pelo `key`.
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        useEffect(() => {
            if (!hydratedRef.current || !storageKey) return;
            saveCircuitProgress(storageKey, planSignature, run);
        }, [run, storageKey, planSignature]);

        // O personal mudou a recuperação (não remonta): o roteiro mudou de
        // tamanho, então o andamento antigo aponta para passos errados.
        const planRef = useRef(planSignature);
        useEffect(() => {
            if (planRef.current === planSignature) return;
            planRef.current = planSignature;
            apply(restartCircuit());
        }, [planSignature, apply]);

        const inProgress = run.phase === 'prep' || run.phase === 'step';
        useWakeLock(inProgress);

        // Relógio: redesenha e avança quando zera. Bip nos últimos segundos
        // de qualquer contagem mais longa que o próprio aviso.
        useEffect(() => {
            if (
                (run.phase !== 'prep' && run.phase !== 'step') ||
                run.clock.status !== 'running'
            ) {
                return;
            }
            const total =
                run.phase === 'prep'
                    ? PREP_SECONDS
                    : (steps[run.index]?.seconds ?? 0);
            const tick = () => {
                const t = Date.now();
                setNow(t);
                const current = runRef.current;
                if (
                    (current.phase !== 'prep' && current.phase !== 'step') ||
                    current.clock.status !== 'running'
                ) {
                    return;
                }
                const left = clockRemaining(current.clock, t);
                const mark = `${current.phase}:${current.index}:${left}`;
                if (
                    left > 0 &&
                    left <= TICK_FROM &&
                    total > TICK_FROM &&
                    lastTickRef.current !== mark
                ) {
                    lastTickRef.current = mark;
                    play('tick');
                }
                if (left === 0) {
                    apply(tickCircuit(current, steps, t), current.phase === 'step');
                }
            };
            tick();
            const id = window.setInterval(tick, 250);
            return () => window.clearInterval(id);
        }, [run, steps, play, apply]);

        const act = (make: (t: number) => CircuitTransition) => {
            setReopened(false);
            apply(make(Date.now()));
        };

        const start = () => {
            setConfirmingRestart(false);
            act((t) => startCircuit(steps, t));
            onStart?.();
        };

        const confirmRestart = () => {
            setConfirmingRestart(false);
            act(() => restartCircuit());
        };

        const wrapRef = useRef<HTMLDivElement>(null);
        useImperativeHandle(ref, () => ({
            start: () => {
                // Em andamento: só mostra — recomeçar apagaria a rodada atual.
                const phase = runRef.current.phase;
                if (phase === 'idle' || phase === 'done') start();
                // Espera o modal fechar e devolver a rolagem da página.
                window.setTimeout(() => {
                    wrapRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                    });
                }, 80);
            },
        }));

        if (steps.length === 0) return null;

        const index = inProgress ? run.index : -1;
        const step: CircuitStep | undefined =
            index >= 0 ? steps[index] : undefined;
        const remaining = inProgress ? clockRemaining(run.clock, now) : 0;
        const paused = inProgress && run.clock.status === 'paused';
        const running = inProgress && run.clock.status === 'running';

        const state =
            run.phase === 'done'
                ? 'done'
                : run.phase === 'prep'
                  ? 'prep'
                  : step?.kind === 'rest'
                    ? 'rest'
                    : step?.kind === 'recover'
                      ? 'recover'
                      : running
                        ? 'running'
                        : 'idle';

        // Exercícios da rodada atual (ou da próxima, durante o descanso), para
        // a fila com o que já foi, o atual e o que falta.
        const queueRound =
            step?.kind === 'rest' ? step.round + 1 : (step?.round ?? 1);
        const queue = steps.filter(
            (s): s is Extract<CircuitStep, { kind: 'work' }> =>
                s.kind === 'work' && s.round === queueRound,
        );
        // Posição do exercício em andamento — ou, na recuperação, do que
        // acabou de terminar (o próximo é o que vem depois dele).
        const positionNow = (() => {
            if (!step || step.kind === 'rest') return -1;
            if (step.kind === 'work') return step.position;
            const before = steps
                .slice(0, index)
                .filter((s) => s.kind === 'work' && s.round === step.round);
            return before.length - 1;
        })();

        const soundLabel = settings.sound ? 'Desligar sons' : 'Ligar sons';
        const redoLabel =
            step?.kind === 'rest'
                ? 'Refazer descanso'
                : step?.kind === 'recover'
                  ? 'Refazer recuperação'
                  : 'Refazer exercício';
        const canRedo =
            run.phase === 'prep' || (run.phase === 'step' && !!step?.seconds);

        const restartConfirm = confirmingRestart && (
            <div className={styles.confirm} role="alertdialog" aria-live="polite">
                <p className={styles.confirmText}>
                    {run.phase === 'done'
                        ? 'Fazer o circuito de novo, desde a rodada 1?'
                        : 'Apagar o progresso e voltar para a rodada 1?'}
                </p>
                <div className={styles.controls}>
                    <button
                        type="button"
                        className={styles.btn}
                        onClick={() => setConfirmingRestart(false)}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className={`${styles.btn} ${styles.btnDanger}`}
                        onClick={
                            run.phase === 'done' ? start : confirmRestart
                        }
                    >
                        <FiRotateCcw />{' '}
                        {run.phase === 'done' ? 'Fazer de novo' : 'Recomeçar'}
                    </button>
                </div>
            </div>
        );

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
                            {run.phase === 'done'
                                ? `${rounds} ${rounds === 1 ? 'rodada' : 'rodadas'} concluídas`
                                : `Rodada ${Math.min(queueRound, rounds)} de ${rounds}`}
                        </span>
                        <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() =>
                                updateSettings({ sound: !settings.sound })
                            }
                            aria-pressed={settings.sound}
                            aria-label={soundLabel}
                            title={soundLabel}
                        >
                            {settings.sound ? <FiVolume2 /> : <FiVolumeX />}
                        </button>
                    </span>
                </div>

                {reopened && (
                    <p className={styles.notice}>
                        Retomado de onde você parou — toque em Continuar
                        quando estiver pronto.
                    </p>
                )}

                {run.phase === 'idle' ? (
                    <p className={styles.hint}>
                        {rounds} {rounds === 1 ? 'rodada' : 'rodadas'} de{' '}
                        {queue.length} exercícios em sequência
                        {recoverySeconds > 0
                            ? `, com ${recoverySeconds} s de recuperação entre eles`
                            : ', sem descanso entre eles'}
                        . O descanso vem no fim de cada rodada. Você terá{' '}
                        {PREP_SECONDS} s para se posicionar.
                    </p>
                ) : run.phase === 'done' ? (
                    <p className={styles.current}>
                        <FiCheck /> Circuito concluído!
                    </p>
                ) : run.phase === 'prep' ? (
                    <div>
                        <p className={styles.current}>Prepare-se</p>
                        <p className={styles.sub}>
                            {step?.kind === 'work'
                                ? `${step.name} · rodada ${step.round} de ${rounds}`
                                : ''}
                        </p>
                    </div>
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

                {run.phase !== 'done' && (
                    <ol
                        className={styles.queue}
                        aria-label="Exercícios da rodada"
                    >
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
                                    {status === 'done' && (
                                        <FiCheck aria-hidden />
                                    )}
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

                {run.phase === 'idle' && (
                    <div className={styles.row}>
                        <div className={styles.controls}>
                            <button
                                type="button"
                                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnStart}`}
                                onClick={start}
                            >
                                <FiPlay /> Iniciar circuito
                            </button>
                        </div>
                    </div>
                )}

                {run.phase === 'done' && (
                    <>
                        {doneAction}
                        {restartConfirm || (
                            <button
                                type="button"
                                className={styles.linkBtn}
                                onClick={() => setConfirmingRestart(true)}
                            >
                                <FiRotateCcw /> Fazer o circuito de novo
                            </button>
                        )}
                    </>
                )}

                {inProgress && (
                    <>
                        <div className={styles.row}>
                            <span
                                className={styles.time}
                                role="timer"
                                aria-live="off"
                            >
                                {run.clock.status === 'manual'
                                    ? (step?.kind === 'work' && step.target) ||
                                      'Livre'
                                    : formatCountdown(remaining)}
                            </span>
                            <div className={styles.controls}>
                                {run.clock.status === 'manual' ? (
                                    <button
                                        type="button"
                                        className={`${styles.btn} ${styles.btnPrimary}`}
                                        onClick={() =>
                                            act((t) =>
                                                skipCircuit(run, steps, t),
                                            )
                                        }
                                    >
                                        <FiCheck /> Feito
                                    </button>
                                ) : paused ? (
                                    <button
                                        type="button"
                                        className={`${styles.btn} ${styles.btnPrimary}`}
                                        onClick={() =>
                                            act((t) =>
                                                resumeCircuit(run, steps, t),
                                            )
                                        }
                                    >
                                        <FiPlay /> Continuar
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className={styles.btn}
                                        onClick={() =>
                                            act((t) => pauseCircuit(run, t))
                                        }
                                    >
                                        <FiPause /> Pausar
                                    </button>
                                )}
                                {run.clock.status !== 'manual' && (
                                    <button
                                        type="button"
                                        className={styles.btn}
                                        onClick={() =>
                                            act((t) =>
                                                skipCircuit(run, steps, t),
                                            )
                                        }
                                        aria-label={
                                            run.phase === 'prep'
                                                ? 'Começar agora'
                                                : step?.kind === 'work'
                                                  ? 'Pular para o próximo'
                                                  : 'Pular a pausa'
                                        }
                                        title="Pular"
                                    >
                                        <FiSkipForward />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Ações com texto, e não só ícone: o ↺ solto foi
                            lido como "refazer o tempo" e apagou o circuito. */}
                        <div className={styles.secondaryRow}>
                            <button
                                type="button"
                                className={styles.linkBtn}
                                onClick={() =>
                                    act((t) => backCircuit(run, steps, t))
                                }
                                disabled={!canGoBack(run, steps)}
                            >
                                <FiSkipBack /> Anterior
                            </button>
                            <button
                                type="button"
                                className={styles.linkBtn}
                                onClick={() =>
                                    act((t) =>
                                        restartCurrentStep(run, steps, t),
                                    )
                                }
                                disabled={!canRedo}
                            >
                                <FiRotateCcw /> {redoLabel}
                            </button>
                        </div>

                        {restartConfirm || (
                            <button
                                type="button"
                                className={`${styles.linkBtn} ${styles.linkBtnMuted}`}
                                onClick={() => setConfirmingRestart(true)}
                            >
                                Recomeçar o circuito inteiro
                            </button>
                        )}
                    </>
                )}

                <span className={styles.srOnly} aria-live="polite">
                    {run.phase === 'done'
                        ? 'Circuito concluído'
                        : run.phase === 'prep'
                          ? `Prepare-se${step?.kind === 'work' ? `: ${step.name}` : ''}`
                          : step
                            ? step.kind === 'rest'
                                ? `Descanso antes da rodada ${step.round + 1}`
                                : step.kind === 'recover'
                                  ? `Recuperação. Próximo: ${step.next}`
                                  : `${step.name}, exercício ${step.position + 1} de ${step.roundSize}`
                            : ''}
                </span>
            </div>
        );
    },
);

export default CircuitTimer;
