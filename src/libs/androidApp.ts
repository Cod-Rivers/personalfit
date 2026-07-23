// Ative apenas depois que o app Android estiver publicado na Play Store —
// antes disso o redirect levaria a uma ficha inexistente (404 da Play Store).
export const ANDROID_APP_LIVE = false;

const ANDROID_APP_PACKAGE = 'com.codriverslabs.venafit';
export const ANDROID_PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_APP_PACKAGE}`;

/** MainActivity.kt anexa esse token ao User-Agent do WebView do app nativo. */
const APP_WEBVIEW_UA_MARKER = 'VenafitApp/';

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
