'use client';

import { useEffect, useState } from 'react';
import { FiRefreshCw, FiAlertTriangle } from 'react-icons/fi';
import {
    getPendingMutations,
    discardMutation,
    onQueueChanged,
    processQueue,
} from '@/libs/offline/syncQueue';

/** Badge com o número de treinos concluídos offline aguardando sincronizar.
 * Só aparece quando há algo pendente; some sozinho assim que a fila esvazia.
 *
 * Mutações 'failed' (ex: rejeitadas por validação) são mostradas à parte de
 * 'pending'/'syncing': reenviar o mesmo corpo nunca vai funcionar, então
 * contá-las como "pendente de sincronizar" prometeria uma sincronização que
 * nunca acontece — o aluno via o badge para sempre, sem entender por quê. */
export default function SyncPendingBadge() {
    const [pendingCount, setPendingCount] = useState(0);
    const [failedIds, setFailedIds] = useState<number[]>([]);

    useEffect(() => {
        let cancelled = false;
        const refresh = () => {
            getPendingMutations().then((rows) => {
                if (cancelled) return;
                setPendingCount(
                    rows.filter((r) => r.status !== 'failed').length,
                );
                setFailedIds(
                    rows
                        .filter((r) => r.status === 'failed')
                        .map((r) => r.id)
                        .filter((id): id is number => id !== undefined),
                );
            });
        };
        refresh();
        const unsubscribe = onQueueChanged(refresh);
        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, []);

    const handleDiscardFailed = () => {
        if (
            !confirm(
                `${failedIds.length === 1 ? 'Este treino falhou' : `Estes ${failedIds.length} treinos falharam`} ao sincronizar e não será possível tentar de novo automaticamente. Descartar e registrar manualmente depois?`,
            )
        ) {
            return;
        }
        void Promise.all(failedIds.map((id) => discardMutation(id)));
    };

    return (
        <div className="d-flex align-items-center gap-2">
            {pendingCount > 0 && (
                <button
                    className="btn btn-sm btn-outline-warning d-flex align-items-center gap-1"
                    onClick={() => void processQueue()}
                    title="Clique para tentar sincronizar agora"
                >
                    <FiRefreshCw />
                    {pendingCount}{' '}
                    {pendingCount === 1 ? 'treino pendente' : 'treinos pendentes'}{' '}
                    de sincronizar
                </button>
            )}
            {failedIds.length > 0 && (
                <button
                    className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                    onClick={handleDiscardFailed}
                    title="Estes treinos não puderam ser salvos — toque para descartar"
                >
                    <FiAlertTriangle />
                    {failedIds.length === 1
                        ? '1 treino falhou'
                        : `${failedIds.length} treinos falharam`}
                </button>
            )}
        </div>
    );
}
