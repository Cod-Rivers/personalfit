/**
 * Preferência de som dos cronômetros do treino (circuito, descanso entre
 * séries, série por tempo): ligado ou não, e voz ou bipe. Uma escolha só
 * por aparelho — quem prefere bipe no circuito ouve bipe no descanso também.
 *
 * Vários cronômetros convivem na mesma tela (uma linha de exercício cada no
 * /acompanhar): trocar num deles atualiza todos, por isso a leitura é um
 * store externo (useSyncExternalStore), não estado de cada componente.
 *
 * A recuperação entre exercícios do circuito (tabata) NÃO mora aqui — é
 * prescrição do personal, gravada no bloco do treino.
 *
 * localStorage pode lançar ou vir vazio (janela privada, dados bloqueados):
 * toda leitura/escrita é protegida e o padrão vale sem ele.
 */
import { useSyncExternalStore } from 'react';
import type { TimerSoundStyle } from './timerSounds';

export interface TimerSoundSettings {
    sound: boolean;
    /** Locutora ("3, 2, 1, Go!") ou os bipes. */
    soundStyle: TimerSoundStyle;
}

export const DEFAULT_TIMER_SOUND_SETTINGS: TimerSoundSettings = {
    sound: true,
    soundStyle: 'voice',
};

/** Nome histórico: a preferência nasceu no circuito. Mudar a chave apagaria
 * a escolha de quem já tinha feito. */
const KEY = 'venafit.circuit.settings';

export function normalizeTimerSoundSettings(raw: unknown): TimerSoundSettings {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<
        string,
        unknown
    >;
    return {
        sound:
            typeof r.sound === 'boolean'
                ? r.sound
                : DEFAULT_TIMER_SOUND_SETTINGS.sound,
        soundStyle:
            r.soundStyle === 'voice' || r.soundStyle === 'beep'
                ? r.soundStyle
                : DEFAULT_TIMER_SOUND_SETTINGS.soundStyle,
    };
}

/** Sem armazenamento: a escolha vale só nesta sessão. */
let memory: TimerSoundSettings | null = null;
// Mesmo texto guardado = mesmo objeto: useSyncExternalStore exige referência
// estável entre leituras.
let cachedRaw: string | null | undefined;
let cached: TimerSoundSettings = DEFAULT_TIMER_SOUND_SETTINGS;

export function getTimerSoundSettings(): TimerSoundSettings {
    if (memory) return memory;
    let raw: string | null;
    try {
        raw = window.localStorage.getItem(KEY);
    } catch {
        return DEFAULT_TIMER_SOUND_SETTINGS;
    }
    if (raw !== cachedRaw) {
        cachedRaw = raw;
        let parsed: unknown = null;
        try {
            parsed = raw ? JSON.parse(raw) : null;
        } catch {
            /* valor corrompido: vale o padrão */
        }
        cached = normalizeTimerSoundSettings(parsed);
    }
    return cached;
}

const listeners = new Set<() => void>();

export function setTimerSoundSettings(patch: Partial<TimerSoundSettings>) {
    const next = { ...getTimerSoundSettings(), ...patch };
    try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
        memory = null;
    } catch {
        memory = next;
    }
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    // Outra aba do app mudou a escolha.
    window.addEventListener('storage', listener);
    return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', listener);
    };
}

/** Preferência atual; no servidor (e na hidratação), o padrão. */
export function useTimerSoundSettings(): TimerSoundSettings {
    return useSyncExternalStore(
        subscribe,
        getTimerSoundSettings,
        () => DEFAULT_TIMER_SOUND_SETTINGS,
    );
}
