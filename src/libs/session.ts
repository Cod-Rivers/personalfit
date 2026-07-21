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
}

const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const AUTH_COOKIE = 'vf_auth';
const ROLE_COOKIE = 'vf_role';

function setCookie(name: string, value: string, maxAgeSeconds: number): void {
    if (typeof document === 'undefined') return;
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

function deleteCookie(name: string): void {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/** Salva a sessão (localStorage + cookies de presença/papel). */
export function saveSession(token: string, user: SessionUser): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    // Cookies expiram junto com a validade típica do access token (3h).
    setCookie(AUTH_COOKIE, '1', 60 * 60 * 3);
    setCookie(ROLE_COOKIE, String(user.role ?? ''), 60 * 60 * 3);
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
 * Limpa toda a sessão: localStorage, cookies e — importante para LGPD — os
 * dados sensíveis de saúde/treino em cache local (IndexedDB offline e Cache
 * Storage do service worker). Em dispositivo compartilhado, isso evita que o
 * próximo usuário acesse o plano do anterior via DevTools.
 */
export async function clearSession(): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    deleteCookie(AUTH_COOKIE);
    deleteCookie(ROLE_COOKIE);

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
