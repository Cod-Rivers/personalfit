'use client';

import { useEffect, useState } from 'react';
import { FiDownload, FiCheck, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import { MacrocycleResponse } from '@/libs/planningService';
import {
    downloadActivePlanForOffline,
    getOfflineMacrocycle,
    isMacrocycleStale,
} from '@/libs/offline/downloadManager';

interface DownloadOfflineButtonProps {
    macrocycle: MacrocycleResponse;
}

type State =
    | { kind: 'idle' }
    | { kind: 'downloading'; done: number; total: number }
    | { kind: 'downloaded'; downloadedAt: string; stale: boolean; mediaTotal: number; mediaCached: number }
    | { kind: 'error'; message: string };

function formatTimestamp(iso: string): string {
    try {
        return new Date(iso).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return iso;
    }
}

export default function DownloadOfflineButton({ macrocycle }: DownloadOfflineButtonProps) {
    const [state, setState] = useState<State>({ kind: 'idle' });

    useEffect(() => {
        let cancelled = false;
        getOfflineMacrocycle(macrocycle.id).then((stored) => {
            if (cancelled || !stored) return;
            setState({
                kind: 'downloaded',
                downloadedAt: stored.downloadedAt,
                stale: isMacrocycleStale(stored, macrocycle.updated_at),
                mediaTotal: 0,
                mediaCached: 0,
            });
        });
        return () => {
            cancelled = true;
        };
    }, [macrocycle.id, macrocycle.updated_at]);

    async function handleDownload() {
        setState({ kind: 'downloading', done: 0, total: 0 });
        try {
            const result = await downloadActivePlanForOffline((p) =>
                setState({ kind: 'downloading', done: p.done, total: p.total }),
            );
            setState({
                kind: 'downloaded',
                downloadedAt: new Date().toISOString(),
                stale: false,
                mediaTotal: result.mediaTotal,
                mediaCached: result.mediaCached,
            });
        } catch (err) {
            setState({
                kind: 'error',
                message: err instanceof Error ? err.message : 'Erro ao baixar treino.',
            });
        }
    }

    if (state.kind === 'downloading') {
        return (
            <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" disabled>
                <FiRefreshCw />
                Baixando{state.total > 0 ? ` ${state.done}/${state.total}` : '...'}
            </button>
        );
    }

    if (state.kind === 'downloaded') {
        return (
            <button
                className={`btn btn-sm d-flex align-items-center gap-1 ${
                    state.stale ? 'btn-outline-warning' : 'btn-outline-success'
                }`}
                onClick={handleDownload}
                title={
                    state.stale
                        ? 'O plano foi atualizado desde o último download'
                        : `Baixado em ${formatTimestamp(state.downloadedAt)}`
                }
            >
                {state.stale ? <FiRefreshCw /> : <FiCheck />}
                {state.stale
                    ? 'Plano atualizado — baixar de novo'
                    : `Disponível offline (${formatTimestamp(state.downloadedAt)})`}
            </button>
        );
    }

    if (state.kind === 'error') {
        return (
            <button
                className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                onClick={handleDownload}
                title={state.message}
            >
                <FiAlertCircle />
                Erro ao baixar — tentar de novo
            </button>
        );
    }

    return (
        <button
            className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
            onClick={handleDownload}
        >
            <FiDownload />
            Baixar para offline
        </button>
    );
}
