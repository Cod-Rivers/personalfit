'use client';

import { useEffect } from 'react';
import { registerOfflineServiceWorker } from '@/libs/offline/registerServiceWorker';
import { setupSyncTriggers } from '@/libs/offline/syncQueue';

/**
 * Registers the app's service worker (offline caching + FCM background
 * messages) as early as possible, independent of notification permission —
 * offline GIF/app-shell caching should work whether or not the student ever
 * grants push notifications. Also wires up the offline mutation sync queue's
 * triggers (online event, tab/app foregrounding). Renders nothing.
 */
export default function ServiceWorkerRegistrar() {
    useEffect(() => {
        registerOfflineServiceWorker();
        return setupSyncTriggers();
    }, []);

    return null;
}
