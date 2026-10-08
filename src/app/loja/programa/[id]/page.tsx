import type { Metadata } from 'next';
import { headers } from 'next/headers';
import type { StoreProgramDetail } from '@/libs/storeService';
import {
    fetchStore,
    jsonLd,
    metaDescription,
    SITE_URL,
} from '@/libs/storePublic';
import ProgramView from './ProgramView';

type Params = { params: Promise<{ id: string }> };

function loadProgram(id: string) {
    return fetchStore<StoreProgramDetail>(
        `/store/programs/${encodeURIComponent(id)}`,
    );
}

function coverOf(p: StoreProgramDetail): string | undefined {
    return p.cover_url || p.cover_video_thumb || undefined;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { id } = await params;
    const res = await loadProgram(id);
    if (!res.ok) {
        return {
            title: 'Programa de treino | Venafit',
            robots: res.notFound ? { index: false } : undefined,
        };
    }
    const p = res.data;
    const by = p.author ? ` por ${p.author.name} (${p.author.cref})` : '';
    const title = `${p.title}${by} | Loja de treinos Venafit`;
    const description = metaDescription(p.summary || p.description);
    const url = `${SITE_URL}/loja/programa/${p.id}`;
    const image = coverOf(p);
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
            images: image ? [{ url: image }] : undefined,
        },
        twitter: {
            card: image ? 'summary_large_image' : 'summary',
            title,
            description,
        },
    };
}

/** Página pública do programa (fase 3 do plano da loja): o servidor manda o
 *  programa já preenchido e os dados estruturados (Product) para o Google. */
export default async function ProgramPage({ params }: Params) {
    const { id } = await params;
    const [res, requestHeaders] = await Promise.all([
        loadProgram(id),
        headers(),
    ]);
    const nonce = requestHeaders.get('x-nonce') ?? undefined;
    const program = res.ok ? res.data : null;

    const structured = program && {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: program.title,
        description: metaDescription(
            program.description || program.summary,
            500,
        ),
        image: coverOf(program),
        brand: { '@type': 'Brand', name: program.author?.name ?? 'Venafit' },
        offers: {
            '@type': 'Offer',
            price: program.price.toFixed(2),
            priceCurrency: 'BRL',
            availability: 'https://schema.org/InStock',
            url: `${SITE_URL}/loja/programa/${program.id}`,
        },
        ...(program.rating_count > 0 && {
            aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: program.rating_avg,
                reviewCount: program.rating_count,
            },
        }),
    };

    return (
        <>
            {structured && (
                <script
                    type="application/ld+json"
                    nonce={nonce}
                    suppressHydrationWarning
                    dangerouslySetInnerHTML={{ __html: jsonLd(structured) }}
                />
            )}
            <ProgramView
                id={id}
                initial={program}
                initialNotFound={!res.ok && res.notFound}
            />
        </>
    );
}
