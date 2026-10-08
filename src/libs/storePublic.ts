/**
 * Leitura da vitrine da loja NO SERVIDOR (fase 3 do plano da loja): as
 * páginas públicas (/loja, /loja/programa/ID, /loja/autor/CODIGO,
 * /loja/colecao/SLUG) chegam ao navegador e ao Google já com o conteúdo.
 * Sem axios (o interceptor do Api lê localStorage) e sem login: a vitrine é
 * pública no backend.
 *
 * O cache de dados do Next (revalidate) segura cada endereço por alguns
 * minutos: todas as páginas saem do mesmo IP do servidor, e o backend limita
 * requisições por IP.
 */

export const STORE_REVALIDATE_SECONDS = 120;

/** Endereço público do site (canonical, Open Graph e sitemap). */
export const SITE_URL = (
    process.env.NEXT_PUBLIC_SITE_URL || 'https://venafit.codriverslabs.com'
).replace(/\/+$/, '');

function apiBase(): string {
    const raw = (process.env.NEXT_PUBLIC_API_URL ?? '')
        .trim()
        .replace(/^['"]|['"]$/g, '')
        .replace(/\/+$/, '');
    return `${raw || 'http://localhost:8080'}/v1`;
}

export type StoreFetch<T> =
    | { ok: true; data: T }
    | { ok: false; notFound: boolean };

/** GET no backend da loja. Falha de rede ou 5xx = { ok: false, notFound:
 *  false }: a página cai na busca pelo navegador. */
export async function fetchStore<T>(path: string): Promise<StoreFetch<T>> {
    try {
        const res = await fetch(`${apiBase()}${path}`, {
            headers: { Accept: 'application/json' },
            next: { revalidate: STORE_REVALIDATE_SECONDS },
        });
        if (res.status === 404) return { ok: false, notFound: true };
        if (!res.ok) return { ok: false, notFound: false };
        return { ok: true, data: (await res.json()) as T };
    } catch {
        return { ok: false, notFound: false };
    }
}

/** JSON-LD seguro dentro de <script>: "<" escapado (o texto vem do autor). */
export function jsonLd(data: unknown): string {
    return JSON.stringify(data).replace(/</g, '\\u003c');
}

/** Corta o texto para a descrição da página (meta description). */
export function metaDescription(text: string | undefined, max = 160): string {
    const clean = (text ?? '').replace(/\s+/g, ' ').trim();
    return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}
