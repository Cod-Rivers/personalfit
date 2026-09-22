'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Contagem regressiva do descanso entre séries.
 *
 * Conta pelo relógio (instante de término), não decrementando um número a
 * cada tick: com a tela bloqueada ou o app em segundo plano o navegador
 * atrasa os intervalos, e um contador por tick voltaria "atrasado" — o aluno
 * descansaria mais do que o prescrito.
 *
 * @param seconds duração prescrita. Mudar com o timer parado reinicia a
 * contagem para o novo valor; rodando, a volta atual segue até o fim.
 */
export function useRestCountdown(seconds: number) {
    const [remaining, setRemaining] = useState(seconds);
    const [running, setRunning] = useState(false);
    const [finished, setFinished] = useState(false);
    const endAtRef = useRef<number | null>(null);

    useEffect(() => {
        if (running) return;
        setRemaining(seconds);
        setFinished(false);
        // Só a duração prescrita reinicia; parar/pausar não.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seconds]);

    useEffect(() => {
        if (!running) return;
        const tick = () => {
            const endAt = endAtRef.current;
            if (endAt == null) return;
            const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
            setRemaining(left);
            if (left === 0) {
                endAtRef.current = null;
                setRunning(false);
                setFinished(true);
                // Na academia o celular está no bolso ou no banco: a vibração
                // é o aviso que chega. Sem suporte (iOS, alguns WebViews), o
                // visual de "Pronto" basta.
                try {
                    navigator.vibrate?.([200, 100, 200]);
                } catch {
                    /* sem vibração */
                }
            }
        };
        tick();
        const id = window.setInterval(tick, 250);
        return () => window.clearInterval(id);
    }, [running]);

    const start = useCallback(() => {
        const from = remaining > 0 ? remaining : seconds;
        endAtRef.current = Date.now() + from * 1000;
        setRemaining(from);
        setFinished(false);
        setRunning(true);
    }, [remaining, seconds]);

    const pause = useCallback(() => {
        const endAt = endAtRef.current;
        if (endAt != null) {
            setRemaining(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
        }
        endAtRef.current = null;
        setRunning(false);
    }, []);

    const reset = useCallback(() => {
        endAtRef.current = null;
        setRunning(false);
        setFinished(false);
        setRemaining(seconds);
    }, [seconds]);

    return { remaining, running, finished, start, pause, reset };
}

/** 90 → "1:30". */
export function formatCountdown(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}
