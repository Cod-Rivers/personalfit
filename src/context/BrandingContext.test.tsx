import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { FOREGROUND_REFRESH_MIN_MS } from '@/hooks/useForegroundRefresh';

const responses: unknown[] = [];
vi.mock('@/libs/brandingService', () => ({
    getPersonalBranding: () => Promise.resolve(responses.shift()),
}));

import { BrandingProvider } from './BrandingContext';

function brandingResponse(branding: unknown) {
    return {
        branding,
        personalName: 'Ana',
        effectivePlanType: branding ? 'pro' : 'free',
        adFree: !!branding,
        studentPlus: false,
        studentOverflow: null,
    };
}

// O personal sai do PRO com o app aberto: ao voltar ao app, a marca dele
// some e as cores voltam ao padrão (antes ficavam até recarregar).
describe('BrandingProvider', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        localStorage.setItem('token', 't');
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            get: () => 'visible',
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        document.documentElement.style.removeProperty('--mint');
    });

    it('ao voltar ao app sem a marca do PRO, as cores voltam ao padrão', async () => {
        responses.push(
            brandingResponse({ primary_color: '#ff0000' }),
            brandingResponse(null),
        );
        render(
            <BrandingProvider>
                <p>app</p>
            </BrandingProvider>,
        );
        await act(async () => {
            await Promise.resolve();
        });
        expect(document.documentElement.style.getPropertyValue('--mint')).toBe(
            '#ff0000',
        );

        await act(async () => {
            vi.advanceTimersByTime(FOREGROUND_REFRESH_MIN_MS + 1);
            document.dispatchEvent(new Event('visibilitychange'));
            await Promise.resolve();
        });
        expect(document.documentElement.style.getPropertyValue('--mint')).toBe(
            '',
        );
    });
});
