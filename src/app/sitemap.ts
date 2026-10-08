import type { MetadataRoute } from 'next';
import { fetchStore, SITE_URL } from '@/libs/storePublic';

interface StoreSitemap {
    programs: { id: string; updated_at: string }[];
    authors: string[];
    collections: string[];
}

/** sitemap.xml: as páginas públicas do site e, da loja de treinos (fase 3),
 *  cada programa à venda, autor e coleção. Sem a loja (backend fora do ar),
 *  sai só a parte fixa. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const fixed: MetadataRoute.Sitemap = [
        { url: `${SITE_URL}/loja`, changeFrequency: 'daily', priority: 1 },
        {
            url: `${SITE_URL}/loja/vender`,
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${SITE_URL}/loja/termo-do-autor`,
            changeFrequency: 'yearly',
            priority: 0.2,
        },
        {
            url: `${SITE_URL}/cadastro`,
            changeFrequency: 'yearly',
            priority: 0.4,
        },
        {
            url: `${SITE_URL}/politica-privacidade`,
            changeFrequency: 'yearly',
            priority: 0.2,
        },
    ];
    const res = await fetchStore<StoreSitemap>('/store/sitemap');
    if (!res.ok) return fixed;
    const { programs, authors, collections } = res.data;
    return [
        ...fixed,
        ...programs.map((p) => ({
            url: `${SITE_URL}/loja/programa/${p.id}`,
            lastModified: p.updated_at,
            changeFrequency: 'weekly' as const,
            priority: 0.8,
        })),
        ...authors.map((code) => ({
            url: `${SITE_URL}/loja/autor/${encodeURIComponent(code)}`,
            changeFrequency: 'weekly' as const,
            priority: 0.6,
        })),
        ...collections.map((slug) => ({
            url: `${SITE_URL}/loja/colecao/${slug}`,
            changeFrequency: 'weekly' as const,
            priority: 0.7,
        })),
    ];
}
