'use client';

import { useEffect, useState } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { getPendingMutationsCount, onQueueChanged, processQueue } from '@/libs/offline/syncQueue';

/** Badge com o número de treinos concluídos offline aguardando sincronizar.
 * Só aparece quando há algo pendente; some sozinho assim que a fila esvazia. */
export default function SyncPendingBadge() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const refresh = () => {
            getPendingMutationsCount().then((c) => {
                if (!cancelled) setCount(c);
            });
        };
        refresh();
        const unsubscribe = onQueueChanged(refresh);
        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, []);

    if (count === 0) return null;

    return (
        <button
            className="btn btn-sm btn-outline-warning d-flex align-items-center gap-1"
            onClick={() => void processQueue()}
            title="Clique para tentar sincronizar agora"
        >
            <FiRefreshCw />
            {count} {count === 1 ? 'treino pendente' : 'treinos pendentes'} de sincronizar
        </button>
    );
}
