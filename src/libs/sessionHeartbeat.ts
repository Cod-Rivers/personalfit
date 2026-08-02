import { Api } from '@/libs/api';
import { getRefreshToken, getUser, saveSession } from '@/libs/session';

/**
 * Renova o access token em silêncio usando o refresh token guardado.
 * Chamada pelo heartbeat (useVisiblePolling em FCMProvider) a cada 30min
 * com a página/app aberto — é isso que evita o usuário ser deslogado no
 * meio do uso mesmo com o access token durando só 45min (ver GenerateToken
 * no backend). Sessões antigas sem refresh_token salvo (de antes desta
 * mudança) simplesmente não renovam e caem no logout natural do
 * interceptor de 401 quando o access token expirar.
 */
export async function renewSession(): Promise<void> {
    const refreshToken = getRefreshToken();
    const user = getUser();
    if (!refreshToken || !user) return;

    try {
        const { data } = await Api.post('/refresh', {
            refresh_token: refreshToken,
        });
        if (data?.access_token && data?.refresh_token) {
            saveSession(data.access_token, user, data.refresh_token);
        }
    } catch {
        // 401 real (sessão expirada/revogada) já dispara clearSession +
        // redirect no interceptor global (ver api.ts). Falha de rede só
        // tenta de novo no próximo heartbeat — não é motivo para deslogar.
    }
}
