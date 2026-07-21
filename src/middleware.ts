import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware de borda para gating de rotas administrativas.
 *
 * A sessão vive em localStorage (o servidor não a enxerga), então usamos os
 * cookies LEVES `vf_auth`/`vf_role` (definidos em libs/session.ts, sem o JWT).
 * A checagem é ADITIVA e não-quebra: só bloqueamos o acesso a /admin quando o
 * cookie de papel está presente e NÃO é de administrador. Sessões antigas
 * (feitas antes deste cookie existir) continuam passando e são tratadas pelo
 * guard client-side `useAuthGuard`, que também redireleciona não-admins.
 *
 * A autorização real das APIs administrativas é feita pelo backend; isto apenas
 * evita servir o bundle de /admin a um usuário cujo papel já sabemos não ser
 * administrativo.
 */
const ADMIN_ROLES = ['admin', 'content_editor'];

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    if (pathname.startsWith('/admin')) {
        const role = req.cookies.get('vf_role')?.value;
        if (role && !ADMIN_ROLES.includes(role)) {
            const url = req.nextUrl.clone();
            url.pathname = role === 'personal' ? '/personal' : '/app';
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*'],
};
