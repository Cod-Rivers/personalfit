/**
 * Preferências do cronômetro de circuito (recuperação tabata e som). Ficam no
 * aparelho, não no plano: são um jeito de executar, não parte da prescrição
 * do personal, e valem para qualquer circuito que a pessoa abrir.
 *
 * localStorage pode lançar ou vir vazio (janela privada, dados bloqueados):
 * toda leitura/escrita é protegida e o padrão vale sem ele.
 */

export interface CircuitSettings {
    /** Recuperação curta entre os exercícios da rodada, em segundos; 0 = sem. */
    recoverySeconds: number;
    sound: boolean;
}

export const DEFAULT_CIRCUIT_SETTINGS: CircuitSettings = {
    recoverySeconds: 0,
    sound: true,
};

export const MAX_RECOVERY_SECONDS = 120;

/** Atalhos do seletor: o tabata clássico é 10 s. */
export const RECOVERY_PRESETS = [
    { seconds: 0, label: 'Sem' },
    { seconds: 10, label: 'Tabata · 10 s' },
    { seconds: 15, label: '15 s' },
    { seconds: 20, label: '20 s' },
    { seconds: 30, label: '30 s' },
] as const;

const KEY = 'venafit.circuit.settings';

export function normalizeCircuitSettings(raw: unknown): CircuitSettings {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<
        string,
        unknown
    >;
    const rec = Number(r.recoverySeconds);
    return {
        recoverySeconds: Number.isFinite(rec)
            ? Math.min(MAX_RECOVERY_SECONDS, Math.max(0, Math.round(rec)))
            : DEFAULT_CIRCUIT_SETTINGS.recoverySeconds,
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
