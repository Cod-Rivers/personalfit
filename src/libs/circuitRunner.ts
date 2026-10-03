/**
 * Máquina de estados da execução de um circuito (roteiro em circuitPlan.ts).
 * Pura: sem React, sem relógio próprio — quem chama passa `now` (ms) e toca
 * o som devolvido em `cue`. O CircuitTimer só desenha e liga os eventos.
 *
 * Fases:
 * - idle: ainda não começou.
 * - prep: contagem "Prepare-se" antes de um exercício — no início, ao voltar,
 *   ao reiniciar o exercício e ao retomar de uma pausa. Sem ela o tempo do
 *   1º exercício começava no mesmo toque do "Iniciar", com o celular ainda
 *   na mão (relato de aluno, 09-26).
 * - step: um passo do roteiro (exercício, recuperação ou descanso).
 * - done: todas as rodadas feitas.
 *
 * O relógio conta pelo instante de término (endAt), como useRestCountdown:
 * com a tela bloqueada os intervalos atrasam, o instante não.
 */
import type { CircuitStep } from './circuitPlan';

/** Preparação antes de começar, voltar ou refazer um exercício. */
export const PREP_SECONDS = 5;
/** Preparação curta ao retomar um exercício pausado no meio. */
export const RESUME_PREP_SECONDS = 3;

export type CircuitClock =
    | { status: 'running'; endAt: number }
    | { status: 'paused'; remaining: number }
    /** Passo por repetições: sem relógio, espera o "Feito". */
    | { status: 'manual' };

export type CircuitRunState =
    | { phase: 'idle' }
    | {
          phase: 'prep';
          index: number;
          clock: CircuitClock;
          /** Retomada de pausa: o exercício continua destes segundos em vez
           * de recomeçar do tempo cheio. */
          resumeFrom: number | null;
      }
    | { phase: 'step'; index: number; clock: CircuitClock }
    | { phase: 'done' };

export type CircuitCue = 'go' | 'recover' | 'rest' | 'done';

/** Rodada anunciada ("Round 2", ou "Final round" na última de 2+). */
export interface RoundCall {
    round: number;
    final: boolean;
}

export interface CircuitTransition {
    state: CircuitRunState;
    /** Som da ENTRADA no novo estado, quando houver. */
    cue?: CircuitCue;
    /** A rodada é anunciada quando começa a pausa que a antecede — a
     * preparação do 1º exercício dela ou o descanso entre rodadas. Sem
     * descanso entre as rodadas, vem junto do "go". */
    roundCall?: RoundCall;
}

const CUE_OF_STEP: Record<CircuitStep['kind'], CircuitCue> = {
    work: 'go',
    recover: 'recover',
    rest: 'rest',
};

const runFor = (seconds: number, now: number): CircuitClock => ({
    status: 'running',
    endAt: now + seconds * 1000,
});

/** Segundos que faltam no relógio (0 no passo manual). */
export function clockRemaining(clock: CircuitClock, now: number): number {
    if (clock.status === 'running') {
        return Math.max(0, Math.ceil((clock.endAt - now) / 1000));
    }
    return clock.status === 'paused' ? clock.remaining : 0;
}

function callRound(steps: CircuitStep[], round: number): RoundCall {
    const lastRound = steps[steps.length - 1]?.round ?? 1;
    return { round, final: round === lastRound && lastRound > 1 };
}

/** Entra no passo `index` já contando; passou do fim = circuito concluído.
 * `advancing`: veio do passo anterior (relógio zerado, "Feito", "Pular"),
 * e não da preparação. */
function enterStep(
    steps: CircuitStep[],
    index: number,
    now: number,
    fromSeconds?: number,
    advancing = false,
): CircuitTransition {
    const step = steps[index];
    if (!step) return { state: { phase: 'done' }, cue: 'done' };
    const secs = fromSeconds ?? step.seconds ?? 0;
    // Exercício emendado no último da rodada anterior: sem descanso entre as
    // rodadas, não houve pausa onde anunciar a nova.
    const roundWithoutRest =
        advancing &&
        step.kind === 'work' &&
        step.position === 0 &&
        steps[index - 1]?.kind === 'work';
    return {
        state: {
            phase: 'step',
            index,
            clock: secs > 0 ? runFor(secs, now) : { status: 'manual' },
        },
        cue: CUE_OF_STEP[step.kind],
        roundCall:
            step.kind === 'rest'
                ? callRound(steps, step.round + 1)
                : roundWithoutRest
                  ? callRound(steps, step.round)
                  : undefined,
    };
}

/** Preparação antes do exercício `index`. Antes do 1º da rodada, anuncia a
 * rodada — menos ao retomar uma pausa (`resumeFrom`): ela já tinha sido
 * anunciada. */
function enterPrep(
    steps: CircuitStep[],
    index: number,
    now: number,
    seconds = PREP_SECONDS,
    resumeFrom: number | null = null,
): CircuitTransition {
    const step = steps[index];
    return {
        state: {
            phase: 'prep',
            index,
            clock: runFor(seconds, now),
            resumeFrom,
        },
        roundCall:
            resumeFrom == null && step?.kind === 'work' && step.position === 0
                ? callRound(steps, step.round)
                : undefined,
    };
}

export function startCircuit(
    steps: CircuitStep[],
    now: number,
): CircuitTransition {
    if (steps.length === 0) return { state: { phase: 'done' } };
    return enterPrep(steps, 0, now);
}

