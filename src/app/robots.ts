import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/libs/storePublic';

/** robots.txt: a loja e as páginas públicas ficam abertas ao Google; as áreas
 *  com login ficam de fora (exigem conta e não têm o que indexar). */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/admin',
                '/personal',
                '/app',
                '/meus-treinos',
                '/pagamento',
                '/parceiro',
                '/minha-conta',
                '/vitrine',
                '/evolucao',
                '/agendamentos',
                '/mensalidades',
                '/plano-alimentar',
                '/desafio',
                '/desafios',
            ],
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    };
}
