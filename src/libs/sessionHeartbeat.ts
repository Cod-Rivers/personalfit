import { refreshAccessToken } from '@/libs/api';

/**
 * Renova o access token em silêncio usando o refresh token guardado.
 * Chamada pelo heartbeat (useVisiblePolling em FCMProvider) a cada 30min
 * com a página/app aberto — é isso que evita o usuário ser deslogado no
 * meio do uso mesmo com o access token durando só 45min (ver GenerateToken
 * no backend). A lógica em si vive em api.ts (refreshAccessToken) porque o
 * interceptor de 401 também precisa dela — heartbeat e retry-on-401
 * compartilham a mesma promise em voo, evitando duas chamadas de refresh
 * concorrentes.
 */
export async function renewSession(): Promise<void> {
    await refreshAccessToken();
}
