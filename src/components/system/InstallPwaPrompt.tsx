'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { FiX, FiUpload } from 'react-icons/fi';
import { isInsideNativeApp } from '@/libs/androidApp';
import s from './InstallPwaPrompt.module.css';

const DISMISS_KEY = 'venafit_install_prompt_dismissed_at';
const DISMISS_DAYS = 14;

// Mesmas rotas públicas/de autenticação de HeaderCondicional. O banner fixo
// no rodapé cobria o formulário nessas páginas — em especial o botão
// "Cadastrar" no iOS, onde o modo 'ios' é sempre uma faixa fixa (sem
// beforeinstallprompt do navegador). Também não faz sentido convidar um
// visitante ainda não cadastrado a instalar o app.
const PUBLIC_PATHS = ['/', '/cadastro', '/esqueceu-senha'];

function isPublicPath(pathname: string): boolean {
    return (
        PUBLIC_PATHS.includes(pathname) ||
        pathname.startsWith('/cadastro/') ||
        pathname.startsWith('/redefinir-senha/')
    );
}

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandaloneDisplay(): boolean {
    const nav = navigator as Navigator & { standalone?: boolean };
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        nav.standalone === true
    );
}

function isIos(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function wasRecentlyDismissed(): boolean {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (Number.isNaN(dismissedAt)) return false;
    const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    return daysSince < DISMISS_DAYS;
}

/**
 * Banner que sugere instalar o Venafit como app (Add to Home Screen) para
 * quem está no navegador comum. iOS não expõe um prompt de instalação
 * programático (Apple não permite), então só dá pra mostrar instrução manual;
 * Android/Chrome expõem `beforeinstallprompt`, que dispara a UI nativa do
 * navegador. Nunca aparece dentro do WebView do app Android nativo — ele já
 * é o app.
 */
export default function InstallPwaPrompt() {
    const pathname = usePathname();
    const [mode, setMode] = useState<'none' | 'ios' | 'installable'>('none');
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);

    useEffect(() => {
        if (
            isPublicPath(pathname) ||
            isInsideNativeApp() ||
            isStandaloneDisplay() ||
            wasRecentlyDismissed()
        ) {
            setMode('none');
            return;
        }

        if (isIos()) {
            setMode('ios');
            return;
        }

        function onBeforeInstallPrompt(e: Event) {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setMode('installable');
        }
        window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        return () =>
            window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    }, [pathname]);

    function dismiss() {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setMode('none');
    }

    async function handleInstallClick() {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        dismiss();
    }

    if (mode === 'none') return null;

    return (
        <div className={s.banner} role="dialog" aria-live="polite">
            <button
                type="button"
                className={s.close}
                onClick={dismiss}
                aria-label="Fechar"
            >
                <FiX />
            </button>
            {mode === 'ios' ? (
                <p className={s.text}>
                    Instale o Venafit na tela de início: toque em{' '}
                    <strong>Compartilhar</strong>{' '}
                    <span className={s.shareIcon} aria-hidden="true">
                        <FiUpload />
                    </span>{' '}
                    e depois em <strong>Adicionar à Tela de Início</strong>.
                </p>
            ) : (
                <div className={s.row}>
                    <p className={s.text}>
                        Instale o Venafit para acesso rápido e uso offline.
                    </p>
                    <button
                        type="button"
                        className={s.installBtn}
                        onClick={handleInstallClick}
                    >
                        Instalar
                    </button>
                </div>
            )}
        </div>
    );
}
