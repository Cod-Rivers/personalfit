// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

function nonceOf(csp: string | null): string | null {
    return csp?.match(/'nonce-([^']+)'/)?.[1] ?? null;
}

function request(path: string, role?: string): NextRequest {
    return new NextRequest(`http://localhost${path}`, {
        headers: role ? { cookie: `vf_role=${role}` } : {},
    });
}

describe('middleware — CSP com nonce', () => {
    it('envia a política com nonce na resposta', () => {
        const res = middleware(request('/meus-treinos'));
        const csp = res.headers.get('content-security-policy');
        expect(nonceOf(csp)).toBeTruthy();
    });

    // O Next só aplica o nonce aos scripts dele se encontrar a política no
    // header da REQUISIÇÃO que chega na renderização. O layout lê o mesmo
    // nonce de `x-nonce` para os <script> escritos à mão. Os três precisam
    // bater, senão os scripts saem com um nonce e a resposta exige outro.
    it('repassa à renderização o mesmo nonce que vai na resposta', () => {
        const res = middleware(request('/meus-treinos'));
        const responseCsp = res.headers.get('content-security-policy');
        const nonce = nonceOf(responseCsp);

        expect(res.headers.get('x-middleware-request-x-nonce')).toBe(nonce);
        expect(
            res.headers.get('x-middleware-request-content-security-policy'),
        ).toBe(responseCsp);
    });

    it('gera um nonce novo a cada requisição', () => {
        const a = nonceOf(
            middleware(request('/app')).headers.get('content-security-policy'),
        );
        const b = nonceOf(
            middleware(request('/app')).headers.get('content-security-policy'),
        );
        expect(a).not.toBe(b);
    });
});

describe('middleware — gate de /admin', () => {
    it('manda aluno para /app', () => {
        const res = middleware(request('/admin', 'student'));
        expect(res.status).toBe(307);
        expect(new URL(res.headers.get('location')!).pathname).toBe('/app');
    });

    it('manda personal para /personal', () => {
        const res = middleware(request('/admin/usuarios', 'personal'));
        expect(res.status).toBe(307);
        expect(new URL(res.headers.get('location')!).pathname).toBe('/personal');
    });

    it('deixa admin e editor de conteúdo passarem, com CSP', () => {
        for (const role of ['admin', 'content_editor']) {
            const res = middleware(request('/admin', role));
            expect(res.headers.get('location')).toBeNull();
            expect(nonceOf(res.headers.get('content-security-policy'))).toBeTruthy();
        }
    });

    // Sessão anterior ao cookie de papel: o guard client-side decide.
    it('deixa passar quem não tem cookie de papel', () => {
        const res = middleware(request('/admin'));
        expect(res.headers.get('location')).toBeNull();
    });
});
