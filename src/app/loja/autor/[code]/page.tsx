import type { Metadata } from 'next';
import type { StoreAuthorPage } from '@/libs/storeService';
import { fetchStore, metaDescription, SITE_URL } from '@/libs/storePublic';
import AuthorView from './AuthorView';

type Params = { params: Promise<{ code: string }> };

function loadAuthor(code: string) {
    return fetchStore<StoreAuthorPage>(
        `/store/authors/${encodeURIComponent(decodeURIComponent(code))}`,
    );
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { code } = await params;
    const res = await loadAuthor(code);
    if (!res.ok) {
        return {
            title: 'Autor | Loja de treinos Venafit',
            robots: res.notFound ? { index: false } : undefined,
        };
    }
    const a = res.data.author;
    const title = `${a.name} (${a.cref}): programas de treino | Venafit`;
    const description = metaDescription(
        a.bio ||
            `Programas de treino de ${a.name}, profissional de Educação Física com ${a.cref}, na loja do Venafit.`,
    );
    const url = `${SITE_URL}/loja/autor/${encodeURIComponent(a.code)}`;
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
            images: a.photo_url ? [{ url: a.photo_url }] : undefined,
        },
    };
}

/** Página pública do autor (fase 3 do plano da loja). */
export default async function AuthorPage({ params }: Params) {
    const { code } = await params;
    const res = await loadAuthor(code);
    return (
        <AuthorView
            code={code}
            initial={res.ok ? res.data : null}
            initialNotFound={!res.ok && res.notFound}
        />
    );
}
