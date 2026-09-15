import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    NATIVE_REPLY_TIMEOUT_MS,
    canShareImageNatively,
    hasHardenedNativeBridge,
    hasNativeBilling,
    nativeAuthClear,
    nativeAuthSave,
    nativeBillingAvailable,
    nativeBillingPurchase,
    nativeShareImage,
    nativeShareText,
} from './nativeBridge';

/**
 * O que estes testes protegem: a escolha entre o canal restrito por origem
 * (`window.VenafitNative`) e as interfaces antigas, e o protocolo de mensagem
 * que o NativeBridge.kt espera. Um campo com nome errado aqui não quebra
 * build nenhum — só faz a compra, o compartilhamento ou o widget pararem de
 * funcionar dentro do app, em silêncio.
 */

type Win = Record<string, unknown>;
type Reply = { ok: boolean; result?: unknown; error?: string } | undefined;

/** Imita o objeto que o Android injeta: responde de forma assíncrona. */
function installPort(
    respond: (msg: Record<string, unknown>) => Reply = () => undefined,
) {
    const listeners: ((event: { data: unknown }) => void)[] = [];
    const sent: Record<string, unknown>[] = [];
    const port = {
        postMessage: vi.fn((raw: string) => {
            const msg = JSON.parse(raw) as Record<string, unknown>;
            sent.push(msg);
            const reply = respond(msg);
            if (reply && typeof msg.id === 'string') {
                void Promise.resolve().then(() =>
                    listeners.forEach((l) =>
                        l({ data: JSON.stringify({ id: msg.id, ...reply }) }),
                    ),
                );
            }
        }),
        addEventListener: (
            _type: string,
            l: (event: { data: unknown }) => void,
        ) => {
            listeners.push(l);
        },
        emitRaw: (data: unknown) => listeners.forEach((l) => l({ data })),
    };
    (window as unknown as Win).VenafitNative = port;
    return { port, sent };
}

afterEach(() => {
    vi.useRealTimers();
    for (const key of [
        'VenafitNative',
        'VenafitAuth',
        'VenafitShare',
        'VenafitBilling',
    ]) {
        delete (window as unknown as Win)[key];
    }
});

describe('detecção do canal restrito', () => {
    it('só existe quando o app injeta VenafitNative', () => {
        expect(hasHardenedNativeBridge()).toBe(false);
        installPort();
        expect(hasHardenedNativeBridge()).toBe(true);
    });
});

describe('sessão do widget', () => {
    it('usa o canal restrito e ignora a interface antiga quando os dois existem', () => {
        const legacy = { save: vi.fn(), clear: vi.fn() };
        (window as unknown as Win).VenafitAuth = legacy;
        const { sent } = installPort();

        nativeAuthSave('jwt-123');
        nativeAuthClear();

        expect(sent).toEqual([
            { bridge: 'auth', action: 'save', token: 'jwt-123' },
            { bridge: 'auth', action: 'clear' },
        ]);
        expect(legacy.save).not.toHaveBeenCalled();
        expect(legacy.clear).not.toHaveBeenCalled();
    });

    it('cai na interface antiga em versão do app sem o canal', () => {
        const legacy = { save: vi.fn(), clear: vi.fn() };
        (window as unknown as Win).VenafitAuth = legacy;

        nativeAuthSave('jwt-123');
        nativeAuthClear();

        expect(legacy.save).toHaveBeenCalledWith('jwt-123');
        expect(legacy.clear).toHaveBeenCalledTimes(1);
    });

    it('nunca lança, mesmo com a ponte quebrada', () => {
        (window as unknown as Win).VenafitAuth = {
            save: () => {
                throw new Error('ponte quebrada');
            },
            clear: vi.fn(),
        };
        expect(() => nativeAuthSave('x')).not.toThrow();
    });
});

describe('compartilhamento', () => {
    it('manda a imagem pelo canal e devolve a resposta do app', async () => {
        const { sent } = installPort(() => ({ ok: true, result: true }));

        expect(canShareImageNatively()).toBe(true);
        expect(await nativeShareImage('QUJD', 'image/jpeg', 'legenda')).toBe(true);
        expect(sent[0]).toMatchObject({
            bridge: 'share',
            action: 'shareImage',
            base64: 'QUJD',
            mimeType: 'image/jpeg',
            text: 'legenda',
        });
    });

    it('devolve false quando o app responde com erro', async () => {
        installPort(() => ({ ok: false, error: 'sem app para receber' }));
        expect(await nativeShareText('oi')).toBe(false);
    });

    it('devolve false quando o app não responde a tempo', async () => {
        vi.useFakeTimers();
        installPort(() => undefined);

        const result = nativeShareImage('QUJD', 'image/jpeg', '');
        await vi.advanceTimersByTimeAsync(NATIVE_REPLY_TIMEOUT_MS);

        expect(await result).toBe(false);
    });

    it('ignora resposta que não é JSON ou não tem id conhecido', async () => {
        const { port } = installPort(() => ({ ok: true, result: true }));
        const result = nativeShareText('oi');
        port.emitRaw('não é json');
        port.emitRaw(JSON.stringify({ id: 'outro', ok: true, result: false }));
        expect(await result).toBe(true);
    });
});

describe('Google Play Billing', () => {
    it('pergunta a disponibilidade pelo canal', async () => {
        const { sent } = installPort((msg) =>
            msg.action === 'isAvailable' ? { ok: true, result: true } : undefined,
        );
        expect(await nativeBillingAvailable()).toBe(true);
        expect(sent[0]).toMatchObject({ bridge: 'billing', action: 'isAvailable' });
    });

    it('envia a compra com o accountId pelo canal, sem tocar a interface antiga', () => {
        const legacy = { isAvailable: () => true, purchase: vi.fn() };
        (window as unknown as Win).VenafitBilling = legacy;
        const { sent } = installPort();

        nativeBillingPurchase('pro_mensal', 'subs', 'user-1');

        expect(sent).toEqual([
            {
                bridge: 'billing',
                action: 'purchase',
                productId: 'pro_mensal',
                productType: 'subs',
                accountId: 'user-1',
            },
        ]);
        expect(legacy.purchase).not.toHaveBeenCalled();
    });

    it('usa a interface antiga em versão do app sem o canal', async () => {
        const legacy = { isAvailable: () => true, purchase: vi.fn() };
        (window as unknown as Win).VenafitBilling = legacy;

        expect(hasNativeBilling()).toBe(true);
        expect(await nativeBillingAvailable()).toBe(true);
        nativeBillingPurchase('plano', 'inapp', 'user-2');
        expect(legacy.purchase).toHaveBeenCalledWith('plano', 'inapp', 'user-2');
    });

    it('recusa a compra fora do app', () => {
        expect(hasNativeBilling()).toBe(false);
        expect(() => nativeBillingPurchase('pro', 'subs', 'u')).toThrow(
            /indisponível/,
        );
    });
});
