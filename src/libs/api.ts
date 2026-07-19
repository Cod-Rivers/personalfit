import axios from "axios";

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

Api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (typeof window !== 'undefined' && error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/?reason=session_expired';
        }
        return Promise.reject(error);
    }
);
