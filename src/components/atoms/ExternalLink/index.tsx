'use client';

import { AnchorHTMLAttributes, useEffect, useState } from 'react';
import { isInsideNativeApp } from '@/libs/androidApp';

type ExternalLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
};

/**
 * Link para uma URL externa (ou de terceiros — vídeo, PDF, WhatsApp, anúncio
 * etc.), que funciona tanto no navegador/PWA quanto dentro do app Android.
 *
 * `target="_blank"` simplesmente NÃO FAZ NADA dentro da WebView do app: o
 * `MainActivity.kt` não implementa `onCreateWindow`/`setSupportMultipleWindows`
 * (decisão deliberada — o app só carrega um host confiável, não precisa de
 * abas), então o toque no link não navega, não abre nada, sem erro visível.
 * O clique normal (sem `target`), por outro lado, cai em
 * `shouldOverrideUrlLoading` do lado nativo, que já sabe abrir URL externa
 * no navegador/app correspondente (WhatsApp, Zoom etc.) via `ACTION_VIEW`.
 *
 * Por isso: dentro do app, renderiza um link comum (mesma janela — o próprio
 * WebView nem chega a navegar, o Android intercepta antes). No navegador/PWA,
 * mantém `target="_blank"` para não tirar o usuário do app.
 */
export default function ExternalLink({
    href,
    children,
    rel,
    ...rest
}: ExternalLinkProps) {
    // Evita mismatch de hidratação: no primeiro render (servidor e cliente,
    // antes do useEffect) sempre assume "navegador" — navigator.userAgent só
    // existe no cliente. Web ganha um clique de latência para trocar de
    // comportamento; dentro do app isso é imperceptível.
    const [insideApp, setInsideApp] = useState(false);

    useEffect(() => {
        setInsideApp(isInsideNativeApp());
    }, []);

    if (insideApp) {
        return (
            <a href={href} {...rest}>
                {children}
            </a>
        );
    }

    return (
        <a href={href} target="_blank" rel={rel ?? 'noopener noreferrer'} {...rest}>
            {children}
        </a>
    );
}
