'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import ResultCardView from '@/components/features/results/ResultCardView';
import { useResultActions } from '@/components/features/results/useResultActions';
import rs from '@/components/features/results/results.module.css';
import { Api } from '@/libs/api';
import type { ResultCard } from '@/libs/resultService';
import s from '../resultados.module.css';

/** Página de um resultado: deslizador antes/depois, números, programa. */
export default function ResultDetailView({
    id,
    initial,
    notFound,
}: {
    id: string;
    initial: ResultCard | null;
    notFound: boolean;
}) {
    const [result, setResult] = useState<ResultCard | null>(initial);
    const [missing, setMissing] = useState(notFound);

    // Falha de rede no servidor: tenta pelo navegador.
    useEffect(() => {
        if (initial || notFound) return;
        Api.get<ResultCard>(`/results/${encodeURIComponent(id)}`)
            .then(({ data }) => setResult(data))
            .catch(() => setMissing(true));
    }, [id, initial, notFound]);

    const setCount = useCallback(
        (_: string, count: number) => setResult((r) => (r ? { ...r, cheers_count: count } : r)),
        [],
    );
    const { cheered, cheer, report, share, slots } = useResultActions(result ? [result] : [], setCount);

    return (
        <div className={s.page}>
            {slots}
            <Link href="/resultados" className={s.back}>
                <FiArrowLeft /> Mural de resultados
            </Link>
            {missing ? (
                <div className={s.empty}>Este resultado não está mais no mural.</div>
            ) : !result ? (
                <p className={s.loading}>Carregando…</p>
            ) : (
                <div className={s.detail}>
                    <ResultCardView
                        result={result}
                        detailed
                        cheered={cheered.has(result.id)}
                        onCheer={() => cheer(result.id)}
                        onReport={() => report(result.id)}
                        onShare={() => share(result)}
                    />
                    <div className={s.cta}>
                        <p>Quer começar o seu? Tire a foto de antes na Evolução do app.</p>
                        <Link href="/evolucao?aba=resultados" className={rs.btnPrimary}>
                            Começar meu antes e depois
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
