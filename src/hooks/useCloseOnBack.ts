'use client';
import { useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { pushModalHistoryEntry } from '@/libs/modalHistory';

/**
 * Enquanto `active`, o botão voltar (WebView Android, navegador, gesto do iOS)
 * chama `onBack` em vez de sair da página. Ver libs/modalHistory.
 *
 * O flushSync é o que deixa o módulo saber, logo depois de chamar `onBack`,
 * se o modal fechou mesmo — se não fechou, ele repõe a entrada.
 */
export function useCloseOnBack(active: boolean, onBack: () => void) {
    const onBackRef = useRef(onBack);
    useEffect(() => {
        onBackRef.current = onBack;
    });

    useEffect(() => {
        if (!active) return;
        return pushModalHistoryEntry(() =>
            flushSync(() => onBackRef.current()),
        );
    }, [active]);
}
