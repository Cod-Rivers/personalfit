/**
 * Pontes nativas do app Android, vistas pelo web app.
 *
 * Dois formatos convivem:
 *
 *  - Canal restrito por origem: `window.VenafitNative` (NativeBridge.kt). O
 *    Android injeta esse objeto só nos frames do host confiável, via
 *    `WebViewCompat.addWebMessageListener`, e recusa mensagem que não venha do
 *    frame principal. É o formato das versões atuais do app.
 *  - Interfaces antigas: `window.VenafitAuth`, `VenafitShare`, `VenafitBilling`
 *    (`addJavascriptInterface`). O Android injeta essas em TODO frame,
 *    inclusive iframes de terceiros — o script de um anúncio conseguiria abrir
 *    a compra do Google Play com o accountId de outra conta. Continuam
 *    suportadas aqui só porque versões antigas do app seguem instaladas, e o
 *    app novo também cai nelas quando a WebView do aparelho não tem suporte ao
 *    canal restrito.
 *
 * Toda chamada nativa do web app passa por este arquivo, que escolhe o
 * formato. `hasHardenedNativeBridge()` é o que decide se é seguro carregar
 * script de terceiro (anúncio) dentro do app — ver libs/adsense.ts.
 */

/** Objeto injetado pelo Android via WebViewCompat.addWebMessageListener. */
interface NativeMessagePort {
    postMessage(message: string): void;
    addEventListener?: (
        type: 'message',
        listener: (event: { data: unknown }) => void,
    ) => void;
    onmessage?: ((event: { data: unknown }) => void) | null;
}

interface LegacyAuthBridge {
    save(token: string): void;
    clear(): void;
}

interface LegacyShareBridge {
    isAvailable?: () => boolean;
    /** Recebe a imagem em base64 PURO (sem o prefixo `data:`). */
    shareImage?: (base64: string, mimeType: string, text: string) => boolean;
    shareText?: (text: string) => boolean;
}

interface LegacyBillingBridge {
    isAvailable(): boolean;
    /** accountId = ID do usuário, enviado ao Play como obfuscatedAccountId. */
    purchase(
        productId: string,
        productType: 'subs' | 'inapp',
        accountId: string,
    ): void;
}

declare global {
    interface Window {
        VenafitNative?: NativeMessagePort;
        VenafitAuth?: LegacyAuthBridge;
        VenafitShare?: LegacyShareBridge;
        VenafitBilling?: LegacyBillingBridge;
    }
}

type BridgeName = 'auth' | 'share' | 'billing' | 'screen' | 'analytics';

interface NativeReply {
    id?: unknown;
    ok?: unknown;
    result?: unknown;
    error?: unknown;
}

/** Quanto esperar a resposta do app. Generoso: a primeira pergunta ao Billing
 *  pode chegar enquanto o app ainda conecta ao Google Play. */
export const NATIVE_REPLY_TIMEOUT_MS = 10_000;

let nextId = 0;
const pending = new Map<string, (reply: NativeReply) => void>();
const listeningPorts = new WeakSet<NativeMessagePort>();

function hardenedPort(): NativeMessagePort | null {
    if (typeof window === 'undefined') return null;
    const port = window.VenafitNative;
    return port && typeof port.postMessage === 'function' ? port : null;
}

/** true dentro do app com o canal restrito por origem. */
export function hasHardenedNativeBridge(): boolean {
    return hardenedPort() !== null;
}

function listen(port: NativeMessagePort): void {
    if (listeningPorts.has(port)) return;
    listeningPorts.add(port);

    const handler = (event: { data: unknown }) => {
        let reply: NativeReply;
        try {
            reply = JSON.parse(String(event.data)) as NativeReply;
        } catch {
            return;
        }
        if (typeof reply?.id !== 'string') return;
        const settle = pending.get(reply.id);
        if (!settle) return;
        pending.delete(reply.id);
        settle(reply);
    };

    if (typeof port.addEventListener === 'function') {
        port.addEventListener('message', handler);
    } else {
        const previous = port.onmessage;
        port.onmessage = (event) => {
            previous?.(event);
            handler(event);
        };
    }
}

/** Mensagem sem resposta: o app não responde a quem não manda `id`. */
function send(
    port: NativeMessagePort,
    bridge: BridgeName,
    action: string,
    args: Record<string, unknown> = {},
): void {
    port.postMessage(JSON.stringify({ ...args, bridge, action }));
}

/** Mensagem com resposta correlacionada por `id`. Rejeita em erro ou timeout. */
function request<T>(
    port: NativeMessagePort,
    bridge: BridgeName,
    action: string,
    args: Record<string, unknown> = {},
): Promise<T> {
    listen(port);
    nextId += 1;
    const id = `${Date.now()}-${nextId}`;

    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
            pending.delete(id);
            reject(new Error(`O app não respondeu a ${bridge}.${action}`));
        }, NATIVE_REPLY_TIMEOUT_MS);

        pending.set(id, (reply) => {
            clearTimeout(timer);
            if (reply.ok === true) {
                resolve(reply.result as T);
            } else {
                reject(
                    new Error(
                        typeof reply.error === 'string' && reply.error
                            ? reply.error
                            : `Falha em ${bridge}.${action}`,
                    ),
                );
            }
        });

        try {
            port.postMessage(JSON.stringify({ ...args, id, bridge, action }));
        } catch (err) {
            clearTimeout(timer);
            pending.delete(id);
            reject(err instanceof Error ? err : new Error(String(err)));
        }
    });
}

