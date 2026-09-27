import { beforeEach, describe, expect, it } from 'vitest';
import {
    CIRCUIT_PROGRESS_TTL_MS,
    loadCircuitProgress,
    parseCircuitProgress,
    saveCircuitProgress,
} from './circuitProgress';
import type { CircuitRunState } from './circuitRunner';

const running: CircuitRunState = {
    phase: 'step',
    index: 2,
    clock: { status: 'running', endAt: 5_000 },
};

describe('circuitProgress', () => {
    beforeEach(() => window.localStorage.clear());

    it('guarda e lê o andamento da mesma prescrição', () => {
        saveCircuitProgress('k', 'sig', running, 1_000);
        expect(loadCircuitProgress('k', 'sig', 2_000)).toEqual(running);
    });

    it('prescrição diferente descarta', () => {
        saveCircuitProgress('k', 'sig', running, 1_000);
        expect(loadCircuitProgress('k', 'outra', 2_000)).toBeNull();
    });

    it('vencido descarta', () => {
        saveCircuitProgress('k', 'sig', running, 0);
        expect(
            loadCircuitProgress('k', 'sig', CIRCUIT_PROGRESS_TTL_MS + 1),
        ).toBeNull();
    });

    it('voltar ao início apaga o registro', () => {
        saveCircuitProgress('k', 'sig', running, 1_000);
        saveCircuitProgress('k', 'sig', { phase: 'idle' }, 1_000);
        expect(window.localStorage.length).toBe(0);
    });

    it('registro corrompido é ignorado', () => {
        expect(parseCircuitProgress('lixo', 'sig', 0)).toBeNull();
        expect(
            parseCircuitProgress(
                { v: 1, signature: 'sig', savedAt: 0, state: { phase: 'x' } },
                'sig',
                0,
            ),
        ).toBeNull();
        expect(
            parseCircuitProgress(
                { v: 1, signature: 'sig', savedAt: 0, state: { phase: 'step' } },
                'sig',
                0,
            ),
        ).toBeNull();
    });
});
