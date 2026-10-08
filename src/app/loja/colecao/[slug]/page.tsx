import type { Metadata } from 'next';
import type { StoreCollection } from '@/libs/storeService';
import { fetchStore, metaDescription, SITE_URL } from '@/libs/storePublic';
import CollectionView from './CollectionView';

type Params = { params: Promise<{ slug: string }> };

function loadCollection(slug: string) {
    return fetchStore<StoreCollection>(
        `/store/collections/${encodeURIComponent(slug)}`,
    );
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { slug } = await params;
    const res = await loadCollection(slug);
    if (!res.ok) {
        return {
            title: 'Coleção | Loja de treinos Venafit',
            robots: res.notFound ? { index: false } : undefined,
        };
    }
    const c = res.data;
    const title = `${c.title} | Loja de treinos Venafit`;
    const description = metaDescription(
        c.description ||
            `${c.programs.length} programas de treino de profissionais com CREF.`,
    );
    const url = `${SITE_URL}/loja/colecao/${c.slug}`;
    return {
        title,
        description,
        alternates: { canonical: url },
        openGraph: {
            title,
            description,
            url,
            type: 'website',
            siteName: 'Venafit',
        },
    };
}

/** Página pública de uma coleção temática (fase 3 do plano da loja). */
export default async function CollectionPage({ params }: Params) {
    const { slug } = await params;
    const res = await loadCollection(slug);
    return (
        <CollectionView
            slug={slug}
            initial={res.ok ? res.data : null}
            initialNotFound={!res.ok && res.notFound}
        />
    );
}
