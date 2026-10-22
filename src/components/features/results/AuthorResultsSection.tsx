'use client';

import { useEffect, useState } from 'react';
import { listAuthorResults, type ResultCard } from '@/libs/resultService';
import ResultCardView from './ResultCardView';
import { useResultActions } from './useResultActions';
import s from './results.module.css';

/** No painel do autor (/parceiro): os resultados do mural de quem fez os
 *  programas dele e autorizou a divulgação pelo autor. O cartão de
 *  compartilhar leva a marca e o link do resultado. */
export default function AuthorResultsSection() {
    const [items, setItems] = useState<ResultCard[] | null>(null);
    const { share, slots } = useResultActions(items ?? []);

    useEffect(() => {
        listAuthorResults()
            .then(setItems)
            .catch(() => setItems([]));
    }, []);

    if (items === null) return null;
    return (
        <section className={s.section} aria-labelledby="resultados-autor">
            {slots}
            <h2 id="resultados-autor" className={s.sectionTitle}>
                Resultados dos seus programas
            </h2>
            <p className={s.muted}>
                Antes e depois verificados de quem fez seus programas e autorizou você a divulgar. Use o botão
                Compartilhar para postar com a marca e o link do resultado. Não altere as fotos nem os números.
            </p>
            {items.length === 0 ? (
                <div className={s.empty}>Ainda não há resultados autorizados para divulgação.</div>
            ) : (
                <div className={s.strip}>
                    {items.map((r) => (
                        <ResultCardView key={r.id} result={r} onShare={() => share(r)} />
                    ))}
                </div>
            )}
        </section>
    );
}
