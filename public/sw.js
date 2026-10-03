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

// Sons dos cronômetros do treino (src/libs/timerSounds.ts), baixados na
// instalação para tocar offline desde o 1º uso. O Howler os busca por XHR
// (destination vazio), que o cache de shell abaixo deixa passar direto —
// sem esta lista os cronômetros ficavam mudos sem rede. Os dois pacotes vêm, para
// a troca Voz/Bipe também funcionar offline. Mantenha igual à lista do app
// (timerSounds.test.ts confere). Mudou um arquivo de som? Suba a versão
// do cache. O logout (clearSession) preserva este cache pelo prefixo.
const SOUND_CACHE = 'venafit-sounds-v1';
const SOUND_FILES = [
    '/sounds/tick.wav',
    '/sounds/go.wav',
    '/sounds/recover.wav',
    '/sounds/rest.wav',
    '/sounds/done.wav',
    '/sounds/voice/1.mp3',
    '/sounds/voice/2.mp3',
    '/sounds/voice/3.mp3',
    '/sounds/voice/4.mp3',
    '/sounds/voice/5.mp3',
    '/sounds/voice/6.mp3',
    '/sounds/voice/7.mp3',
    '/sounds/voice/8.mp3',
    '/sounds/voice/9.mp3',
    '/sounds/voice/10.mp3',
    '/sounds/voice/ready.mp3',
    '/sounds/voice/go.mp3',
    '/sounds/voice/round.mp3',
    '/sounds/voice/final_round.mp3',
    '/sounds/voice/level_up.mp3',
    '/sounds/voice/time_over.mp3',
    '/sounds/voice/congratulations.mp3',
    '/sounds/voice/you_win.mp3',
];

// Melhor-esforço, arquivo por arquivo: um som que falhar não pode travar a
// instalação do SW (cache.addAll falharia inteiro); o cache-first do fetch
// completa o que faltar no próximo uso com rede.
async function precacheSounds() {
    const cache = await caches.open(SOUND_CACHE);
    await Promise.all(
        SOUND_FILES.map((path) => cache.add(path).catch(() => {})),
    );
}

async function purgeOldSoundCaches() {
    const keys = await caches.keys();
    await Promise.all(
        keys
            .filter((k) => k.startsWith('venafit-sounds-') && k !== SOUND_CACHE)
            .map((k) => caches.delete(k)),
    );
}

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
const NO_CACHE_PATHS = [
    '/api',
    '/minha-conta',
    '/anamnese',
    '/admin',
    // O próprio endereço destas páginas carrega um token de uso único
    // (redefinição de senha, confirmação de exclusão de conta). Cachear a
    // navegação grava o token no Cache Storage, com a URL como chave. E os
    // dois fluxos rodam deslogado, então o clearSession() do logout, que
    // limpa o Cache Storage, nunca passa para apagá-lo.
    '/redefinir-senha',
    '/excluir-conta/confirmar',
];

function isSensitivePath(pathname) {
    return NO_CACHE_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(precacheSounds().catch(() => {}));
});

// Tira do cache de shell o que foi guardado antes de o caminho entrar em
// NO_CACHE_PATHS. Sem isto, um aparelho que já abriu um link de redefinição
// de senha continuaria com o token no Cache Storage indefinidamente.
async function purgeSensitiveShellEntries() {
    const cache = await caches.open(SHELL_CACHE);
    const requests = await cache.keys();
    await Promise.all(
        requests
            .filter((req) => isSensitivePath(new URL(req.url).pathname))
            .map((req) => cache.delete(req)),
    );
}

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            // Faxina é melhor-esforço: falhar aqui não pode travar a ativação.
            purgeSensitiveShellEntries().catch(() => {}),
            purgeOldSoundCaches().catch(() => {}),
        ]),
    );
});

