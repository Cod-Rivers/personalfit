import { NextRequest, NextResponse } from 'next/server';
import { buildPageCsp, generateNonce } from '@/libs/csp';

/**
 * Middleware de borda: CSP com nonce em toda página + gate de /admin.
 *
 * CSP: gera um nonce por requisição e o entrega em dois lugares. Na RESPOSTA,
 * para o navegador aplicar a política. Na REQUISIÇÃO que segue para a
 * renderização: o Next lê o nonce do header `Content-Security-Policy` e o
 * aplica aos scripts dele, e o layout raiz lê `x-nonce` para os <script>
 * escritos à mão. Detalhes e motivo da política em libs/csp.ts.
 *
 * Gate de /admin: a sessão vive em localStorage (o servidor não a enxerga),
 * então usamos os cookies LEVES `vf_auth`/`vf_role` (definidos em
 * libs/session.ts, sem o JWT). A checagem é ADITIVA e não-quebra: só
 * bloqueamos o acesso a /admin quando o cookie de papel está presente e NÃO é
 * de administrador. Sessões antigas (feitas antes deste cookie existir)
 * continuam passando e são tratadas pelo guard client-side `useAuthGuard`,
 * que também redireciona não-admins. A autorização real das APIs
 * administrativas é feita pelo backend; isto apenas evita servir o bundle de
 * /admin a um usuário cujo papel já sabemos não ser administrativo.
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

    const nonce = generateNonce();
    const csp = buildPageCsp({
        nonce,
        isDev: process.env.NODE_ENV !== 'production',
    });

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('Content-Security-Policy', csp);

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set('Content-Security-Policy', csp);
    return response;
}

export const config = {
    matcher: [
        {
            // Toda rota de página. Ficam de fora os arquivos estáticos (não
            // são documento, CSP neles não tem efeito) e o /sw.js, que tem
            // CSP própria em next.config.ts — a das páginas quebraria o
            // importScripts do Firebase (ver buildServiceWorkerCsp).
            source: '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|ads.txt|icons/|assets/).*)',
            // Prefetch do <Link> baixa payload RSC, não documento: nonce ali
            // seria trabalho jogado fora a cada link visível na tela.
            missing: [
                { type: 'header', key: 'next-router-prefetch' },
                { type: 'header', key: 'purpose', value: 'prefetch' },
            ],
        },
        // O gate de /admin vale também para prefetch, como antes.
        '/admin/:path*',
    ],
};
