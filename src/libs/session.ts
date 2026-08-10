/**
 * Gestão centralizada da sessão do cliente.
 *
 * O token de acesso continua em localStorage (a API autentica por header
 * Authorization: Bearer, nunca por cookie). Além disso, espelhamos dois cookies
 * LEVES — `vf_auth` (presença) e `vf_role` (papel) — que NÃO contêm o JWT.
 * Eles servem apenas para o middleware de borda (middleware.ts) poder gatear
 * rotas sem enviar o token; como o backend ignora cookies, não há superfície de
 * CSRF nova.
 *
 * Centralizar aqui elimina a duplicação de leitura/escrita de sessão que estava
 * espalhada por login, seleção de perfil, header e interceptores.
 */

export interface SessionUser {
    id?: string;
    role?: string;
    name?: string;
    email?: string;
    has_personal?: boolean;
    // true para aluno pré-cadastrado pelo personal que ainda não trocou a
    // senha temporária recebida por e-mail (ver /trocar-senha-temporaria).
    must_change_password?: boolean;
}

// Bridge nativa do app Android (window.VenafitAuth, injetada via
// addJavascriptInterface — ver AuthBridge.kt) usada pelo widget de tela
// inicial (calendário de constância) para chamar a API em background, sem
// depender da WebView estar aberta. Ausente no navegador comum.
declare global {
    interface Window {
        VenafitAuth?: {
            save(token: string): void;
            clear(): void;
        };
    }
}

const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const REFRESH_TOKEN_KEY = 'refresh_token';
const AUTH_COOKIE = 'vf_auth';
const ROLE_COOKIE = 'vf_role';

/**
 * Teto absoluto da sessão (ver RefreshSessionMaxDays no backend): o access
 * token em si dura só 45min, mas é renovado em silêncio pelo heartbeat
 * (ver renewSession em sessionHeartbeat.ts, chamado pelo FCMProvider)
 * enquanto o refresh token continuar válido. O cookie de presença precisa
 * acompanhar esse teto, não a duração curta do access token — senão o
 * middleware trataria o usuário como deslogado no meio de uma sessão que na
 * verdade ainda é válida.
 */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/**
 * Prefixo do cache local (localStorage) de "Minhas Anotações" por exercício
 * (ver exerciseAnnotationService.ts). É dado sensível de treino/saúde, então
 * precisa ser limpo no logout como o resto (mesmo motivo do IndexedDB acima).
 */
export const EXERCISE_NOTE_CACHE_PREFIX = 'vf_exercise_note:';

/**
 * Prefixo do cache local (localStorage) da carga ("Peso (KG)") que o aluno
 * definiu por exercício (ver exerciseWeightService.ts). Mesmo motivo do
 * prefixo de anotações acima: dado sensível de treino, precisa ser limpo no
 * logout.
 */
export const EXERCISE_WEIGHT_CACHE_PREFIX = 'vf_exercise_weight:';

/**
 * Prefixo do cache local (localStorage) do timestamp de início do treino
 * (ver workoutSessionTimer.ts), usado para calcular a duração automática.
 * Não é dado sensível de saúde, mas segue o mesmo padrão de higiene dos
 * prefixos acima: limpo no logout para não vazar entre usuários no mesmo
 * dispositivo.
 */
export const WORKOUT_START_CACHE_PREFIX = 'vf_workout_start:';

function setCookie(name: string, value: string, maxAgeSeconds: number): void {
    if (typeof document === 'undefined') return;
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

function deleteCookie(name: string): void {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/**
 * Salva a sessão (localStorage + cookies de presença/papel). Chamada tanto
 * no login quanto a cada renovação silenciosa do heartbeat — por isso
 * refreshToken é opcional (o heartbeat sempre passa um; alguns fluxos
 * legados de troca de perfil podem não ter um novo no momento).
 */
export function saveSession(
    token: string,
    user: SessionUser,
    refreshToken?: string,
): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    setCookie(AUTH_COOKIE, '1', SESSION_MAX_AGE_SECONDS);
    setCookie(ROLE_COOKIE, String(user.role ?? ''), SESSION_MAX_AGE_SECONDS);
    window.VenafitAuth?.save(token);
}

export function getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Reenvia o token atual (se houver) para a bridge nativa. Chamada no boot da
 * app (FCMProvider), não só no login/heartbeat — cobre o caso do processo
 * nativo ter sido reiniciado e perdido o último token salvo (ver
 * AuthBridge.kt e WorkoutCalendarSyncWorker).
 */
export function refreshNativeAuthToken(): void {
    if (typeof window === 'undefined') return;
    const token = getToken();
    if (token) window.VenafitAuth?.save(token);
}

export function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): SessionUser | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as SessionUser;
    } catch {
        return null;
    }
}

/**
 * Hub de treinos do aluno logado: `/meus-treinos` para quem tem personal
 * vinculado (sistema de macrociclo), `/app` para quem não tem (dashboard
 * legado de protocolo). Usado pelos botões "voltar" nas telas do aluno.
 */
export function getStudentHomeRoute(): string {
    return getUser()?.has_personal ? '/meus-treinos' : '/app';
}

/**
 * Rota de entrada por papel, logo após a autenticação. Usada tanto pelo login
 * quanto pela seleção de perfil (login com CPF de papel duplo), que antes
 * repetiam a mesma cadeia de ternários.
 *
 * Aluno COM personal vinculado entra por `/vitrine` — a página de divulgação da
 * marca do personal. Quem decide se ela aparece é o SERVIDOR: `/vitrine`
 * consulta a API e, se o personal não estiver no plano Pro ou não tiver
 * publicado a página, redireciona na hora para o fluxo atual (Meus Treinos).
 * O cliente não conhece o plano do personal e não deveria conhecer. Aluno sem
 * personal nem passa por lá.
 */
export function landingRouteFor(user: SessionUser): string {
    if (user.role === 'admin' || user.role === 'content_editor') return '/admin';
    if (user.role === 'personal') return '/personal';
    return user.has_personal ? '/vitrine' : '/app';
}

/**
 * Limpa toda a sessão: localStorage, cookies e — importante para LGPD — os
 * dados sensíveis de saúde/treino em cache local (IndexedDB offline e Cache
 * Storage do service worker). Em dispositivo compartilhado, isso evita que o
 * próximo usuário acesse o plano do anterior via DevTools.
 */
export async function clearSession(): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    deleteCookie(AUTH_COOKIE);
    deleteCookie(ROLE_COOKIE);
    window.VenafitAuth?.clear();

    // Anotações e carga de exercício cacheadas localmente (dado sensível de treino)
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (
            key?.startsWith(EXERCISE_NOTE_CACHE_PREFIX) ||
            key?.startsWith(EXERCISE_WEIGHT_CACHE_PREFIX) ||
            key?.startsWith(WORKOUT_START_CACHE_PREFIX)
        ) {
            localStorage.removeItem(key);
        }
    }

    // IndexedDB offline (planos de treino, mutações pendentes)
    try {
        if (window.indexedDB) {
            await new Promise<void>((resolve) => {
                const req = indexedDB.deleteDatabase('venafit-offline');
                req.onsuccess = req.onerror = req.onblocked = () => resolve();
            });
        }
    } catch {
        /* melhor-esforço: não bloquear o logout por falha de limpeza */
    }

    // Cache Storage do service worker (respostas cacheadas)
    try {
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
        }
    } catch {
        /* melhor-esforço */
    }
}
