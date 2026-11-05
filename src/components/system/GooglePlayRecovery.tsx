'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { hasHardenedNativeBridge } from '@/libs/nativeBridge';
import { getToken } from '@/libs/session';
import {
    listenForRecoveredPurchases,
    recoverGooglePlayPurchases,
} from '@/libs/googlePlayRecovery';

/**
 * Reprocessa as compras do Google Play que o app achou pendentes de verify
 * ao abrir (ver libs/googlePlayRecovery.ts). Montado uma vez no layout raiz.
 * Renderiza nada; fora do app não faz nada.
 *
 * A busca roda na primeira página com sessão: o app abre às vezes no login,
 * e a compra fica guardada nele até lá. A troca de rota é o sinal de que o
 * login pode ter acontecido.
 */
export default function GooglePlayRecovery() {
    const pathname = usePathname();
    const pulled = useRef(false);

    useEffect(() => {
        if (!hasHardenedNativeBridge()) return undefined;
        return listenForRecoveredPurchases();
    }, []);

    useEffect(() => {
        if (pulled.current || !hasHardenedNativeBridge() || !getToken()) return;
        pulled.current = true;
        void recoverGooglePlayPurchases();
    }, [pathname]);

    return null;
}
