/**
 * Preferência do aparelho para o cronômetro de circuito: só o som. A
 * recuperação entre exercícios (tabata) NÃO mora aqui — é prescrição do
 * personal, gravada no bloco do treino (group_recovery_seconds) para o aluno
 * seguir em qualquer aparelho.
 *
 * localStorage pode lançar ou vir vazio (janela privada, dados bloqueados):
 * toda leitura/escrita é protegida e o padrão vale sem ele.
 */

export interface CircuitSettings {
    sound: boolean;
}

export const DEFAULT_CIRCUIT_SETTINGS: CircuitSettings = {
    sound: true,
};

const KEY = 'venafit.circuit.settings';

export function normalizeCircuitSettings(raw: unknown): CircuitSettings {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<
        string,
        unknown
    >;
    return {
        sound:
            typeof r.sound === 'boolean'
                ? r.sound
                : DEFAULT_CIRCUIT_SETTINGS.sound,
    };
}

export function loadCircuitSettings(): CircuitSettings {
    try {
        const raw = window.localStorage.getItem(KEY);
        return normalizeCircuitSettings(raw ? JSON.parse(raw) : null);
    } catch {
        return DEFAULT_CIRCUIT_SETTINGS;
    }
}

export function saveCircuitSettings(settings: CircuitSettings): void {
    try {
        window.localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
        /* sem armazenamento: vale só nesta sessão */
    }
}
