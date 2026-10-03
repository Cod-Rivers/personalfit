/**
 * Preferência do aparelho para o cronômetro de circuito: só o som (ligado ou
 * não, e voz ou bipe). A recuperação entre exercícios (tabata) NÃO mora aqui
 * — é prescrição do personal, gravada no bloco do treino
 * (group_recovery_seconds) para o aluno seguir em qualquer aparelho.
 *
 * localStorage pode lançar ou vir vazio (janela privada, dados bloqueados):
 * toda leitura/escrita é protegida e o padrão vale sem ele.
 */
import type { CircuitSoundStyle } from './circuitSounds';

export interface CircuitSettings {
    sound: boolean;
    /** Locutora ("3, 2, 1, Go!") ou os bipes. Quem já usava o circuito
     * antes da voz existir passa a ouvir a voz, e pode voltar aos bipes. */
    soundStyle: CircuitSoundStyle;
}

export const DEFAULT_CIRCUIT_SETTINGS: CircuitSettings = {
    sound: true,
    soundStyle: 'voice',
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
        soundStyle:
            r.soundStyle === 'voice' || r.soundStyle === 'beep'
                ? r.soundStyle
                : DEFAULT_CIRCUIT_SETTINGS.soundStyle,
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
