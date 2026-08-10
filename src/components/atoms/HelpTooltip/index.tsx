'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { FiX, FiChevronRight } from 'react-icons/fi';
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

const BUBBLE_WIDTH = 240;
const VIEWPORT_MARGIN = 12;

/** Balão de ajuda estilo diálogo de RPG: abre com hover (desktop) ou toque
 * (mobile/WebView), mostra uma explicação curta e um link para a página de
 * ajuda completa.
 *
 * Sempre renderizado via portal em document.body e posicionado a partir do
 * retângulo do gatilho: qualquer ancestral com overflow (ex.: o corpo
 * rolável de Modal) cortaria o balão se ele ficasse no fluxo normal do DOM. */
export default function HelpTooltip({
    text,
    href,
    linkLabel = 'Saiba mais',
    label = 'Ajuda',
}: HelpTooltipProps) {
    const [open, setOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [desktopPos, setDesktopPos] = useState<{
        left: number;
        top: number;
        width: number;
        tailLeft: number;
    } | null>(null);
    const wrapperRef = useRef<HTMLSpanElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const bubbleRef = useRef<HTMLSpanElement>(null);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        const mql = window.matchMedia('(max-width: 640px)');
        const update = () => setIsMobile(mql.matches);
        update();
        mql.addEventListener('change', update);
        return () => mql.removeEventListener('change', update);
    }, []);

    useLayoutEffect(() => {
        if (!open || isMobile) {
            setDesktopPos(null);
            return;
        }

        const updatePosition = () => {
            const trigger = triggerRef.current;
            if (!trigger) return;
            const rect = trigger.getBoundingClientRect();
            const width = Math.min(BUBBLE_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
            let left = rect.left + rect.width / 2 - width / 2;
            left = Math.max(
                VIEWPORT_MARGIN,
                Math.min(left, window.innerWidth - width - VIEWPORT_MARGIN),
            );
            const tailLeft = rect.left + rect.width / 2 - left;
            setDesktopPos({
                left,
                top: rect.top - 10,
                width,
                tailLeft,
            });
        };

        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [open, isMobile]);

    useEffect(() => {
        if (!open) return;

        function handleOutside(event: MouseEvent | TouchEvent) {
            const target = event.target as Node;
            if (
                wrapperRef.current?.contains(target) ||
                bubbleRef.current?.contains(target)
            ) {
                return;
            }
            setOpen(false);
        }

        document.addEventListener('mousedown', handleOutside);
        document.addEventListener('touchstart', handleOutside);
        return () => {
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('touchstart', handleOutside);
        };
    }, [open]);

    const desktopBubbleStyle: React.CSSProperties | undefined =
        !isMobile && desktopPos
            ? {
                  position: 'fixed',
                  left: desktopPos.left,
                  top: desktopPos.top,
                  width: desktopPos.width,
                  marginLeft: 0,
                  transform: 'translateY(-100%)',
                  visibility: desktopPos ? 'visible' : 'hidden',
              }
            : !isMobile
              ? { visibility: 'hidden' }
              : undefined;

    const desktopTailStyle: React.CSSProperties | undefined =
        !isMobile && desktopPos
            ? { left: desktopPos.tailLeft }
            : undefined;

    const bubbleContent = (
        <>
            <span
                className={styles.backdrop}
                aria-hidden="true"
                onClick={() => setOpen(false)}
            />
            <span
                className={styles.bubble}
                role="tooltip"
                ref={bubbleRef}
                style={desktopBubbleStyle}
            >
                <button
                    type="button"
                    className={styles.bubbleClose}
                    aria-label="Fechar ajuda"
                    onClick={(event) => {
                        event.stopPropagation();
                        setOpen(false);
                    }}
                >
                    <FiX />
                </button>
                <span className={styles.bubbleText}>{text}</span>
                <Link
                    href={href}
                    className={styles.bubbleLink}
                    onClick={() => setOpen(false)}
                >
                    {linkLabel} <FiChevronRight />
                </Link>
                <span
                    className={styles.bubbleTail}
                    aria-hidden="true"
                    style={desktopTailStyle}
                />
            </span>
        </>
    );

    return (
        <span
            className={styles.wrapper}
            ref={wrapperRef}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
        >
            <button
                type="button"
                ref={triggerRef}
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
            {open && mounted && createPortal(bubbleContent, document.body)}
        </span>
    );
}
