import type { Metadata } from 'next';
import type { StoreCollection, StoreProgramCard } from '@/libs/storeService';
import { fetchStore, SITE_URL } from '@/libs/storePublic';
import StoreHome from './StoreHome';

const TITLE = 'Loja de treinos: programas de profissionais com CREF | Venafit';
const DESCRIPTION =
    'Programas de treino completos, montados por profissionais de Educação Física com CREF. Pagamento único, com vídeos, cronômetro e registro de carga no app Venafit.';

export const metadata: Metadata = {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: `${SITE_URL}/loja` },
    openGraph: {
        title: TITLE,
        description: DESCRIPTION,
        url: `${SITE_URL}/loja`,
        type: 'website',
        siteName: 'Venafit',
    },
};

/** Vitrine pública (fase 3 do plano da loja): o servidor manda os
 *  programas na ordem padrão e as coleções temáticas. */
export default async function LojaPage() {
    const [programs, collections] = await Promise.all([
        fetchStore<StoreProgramCard[]>('/store/programs?sort=featured'),
        fetchStore<StoreCollection[]>('/store/collections'),
    ]);
    return (
        <StoreHome
            initialPrograms={programs.ok ? programs.data : null}
            initialCollections={collections.ok ? collections.data : []}
        />
    );
}
