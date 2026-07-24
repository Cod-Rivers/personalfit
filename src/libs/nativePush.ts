import { Api } from '@/libs/api';

const TOKEN_KEY = 'venafit_native_push_token'; // gravado pelo app Android
const REGISTERED_KEY = 'venafit_registered_push_token'; // dedupe local

/**
 * Registra no backend o token de push nativo injetado pelo app Android
 * (MainActivity → localStorage). No-op no navegador comum ou se o token já foi
 * registrado. Seguro para chamar várias vezes.
 */
export async function syncNativePushToken(): Promise<void> {
    if (typeof window === 'undefined') return;

    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    // Só registra se logado (o endpoint exige auth).
    if (!window.localStorage.getItem('token')) return;

    // Evita reenviar o mesmo token toda hora.
    if (window.localStorage.getItem(REGISTERED_KEY) === token) return;

    try {
        await Api.post('/me/fcm-token', { token });
        window.localStorage.setItem(REGISTERED_KEY, token);
    } catch {
        // silencioso: tenta de novo no próximo carregamento
    }
}

/**
 * Ativa o registro do token nativo: tenta agora e escuta o evento disparado
 * pelo app quando injeta/renova o token. Retorna uma função de limpeza.
 */
export function listenNativePushToken(): () => void {
    if (typeof window === 'undefined') return () => {};
    const handler = () => void syncNativePushToken();
    window.addEventListener('venafit-native-token', handler);
    void syncNativePushToken();
    return () => window.removeEventListener('venafit-native-token', handler);
}
