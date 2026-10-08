'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePlanStoreHidden } from '@/hooks/usePlanStoreHidden';
import { getStudentHomeRoute, getToken, getUser } from '@/libs/session';

/**
 * Acesso às páginas da loja. Desde a fase 3 elas são públicas: sem login, a
 * vitrine aparece (o servidor já manda o conteúdo, para o Google e para o
 * link do Instagram), e a compra pede cadastro. Com login, a loja continua
 * escondida do aluno de personal PRO (decisão 6 do plano da loja): quem chega
 * pela URL volta para Meus Treinos.
 *
 * - `ready`: pode buscar e mostrar a loja pelo navegador.
 * - `loggedIn`: null enquanto a sessão não foi lida (no servidor e no
 *   primeiro render); a compra decide por ele.
 */
export function useStoreGuard(): { ready: boolean; loggedIn: boolean | null } {
    const router = useRouter();
    const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
    const [hasPersonal, setHasPersonal] = useState(false);

    useEffect(() => {
        const user = getToken() ? getUser() : null;
        setLoggedIn(!!user);
        setHasPersonal(!!user?.has_personal);
    }, []);

    const hidden = usePlanStoreHidden(hasPersonal);

    useEffect(() => {
        if (loggedIn && hidden === true) router.replace(getStudentHomeRoute());
    }, [loggedIn, hidden, router]);

    return {
        ready: loggedIn === false || (loggedIn === true && hidden === false),
        loggedIn,
    };
}
