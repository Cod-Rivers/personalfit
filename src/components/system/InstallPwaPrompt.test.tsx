import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import InstallPwaPrompt from './InstallPwaPrompt';

vi.mock('next/navigation', () => ({
    usePathname: () => '/meus-treinos',
}));

// ANDROID_APP_LIVE é uma const no código; o getter deixa cada teste escolher.
const flags = vi.hoisted(() => ({ live: false }));
vi.mock('@/libs/androidApp', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/libs/androidApp')>();
    return {
        ...actual,
        get ANDROID_APP_LIVE() {
            return flags.live;
        },
    };
});

const ANDROID_CHROME =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';
const IPHONE_SAFARI =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

function setUserAgent(ua: string) {
    Object.defineProperty(window.navigator, 'userAgent', {
        value: ua,
        configurable: true,
    });
}

describe('InstallPwaPrompt', () => {
    beforeEach(() => {
        localStorage.clear();
        window.matchMedia = vi
            .fn()
            .mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
    });

    afterEach(() => {
        flags.live = false;
    });

    it('com o app publicado, manda o Android para a Play Store em vez de instalar a PWA', () => {
        flags.live = true;
        setUserAgent(ANDROID_CHROME);

        render(<InstallPwaPrompt />);

        const link = screen.getByRole('link', { name: 'Play Store' });
        expect(link.getAttribute('href')).toContain(
            'play.google.com/store/apps/details?id=com.codriverslabs.venafit',
        );
        expect(screen.queryByRole('button', { name: 'Instalar' })).toBeNull();
    });

    // Antes da aprovação na loja, a ficha dá 404: o Android continua com o
    // atalho da PWA.
    it('com o app ainda não publicado, o Android continua instalando a PWA', () => {
        setUserAgent(ANDROID_CHROME);

        render(<InstallPwaPrompt />);
        expect(screen.queryByRole('link', { name: 'Play Store' })).toBeNull();

        act(() => {
            window.dispatchEvent(new Event('beforeinstallprompt'));
        });
        expect(screen.getByRole('button', { name: 'Instalar' })).toBeInTheDocument();
    });

    it('no iPhone nunca oferece a Play Store', () => {
        flags.live = true;
        setUserAgent(IPHONE_SAFARI);

        render(<InstallPwaPrompt />);

        expect(screen.queryByRole('link', { name: 'Play Store' })).toBeNull();
        expect(screen.getByText(/Adicionar à Tela de Início/)).toBeInTheDocument();
    });
});
