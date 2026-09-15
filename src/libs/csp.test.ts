import { describe, expect, it } from 'vitest';
import { buildPageCsp, buildServiceWorkerCsp, generateNonce } from './csp';

/** Valor de uma diretiva, sem o nome. */
function directive(csp: string, name: string): string {
    const found = csp
        .split('; ')
        .find((d) => d === name || d.startsWith(`${name} `));
    return found === undefined ? '' : found.slice(name.length).trim();
}

describe('generateNonce', () => {
    it('gera 128 bits em base64, diferente a cada chamada', () => {
        const a = generateNonce();
        const b = generateNonce();
        // 16 bytes em base64 = 24 caracteres com padding.
        expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
        expect(a).not.toBe(b);
    });
});

describe('buildPageCsp', () => {
    const prod = buildPageCsp({ nonce: 'abc123', isDev: false });
    const dev = buildPageCsp({ nonce: 'abc123', isDev: true });

    it('só confia em script com o nonce da requisição', () => {
        const scriptSrc = directive(prod, 'script-src');
        expect(scriptSrc).toContain("'nonce-abc123'");
        expect(scriptSrc).toContain("'strict-dynamic'");
    });

    // `'unsafe-inline'` fica na lista só como fallback para navegador sem
    // CSP 3. Isso só é seguro enquanto houver nonce: é a presença do nonce
    // que faz o navegador ignorar o `'unsafe-inline'`. Sem nonce, a política
    // voltaria a liberar todo script inline e URI `javascript:`.
    it('nunca tem unsafe-inline em script-src sem um nonce ao lado', () => {
        for (const csp of [prod, dev]) {
            const scriptSrc = directive(csp, 'script-src');
            if (scriptSrc.includes("'unsafe-inline'")) {
                expect(scriptSrc).toMatch(/'nonce-[^']+'/);
            }
        }
    });

    // O Google exige 'unsafe-eval' para as tags de anúncio. Só é aceitável
    // porque o nonce continua sendo exigido para o primeiro script.
    it('libera eval (exigência do AdSense) sempre ao lado do nonce', () => {
        for (const csp of [prod, dev]) {
            const scriptSrc = directive(csp, 'script-src');
            expect(scriptSrc).toContain("'unsafe-eval'");
            expect(scriptSrc).toMatch(/'nonce-[^']+'/);
            expect(scriptSrc).toContain("'strict-dynamic'");
        }
    });

    it('aceita iframe https (anúncios do AdSense), nunca http', () => {
        const frameSrc = directive(prod, 'frame-src');
        expect(frameSrc).toContain('https:');
        expect(frameSrc).not.toMatch(/\bhttp:/);
    });

    it('não aceita http nem websocket em produção', () => {
        const connectSrc = directive(prod, 'connect-src');
        expect(connectSrc).not.toMatch(/\bhttp:/);
        expect(connectSrc).not.toMatch(/\bwss?:/);
        expect(prod).toContain('upgrade-insecure-requests');
    });

    it('mantém o backend local em http funcionando no next dev', () => {
        expect(directive(dev, 'connect-src')).toContain('http:');
        expect(dev).not.toContain('upgrade-insecure-requests');
    });

    it('preserva as travas que não dependem de nonce', () => {
        expect(directive(prod, 'object-src')).toBe("'none'");
        expect(directive(prod, 'base-uri')).toBe("'self'");
        expect(directive(prod, 'form-action')).toBe("'self'");
        expect(directive(prod, 'frame-ancestors')).toBe("'none'");
    });
});

describe('buildServiceWorkerCsp', () => {
    const sw = buildServiceWorkerCsp(false);

    it('deixa o Firebase Messaging carregar via importScripts', () => {
        expect(directive(sw, 'script-src')).toContain('https://www.gstatic.com');
    });

    // `importScripts` não carrega nonce; com strict-dynamic, a allowlist de
    // host seria ignorada e o gstatic, bloqueado.
    it('não usa nonce nem strict-dynamic', () => {
        expect(sw).not.toContain("'strict-dynamic'");
        expect(sw).not.toMatch(/'nonce-/);
    });
});
