import Link from 'next/link';
import {
    AUTHOR_TERMS_UPDATED_AT,
    AUTHOR_TERMS_VERSION,
    AuthorTermsText,
} from '../_components/AuthorTerms';
import s from './termo.module.css';

export const metadata = {
    title: 'Termo do Autor — Loja de treinos do Venafit',
    description:
        'As regras para profissionais de Educação Física que vendem programas de treino na loja do Venafit.',
    alternates: { canonical: '/loja/termo-do-autor' },
};

/** O Termo do Autor, para ler antes de se candidatar. O aceite é no painel
 *  do parceiro (/parceiro), já como autor. */
export default function AuthorTermsPage() {
    return (
        <div className={s.page}>
            <h1 className={s.title}>Termo do Autor</h1>
            <p className={s.meta}>
                Loja de treinos do Venafit · versão {AUTHOR_TERMS_VERSION} ·
                atualizado em {AUTHOR_TERMS_UPDATED_AT}
            </p>
            <div className={s.text}>
                <AuthorTermsText />
            </div>
            <p className={s.meta}>
                Quer vender seus treinos?{' '}
                <Link href="/loja/vender">Veja como se candidatar</Link>.
            </p>
        </div>
    );
}
