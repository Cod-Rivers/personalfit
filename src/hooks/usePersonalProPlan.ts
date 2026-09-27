'use client';
import { useEffect, useState } from 'react';
import { getMyBranding } from '@/libs/brandingService';

/**
 * O personal logado tem o plano Pro? Usado pelas telas do aluno vistas pelo
 * personal (Evolução: fotos da avaliação; Cargas: comparações e relatório).
 *
 * - `enabled=false` (tela do próprio aluno) não consulta nada e devolve null.
 * - Enquanto a resposta não chega, ou se ela falhar, devolve null — quem
 *   usa decide o que "não sei" significa. O backend é quem garante o que é
 *   Pro; isto só evita oferecer um botão que vai dar 403.
 */
export function usePersonalProPlan(enabled: boolean): boolean | null {
    const [isPro, setIsPro] = useState<boolean | null>(null);

    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;
        getMyBranding()
            .then((r) => {
                if (!cancelled) setIsPro(r.plan_type === 'pro');
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [enabled]);

    return enabled ? isPro : null;
}
