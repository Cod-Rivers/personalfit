/**
 * Andamento de um circuito guardado no aparelho, para sobreviver a recarga
 * da página e ao Android fechando o app em segundo plano (tela bloqueada no
 * meio da rodada). Sem isto o circuito voltava à rodada 1.
 *
 * Uma chave por bloco (quem chama monta, ex.: treino + 1º exercício). O
 * registro carrega a assinatura da prescrição: se o personal mudou o bloco,
 * o andamento antigo não vale mais e é descartado. Validade curta — um
 * circuito deixado pela metade ontem não deve reabrir hoje.
 *
 * localStorage pode lançar ou vir vazio (janela privada, dados bloqueados):
 * sem ele o circuito funciona, só não é retomado. Mesmo molde de
 * circuitSettings.ts.
 */
import type { CircuitRunState } from './circuitRunner';

const PREFIX = 'venafit.circuit.progress.';
/** Depois disso o andamento é de outra sessão de treino. */
export const CIRCUIT_PROGRESS_TTL_MS = 6 * 60 * 60 * 1000;

interface SavedProgress {
    v: 1;
    signature: string;
    savedAt: number;
    state: CircuitRunState;
}

const PHASES = new Set(['idle', 'prep', 'step', 'done']);

/** Registro lido → estado, ou null se inválido, vencido ou de outra
 * prescrição. Exportada para teste. */
export function parseCircuitProgress(
    raw: unknown,
    signature: string,
    now: number,
): CircuitRunState | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Partial<SavedProgress>;
    if (r.v !== 1 || r.signature !== signature) return null;
    if (typeof r.savedAt !== 'number') return null;
    if (now - r.savedAt > CIRCUIT_PROGRESS_TTL_MS) return null;
    const state = r.state as CircuitRunState | undefined;
    if (!state || !PHASES.has(state.phase)) return null;
    if (
        (state.phase === 'prep' || state.phase === 'step') &&
        (typeof state.index !== 'number' || !state.clock)
    ) {
        return null;
    }
    return state;
}

export function loadCircuitProgress(
    key: string,
    signature: string,
    now: number = Date.now(),
): CircuitRunState | null {
    try {
        const raw = window.localStorage.getItem(PREFIX + key);
        return parseCircuitProgress(
            raw ? JSON.parse(raw) : null,
            signature,
            now,
        );
    } catch {
        return null;
    }
}

export function saveCircuitProgress(
    key: string,
    signature: string,
    state: CircuitRunState,
    now: number = Date.now(),
): void {
    try {
        if (state.phase === 'idle') {
            window.localStorage.removeItem(PREFIX + key);
            return;
        }
        const record: SavedProgress = {
            v: 1,
            signature,
            savedAt: now,
            state,
        };
        window.localStorage.setItem(PREFIX + key, JSON.stringify(record));
    } catch {
        /* sem armazenamento: o circuito só não é retomado */
    }
}
