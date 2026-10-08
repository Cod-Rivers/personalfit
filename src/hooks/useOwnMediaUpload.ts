'use client';

import { useEffect, useState } from 'react';
import { Api } from '@/libs/api';
import { sessionHasFullPro } from '@/libs/session';

/** Cache da resposta na aba: a pergunta é a mesma em todo o editor. */
let authorCache: boolean | null = null;

/** GET /me/store-author — a conta é de um autor da loja com a loja ligada. */
export async function fetchIsStoreAuthor(): Promise<boolean> {
    if (authorCache !== null) return authorCache;
    try {
        const { data } = await Api.get<{ is_author: boolean }>(
            '/me/store-author',
        );
        authorCache = !!data?.is_author;
    } catch {
        authorCache = false;
    }
    return authorCache;
}

/** Enviar vídeo próprio (arquivo) num exercício: PRO, ou autor da loja de
 *  programas (Todo/PLANO_LOJA_DE_TREINOS.md §5.10 — o autor envia o vídeo do
 *  exercício que falta no app mesmo sem o PRO). O backend decide de novo;
 *  isto só evita a tela oferecer o que vai dar 403. */
export function useOwnMediaUpload(): boolean {
    const [allowed, setAllowed] = useState(false);
    useEffect(() => {
        if (sessionHasFullPro()) {
            setAllowed(true);
            return;
        }
        let cancelled = false;
        void fetchIsStoreAuthor().then((isAuthor) => {
            if (!cancelled) setAllowed(isAuthor);
        });
        return () => {
            cancelled = true;
        };
    }, []);
    return allowed;
}
