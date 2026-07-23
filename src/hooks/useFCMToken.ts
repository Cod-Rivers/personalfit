'use client';

import { useEffect, useRef, useState } from 'react';
import { getToken } from 'firebase/messaging';
import { getFirebaseMessaging } from '@/libs/firebase';
import { Api } from '@/libs/api';
import { registerOfflineServiceWorker } from '@/libs/offline/registerServiceWorker';

async function registerFCMToken(fcmToken: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    await Api.post('/me/fcm-token', { token: fcmToken });
}

export function useFCMToken() {
    const registered = useRef(false);
    const [permissionDenied, setPermissionDenied] = useState(false);

    useEffect(() => {
        if (registered.current) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) return;

        // Dentro do app Android (WebView) o push é nativo (Firebase Android SDK),
        // não via Web Notifications API — e o WebView nunca concede essa permissão
        // web, então pedir aqui só geraria o aviso de "bloqueado" pra sempre.
        // Presença da bridge nativa (injetada via addJavascriptInterface) indica
        // que estamos rodando dentro do wrapper Android.
        if (typeof window !== 'undefined' && 'VenafitBilling' in window) return;

        (async () => {
            try {
                const messaging = await getFirebaseMessaging();
                if (!messaging) return;

                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    setPermissionDenied(true);
                    return;
                }

                const registration = await registerOfflineServiceWorker();
                const fcmToken = await getToken(messaging, {
                    vapidKey,
                    ...(registration ? { serviceWorkerRegistration: registration } : {}),
                });
                if (!fcmToken) return;

                await registerFCMToken(fcmToken);
                registered.current = true;
            } catch (err) {
                console.error('[FCM] Erro ao registrar token:', err);
            }
        })();
    }, []);

    return { permissionDenied };
}
