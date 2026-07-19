import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, isSupported, Messaging } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let messagingInstance: Messaging | null = null;

export async function getFirebaseMessaging(): Promise<Messaging | null> {
    if (typeof window === 'undefined') return null;
    if (messagingInstance) return messagingInstance;

    const supported = await isSupported();
    if (!supported) return null;

    messagingInstance = getMessaging(app);
    return messagingInstance;
}

export default app;
