// Ative apenas depois que o app Android estiver publicado na Play Store —
// antes disso o redirect levaria a uma ficha inexistente (404 da Play Store).
export const ANDROID_APP_LIVE = true;

const ANDROID_APP_PACKAGE = 'com.codriverslabs.venafit';
export const ANDROID_PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_APP_PACKAGE}`;

/** Assinaturas da conta na Play Store, já filtradas pelo app: é por lá que se
 *  cancela ou troca de plano uma assinatura feita pelo Google Play. */
export const PLAY_SUBSCRIPTIONS_URL = `https://play.google.com/store/account/subscriptions?package=${ANDROID_APP_PACKAGE}`;

/** Ficha da Play Store levando o código de quem indicou (`ref`). O app lê o
 *  `referrer` na primeira abertura (Install Referrer, ver InstallReferrer.kt)
 *  e o guarda como o `?ref=` do site: sem isso, quem chega pelo link de um
 *  parceiro e instala o app perde a origem. */
export function playStoreUrl(ref?: string | null): string {
    const code = ref?.trim();
    if (!code) return ANDROID_PLAY_STORE_URL;
    return `${ANDROID_PLAY_STORE_URL}&referrer=${encodeURIComponent(`ref=${code}`)}`;
}

/** MainActivity.kt anexa esse token ao User-Agent do WebView do app nativo. */
const APP_WEBVIEW_UA_MARKER = 'VenafitApp/';

/** true quando a página já está rodando dentro do WebView do app Android nativo. */
export function isInsideNativeApp(): boolean {
    if (typeof navigator === 'undefined') return false;
    return navigator.userAgent.includes(APP_WEBVIEW_UA_MARKER);
}

/**
 * true quando a página está sendo aberta pelo navegador do Android FORA do
 * app nativo. Serve para detectar o fallback do App Link: se o app já
 * estivesse instalado e o domínio verificado, o Android teria aberto o app
 * direto e este código nunca executaria — então chegar aqui com UA Android
 * normalmente significa "app não instalado". Exclui o próprio WebView do
 * app (marcado em MainActivity.kt) para não redirecionar quem já o usa.
 */
export function isAndroidBrowser(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    return /Android/i.test(ua) && !ua.includes(APP_WEBVIEW_UA_MARKER);
}
