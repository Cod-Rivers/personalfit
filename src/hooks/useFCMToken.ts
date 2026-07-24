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

function isInAndroidApp() {
    // Dentro do app Android (WebView) o push é nativo (Firebase Android SDK),
    // não via Web Notifications API — e o WebView não implementa o prompt de
    // permissão dessa API, então pedir aqui nunca teria efeito. Presença da
    // bridge nativa (injetada via addJavascriptInterface) indica o wrapper.
    return typeof window !== 'undefined' && 'VenafitBilling' in window;
}

async function fetchAndRegisterToken(vapidKey: string) {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return;

    const registration = await registerOfflineServiceWorker();
    const fcmToken = await getToken(messaging, {
        vapidKey,
        ...(registration ? { serviceWorkerRegistration: registration } : {}),
    });
    if (!fcmToken) return;

    await registerFCMToken(fcmToken);
}

export function useFCMToken() {
    const registered = useRef(false);
    const [permissionState, setPermissionState] = useState<NotificationPermission | null>(null);

    useEffect(() => {
        if (isInAndroidApp()) return;
        if (typeof Notification === 'undefined') return;
        setPermissionState(Notification.permission);

        // Se a permissão já foi concedida antes, busca o token silenciosamente
        // (sem precisar de gesto do usuário, já que não há prompt a mostrar).
        if (Notification.permission !== 'granted' || registered.current) return;

        const token = localStorage.getItem('token');
        if (!token) return;
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) return;

        fetchAndRegisterToken(vapidKey)
            .then(() => {
                registered.current = true;
            })
            .catch((err) => console.error('[FCM] Erro ao registrar token:', err));
    }, []);

    // Só deve ser chamado a partir de um gesto do usuário (ex.: clique em um
    // botão) — pedir permissão de notificação sem gesto costuma ser negado
    // silenciosamente pelo navegador, sem nunca mostrar o pop-up ao usuário.
    async function requestPermission() {
        if (typeof Notification === 'undefined') return;

        const token = localStorage.getItem('token');
        if (!token) return;
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) return;

        try {
            const permission = await Notification.requestPermission();
            setPermissionState(permission);
            if (permission !== 'granted') return;

            await fetchAndRegisterToken(vapidKey);
            registered.current = true;
        } catch (err) {
            console.error('[FCM] Erro ao registrar token:', err);
        }
    }

    return { permissionState, requestPermission };
}
