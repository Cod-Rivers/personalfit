import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const clearSession = vi.fn(() => Promise.resolve());
vi.mock('@/libs/session', () => ({
    clearSession: () => clearSession(),
    getRefreshToken: () => null,
    getUser: () => null,
    saveSession: vi.fn(),
}));

import { Api } from './api';

type Rejected = (error: unknown) => Promise<unknown>;

// O axios guarda os interceptors em `handlers`; o de resposta é o único aqui.
function responseErrorHandler(): Rejected {
    const handlers = (Api.interceptors.response as unknown as {
        handlers: { rejected: Rejected }[];
    }).handlers;
    return handlers[0].rejected;
}

function suspendedError(url: string) {
    return {
        config: { url, headers: {} },
        response: { status: 403, data: { code: 'account_suspended', error: 'suspensa' } },
    };
}

describe('Api: conta suspensa', () => {
    const originalLocation = window.location;
    let href = '';

    beforeEach(() => {
        clearSession.mockClear();
        href = '';
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: {
                get href() {
                    return href;
                },
                set href(v: string) {
                    href = v;
                },
            },
        });
    });

    afterEach(() => {
        Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    });

    it('encerra a sessão e leva ao login com o motivo, sem tentar renovar', async () => {
        await expect(responseErrorHandler()(suspendedError('/students'))).rejects.toBeTruthy();
        await Promise.resolve();
        expect(clearSession).toHaveBeenCalledTimes(1);
        expect(href).toBe('/?reason=account_suspended');
    });

    it('no próprio POST /login não redireciona: a tela mostra a mensagem', async () => {
        await expect(responseErrorHandler()(suspendedError('/login'))).rejects.toBeTruthy();
        await Promise.resolve();
        expect(clearSession).not.toHaveBeenCalled();
        expect(href).toBe('');
    });
});
