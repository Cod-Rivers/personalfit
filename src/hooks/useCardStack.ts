'use client';

import { useCallback, useMemo, useState } from 'react';

export interface CardStack<T> {
    /** Card visível agora — o topo da pilha. */
    current: T;
    /** 0 = card raiz. Usado para decidir se o header mostra o botão voltar. */
    depth: number;
    /** Toda a pilha, da raiz ao topo — serve para montar a trilha do header. */
    trail: T[];
    push: (card: T) => void;
    /** Sai do card atual. Na raiz não faz nada (quem fecha o modal é o chamador). */
    pop: () => void;
    /** Troca o card do topo sem crescer a pilha (ex.: mudar de aba dentro do card). */
    replace: (card: T) => void;
    /** Volta para a raiz e empilha o card pedido — usado ao levar o usuário até um erro. */
    resetTo: (card: T) => void;
}

/**
 * Pilha de navegação para um modal que troca de conteúdo em vez de abrir outro
 * modal por cima.
 *
 * Modais aninhados seriam o caminho óbvio, mas cada instância de
 * `components/system/Modal` traz backdrop próprio, trava de scroll do body e
 * uma entrada na pilha de Escape; com quatro níveis (fase → treinos → treino →
 * exercício) o resultado é uma pilha de folhas e um Escape que fecha a coisa
 * errada. Aqui o modal é sempre um só, e o que muda é o card renderizado.
 */
export function useCardStack<T>(root: T): CardStack<T> {
    const [stack, setStack] = useState<T[]>([root]);

    const push = useCallback((card: T) => setStack((s) => [...s, card]), []);

    const pop = useCallback(
        () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
        [],
    );

    const replace = useCallback(
        (card: T) => setStack((s) => [...s.slice(0, -1), card]),
        [],
    );

    const resetTo = useCallback(
        (card: T) =>
            setStack((s) => {
                const base = s[0];
                return base === card ? [base] : [base, card];
            }),
        [],
    );

    return useMemo(
        () => ({
            current: stack[stack.length - 1],
            depth: stack.length - 1,
            trail: stack,
            push,
            pop,
            replace,
            resetTo,
        }),
        [stack, push, pop, replace, resetTo],
    );
}