/** Avança quando o relógio zera; fora disso devolve o mesmo estado. */
export function tickCircuit(
    state: CircuitRunState,
    steps: CircuitStep[],
    now: number,
): CircuitTransition {
    if (state.phase !== 'prep' && state.phase !== 'step') return { state };
    if (state.clock.status !== 'running' || state.clock.endAt > now) {
        return { state };
    }
    if (state.phase === 'prep') {
        return enterStep(steps, state.index, now, state.resumeFrom ?? undefined);
    }
    return enterStep(steps, state.index + 1, now, undefined, true);
}

/** "Feito" no passo manual e "Pular": vai direto ao próximo, sem preparação
 * — no meio do circuito o próximo emenda, como no avanço automático. Na
 * preparação, pula a contagem e começa o exercício. */
export function skipCircuit(
    state: CircuitRunState,
    steps: CircuitStep[],
    now: number,
): CircuitTransition {
    if (state.phase === 'prep') {
        return enterStep(steps, state.index, now, state.resumeFrom ?? undefined);
    }
    if (state.phase === 'step') {
        return enterStep(steps, state.index + 1, now, undefined, true);
    }
    return { state };
}

export function pauseCircuit(
    state: CircuitRunState,
    now: number,
): CircuitTransition {
    if (
        (state.phase === 'prep' || state.phase === 'step') &&
        state.clock.status === 'running'
    ) {
        return {
            state: {
                ...state,
                clock: {
                    status: 'paused',
                    remaining: clockRemaining(state.clock, now),
                },
            },
        };
    }
    return { state };
}

/** Retomar um EXERCÍCIO pausado passa por uma preparação curta (a pessoa
 * largou o celular para voltar à posição); recuperação e descanso seguem
 * direto — ali não há movimento para perder. */
export function resumeCircuit(
    state: CircuitRunState,
    steps: CircuitStep[],
    now: number,
): CircuitTransition {
    if (state.phase !== 'prep' && state.phase !== 'step') return { state };
    if (state.clock.status !== 'paused' || state.clock.remaining <= 0) {
        return { state };
    }
    const { remaining } = state.clock;
    if (state.phase === 'step' && steps[state.index]?.kind === 'work') {
        return enterPrep(
            steps,
            state.index,
            now,
            RESUME_PREP_SECONDS,
            remaining,
        );
    }
    return { state: { ...state, clock: runFor(remaining, now) } };
}

/** ↺ — refaz só o passo atual, do tempo cheio. Exercício passa pela
 * preparação de novo ("perdi os primeiros segundos"); recuperação e descanso
 * só recomeçam a contar. O circuito inteiro NÃO volta — isso é
 * `restartCircuit`, que pede confirmação na tela. */
export function restartCurrentStep(
    state: CircuitRunState,
    steps: CircuitStep[],
    now: number,
): CircuitTransition {
    if (state.phase === 'prep') return enterPrep(steps, state.index, now);
    if (state.phase !== 'step') return { state };
    const step = steps[state.index];
    if (!step || step.seconds == null) return { state };
    if (step.kind === 'work') return enterPrep(steps, state.index, now);
    return { state: { ...state, clock: runFor(step.seconds, now) } };
}

/** Índice do exercício anterior ao passo `index` (recuperação e descanso
 * não contam), ou -1. Na recuperação, é o exercício que acabou de terminar. */
export function previousWorkIndex(
    steps: CircuitStep[],
    index: number,
): number {
    for (let i = Math.min(index, steps.length) - 1; i >= 0; i--) {
        if (steps[i].kind === 'work') return i;
    }
    return -1;
}

/** ⏮ — volta ao exercício anterior, com preparação. Desfaz um "Pular"
 * acidental sem apagar o circuito inteiro. */
export function backCircuit(
    state: CircuitRunState,
    steps: CircuitStep[],
    now: number,
): CircuitTransition {
    if (state.phase !== 'prep' && state.phase !== 'step') return { state };
    const prev = previousWorkIndex(steps, state.index);
    return prev < 0 ? { state } : enterPrep(steps, prev, now);
}

export function canGoBack(
    state: CircuitRunState,
    steps: CircuitStep[],
): boolean {
    return (
        (state.phase === 'prep' || state.phase === 'step') &&
        previousWorkIndex(steps, state.index) >= 0
    );
}

export function restartCircuit(): CircuitTransition {
    return { state: { phase: 'idle' } };
}

/** Estado salvo → estado que a tela reabre. Nunca volta contando: quem
 * recarregou a página (ou teve o app fechado pelo sistema) pode nem estar
 * pronto — reabre pausado, no mesmo passo, com o que faltava. Passo cujo
 * tempo já acabou reabre do tempo cheio. */
export function reopenCircuit(
    saved: CircuitRunState,
    steps: CircuitStep[],
    now: number,
): CircuitRunState {
    if (saved.phase === 'idle' || saved.phase === 'done') return saved;
    const index = Math.min(saved.index, steps.length - 1);
    const step = steps[index];
    if (!step) return { phase: 'idle' };
    if (step.seconds == null) {
        return { phase: 'step', index, clock: { status: 'manual' } };
    }
    const left =
        saved.phase === 'prep'
            ? (saved.resumeFrom ?? step.seconds)
            : saved.clock.status === 'manual'
              ? step.seconds
              : clockRemaining(saved.clock, now);
    return {
        phase: 'step',
        index,
        clock: {
            status: 'paused',
            remaining: left > 0 ? Math.min(left, step.seconds) : step.seconds,
        },
    };
}
