import type { Metadata } from 'next';
import type { ResultCard } from '@/libs/resultService';
import { fetchStore, SITE_URL } from '@/libs/storePublic';
import ResultDetailView from './ResultDetailView';

type Params = { params: Promise<{ id: string }> };

function loadResult(id: string) {
    return fetchStore<ResultCard>(`/results/${encodeURIComponent(id)}`);
}

/** A página de cada resultado NÃO vai para o Google (decisão 2 do plano):
 *  quem publicou não aparece numa busca pelo próprio nome. O link continua
 *  abrindo para quem recebe o compartilhamento, com a prévia da foto. */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { id } = await params;
    const res = await loadResult(id);
    if (!res.ok) {
        return { title: 'Resultado | Venafit', robots: { index: false, follow: false } };
    }
    const r = res.data;
    const title = r.program
        ? `${r.weeks_between} semanas de ${r.program.title} | Mural de resultados Venafit`
        : `Antes e depois: ${r.weeks_between} semanas | Mural de resultados Venafit`;
    const description = 'Antes e depois publicado por um aluno do Venafit, com autorização e revisão da equipe.';
    const url = `${SITE_URL}/resultados/${r.id}`;
    return {
        title,
        description,
        robots: { index: false, follow: true },
        alternates: { canonical: url },
        openGraph: {
            title,
            description,
            url,
            type: 'article',
            siteName: 'Venafit',
            images: r.after_url ? [{ url: r.after_url }] : undefined,
        },
        twitter: { card: r.after_url ? 'summary_large_image' : 'summary', title, description },
    };
}

export default async function ResultPage({ params }: Params) {
    const { id } = await params;
    const res = await loadResult(id);
    return (
        <ResultDetailView
            id={id}
            initial={res.ok ? res.data : null}
            notFound={!res.ok && res.notFound}
        />
    );
}
