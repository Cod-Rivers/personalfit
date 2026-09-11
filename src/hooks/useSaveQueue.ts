'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface Options<TPayload, TResult> {
    persist: (payload: TPayload) => Promise<TResult>;
    onSuccess?: (result: TResult, payload: TPayload) => void;
    onError?: (error: unknown) => void;
}

export interface SaveQueue<TPayload> {
    status: SaveStatus;
    errorMessage: string;
    /** Enfileira um save. Chamadas durante um save em voo são coalescidas. */
    save: (payload: TPayload) => void;
    /** true quando há algo enfileirado ou em voo — usado para avisar antes de fechar. */
    pending: boolean;
    /** Limpa a mensagem de erro sem tentar de novo (ex.: ao reabrir o card). */
    dismissError: () => void;
}

/**
 * Fila de salvamento com UMA requisição em voo por vez.
 *
 * O editor por cards salva a cada card concluído, e o personal navega rápido:
 * sem serializar, dois PUTs do mesmo mesociclo saem juntos e o servidor
 * (read-modify-write do macrociclo inteiro) grava o resultado do que chegar por
 * último, que não é necessariamente o mais recente. Enquanto um save está em
 * voo, novos pedidos só guardam o payload mais novo — pedidos intermediários
 * são descartados de propósito, já que cada payload é o estado completo da fase.
 */
export function useSaveQueue<TPayload, TResult>({
    persist,
    onSuccess,
    onError,
}: Options<TPayload, TResult>): SaveQueue<TPayload> {
    const [status, setStatus] = useState<SaveStatus>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [pending, setPending] = useState(false);

    const inFlight = useRef(false);
    const queued = useRef<{ payload: TPayload } | null>(null);
    const mounted = useRef(true);

    // Callbacks vivem em ref para o `run` não precisar delas como dependência:
    // o editor recria essas funções a cada tecla digitada, e um `run` novo a
    // cada render reabriria a porta para duas requisições concorrentes.
    const persistRef = useRef(persist);
    const onSuccessRef = useRef(onSuccess);
    const onErrorRef = useRef(onError);
    useEffect(() => {
        persistRef.current = persist;
        onSuccessRef.current = onSuccess;
        onErrorRef.current = onError;
    });

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const run = useCallback(async () => {
        if (inFlight.current) return;
        const next = queued.current;
        if (!next) return;

        queued.current = null;
        inFlight.current = true;
        setStatus('saving');

        try {
            const result = await persistRef.current(next.payload);
            onSuccessRef.current?.(result, next.payload);
            if (mounted.current) {
                setStatus('saved');
                setErrorMessage('');
            }
        } catch (e: unknown) {
            const msg =
                (e as { response?: { data?: { error?: string; message?: string } } })
                    ?.response?.data?.error ??
                (e as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message ??
                'Não foi possível salvar. Sua conexão pode ter caído.';
            onErrorRef.current?.(e);
            if (mounted.current) {
                setStatus('error');
                setErrorMessage(msg);
            }
            // O payload que falhou NÃO volta para a fila: ele é o estado
            // completo da fase, e o próximo card salvo já o carrega inteiro.
            // Reenfileirar aqui criaria um laço de retry silencioso contra um
            // erro que pode ser de validação (400), não de rede.
        } finally {
            inFlight.current = false;
            if (queued.current) {
                void run();
            } else if (mounted.current) {
                setPending(false);
            }
        }
    }, []);

    const save = useCallback(
        (payload: TPayload) => {
            queued.current = { payload };
            setPending(true);
            void run();
        },
        [run],
    );

    const dismissError = useCallback(() => {
        setErrorMessage('');
        setStatus('idle');
    }, []);

    return { status, errorMessage, save, pending, dismissError };
}
