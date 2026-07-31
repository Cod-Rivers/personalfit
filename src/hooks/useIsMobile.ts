'use client';

import { useEffect, useState } from 'react';

/**
 * true/false conforme a largura da viewport. `defaultValue` é o palpite
 * usado antes da hidratação (matchMedia só existe no client) — escolha o
 * valor que minimiza o efeito colateral de estar errado por um instante
 * (ex.: qual branch evita carregar um bundle pesado à toa).
 */
export function useIsMobile(breakpointPx: number, defaultValue = false): boolean {
    const [isMobile, setIsMobile] = useState(defaultValue);

    useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${breakpointPx}px)`);
        const update = () => setIsMobile(mql.matches);
        update();
        mql.addEventListener('change', update);
        return () => mql.removeEventListener('change', update);
    }, [breakpointPx]);

    return isMobile;
}
