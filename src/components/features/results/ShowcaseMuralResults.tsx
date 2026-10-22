'use client';

import type { ResultCard } from '@/libs/resultService';
import ResultCardView from './ResultCardView';
import s from './results.module.css';

/** Na vitrine do personal: os resultados do mural em que ele aceitou
 *  aparecer (`mural_results` da resposta da vitrine). Diferente das fotos
 *  de "resultados" que o personal sobe à mão, aqui a autorização do aluno
 *  está registrada no termo do mural. */
export default function ShowcaseMuralResults({
    results,
    title = 'Resultados de alunos',
}: {
    results?: ResultCard[] | null;
    title?: string;
}) {
    if (!results || results.length === 0) return null;
    return (
        <section className={s.section} aria-label={title}>
            <h3 className={s.sectionTitle}>{title}</h3>
            <div className={s.strip}>
                {results.map((r) => (
                    <ResultCardView key={r.id} result={r} />
                ))}
            </div>
        </section>
    );
}
