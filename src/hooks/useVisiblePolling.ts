'use client';

import { useEffect } from 'react';

/**
 * Roda `fn` a cada `intervalMs`, mas pausa enquanto a aba está em background
 * (`document.hidden`) e refaz o fetch imediatamente ao voltar ao foco —
 * evita polling infinito de abas minimizadas/inativas.
 */
export function useVisiblePolling(
    fn: () => void,
    intervalMs: number,
    enabled = true,
): void {
    useEffect(() => {
        if (!enabled) return;

        let interval: ReturnType<typeof setInterval> | null = null;

        const start = () => {
            if (interval) return;
            interval = setInterval(fn, intervalMs);
        };
        const stop = () => {
            if (!interval) return;
            clearInterval(interval);
            interval = null;
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                stop();
            } else {
                fn();
                start();
            }
        };

        if (!document.hidden) {
            fn();
            start();
        }
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            stop();
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange,
            );
        };
    }, [fn, intervalMs, enabled]);
}
