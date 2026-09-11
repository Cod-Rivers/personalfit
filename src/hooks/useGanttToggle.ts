'use client';

import { useCallback, useState } from 'react';

/**
 * Estado de visibilidade do GanttPlanning, persistido em localStorage por
 * tela (storageKey) — sem isso o toggle "ocultar linha do tempo" volta a
 * ligado a cada F5.
 *
 * `defaultEnabled` só vale para quem NUNCA mexeu no toggle nesta tela: nas
 * telas de periodização do personal ele entra desligado, porque a linha do
 * tempo ficava entre o cabeçalho e a lista de fases e empurrava o conteúdo
 * que o personal veio editar para fora da primeira tela. Quem já escolheu
 * mantém a escolha, e o botão "Mostrar linha do tempo" continua visível.
 */
export function useGanttToggle(
    storageKey: string,
    defaultEnabled = true,
): [boolean, (v: boolean) => void] {
    const [enabled, setEnabledState] = useState<boolean>(() => {
        if (typeof window === 'undefined') return defaultEnabled;
        try {
            const stored = window.localStorage.getItem(storageKey);
            if (stored === null) return defaultEnabled;
            return stored !== 'false';
        } catch {
            return defaultEnabled;
        }
    });

    const setEnabled = useCallback(
        (v: boolean) => {
            setEnabledState(v);
            try {
                window.localStorage.setItem(storageKey, String(v));
            } catch {
                // localStorage indisponível (modo privado, quota etc.) — ignora
            }
        },
        [storageKey],
    );

    return [enabled, setEnabled];
}
