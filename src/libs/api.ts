import axios, { InternalAxiosRequestConfig } from "axios";
import { clearSession, getRefreshToken, getUser, saveSession } from "@/libs/session";

const normalizeBaseUrl = (value?: string): string => {
    const raw = (value ?? '').trim().replace(/^['"]|['"]$/g, '');
    if (!raw) return '';
    return raw.replace(/\/+$/, '');
};

const fallbackLocalApi = 'http://localhost:8080';
const resolvedBase =
    normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL) || fallbackLocalApi;

export const Api = axios.create({
    baseURL: `${resolvedBase}/v1`,
    headers: {
        "Content-Type": "application/json",
    },
});

Api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = token;
        }
    }
    return config;
});

let refreshInFlight: Promise<string | null> | null = null;

/**
 * Troca o refresh token guardado por um novo par (access+refresh) e persiste
 * a sessão. Usa axios puro (não a instância `Api`) para não reentrar nos
 * próprios interceptors. Concorrência (heartbeat do FCMProvider e o retry de
 * 401 abaixo disparando quase juntos) é resolvida com uma única promise
 * compartilhada — a segunda chamada espera a primeira em vez de abrir outra
 * requisição de refresh.
 */
export function refreshAccessToken(): Promise<string | null> {
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
        const refreshToken = getRefreshToken();
        const user = getUser();
        if (!refreshToken || !user) return null;

        try {
            const { data } = await axios.post(`${resolvedBase}/v1/refresh`, {
                refresh_token: refreshToken,
            });
            if (data?.access_token && data?.refresh_token) {
                saveSession(data.access_token, user, data.refresh_token);
                return data.access_token as string;
            }
            return null;
        } catch {
            return null;
        }
    })();

    refreshInFlight.finally(() => {
        refreshInFlight = null;
    });

    return refreshInFlight;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

Api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error.response?.status;
        const originalRequest = error.config as RetriableConfig | undefined;
        const isRefreshCall = originalRequest?.url?.includes('/refresh');

        // Access token expirado (comum: app reaberto depois dos 45min de
        // validade, antes do heartbeat rodar de novo) — tenta renovar com o
        // refresh token e refazer a requisição original UMA vez antes de
        // desistir. Sem isso, qualquer 401 pontual derrubava a sessão inteira
        // mesmo com dias de validade restantes no refresh token.
        if (
            typeof window !== 'undefined' &&
            status === 401 &&
            originalRequest &&
            !originalRequest._retried &&
            !isRefreshCall
        ) {
            originalRequest._retried = true;
            const newToken = await refreshAccessToken();
            if (newToken) {
                originalRequest.headers.Authorization = newToken;
                return Api(originalRequest);
            }
        }

        if (typeof window !== 'undefined' && status === 401) {
            void clearSession().finally(() => {
                window.location.href = '/?reason=session_expired';
            });
        }
        return Promise.reject(error);
    }
);