// ─── Sessão do widget de calendário (AuthBridge.kt) ───

/** Melhor-esforço: falha da ponte nunca pode atrapalhar login nem logout. */
export function nativeAuthSave(token: string): void {
    try {
        const port = hardenedPort();
        if (port) {
            send(port, 'auth', 'save', { token });
            return;
        }
        if (typeof window !== 'undefined') window.VenafitAuth?.save(token);
    } catch {
        /* melhor-esforço */
    }
}

export function nativeAuthClear(): void {
    try {
        const port = hardenedPort();
        if (port) {
            send(port, 'auth', 'clear');
            return;
        }
        if (typeof window !== 'undefined') window.VenafitAuth?.clear();
    } catch {
        /* melhor-esforço */
    }
}

// ─── Compartilhamento (ShareBridge.kt) ───

function legacyShare(): LegacyShareBridge | null {
    if (typeof window === 'undefined') return null;
    const b = window.VenafitShare;
    if (!b || typeof b.shareImage !== 'function') return null;
    // `isAvailable` é opcional de propósito: uma ponte que não a implemente
    // continua servindo, desde que saiba compartilhar.
    if (typeof b.isAvailable === 'function' && !b.isAvailable()) return null;
    return b;
}

export function canShareImageNatively(): boolean {
    return hasHardenedNativeBridge() || legacyShare() !== null;
}

export function canShareTextNatively(): boolean {
    return (
        hasHardenedNativeBridge() ||
        typeof legacyShare()?.shareText === 'function'
    );
}

/** true quando o app conseguiu abrir o seletor de apps do Android. */
export async function nativeShareImage(
    base64: string,
    mimeType: string,
    text: string,
): Promise<boolean> {
    const port = hardenedPort();
    if (port) {
        try {
            const opened = await request<boolean>(port, 'share', 'shareImage', {
                base64,
                mimeType,
                text,
            });
            return opened === true;
        } catch {
            return false;
        }
    }
    try {
        return legacyShare()?.shareImage?.(base64, mimeType, text) === true;
    } catch {
        return false;
    }
}

export async function nativeShareText(text: string): Promise<boolean> {
    const port = hardenedPort();
    if (port) {
        try {
            const opened = await request<boolean>(port, 'share', 'shareText', {
                text,
            });
            return opened === true;
        } catch {
            return false;
        }
    }
    try {
        return legacyShare()?.shareText?.(text) === true;
    } catch {
        return false;
    }
}

// ─── Google Play Billing (BillingBridge.kt) ───

/** true dentro do app (qualquer formato de ponte). Não diz se o Billing já
 *  está pronto — para isso, nativeBillingAvailable(). */
export function hasNativeBilling(): boolean {
    if (hasHardenedNativeBridge()) return true;
    return typeof window !== 'undefined' && !!window.VenafitBilling;
}

export async function nativeBillingAvailable(): Promise<boolean> {
    const port = hardenedPort();
    if (port) {
        try {
            return (await request<boolean>(port, 'billing', 'isAvailable')) === true;
        } catch {
            return false;
        }
    }
    try {
        return typeof window !== 'undefined' && !!window.VenafitBilling?.isAvailable();
    } catch {
        return false;
    }
}

/** Inicia a compra. O resultado chega pelo CustomEvent 'venafit-billing'. */
export function nativeBillingPurchase(
    productId: string,
    productType: 'subs' | 'inapp',
    accountId: string,
): void {
    const port = hardenedPort();
    if (port) {
        send(port, 'billing', 'purchase', { productId, productType, accountId });
        return;
    }
    const legacy = typeof window !== 'undefined' ? window.VenafitBilling : undefined;
    if (!legacy) {
        throw new Error('Google Play Billing indisponível neste dispositivo');
    }
    legacy.purchase(productId, productType, accountId);
}

// ─── Tela acesa (ScreenBridge.kt) ───

/**
 * Pede ao app que mantenha a tela acesa (ou libere). A WebView recusa a
 * Screen Wake Lock API com NotAllowedError, então dentro do app é esta ponte
 * que funciona — ver hooks/useWakeLock.ts.
 *
 * true = o pedido foi entregue ao app. Só pelo canal restrito: versões do app
 * sem a rota ignoram a mensagem (ação desconhecida) e a tela apaga como antes.
 */
export function nativeKeepScreenOn(on: boolean): boolean {
    try {
        const port = hardenedPort();
        if (!port) return false;
        send(port, 'screen', 'keepOn', { on });
        return true;
    } catch {
        return false;
    }
}

// ─── Medição do funil (AnalyticsBridge.kt) ───

/**
 * Evento do funil de marketing (Todo/PLANO_MARKETING_ADMOB.md, fase 0),
 * registrado no Firebase Analytics do lado nativo — o app já tem o
 * google-services.json, o web não tem GA4 configurado ainda. Sem resposta
 * de propósito (`send`, não `request`): medição nunca deve travar nem
 * atrasar a ação que o usuário está fazendo.
 *
 * Fora do app (navegador, PWA), não faz nada — não é um "TODO esquecido",
 * é o estado atual: cobrir web/PWA é o próximo passo do plano (GA4 via
 * Firebase JS SDK), fora do escopo desta ponte nativa.
 */
export function nativeLogEvent(
    name: string,
    params: Record<string, string | number | boolean> = {},
): void {
    try {
        const port = hardenedPort();
        if (!port) return;
        send(port, 'analytics', 'logEvent', { name, params });
    } catch {
        /* medição nunca pode quebrar o fluxo do usuário */
    }
}