// Página mínima para uma navegação offline que não tem cópia no cache.
// Inline (sem buscar um /offline.html) porque este arquivo é estático e não
// passa por precache: um fetch aqui falharia pelo mesmo motivo que trouxe a
// requisição até este ponto.
function offlineFallbackResponse() {
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sem conexão — Venafit</title>
<style>
  :root { color-scheme: light dark; }
  body { margin:0; min-height:100dvh; display:flex; align-items:center;
         justify-content:center; padding:24px; text-align:center;
         font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
         background:#0f1115; color:#e8e8ea; }
  h1 { font-size:1.25rem; margin:0 0 12px; }
  p { margin:0 0 20px; font-size:0.95rem; line-height:1.5; opacity:.8; max-width:34ch; }
  button { font:inherit; padding:12px 24px; border-radius:10px; border:0;
           background:#e8722f; color:#fff; cursor:pointer; }
</style>
</head>
<body>
  <div>
    <h1>Sem conexão</h1>
    <p>Esta tela ainda não foi aberta neste aparelho, então não há uma cópia
       salva para mostrar offline. O que você já registrou continua guardado e
       será enviado sozinho quando a internet voltar.</p>
    <button onclick="location.reload()">Tentar de novo</button>
  </div>
</body>
</html>`;
    return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}

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

    // Sons do circuito: cache-first, inclusive pelo XHR do Howler, que o
    // ramo de shell abaixo deixaria passar sem cache. Só guarda resposta
    // inteira (200): o <audio> do fallback HTML5 pede faixas (206), e
    // cache.put recusa resposta parcial.
    if (url.origin === self.location.origin && url.pathname.startsWith('/sounds/')) {
        event.respondWith(
            caches.open(SOUND_CACHE).then(async (cache) => {
                const cached = await cache.match(request, { ignoreSearch: true });
                if (cached) return cached;
                const response = await fetch(request);
                if (response.status === 200) {
                    cache.put(request, response.clone()).catch(() => {});
                }
                return response;
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
                .catch(async () => {
                    const cached = await caches.match(request);
                    if (cached) return cached;
                    // Sem cópia no cache, `caches.match` devolve undefined —
                    // e `respondWith(undefined)` vira um erro de rede. Numa
                    // navegação isso dava tela branca no PWA e o diálogo
                    // "Não foi possível carregar" no app Android (ver
                    // onReceivedError em MainActivity.kt), sem dizer que o
                    // problema era a falta de conexão.
                    if (request.mode === 'navigate') {
                        return offlineFallbackResponse();
                    }
                    return Response.error();
                }),
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
        // Mensagem com bloco "notification" (todas as que o backend manda) já
        // é exibida pelo próprio SDK do Firebase, que abre
        // webpush.fcm_options.link no clique. Exibir de novo aqui mostrava a
        // mesma notificação duas vezes — e a nossa cópia não abria nada.
        if (payload.notification) return;
        const data = payload.data || {};
        if (data.title) {
            self.registration.showNotification(data.title, {
                body: data.body || '',
                icon: '/favicon.ico',
                tag: data.tag || undefined,
                data: { deep_link: data.deep_link },
            });
        }
    });
}

// Clique numa notificação exibida por NÓS (mensagem só de dados, acima): foca
// a aba do app e navega para o deep link, ou abre uma nova. As exibidas pelo
// SDK (data.FCM_MSG) têm o tratamento do próprio Firebase. Só rota interna.
self.addEventListener('notificationclick', (event) => {
    const data = (event.notification && event.notification.data) || {};
    if (data.FCM_MSG) return;
    const link = typeof data.deep_link === 'string' ? data.deep_link : '';
    if (!link.startsWith('/') || link.startsWith('//')) return;
    event.notification.close();
    const url = new URL(link, self.location.origin).href;
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
            for (const client of list) {
                if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                    return client.navigate(url).then((c) => (c || client).focus());
                }
            }
            return clients.openWindow(url);
        }),
    );
});
