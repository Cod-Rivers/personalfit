/**
 * Registers the single app service worker (offline caching + FCM background
 * messages, merged into one file since both must control scope "/").
 * Firebase config is passed via query string because /sw.js is a static file
 * copied as-is into the build output — it never goes through Next.js's
 * NEXT_PUBLIC_* env var inlining like client bundles do.
 */
export async function registerOfflineServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return null;
    }

    const params = new URLSearchParams({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
        messagingSenderId:
            process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
    });

    try {
        return await navigator.serviceWorker.register(`/sw.js?${params.toString()}`);
    } catch (err) {
        console.error('[SW] Falha ao registrar service worker:', err);
        return null;
    }
}
