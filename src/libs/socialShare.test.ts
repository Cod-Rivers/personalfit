import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { buildCaption, shareImage, shareText } from './socialShare';

/**
 * O que estes testes protegem: a ORDEM em que o compartilhamento tenta cada
 * caminho, e o desfecho que cada um devolve.
 *
 * Isso importa porque cada ambiente falha de um jeito diferente e silencioso:
 * dentro da WebView do app, `navigator.share` não existe e baixar blob não
 * funciona; no desktop não há folha de compartilhamento; e "a pessoa fechou a
 * folha" chega como exceção (AbortError), que tratada como erro faria a tela
 * acusar falha de algo que funcionou.
 */

const APP_UA =
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 VenafitApp/1.0';
const BROWSER_UA =
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36';

function setUserAgent(ua: string) {
    Object.defineProperty(navigator, 'userAgent', {
        value: ua,
        configurable: true,
    });
}

function fakeFile() {
    return new File(['conteudo-da-imagem'], 'venafit.jpg', {
        type: 'image/jpeg',
    });
}

describe('shareImage', () => {
    beforeEach(() => {
        setUserAgent(BROWSER_UA);
        delete (window as unknown as Record<string, unknown>).VenafitShare;
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        delete (window as unknown as Record<string, unknown>).VenafitShare;
    });

    it('usa a ponte nativa quando está dentro do app Android', async () => {
        setUserAgent(APP_UA);
        const shareImageSpy = vi.fn().mockReturnValue(true);
        (window as unknown as Record<string, unknown>).VenafitShare = {
            isAvailable: () => true,
            shareImage: shareImageSpy,
        };
        // A folha do sistema até existiria neste ambiente de teste, e mesmo
        // assim a ponte tem precedência: dentro da WebView, `navigator.share`
        // não existe de verdade — e onde existir, a ponte é o caminho testado.
        const shareSpy = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal('navigator', {
            ...navigator,
            share: shareSpy,
            canShare: () => true,
            userAgent: APP_UA,
        });

        expect(await shareImage(fakeFile(), 'legenda')).toBe('shared');
        expect(shareImageSpy).toHaveBeenCalledTimes(1);
        expect(shareSpy).not.toHaveBeenCalled();
        // base64 puro, sem o prefixo `data:` — é o contrato do ShareBridge.
        const [base64, mime, text] = shareImageSpy.mock.calls[0];
        expect(base64.startsWith('data:')).toBe(false);
        expect(mime).toBe('image/jpeg');
        expect(text).toBe('legenda');
    });

    it('ignora a ponte que se declara indisponível', async () => {
        setUserAgent(APP_UA);
        const shareImageSpy = vi.fn().mockReturnValue(true);
        (window as unknown as Record<string, unknown>).VenafitShare = {
            isAvailable: () => false,
            shareImage: shareImageSpy,
        };
        vi.stubGlobal('navigator', {
            ...navigator,
            share: undefined,
            canShare: undefined,
            userAgent: APP_UA,
        });

        // Sem ponte utilizável E dentro do app: baixar não funciona ali, então
        // o honesto é dizer que não dá — nunca fingir que compartilhou.
        expect(await shareImage(fakeFile(), 'legenda')).toBe('unsupported');
        expect(shareImageSpy).not.toHaveBeenCalled();
    });

    it('usa a folha do sistema no navegador', async () => {
        const shareSpy = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal('navigator', {
            ...navigator,
            share: shareSpy,
            canShare: () => true,
            userAgent: BROWSER_UA,
        });

        expect(await shareImage(fakeFile(), 'legenda')).toBe('shared');
        expect(shareSpy).toHaveBeenCalledTimes(1);
    });

    it('trata o fechamento da folha como desistência, não como erro', async () => {
        const abort = new DOMException('cancelado', 'AbortError');
        vi.stubGlobal('navigator', {
            ...navigator,
            share: vi.fn().mockRejectedValue(abort),
            canShare: () => true,
            userAgent: BROWSER_UA,
        });

        expect(await shareImage(fakeFile(), 'legenda')).toBe('dismissed');
    });

    it('cai para o download quando não há folha de compartilhamento', async () => {
        vi.stubGlobal('navigator', {
            ...navigator,
            share: undefined,
            canShare: undefined,
            userAgent: BROWSER_UA,
        });
        vi.stubGlobal('URL', {
            ...URL,
            createObjectURL: vi.fn().mockReturnValue('blob:fake'),
            revokeObjectURL: vi.fn(),
        });

        expect(await shareImage(fakeFile(), 'legenda')).toBe('downloaded');
    });

    it('não tenta arquivo quando canShare recusa aquele arquivo', async () => {
        const shareSpy = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal('navigator', {
            ...navigator,
            share: shareSpy,
            // Alguns navegadores têm `share` mas não aceitam arquivo; chamar
            // assim mesmo lança TypeError em vez de compartilhar.
            canShare: () => false,
            userAgent: BROWSER_UA,
        });
        vi.stubGlobal('URL', {
            ...URL,
            createObjectURL: vi.fn().mockReturnValue('blob:fake'),
            revokeObjectURL: vi.fn(),
        });

        expect(await shareImage(fakeFile(), 'legenda')).toBe('downloaded');
        expect(shareSpy).not.toHaveBeenCalled();
    });
});

describe('shareText', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        delete (window as unknown as Record<string, unknown>).VenafitShare;
    });

    it('copia para a área de transferência quando não há folha nem ponte', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal('navigator', {
            ...navigator,
            share: undefined,
            clipboard: { writeText },
            userAgent: BROWSER_UA,
        });

        expect(await shareText('vem treinar', 'https://exemplo.test/d/1')).toBe(
            'downloaded',
        );
        expect(writeText).toHaveBeenCalledWith(
            'vem treinar\nhttps://exemplo.test/d/1',
        );
    });
});

describe('buildCaption', () => {
    it('descarta linhas vazias e assina com o endereço do app', () => {
        const caption = buildCaption(['Treino A concluído.', '', 'Mais um dia']);
        const linhas = caption.split('\n');

        expect(linhas[0]).toBe('Treino A concluído.');
        expect(linhas).toContain('Mais um dia');
        // A assinatura é o ponto da legenda: sem ela, o post não leva ninguém
        // de volta ao app.
        expect(caption).toContain('Treine com o Venafit');
        expect(caption).toContain(window.location.host);
    });
});
