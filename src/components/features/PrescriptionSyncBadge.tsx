'use client';

import { useEffect, useState } from 'react';
import { FiRefreshCw, FiAlertTriangle } from 'react-icons/fi';
import {
    getPendingPrescriptionPatches,
    discardPrescriptionPatch,
    onPrescriptionQueueChanged,
    processPrescriptionQueue,
} from '@/libs/offline/prescriptionQueue';

/** Badge com edições de série/carga do PERSONAL (ver ExerciseDetailCard +
 * MesocycleSection) feitas sem rede e ainda não enviadas ao servidor.
 * Mesmo padrão de SyncPendingBadge (fila do aluno): só aparece quando há
 * algo pendente, some sozinho quando a fila esvazia. 'failed' é mostrado à
 * parte — reenviar o mesmo patch não vai resolver sozinho (fase ou
 * exercício apagado nesse meio tempo), então a UI oferece descartar. */
export default function PrescriptionSyncBadge() {
    const [pendingNames, setPendingNames] = useState<string[]>([]);
    const [failed, setFailed] = useState<{ id: number; exerciseName: string }[]>(
        [],
    );

    useEffect(() => {
        let cancelled = false;
        const refresh = () => {
            getPendingPrescriptionPatches().then((rows) => {
                if (cancelled) return;
                setPendingNames(
                    rows
                        .filter((r) => r.status !== 'failed')
                        .map((r) => r.exerciseName),
                );
                setFailed(
                    rows
                        .filter((r) => r.status === 'failed' && r.id !== undefined)
                        .map((r) => ({
                            id: r.id as number,
                            exerciseName: r.exerciseName,
                        })),
                );
            });
        };
        refresh();
        const unsubscribe = onPrescriptionQueueChanged(refresh);
        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, []);

    const handleDiscardFailed = () => {
        if (
            !confirm(
                `${failed.length === 1 ? 'Esta alteração' : `Estas ${failed.length} alterações`} não pôde ser enviada ao aluno e não será tentada de novo automaticamente. Descartar?`,
            )
        ) {
            return;
        }
        void Promise.all(failed.map((f) => discardPrescriptionPatch(f.id)));
    };

    if (pendingNames.length === 0 && failed.length === 0) return null;

    return (
        <div
            className="d-flex align-items-center gap-2 flex-wrap"
            style={{ marginBottom: 12 }}
        >
            {pendingNames.length > 0 && (
                <button
                    type="button"
                    className="btn btn-sm btn-outline-warning d-flex align-items-center gap-1"
                    onClick={() => void processPrescriptionQueue()}
                    title={`Aguardando conexão: ${pendingNames.join(', ')}`}
                >
                    <FiRefreshCw />
                    {pendingNames.length}{' '}
                    {pendingNames.length === 1
                        ? 'alteração pendente'
                        : 'alterações pendentes'}{' '}
                    de sincronizar
                </button>
            )}
            {failed.length > 0 && (
                <button
                    type="button"
                    className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                    onClick={handleDiscardFailed}
                    title="Estas alterações não puderam ser enviadas — toque para descartar"
                >
                    <FiAlertTriangle />
                    {failed.length === 1
                        ? '1 alteração falhou'
                        : `${failed.length} alterações falharam`}
                </button>
            )}
        </div>
    );
}
