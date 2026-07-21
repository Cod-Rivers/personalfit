'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getUser, SessionUser } from '@/libs/session';

interface AuthGuardOptions {
    /** Papéis permitidos. Vazio/omisso = qualquer usuário autenticado. */
    allowedRoles?: string[];
    /** Para onde redirecionar quem não está autenticado. */
    redirectTo?: string;
    /** Para onde redirecionar quem está autenticado mas sem papel permitido. */
    forbiddenRedirect?: string;
}

interface AuthGuardState {
    user: SessionUser | null;
    /** true enquanto a checagem inicial não terminou (evite renderizar conteúdo protegido). */
    checking: boolean;
    authorized: boolean;
}

/**
 * Guard de rota centralizado. Substitui o padrão duplicado
 * `localStorage.getItem('token')` + `JSON.parse(localStorage.getItem('user'))`
 * dentro de `useEffect` que estava replicado em ~10 páginas. Concentrar aqui
 * torna a lógica de sessão um único ponto de manutenção.
 *
 * A autorização real dos dados continua sendo do backend; este guard controla
 * apenas o que a UI renderiza/redireciona.
 */
export function useAuthGuard(options: AuthGuardOptions = {}): AuthGuardState {
    const {
        allowedRoles,
        redirectTo = '/',
        forbiddenRedirect = '/',
    } = options;
    const router = useRouter();
    const [state, setState] = useState<AuthGuardState>({
        user: null,
        checking: true,
        authorized: false,
    });

    useEffect(() => {
        const token = getToken();
        const user = getUser();

        if (!token || !user) {
            setState({ user: null, checking: false, authorized: false });
            router.replace(redirectTo);
            return;
        }

        if (allowedRoles && allowedRoles.length > 0) {
            const role = String(user.role ?? '');
            if (!allowedRoles.includes(role)) {
                setState({ user, checking: false, authorized: false });
                router.replace(forbiddenRedirect);
                return;
            }
        }

        setState({ user, checking: false, authorized: true });
        // allowedRoles é comparado por conteúdo via join para estabilidade da dep.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router, redirectTo, forbiddenRedirect, (allowedRoles ?? []).join(',')]);

    return state;
}
