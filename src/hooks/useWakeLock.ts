'use client';

import { useEffect } from 'react';
import { nativeKeepScreenOn } from '@/libs/nativeBridge';

/**
 * Mantém a tela acesa enquanto `active`. Usado no circuito: num exercício de
 * 1 minuto a tela apagava e o aluno perdia o cronômetro de vista.
 *
 * Dois caminhos:
 * - Dentro do app Android: ponte nativa (ScreenBridge.kt). A WebView expõe
 *   `navigator.wakeLock`, mas recusa todo pedido com NotAllowedError — só
 *   testar a existência da API daria falso positivo.
 * - No navegador: Screen Wake Lock API. O navegador solta o bloqueio quando
 *   a aba some (troca de app, tela desligada no botão), por isso ele é pedido
 *   de novo ao voltar a ficar visível.
 *
 * Sem nenhum dos dois (iOS antigo, versão do app sem a rota) não faz nada: a
 * tela apaga como antes e o circuito segue funcionando.
 */
export function useWakeLock(active: boolean): void {
    useEffect(() => {
        if (!active) return;

        // App: a janela nativa só mantém a tela acesa enquanto está visível,
        // então não há o que repedir ao voltar.
        if (nativeKeepScreenOn(true)) {
            return () => {
                nativeKeepScreenOn(false);
            };
        }

        const wakeLock = (
            navigator as Navigator & {
                wakeLock?: {
                    request: (type: 'screen') => Promise<WakeLockSentinel>;
                };
            }
        ).wakeLock;
        if (!wakeLock) return;

        let sentinel: WakeLockSentinel | null = null;
        let cancelled = false;

        const acquire = async () => {
            if (document.visibilityState !== 'visible') return;
            try {
                const s = await wakeLock.request('screen');
                if (cancelled) void s.release();
                else sentinel = s;
            } catch {
                /* negado (economia de bateria, sem gesto): segue sem */
            }
        };
        const onVisibility = () => {
            if (document.visibilityState === 'visible') void acquire();
        };

        void acquire();
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', onVisibility);
            void sentinel?.release().catch(() => {});
            sentinel = null;
        };
    }, [active]);
}
