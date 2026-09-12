import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import HelpTooltip from './index';

const BUBBLE_HEIGHT = 120;

function mockMatchMedia(overrides: Record<string, boolean>) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: overrides[query] ?? false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
}

/** Ponteiro fino com hover (desktop), balão flutuante. */
function asDesktop() {
    mockMatchMedia({ '(hover: hover) and (pointer: fine)': true });
}

/** Tela de toque larga (tablet/WebView): sem hover, mas ainda não é a caixa
 * de diálogo de rodapé das telas estreitas. */
function asTouch() {
    mockMatchMedia({});
}

function renderTooltip() {
    const utils = render(
        <HelpTooltip text="Explicação curta" href="/ajuda#glossario-rpe" />,
    );
    return {
        ...utils,
        trigger: screen.getByRole('button', { name: 'Ajuda' }),
    };
}

/** Finge o retângulo do "?" na viewport (jsdom não faz layout). */
function placeTrigger(trigger: HTMLElement, top: number) {
    trigger.getBoundingClientRect = () =>
        ({
            top,
            bottom: top + 18,
            left: 500,
            right: 518,
            width: 18,
            height: 18,
            x: 500,
            y: top,
            toJSON: () => ({}),
        }) as DOMRect;
}

describe('HelpTooltip', () => {
    let originalOffsetHeight: PropertyDescriptor | undefined;
    let originalMatchMedia: typeof window.matchMedia;

    beforeEach(() => {
        originalMatchMedia = window.matchMedia;
        originalOffsetHeight = Object.getOwnPropertyDescriptor(
            HTMLElement.prototype,
            'offsetHeight',
        );
        Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
            configurable: true,
            get(this: HTMLElement) {
                return this.getAttribute('role') === 'tooltip'
                    ? BUBBLE_HEIGHT
                    : 0;
            },
        });
    });

    afterEach(() => {
        if (originalOffsetHeight) {
            Object.defineProperty(
                HTMLElement.prototype,
                'offsetHeight',
                originalOffsetHeight,
            );
        }
        window.matchMedia = originalMatchMedia;
        vi.useRealTimers();
    });

    it('abre para baixo quando não cabe acima do gatilho (itens do menu)', () => {
        asDesktop();
        const { trigger } = renderTooltip();
        placeTrigger(trigger, 20);

        fireEvent.click(trigger);

        const bubble = screen.getByRole('tooltip');
        // 18px de base + 10px de vão: abaixo do "?", não cortado no topo.
        expect(bubble.style.top).toBe('48px');
        expect(Number.parseFloat(bubble.style.top)).toBeGreaterThan(20);
    });

    it('abre para cima quando há espaço acima do gatilho', () => {
        asDesktop();
        const { trigger } = renderTooltip();
        placeTrigger(trigger, 400);

        fireEvent.click(trigger);

        const bubble = screen.getByRole('tooltip');
        expect(bubble.style.top).toBe(`${400 - 10 - BUBBLE_HEIGHT}px`);
    });

    it('centraliza no gatilho sem vazar da borda direita da viewport', () => {
        asDesktop();
        const { trigger } = renderTooltip();
        placeTrigger(trigger, 400);

        fireEvent.click(trigger);

        const bubble = screen.getByRole('tooltip');
        const left = Number.parseFloat(bubble.style.left);
        const width = Number.parseFloat(bubble.style.width);
        expect(left).toBeGreaterThanOrEqual(12);
        expect(left + width).toBeLessThanOrEqual(window.innerWidth - 12);
    });

    it('abre no toque: o mouseenter emulado não pode fechar no mesmo toque', () => {
        asTouch();
        const { trigger } = renderTooltip();
        placeTrigger(trigger, 20);

        // Ordem que o navegador usa num toque: mouseenter antes do click.
        fireEvent.mouseEnter(trigger.parentElement as HTMLElement);
        fireEvent.click(trigger);

        expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    it('continua aberto quando o mouse sai do "?" e entra no balão', () => {
        vi.useFakeTimers();
        asDesktop();
        const { trigger } = renderTooltip();
        placeTrigger(trigger, 400);
        const wrapper = trigger.parentElement as HTMLElement;

        fireEvent.mouseEnter(wrapper);
        const bubble = screen.getByRole('tooltip');
        fireEvent.mouseLeave(wrapper);
        fireEvent.mouseEnter(bubble);
        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    it('fecha ao sair do balão e com Escape', () => {
        vi.useFakeTimers();
        asDesktop();
        const { trigger } = renderTooltip();
        placeTrigger(trigger, 400);
        const wrapper = trigger.parentElement as HTMLElement;

        fireEvent.mouseEnter(wrapper);
        fireEvent.mouseLeave(screen.getByRole('tooltip'));
        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

        fireEvent.click(trigger);
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
});
