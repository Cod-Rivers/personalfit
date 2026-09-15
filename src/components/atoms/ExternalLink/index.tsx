'use client';

import { AnchorHTMLAttributes, useEffect, useState } from 'react';
import { isInsideNativeApp } from '@/libs/androidApp';
import { safeExternalHref } from '@/libs/safeLink';

type ExternalLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
};

/**
 * Link para uma URL externa (ou de terceiros — vídeo, PDF, WhatsApp, anúncio
 * etc.), que funciona tanto no navegador/PWA quanto dentro do app Android.
 *
 * `target="_blank"` NÃO FAZ NADA dentro da WebView das versões do app
 * anteriores ao tratamento de `onCreateWindow` no `MainActivity.kt`: o toque
 * no link não navega, não abre nada, sem erro visível. Essas versões seguem
 * instaladas em aparelhos que não atualizaram, então o link sem `target`
 * continua sendo o caminho que funciona em todas.
 * O clique normal (sem `target`), por outro lado, cai em
 * `shouldOverrideUrlLoading` do lado nativo, que já sabe abrir URL externa
 * no navegador/app correspondente (WhatsApp, Zoom etc.) via `ACTION_VIEW`.
 *
 * Por isso: dentro do app, renderiza um link comum (mesma janela — o próprio
 * WebView nem chega a navegar, o Android intercepta antes). No navegador/PWA,
 * mantém `target="_blank"` para não tirar o usuário do app.
 *
 * É também o ponto único por onde passa TODO link de terceiro do app, e por
 * isso o lugar certo para barrar esquema perigoso (ver libs/safeLink.ts).
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

    const safeHref = safeExternalHref(href);

    // O que não for http(s) não vira <a>: um href `javascript:` executaria no
    // clique em navegador sem CSP nível 3 (ver libs/safeLink.ts) e o JWT
    // está em localStorage. Renderiza como texto em vez de sumir com o
    // conteúdo — esconder faria o usuário achar que a tela quebrou, e o
    // rótulo ("Entrar na reunião") ainda informa o que deveria haver ali.
    if (safeHref === null) {
        const { className, title, 'aria-label': ariaLabel } = rest;
        return (
            <span className={className} title={title} aria-label={ariaLabel}>
                {children}
            </span>
        );
    }

    if (insideApp) {
        return (
            <a href={safeHref} {...rest}>
                {children}
            </a>
        );
    }

    return (
        <a
            href={safeHref}
            target="_blank"
            rel={rel ?? 'noopener noreferrer'}
            {...rest}
        >
            {children}
        </a>
    );
}
