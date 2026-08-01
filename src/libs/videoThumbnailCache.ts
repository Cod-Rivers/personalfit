'use client';

/**
 * Cache local (IndexedDB) de thumbnails capturadas dinamicamente de vídeos
 * cujo video_thumb salvo não é uma imagem de verdade (ver isVideoExtension em
 * exerciseVideoService.ts). A captura roda no navegador via
 * captureVideoFrameFromUrl; este módulo só cuida de:
 *   1. não recapturar um vídeo já visto neste dispositivo (grava o JPEG gerado);
 *   2. não capturar vários vídeos ao mesmo tempo (rolar rápido por uma lista
 *      não deve tentar decodificar 10 vídeos simultâneos no celular);
 *   3. não duplicar trabalho se o mesmo vídeo for pedido por dois componentes
 *      montados ao mesmo tempo (dedupe por URL).
 * Sem esse módulo, cada abertura do seletor de exercícios recapturaria tudo
 * do zero — funcional, mas caro em CPU/rede a cada uso.
 */

import { captureVideoFrameFromUrl } from '@/libs/exerciseVideoService';

const DB_NAME = 'venafit-video-thumbs';
const STORE_NAME = 'thumbs';
const DB_VERSION = 1;

/** Máximo de capturas (mount de <video> + decode de frame) simultâneas —
 * limite baixo de propósito, é o que evita o travamento no celular ao rolar
 * rápido por uma lista com muitos itens ainda não cacheados. */
const MAX_CONCURRENT_CAPTURES = 2;

function openDB(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') return Promise.resolve(null);
    return new Promise((resolve) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains(STORE_NAME)) {
                req.result.createObjectStore(STORE_NAME);
            }
        };
        req.onsuccess = () => resolve(req.result);
        // IndexedDB indisponível (modo privado restrito, quota, etc.) não deve
        // quebrar o app — só desliga o cache, a captura ainda funciona.
        req.onerror = () => resolve(null);
    });
}

let dbPromise: Promise<IDBDatabase | null> | null = null;
function getDB(): Promise<IDBDatabase | null> {
    if (!dbPromise) dbPromise = openDB();
    return dbPromise;
}

async function readCached(videoUrl: string): Promise<Blob | null> {
    const db = await getDB();
    if (!db) return null;
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(videoUrl);
        req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
        req.onerror = () => resolve(null);
    });
}

async function writeCached(videoUrl: string, blob: Blob): Promise<void> {
    const db = await getDB();
    if (!db) return;
    await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(blob, videoUrl);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
    });
}

let activeCaptures = 0;
const captureQueue: Array<() => void> = [];

function acquireCaptureSlot(): Promise<void> {
    if (activeCaptures < MAX_CONCURRENT_CAPTURES) {
        activeCaptures++;
        return Promise.resolve();
    }
    return new Promise((resolve) => captureQueue.push(resolve));
}

function releaseCaptureSlot(): void {
    activeCaptures--;
    const next = captureQueue.shift();
    if (next) {
        activeCaptures++;
        next();
    }
}

/** Dedupe: se dois componentes pedem o mesmo vídeo ao mesmo tempo (comum —
 * o mesmo exercício pode aparecer em mais de um treino da lista), só uma
 * captura roda; a segunda chamada reaproveita a promise em andamento. */
const inFlight = new Map<string, Promise<Blob | null>>();

/**
 * Devolve a thumbnail de `videoUrl`: do cache se já existir, ou capturando um
 * frame agora (e gravando o resultado pra próxima vez). Retorna null se a
 * captura falhar (formato não suportado, CORS bloqueado, timeout de rede).
 */
export function getOrCaptureThumbnail(videoUrl: string): Promise<Blob | null> {
    const existing = inFlight.get(videoUrl);
    if (existing) return existing;

    const promise = (async () => {
        const cached = await readCached(videoUrl);
        if (cached) return cached;

        await acquireCaptureSlot();
        try {
            const blob = await captureVideoFrameFromUrl(videoUrl);
            if (blob) await writeCached(videoUrl, blob);
            return blob;
        } finally {
            releaseCaptureSlot();
        }
    })();

    inFlight.set(videoUrl, promise);
    promise.finally(() => inFlight.delete(videoUrl));
    return promise;
}
