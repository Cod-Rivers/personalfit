'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/system/Toast';
import { getToken } from '@/libs/session';
import { myCheers, toggleCheer, type ResultCard } from '@/libs/resultService';
import ReportResultDialog from './ReportResultDialog';
import { shareResult } from './shareResult';

/** Ações dos cards do mural: aplaudir (com login), denunciar (sem login) e
 *  compartilhar. Devolve os handlers e os elementos a renderizar. */
export function useResultActions(results: ResultCard[], onCount?: (id: string, count: number) => void) {
    const router = useRouter();
    const [cheered, setCheered] = useState<Set<string>>(new Set());
    const [reporting, setReporting] = useState<string | null>(null);
    const [loggedIn, setLoggedIn] = useState(false);
    const { showSuccess, showError, ToastSlot } = useToast();
    const ids = results.map((r) => r.id).join(',');

    useEffect(() => {
        setLoggedIn(!!getToken());
    }, []);

    useEffect(() => {
        if (!loggedIn || !ids) return;
        myCheers(ids.split(','))
            .then(setCheered)
            .catch(() => {});
    }, [loggedIn, ids]);

    const cheer = useCallback(
        async (id: string) => {
            if (!loggedIn) {
                router.push(`/?redirect=${encodeURIComponent(`/resultados/${id}`)}`);
                return;
            }
            try {
                const res = await toggleCheer(id);
                setCheered((prev) => {
                    const next = new Set(prev);
                    if (res.cheered) next.add(id);
                    else next.delete(id);
                    return next;
                });
                onCount?.(id, res.cheers_count);
            } catch {
                showError('Não foi possível aplaudir agora.');
            }
        },
        [loggedIn, router, onCount, showError],
    );

    const share = useCallback(
        async (r: ResultCard) => {
            const outcome = await shareResult(r);
            if (outcome === 'unsupported') showError('Atualize o app para compartilhar imagens.');
            else if (outcome === 'failed') showError('Não foi possível compartilhar agora.');
        },
        [showError],
    );

    const slots = (
        <>
            {ToastSlot}
            <ReportResultDialog
                resultId={reporting}
                onClose={() => setReporting(null)}
                onDone={(msg) => {
                    setReporting(null);
                    showSuccess(msg);
                }}
            />
        </>
    );

    return { cheered, cheer, report: setReporting, share, slots };
}
