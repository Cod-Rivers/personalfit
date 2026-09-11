'use client';

import { useEffect } from 'react';
import { registerOfflineServiceWorker } from '@/libs/offline/registerServiceWorker';
import { setupMediaSyncTriggers } from '@/libs/offline/mediaQueue';
import { setupSyncTriggers } from '@/libs/offline/syncQueue';

/**
 * Registers the app's service worker (offline caching + FCM background
 * messages) as early as possible, independent of notification permission —
 * offline GIF/app-shell caching should work whether or not the student ever
 * grants push notifications. Also wires up the triggers of BOTH offline
 * queues — mutations (syncQueue) and check-in photos (mediaQueue) — on the
 * same events (online, tab/app foregrounding). Renders nothing.
 */
export default function ServiceWorkerRegistrar() {
    useEffect(() => {
        registerOfflineServiceWorker();
        const teardownSync = setupSyncTriggers();
        // Sem isto, a fila de fotos de check-in só rodava UMA vez, na
        // chamada que `enqueuePhoto` dispara logo depois de enfileirar a
        // foto — e nesse instante a sessão ainda está na fila principal,
        // então o `logId` real não existe e a foto é pulada. Sem nenhum
        // gatilho posterior ('online', app voltando ao foreground, fila
        // principal sincronizando), ela ficava pendente para sempre e a
        // foto nunca chegava ao servidor.
        const teardownMedia = setupMediaSyncTriggers();
        return () => {
            teardownSync();
            teardownMedia();
        };
    }, []);

    return null;
}
