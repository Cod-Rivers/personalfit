import type { Metadata } from 'next';
import type { ResultPage } from '@/libs/resultService';
import { fetchStore, SITE_URL } from '@/libs/storePublic';
import ResultsWall from './ResultsWall';

const TITLE = 'Mural de resultados: antes e depois reais | Venafit';
const DESCRIPTION =
    'Antes e depois de quem treina com o Venafit, publicados pelos próprios alunos e revisados pela equipe. Resultados verificados mostram o programa e os treinos registrados.';

export const metadata: Metadata = {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: `${SITE_URL}/resultados` },
    openGraph: {
        title: TITLE,
        description: DESCRIPTION,
        url: `${SITE_URL}/resultados`,
        type: 'website',
        siteName: 'Venafit',
    },
};

/** Mural público (Todo/PLANO_MURAL_DE_RESULTADOS.md): o servidor manda a
 *  primeira página; filtros e "ver mais" buscam pelo navegador. Sem anúncio
 *  nenhum aqui (§4.6 do plano). */
export default async function ResultadosPage() {
    const res = await fetchStore<ResultPage>('/results?limit=24');
    return <ResultsWall initial={res.ok ? res.data : null} />;
}
