'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './styles.module.css';

interface HelpTooltipProps {
    /** Texto curto explicando o campo/painel. */
    text: string;
    /** Link para a Central de Ajuda (ex: "/ajuda#prontidao"). */
    href: string;
    linkLabel?: string;
    /** Rótulo acessível do botão de gatilho. */
    label?: string;
}

/** Balão de ajuda estilo diálogo de RPG: abre com hover (desktop) ou toque
 * (mobile/WebView), mostra uma explicação curta e um link para a página de
 * ajuda completa. */
export default function HelpTooltip({
    text,
    href,
    linkLabel = 'Saiba mais',
    label = 'Ajuda',
}: HelpTooltipProps) {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (!open) return;

        function handleOutside(event: MouseEvent | TouchEvent) {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        }

        document.addEventListener('mousedown', handleOutside);
        document.addEventListener('touchstart', handleOutside);
        return () => {
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('touchstart', handleOutside);
        };
    }, [open]);

    return (
        <span
            className={styles.wrapper}
            ref={wrapperRef}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
        >
            <button
                type="button"
                className={styles.trigger}
                aria-label={label}
                aria-expanded={open}
                onClick={(event) => {
                    event.stopPropagation();
                    setOpen((prev) => !prev);
                }}
            >
                ?
            </button>
            {open && (
                <>
                    <span
                        className={styles.backdrop}
                        aria-hidden="true"
                        onClick={() => setOpen(false)}
                    />
                    <span className={styles.bubble} role="tooltip">
                        <span className={styles.bubbleText}>{text}</span>
                        <Link
                            href={href}
                            className={styles.bubbleLink}
                            onClick={() => setOpen(false)}
                        >
                            {linkLabel} →
                        </Link>
                        <span
                            className={styles.bubbleTail}
                            aria-hidden="true"
                        />
                    </span>
                </>
            )}
        </span>
    );
}
