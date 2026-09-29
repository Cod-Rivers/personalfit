'use client';

import { useEffect } from 'react';
import { captureAcquisitionRef } from '@/libs/acquisition';

/**
 * Captura o `?ref=` do primeiro toque (ver libs/acquisition.ts) em QUALQUER
 * página, não só no /cadastro: um link de afiliado ou de campanha pode levar
 * a pessoa direto para uma tela pública (ex.: o desafio em /desafio/[token]),
 * e ela só se cadastra minutos ou dias depois. Montado uma vez no layout
 * raiz, junto de ServiceWorkerRegistrar. Renderiza nada.
 *
 * `window.location.search` em vez de `useSearchParams()` de propósito: este
 * componente não precisa reagir a mudança de rota (o valor só é lido de
 * novo no próximo carregamento de página), e assim evita exigir um
 * <Suspense> no layout raiz.
 */
export default function AcquisitionCapture() {
    useEffect(() => {
        captureAcquisitionRef(window.location.search);
    }, []);

    return null;
}
