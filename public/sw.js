/* eslint-disable no-undef */
/**
 * Single service worker for the app, controlling scope "/". Merges two
 * concerns that both need that scope (a page can only be controlled by one
 * SW at a given path):
 *  1. Offline caching: GIFs/exercise media (cache-first) and a runtime
 *     cache-on-read fallback for the app shell (HTML/JS/CSS), so a
 *     previously-visited page still loads with no network.
 *  2. Firebase Cloud Messaging background push notifications (formerly
 *     public/firebase-messaging-sw.js).
 *
 * Firebase config arrives via the registration URL's query string (see
 * src/libs/offline/registerServiceWorker.ts) since this file is a static
 * asset and never gets Next.js's NEXT_PUBLIC_* build-time substitution.
 */

const GIF_CACHE = 'venafit-gifs-v1';
const SHELL_CACHE = 'venafit-shell-v1';
const MEDIA_HOSTS = ['midia.venafit.codriverslabs.com'];

// URLs assinadas (GET presigned) contra o endpoint direto do R2 servem mídia
// sensível (fotos de evolução do aluno, PDF de plano alimentar) — cada URL
// expira e é única por requisição (assinatura na query string), então nunca
// deve ser cacheada: um cache-first aqui nunca daria hit (URL sempre nova) e
// só acumularia cópias duplicadas do mesmo arquivo no Cache Storage.
function isSignedR2Request(url) {
    return url.hostname.endsWith('.r2.cloudflarestorage.com') || url.searchParams.has('X-Amz-Signature');
}

// Caminhos que nunca devem ser cacheados pelo SW: dados de conta/autenticação e
// qualquer coisa sob /api. Mesmo hoje a API vivendo em outra origem (portanto já
// fora do cache same-origin), esta lista é defesa em profundidade caso a API
// passe a ser servida no mesmo domínio via proxy reverso.
const NO_CACHE_PATHS = ['/api', '/minha-conta', '/anamnese', '/admin'];

function isSensitivePath(pathname) {
    return NO_CACHE_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

function isMediaRequest(request, url) {
    if (MEDIA_HOSTS.includes(url.hostname)) return true;
    return ['image', 'video'].includes(request.destination);
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Mídia sensível assinada: deixa passar direto pela rede, sem
    // interceptar (nem cache-first, nem o fallback de shell abaixo).
    if (isSignedR2Request(url)) return;

    if (isMediaRequest(request, url)) {
        // Cache-first: GIFs/videos are immutable-ish once uploaded, so prefer
        // the cached copy and only hit the network on a cache miss.
        event.respondWith(
            caches.open(GIF_CACHE).then(async (cache) => {
                const cached = await cache.match(request);
                if (cached) return cached;
                try {
                    const response = await fetch(request);
                    if (response.ok) cache.put(request, response.clone());
                    return response;
                } catch (err) {
                    if (cached) return cached;
                    throw err;
                }
            }),
        );
        return;
    }

    if (url.origin === self.location.origin) {
        // Nunca cachear dados de conta/autenticação nem chamadas de dados
        // (destination vazio = fetch/XHR). Passam direto pela rede.
        if (isSensitivePath(url.pathname) || request.destination === 'empty') {
            return;
        }
        // Network-first with a runtime-cache fallback: lets a previously
        // visited page (app shell, data-less navigation) still render
        // offline without hand-maintaining a precache manifest against
        // Next.js's content-hashed build output.
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(request)),
        );
    }
});

/* ── Firebase Cloud Messaging (background push) ── */
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');

const swParams = new URL(self.location.href).searchParams;
const firebaseConfig = {
    apiKey: swParams.get('apiKey'),
    authDomain: swParams.get('authDomain'),
    projectId: swParams.get('projectId'),
    storageBucket: swParams.get('storageBucket'),
    messagingSenderId: swParams.get('messagingSenderId'),
    appId: swParams.get('appId'),
};

if (firebaseConfig.apiKey) {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
        const { title, body } = payload.notification || {};
        if (title) {
            self.registration.showNotification(title, {
                body: body || '',
                icon: '/favicon.ico',
            });
        }
    });
}
