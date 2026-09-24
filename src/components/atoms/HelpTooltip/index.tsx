'use client';

import React, {
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
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
    /** Título em destaque acima do texto (ex: nome da técnica selecionada). */
    title?: string;
    /** Passo a passo numerado exibido abaixo do texto. */
    steps?: string[];
}

const BUBBLE_WIDTH = 240;
/** Com passo a passo o balão fica mais largo, senão a lista vira uma coluna
 * estreita e alta demais. */
const BUBBLE_WIDTH_WITH_STEPS = 320;
const VIEWPORT_MARGIN = 12;
/** Distância entre o "?" e a borda do balão (o rabicho ocupa esse vão). */
const TRIGGER_GAP = 10;
/** Folga lateral mínima para o rabicho não vazar da borda arredondada. */
const TAIL_INSET = 16;
const MIN_BUBBLE_HEIGHT = 96;
/** Carência ao sair do gatilho, para dar tempo de levar o mouse até o balão. */
const HOVER_CLOSE_DELAY = 160;

type Placement = 'top' | 'bottom';

interface BubblePos {
    left: number;
    top: number;
    width: number;
    /** Definido só quando o balão não cabe inteiro no espaço disponível. */
    maxHeight: number | null;
    placement: Placement;
    /** Posição do rabicho dentro do balão; null quando ele não encosta no "?". */
    tailLeft: number | null;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

/** Balão de ajuda estilo diálogo de RPG: abre com hover (ponteiro fino) ou
 * toque (mobile/WebView), mostra uma explicação curta e um link para a página
 * de ajuda completa.
 *
 * Sempre renderizado via portal em document.body e posicionado a partir do
 * retângulo do gatilho: qualquer ancestral com overflow (ex.: o corpo
 * rolável de Modal) cortaria o balão se ele ficasse no fluxo normal do DOM.
 *
 * O balão abre acima do "?" quando há espaço e vira para baixo quando não há
 * — é o caso dos itens do menu do Header, que ficam a poucos pixels do topo
 * da viewport e teriam o balão inteiro cortado se ele só soubesse subir. */
export default function HelpTooltip({
    text,
    href,
    linkLabel = 'Saiba mais',
    label = 'Ajuda',
    title,
    steps,
}: HelpTooltipProps) {
    const hasSteps = !!steps && steps.length > 0;
    /** Chave estável do conteúdo: o chamador costuma montar `steps` a cada
     * render, e o array novo não pode disparar uma nova medição do balão. */
    const contentKey = `${title ?? ''}\n${text}\n${hasSteps ? steps.join('\n') : ''}`;
    const [open, setOpen] = useState(false);
    /** Telas estreitas viram caixa de diálogo fixa no rodapé. */
    const [sheetMode, setSheetMode] = useState(false);
    /** Só abre no hover quando existe ponteiro de verdade: num toque o
     * navegador emula mouseenter antes do click, e o par abrir + alternar
     * fecharia o balão no mesmo toque que o abriu. */
    const [canHover, setCanHover] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [pos, setPos] = useState<BubblePos | null>(null);
    const wrapperRef = useRef<HTMLSpanElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const bubbleRef = useRef<HTMLSpanElement>(null);
    const closeTimer = useRef<number | null>(null);
    /** Altura natural do balão, medida uma vez por abertura. Não pode ser
     * remedida depois: a partir da 2ª passada o React já aplicou max-height
     * inline, e limpar esse estilo por fora faria o diff do React achar que
     * não há nada para reaplicar. */
    const naturalHeight = useRef<number | null>(null);
    const bubbleId = useId();

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        const sheetMql = window.matchMedia('(max-width: 640px)');
        const hoverMql = window.matchMedia(
            '(hover: hover) and (pointer: fine)',
        );
        const sync = () => {
            setSheetMode(sheetMql.matches);
            setCanHover(hoverMql.matches);
        };
        sync();
        sheetMql.addEventListener('change', sync);
        hoverMql.addEventListener('change', sync);
        return () => {
            sheetMql.removeEventListener('change', sync);
            hoverMql.removeEventListener('change', sync);
        };
    }, []);

    const cancelClose = useCallback(() => {
        if (closeTimer.current !== null) {
            window.clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
    }, []);

    const scheduleClose = useCallback(() => {
        cancelClose();
        closeTimer.current = window.setTimeout(() => {
            closeTimer.current = null;
            setOpen(false);
        }, HOVER_CLOSE_DELAY);
    }, [cancelClose]);

    useEffect(() => cancelClose, [cancelClose]);

    useLayoutEffect(() => {
        naturalHeight.current = null;
        if (!open || sheetMode) {
            // A largura escrita na medição abaixo não passa pelo React, então
            // ela não seria removida ao virar caixa de rodapé (onde o balão
            // ocupa a linha inteira e não recebe estilo inline).
            if (bubbleRef.current) bubbleRef.current.style.width = '';
            setPos(null);
            return;
        }

        const updatePosition = () => {
            const trigger = triggerRef.current;
            const bubble = bubbleRef.current;
            if (!trigger || !bubble) return;

            const rect = trigger.getBoundingClientRect();
            const vw =
                document.documentElement.clientWidth || window.innerWidth;
            const vh =
                document.documentElement.clientHeight || window.innerHeight;
            const width = Math.min(
                hasSteps ? BUBBLE_WIDTH_WITH_STEPS : BUBBLE_WIDTH,
                vw - VIEWPORT_MARGIN * 2,
            );

            // A altura só é conhecida com a largura final aplicada. Na 1ª
            // passada o balão já está no DOM (invisível, ainda sem estilo do
            // React), então medimos nele mesmo em vez de chutar um valor.
            if (naturalHeight.current === null) {
                bubble.style.width = `${width}px`;
                naturalHeight.current = bubble.offsetHeight;
            }
            const height = naturalHeight.current;

            const spaceAbove = rect.top - VIEWPORT_MARGIN - TRIGGER_GAP;
            const spaceBelow = vh - rect.bottom - VIEWPORT_MARGIN - TRIGGER_GAP;
            const placement: Placement =
                height <= spaceAbove
                    ? 'top'
                    : height <= spaceBelow
                      ? 'bottom'
                      : spaceBelow > spaceAbove
                        ? 'bottom'
                        : 'top';

            const available = placement === 'top' ? spaceAbove : spaceBelow;
            const maxHeight =
                height > available
                    ? Math.max(available, MIN_BUBBLE_HEIGHT)
                    : null;
            const finalHeight = maxHeight ?? height;

            const left = clamp(
                rect.left + rect.width / 2 - width / 2,
                VIEWPORT_MARGIN,
                Math.max(VIEWPORT_MARGIN, vw - width - VIEWPORT_MARGIN),
            );
            const wantedTop =
                placement === 'top'
                    ? rect.top - TRIGGER_GAP - finalHeight
                    : rect.bottom + TRIGGER_GAP;
            const top = clamp(
                wantedTop,
                VIEWPORT_MARGIN,
                Math.max(VIEWPORT_MARGIN, vh - finalHeight - VIEWPORT_MARGIN),
            );

            // O rabicho só aparece se, depois dos clamps, o balão continuar
            // encostado no "?": apontar para o lugar errado é pior que não ter.
            const centerX = rect.left + rect.width / 2;
            const tailFits =
                Math.abs(top - wantedTop) < 1 &&
                centerX >= left + TAIL_INSET &&
                centerX <= left + width - TAIL_INSET;

            setPos({
                left,
                top,
                width,
                maxHeight,
                placement,
                tailLeft: tailFits ? centerX - left : null,
            });
        };

        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [open, sheetMode, contentKey, hasSteps]);

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
            cancelClose();
            setOpen(false);
        }

        function handleKey(event: KeyboardEvent) {
            if (event.key !== 'Escape') return;
            cancelClose();
            setOpen(false);
            triggerRef.current?.focus();
        }

        document.addEventListener('mousedown', handleOutside);
        document.addEventListener('touchstart', handleOutside);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('touchstart', handleOutside);
            document.removeEventListener('keydown', handleKey);
        };
    }, [open, cancelClose]);

    const bubbleStyle: React.CSSProperties | undefined = sheetMode
        ? undefined
        : pos
          ? {
                left: pos.left,
                top: pos.top,
                width: pos.width,
                maxHeight: pos.maxHeight ?? undefined,
                overflowY: pos.maxHeight ? 'auto' : undefined,
            }
          : // Primeira passada: precisa estar no DOM para ser medido, mas
            // ainda não se sabe onde ele cabe.
            { visibility: 'hidden' };

    const bubbleClassName = `${styles.bubble}${
        !sheetMode && pos?.placement === 'bottom'
            ? ` ${styles.bubbleBelow}`
            : ''
    }`;

    const bubbleContent = (
        <>
            <span
                className={styles.backdrop}
                aria-hidden="true"
                onClick={() => {
                    cancelClose();
                    setOpen(false);
                }}
            />
            <span
                className={bubbleClassName}
                role="tooltip"
                id={bubbleId}
                ref={bubbleRef}
                style={bubbleStyle}
                onMouseEnter={canHover ? cancelClose : undefined}
                onMouseLeave={canHover ? scheduleClose : undefined}
            >
                <button
                    type="button"
                    className={styles.bubbleClose}
                    aria-label="Fechar ajuda"
                    onClick={(event) => {
                        event.stopPropagation();
                        cancelClose();
                        setOpen(false);
                    }}
                >
                    <FiX />
                </button>
                {title && (
                    <span className={styles.bubbleTitle}>{title}</span>
                )}
                <span className={styles.bubbleText}>{text}</span>
                {hasSteps && (
                    <ol className={styles.bubbleSteps}>
                        {steps.map((step, i) => (
                            <li key={i}>{step}</li>
                        ))}
                    </ol>
                )}
                <Link
                    href={href}
                    className={styles.bubbleLink}
                    onClick={() => {
                        cancelClose();
                        setOpen(false);
                    }}
                >
                    {linkLabel} <FiChevronRight />
                </Link>
                {!sheetMode && pos?.tailLeft != null && (
                    <span
                        className={`${styles.bubbleTail}${
                            pos.placement === 'bottom'
                                ? ` ${styles.bubbleTailUp}`
                                : ''
                        }`}
                        aria-hidden="true"
                        style={{ left: pos.tailLeft }}
                    />
                )}
            </span>
        </>
    );

    return (
        <span
            className={styles.wrapper}
            ref={wrapperRef}
            onMouseEnter={
                canHover
                    ? () => {
                          cancelClose();
                          setOpen(true);
                      }
                    : undefined
            }
            onMouseLeave={canHover ? scheduleClose : undefined}
        >
            <button
                type="button"
                ref={triggerRef}
                className={styles.trigger}
                aria-label={label}
                aria-expanded={open}
                aria-describedby={open ? bubbleId : undefined}
                onClick={(event) => {
                    event.stopPropagation();
                    cancelClose();
                    setOpen((prev) => !prev);
                }}
            >
                ?
            </button>
            {open && mounted && createPortal(bubbleContent, document.body)}
        </span>
    );
}
