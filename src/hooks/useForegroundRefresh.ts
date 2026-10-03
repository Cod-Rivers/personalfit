'use client';
import { useEffect, useRef } from 'react';

/** Intervalo mínimo entre duas atualizações (voltar várias vezes ao app em
 * poucos minutos não repete a busca). */
export const FOREGROUND_REFRESH_MIN_MS = 5 * 60_000;
/** Reserva: com o app aberto e visível, atualiza também a cada 30 min. */
export const FOREGROUND_REFRESH_PERIOD_MS = 30 * 60_000;

/**
 * Chama `refresh` quando o app volta para a frente (visibilitychange/focus)
 * e, de reserva, periodicamente enquanto ele estiver visível — no máximo uma
 * vez a cada `minIntervalMs`. A carga inicial é de quem usa o hook; este só
 * cuida das seguintes.
 *
 * Existe porque o plano do personal muda com o app aberto (vira PRO, volta
 * ao free, abre a espera do excedente de alunos), e os dados que dependem
 * dele (marca, anúncios, loja, avisos) eram buscados uma vez por abertura do
 * app — no Android o WebView fica aberto por dias. O temporizador só busca
 * com a página visível: app em segundo plano não gera requisição.
 */
export function useForegroundRefresh(
    refresh: () => void,
    minIntervalMs: number = FOREGROUND_REFRESH_MIN_MS,
    periodMs: number = FOREGROUND_REFRESH_PERIOD_MS,
): void {
    const refreshRef = useRef(refresh);
    refreshRef.current = refresh;
    const lastRef = useRef(Date.now());

    useEffect(() => {
        const maybeRefresh = () => {
            if (document.visibilityState !== 'visible') return;
            const now = Date.now();
            if (now - lastRef.current < minIntervalMs) return;
            lastRef.current = now;
            refreshRef.current();
        };
        document.addEventListener('visibilitychange', maybeRefresh);
        window.addEventListener('focus', maybeRefresh);
        const id = window.setInterval(maybeRefresh, periodMs);
        return () => {
            document.removeEventListener('visibilitychange', maybeRefresh);
            window.removeEventListener('focus', maybeRefresh);
            window.clearInterval(id);
        };
    }, [minIntervalMs, periodMs]);
}
