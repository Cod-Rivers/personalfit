import { describe, expect, it } from 'vitest';
import { buildCircuitPlan } from './circuitPlan';
import {
    backCircuit,
    canGoBack,
    clockRemaining,
    pauseCircuit,
    PREP_SECONDS,
    previousWorkIndex,
    reopenCircuit,
    restartCurrentStep,
    resumeCircuit,
    RESUME_PREP_SECONDS,
    skipCircuit,
    startCircuit,
    tickCircuit,
    type CircuitRunState,
} from './circuitRunner';

// A(20s) → recuperação 10s → B(20s) → descanso 30s → A → rec → B
const { steps } = buildCircuitPlan(
    [
        { name: 'A', series: [20, 20], timed: true, rest: 30 },
        { name: 'B', series: [20, 20], timed: true, rest: 30 },
    ],
    { recoverySeconds: 10 },
);
const T0 = 1_000_000;
const s = (sec: number) => T0 + sec * 1000;

const stepAt = (index: number, remaining: number): CircuitRunState => ({
    phase: 'step',
    index,
    clock: { status: 'running', endAt: T0 + remaining * 1000 },
});

describe('circuitRunner', () => {
    it('começa pela preparação, sem som, e entra no 1º exercício com "go"', () => {
        const started = startCircuit(steps, T0);
        expect(started.state).toMatchObject({ phase: 'prep', index: 0 });
        expect(started.cue).toBeUndefined();
        const early = tickCircuit(started.state, steps, s(PREP_SECONDS - 1));
        expect(early.state).toBe(started.state);
        const go = tickCircuit(started.state, steps, s(PREP_SECONDS));
        expect(go.state).toMatchObject({ phase: 'step', index: 0 });
        expect(go.cue).toBe('go');
    });

    it('relógio zerado avança um passo, com o som do passo novo', () => {
        const t = tickCircuit(stepAt(0, 0), steps, T0);
        expect(t.state).toMatchObject({ phase: 'step', index: 1 });
        expect(t.cue).toBe('recover');
    });

    describe('anúncio da rodada', () => {
        // steps: A, rec, B, descanso, A(rodada 2), rec, B(rodada 2)
        it('a preparação do início anuncia a rodada 1', () => {
            expect(startCircuit(steps, T0).roundCall).toEqual({
                round: 1,
                final: false,
            });
        });

        it('o descanso anuncia a rodada seguinte; a última é "final"', () => {
            const rest = tickCircuit(stepAt(2, 0), steps, T0);
            expect(rest.state).toMatchObject({ phase: 'step', index: 3 });
            expect(rest.cue).toBe('rest');
            expect(rest.roundCall).toEqual({ round: 2, final: true });
            // Já anunciada no descanso: o exercício entra só com "go".
            const go = tickCircuit(stepAt(3, 0), steps, T0);
            expect(go.cue).toBe('go');
            expect(go.roundCall).toBeUndefined();
        });

        it('rodadas do meio não são "final"', () => {
            const three = buildCircuitPlan([
                { name: 'A', series: [20, 20, 20], timed: true, rest: 30 },
                { name: 'B', series: [20, 20, 20], timed: true, rest: 30 },
            ]).steps;
            // A, B, descanso, A, B, descanso, A, B
            expect(tickCircuit(stepAt(1, 0), three, T0).roundCall).toEqual({
                round: 2,
                final: false,
            });
            expect(tickCircuit(stepAt(4, 0), three, T0).roundCall).toEqual({
                round: 3,
                final: true,
            });
        });

        it('sem descanso entre as rodadas, o anúncio vem junto do "go"', () => {
            const noRest = buildCircuitPlan([
                { name: 'A', series: [20, 20], timed: true },
                { name: 'B', series: [20, 20], timed: true },
            ]).steps;
            // A, B, A(rodada 2), B
            const t = tickCircuit(stepAt(1, 0), noRest, T0);
            expect(t.state).toMatchObject({ phase: 'step', index: 2 });
            expect(t.cue).toBe('go');
            expect(t.roundCall).toEqual({ round: 2, final: true });
            // Dentro da rodada, nada de anúncio.
            expect(tickCircuit(stepAt(0, 0), noRest, T0).roundCall).toBe(
                undefined,
            );
        });

        it('voltar ao 1º exercício de uma rodada anuncia de novo; a retomada não', () => {
            const back = backCircuit(stepAt(5, 5), steps, T0);
            expect(back.state).toMatchObject({ phase: 'prep', index: 4 });
            expect(back.roundCall).toEqual({ round: 2, final: true });
            // Da preparação para o exercício: só "go", a rodada já foi dita.
            const go = tickCircuit(back.state, steps, s(PREP_SECONDS));
            expect(go.cue).toBe('go');
            expect(go.roundCall).toBeUndefined();

            const paused = pauseCircuit(stepAt(4, 12), T0).state;
            const prep = resumeCircuit(paused, steps, T0);
            expect(prep.state).toMatchObject({ phase: 'prep', resumeFrom: 12 });
            expect(prep.roundCall).toBeUndefined();
            const resumed = tickCircuit(
                prep.state,
                steps,
                s(RESUME_PREP_SECONDS),
            );
            expect(resumed.cue).toBe('go');
            expect(resumed.roundCall).toBeUndefined();
        });

        it('exercício do meio da rodada não anuncia nada na preparação', () => {
            const redo = restartCurrentStep(stepAt(2, 8), steps, T0);
            expect(redo.state).toMatchObject({ phase: 'prep', index: 2 });
            expect(redo.roundCall).toBeUndefined();
        });
    });

    it('depois do último passo, concluído com "done"', () => {
        const t = tickCircuit(stepAt(steps.length - 1, 0), steps, T0);
        expect(t.state).toEqual({ phase: 'done' });
        expect(t.cue).toBe('done');
    });

    it('refazer: exercício volta à preparação; descanso recomeça direto', () => {
        const redoWork = restartCurrentStep(stepAt(0, 5), steps, T0);
        expect(redoWork.state).toMatchObject({ phase: 'prep', index: 0 });

        const restIdx = steps.findIndex((x) => x.kind === 'rest');
        const redoRest = restartCurrentStep(stepAt(restIdx, 3), steps, T0);
        expect(redoRest.state).toMatchObject({ phase: 'step', index: restIdx });
        if (redoRest.state.phase === 'step') {
            expect(clockRemaining(redoRest.state.clock, T0)).toBe(30);
        }
    });

    it('pausa guarda o que falta; retomar exercício tem preparação curta e continua dali', () => {
        const paused = pauseCircuit(stepAt(0, 12), T0).state;
        expect(paused).toMatchObject({
            clock: { status: 'paused', remaining: 12 },
        });
        const resumed = resumeCircuit(paused, steps, s(100));
        expect(resumed.state).toMatchObject({
            phase: 'prep',
            index: 0,
            resumeFrom: 12,
        });
        const back = tickCircuit(
            resumed.state,
            steps,
            s(100 + RESUME_PREP_SECONDS),
        );
        if (back.state.phase !== 'step') throw new Error('esperava step');
        expect(clockRemaining(back.state.clock, s(100 + RESUME_PREP_SECONDS))).toBe(12);
    });

    it('retomar recuperação/descanso segue direto, sem preparação', () => {
        const paused = pauseCircuit(stepAt(1, 4), T0).state;
        const resumed = resumeCircuit(paused, steps, T0);
        expect(resumed.state).toMatchObject({ phase: 'step', index: 1 });
    });

    it('pular na preparação começa o exercício na hora', () => {
        const prep = startCircuit(steps, T0).state;
        expect(skipCircuit(prep, steps, T0).state).toMatchObject({
            phase: 'step',
            index: 0,
        });
    });

    it('anterior: volta ao exercício anterior pulando recuperação e descanso', () => {
        // índice 2 = B da rodada 1; anterior = A (0)
        expect(previousWorkIndex(steps, 2)).toBe(0);
        // na recuperação (1), o anterior é o exercício que acabou de terminar
        expect(previousWorkIndex(steps, 1)).toBe(0);
        expect(previousWorkIndex(steps, 0)).toBe(-1);
        expect(canGoBack(stepAt(0, 10), steps)).toBe(false);
        expect(backCircuit(stepAt(2, 10), steps, T0).state).toMatchObject({
            phase: 'prep',
            index: 0,
        });
    });

    describe('reopenCircuit', () => {
        it('reabre pausado com o que faltava', () => {
            const state = reopenCircuit(stepAt(2, 15), steps, s(5));
            expect(state).toEqual({
                phase: 'step',
                index: 2,
                clock: { status: 'paused', remaining: 10 },
            });
        });

        it('passo cujo tempo acabou reabre do tempo cheio', () => {
            const state = reopenCircuit(stepAt(2, 15), steps, s(600));
            expect(state).toMatchObject({
                clock: { status: 'paused', remaining: 20 },
            });
        });

        it('na preparação, reabre no exercício, pausado', () => {
            const prep = startCircuit(steps, T0).state;
            expect(reopenCircuit(prep, steps, s(1))).toMatchObject({
                phase: 'step',
                index: 0,
                clock: { status: 'paused', remaining: 20 },
            });
        });

        it('concluído continua concluído', () => {
            expect(reopenCircuit({ phase: 'done' }, steps, T0)).toEqual({
                phase: 'done',
            });
        });
    });
});
