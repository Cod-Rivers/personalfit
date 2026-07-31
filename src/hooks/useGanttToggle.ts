'use client';

import { useCallback, useState } from 'react';

/**
 * Estado de visibilidade do GanttPlanning, persistido em localStorage por
 * tela (storageKey) — sem isso o toggle "ocultar linha do tempo" volta a
 * ligado a cada F5.
 */
export function useGanttToggle(storageKey: string): [boolean, (v: boolean) => void] {
    const [enabled, setEnabledState] = useState<boolean>(() => {
        if (typeof window === 'undefined') return true;
        try {
            return window.localStorage.getItem(storageKey) !== 'false';
        } catch {
            return true;
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
