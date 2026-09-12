'use client';

import { useEffect, useState } from 'react';
import { FiRefreshCw, FiAlertTriangle, FiImage } from 'react-icons/fi';
import {
    getPendingMutations,
    discardMutation,
    onQueueChanged,
    processQueue,
} from '@/libs/offline/syncQueue';
import {
    getPendingMedia,
    discardPendingPhoto,
    onMediaQueueChanged,
} from '@/libs/offline/mediaQueue';

/** Badge com o número de treinos concluídos offline aguardando sincronizar,
 * MAIS o status das fotos de check-in (pendência -19 — antes disso,
 * `getPendingMedia`/`discardPendingPhoto` existiam e eram testados, mas
 * nenhuma tela os chamava: uma foto que virava `failed` (recusada por
 * tamanho/MIME, ou bloqueada pelo rewrite P-8) ficava invisível para
 * sempre). Só aparece quando há algo pendente; some sozinho assim que a
 * fila esvazia.
 *
 * Mutações/fotos 'failed' são mostradas à parte de 'pending'/'syncing':
 * reenviar o mesmo corpo nunca vai funcionar, então contá-las como
 * "pendente de sincronizar" prometeria uma sincronização que nunca
 * acontece — o aluno via o badge para sempre, sem entender por quê. */
export default function SyncPendingBadge() {
    const [pendingCount, setPendingCount] = useState(0);
    const [failedIds, setFailedIds] = useState<number[]>([]);
    // 'waiting_workout_sync' entra aqui junto com 'pending'/'uploading' — é
    // o estado normal enquanto o treino ainda não sincronizou e a foto
    // espera o logId real (mediaQueue.ts); não é erro, não deve parecer um.
    const [photoPendingCount, setPhotoPendingCount] = useState(0);
    const [photoFailedIds, setPhotoFailedIds] = useState<number[]>([]);

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
            getPendingMedia().then((rows) => {
                if (cancelled) return;
                setPhotoPendingCount(
                    rows.filter((r) => r.displayStatus !== 'failed').length,
                );
                setPhotoFailedIds(
                    rows
                        .filter((r) => r.displayStatus === 'failed')
                        .map((r) => r.id)
                        .filter((id): id is number => id !== undefined),
                );
            });
        };
        refresh();
        const unsubscribeQueue = onQueueChanged(refresh);
        const unsubscribeMedia = onMediaQueueChanged(refresh);
        return () => {
            cancelled = true;
            unsubscribeQueue();
            unsubscribeMedia();
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

    const handleDiscardFailedPhotos = () => {
        if (
            !confirm(
                `${photoFailedIds.length === 1 ? 'Esta foto de check-in falhou' : `Estas ${photoFailedIds.length} fotos de check-in falharam`} ao enviar e não será possível tentar de novo automaticamente. Os treinos em si já estão registrados — descartar a(s) foto(s)?`,
            )
        ) {
            return;
        }
        void Promise.all(photoFailedIds.map((id) => discardPendingPhoto(id)));
    };

    return (
        <div className="d-flex align-items-center gap-2 flex-wrap">
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
            {photoPendingCount > 0 && (
                <span
                    className="badge bg-secondary d-flex align-items-center gap-1"
                    title="Fotos de check-in aguardando envio — o treino já está salvo, só a foto está a caminho"
                >
                    <FiImage />
                    {photoPendingCount}{' '}
                    {photoPendingCount === 1 ? 'foto' : 'fotos'} de check-in
                    aguardando envio
                </span>
            )}
            {photoFailedIds.length > 0 && (
                <button
                    className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                    onClick={handleDiscardFailedPhotos}
                    title="Estas fotos de check-in não puderam ser enviadas — toque para descartar"
                >
                    <FiAlertTriangle />
                    {photoFailedIds.length === 1
                        ? '1 foto de check-in falhou'
                        : `${photoFailedIds.length} fotos de check-in falharam`}
                </button>
            )}
        </div>
    );
}
