import type { Metadata } from 'next';
import type { PublicPage } from '@/libs/leadService';
import { fetchStore, metaDescription, SITE_URL } from '@/libs/storePublic';
import PublicPageView from './PublicPageView';

type Params = { params: Promise<{ slug: string }> };

/** fetchStore é o GET público genérico do servidor (sem login, com cache de
 *  2 min); o nome é da loja, que foi a primeira página pública. */
function loadPage(slug: string) {
    return fetchStore<PublicPage>(
        `/pages/${encodeURIComponent(decodeURIComponent(slug))}`,
    );
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { slug } = await params;
    const res = await loadPage(slug);
    if (!res.ok) {
        return {
            title: 'Personal trainer | Venafit',
            robots: res.notFound ? { index: false } : undefined,
        };
    }
    const p = res.data;
    const headline = p.showcase?.tagline || p.headline;
    const title = headline
        ? `${p.personal_name}: ${headline}`
        : `${p.personal_name}, personal trainer`;
    const description = metaDescription(
        p.showcase?.bio ||
            p.about ||
            `Treine com ${p.personal_name}. Peça contato e comece com acompanhamento de verdade.`,
    );
    const url = `${SITE_URL}/p/${p.slug}`;
    // O avatar da conta pode ser data URI (base64), que as redes não aceitam
    // na prévia do link: só vai URL http(s).
    const image = [p.showcase?.cover_url, p.avatar_url].find(
        (u) => !!u && /^https?:\/\//.test(u),
    );
    return {
        title,
        description,
        alternates: { canonical: url },
        openGraph: {
            title,
            description,
            url,
            type: 'profile',
            siteName: 'Venafit',
            images: image ? [{ url: image }] : undefined,
        },
    };
}

/** Página pública do personal: o link da bio (funil de vendas, -48). */
export default async function PersonalPublicPage({ params }: Params) {
    const { slug } = await params;
    const res = await loadPage(slug);
    return (
        <PublicPageView
            slug={decodeURIComponent(slug)}
            initial={res.ok ? res.data : null}
            initialNotFound={!res.ok && res.notFound}
        />
    );
}
