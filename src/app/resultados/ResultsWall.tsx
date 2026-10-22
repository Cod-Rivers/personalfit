'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import ResultCardView, { RESULTS_DISCLAIMER } from '@/components/features/results/ResultCardView';
import { useResultActions } from '@/components/features/results/useResultActions';
import rs from '@/components/features/results/results.module.css';
import { getStudentHomeRoute, getToken } from '@/libs/session';
import { listResults, RESULT_GOALS, type ResultCard, type ResultFilter, type ResultPage } from '@/libs/resultService';
import { saveStoreEntryPoint } from '@/libs/storeSaleRef';
import s from './resultados.module.css';

const WEEKS = [
    { value: 0, label: 'Qualquer duração' },
    { value: 8, label: '8 semanas ou mais' },
    { value: 12, label: '12 semanas ou mais' },
    { value: 24, label: '6 meses ou mais' },
];

/** O mural de resultados (público). */
export default function ResultsWall({ initial }: { initial: ResultPage | null }) {
    const [filter, setFilter] = useState<ResultFilter>({});
    const [items, setItems] = useState<ResultCard[] | null>(initial?.items ?? null);
    const [next, setNext] = useState<string | undefined>(initial?.next_before);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [loggedIn, setLoggedIn] = useState(false);
    const isDefault = !filter.goal && !filter.min_weeks && !filter.verified && !filter.program;

    const setCount = useCallback(
        (id: string, count: number) =>
            setItems((prev) => prev?.map((r) => (r.id === id ? { ...r, cheers_count: count } : r)) ?? prev),
        [],
    );
    const { cheered, cheer, report, share, slots } = useResultActions(items ?? [], setCount);

    useEffect(() => {
        setLoggedIn(!!getToken());
        // ?program=ID: os resultados de um programa (link da página dele).
        const program = new URLSearchParams(window.location.search).get('program');
        if (program && /^[0-9a-f]{24}$/.test(program)) setFilter((f) => ({ ...f, program }));
        // Quem chega pelo mural e vai à loja leva a origem para a compra.
        saveStoreEntryPoint('mural');
    }, []);

    useEffect(() => {
        if (isDefault && initial) {
            setItems(initial.items);
            setNext(initial.next_before);
            return;
        }
        let alive = true;
        setItems(null);
        setError('');
        listResults({ ...filter, limit: 24 })
            .then((page) => {
                if (!alive) return;
                setItems(page.items);
                setNext(page.next_before);
            })
            .catch(() => {
                if (!alive) return;
                setItems([]);
                setError('Não foi possível carregar o mural. Tente de novo em instantes.');
            });
        return () => {
            alive = false;
        };
    }, [filter, isDefault, initial]);

    const loadMore = async () => {
        if (!next) return;
        setLoading(true);
        try {
            const page = await listResults({ ...filter, before: next, limit: 24 });
            setItems((prev) => [...(prev ?? []), ...page.items]);
            setNext(page.next_before);
        } catch {
            setError('Não foi possível carregar mais resultados.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={s.page}>
            {slots}
            {loggedIn && (
                <Link href={getStudentHomeRoute()} className={s.back}>
                    <FiArrowLeft /> Voltar
                </Link>
            )}
            <h1 className={s.title}>Mural de resultados</h1>
            {filter.program && (
                <p className={s.subtitle}>
                    Mostrando os resultados de um programa da loja.{' '}
                    <button type="button" className={rs.linkBtn} onClick={() => setFilter((f) => ({ ...f, program: undefined }))}>
                        Ver todos
                    </button>
                </p>
            )}
            <p className={s.subtitle}>
                Antes e depois publicados pelos próprios alunos, com autorização e revisão da equipe. O selo
                “Resultado verificado” indica fotos enviadas pela Evolução do app, com semanas de diferença, e
                treinos registrados no período.
            </p>

            <div className={s.filters}>
                <select
                    className={s.filter}
                    aria-label="Objetivo"
                    value={filter.goal ?? ''}
                    onChange={(e) => setFilter((f) => ({ ...f, goal: e.target.value || undefined }))}
                >
                    <option value="">Todos os objetivos</option>
                    {RESULT_GOALS.map((g) => (
                        <option key={g.value} value={g.value}>
                            {g.label}
                        </option>
                    ))}
                </select>
                <select
                    className={s.filter}
                    aria-label="Duração"
                    value={filter.min_weeks ?? 0}
                    onChange={(e) => setFilter((f) => ({ ...f, min_weeks: Number(e.target.value) || undefined }))}
                >
                    {WEEKS.map((w) => (
                        <option key={w.value} value={w.value}>
                            {w.label}
                        </option>
                    ))}
                </select>
                <label className={s.toggle}>
                    <input
                        type="checkbox"
                        checked={!!filter.verified}
                        onChange={(e) => setFilter((f) => ({ ...f, verified: e.target.checked || undefined }))}
                    />
                    Só verificados
                </label>
            </div>

            {error && <p className={rs.error}>{error}</p>}
            {items === null ? (
                <p className={s.loading}>Carregando resultados…</p>
            ) : items.length === 0 ? (
                <div className={s.empty}>
                    {isDefault
                        ? 'Os primeiros resultados aparecem aqui em breve.'
                        : 'Nenhum resultado com esses filtros.'}
                </div>
            ) : (
                <div className={rs.grid}>
                    {items.map((r) => (
                        <ResultCardView
                            key={r.id}
                            result={r}
                            cheered={cheered.has(r.id)}
                            onCheer={() => cheer(r.id)}
                            onReport={() => report(r.id)}
                            onShare={() => share(r)}
                        />
                    ))}
                </div>
            )}

            {next && (
                <div className={s.more}>
                    <button type="button" className={rs.btn} onClick={loadMore} disabled={loading}>
                        {loading ? 'Carregando…' : 'Ver mais resultados'}
                    </button>
                </div>
            )}

            <div className={s.cta}>
                <p>Quer o seu aqui? Tire a foto de antes na Evolução do app e, depois de algumas semanas, publique.</p>
                <Link href={loggedIn ? '/evolucao?aba=resultados' : '/cadastro?redirect=%2Fevolucao%3Faba%3Dresultados'} className={rs.btnPrimary}>
                    Começar meu antes e depois
                </Link>
                <Link href="/loja" className={rs.btn}>
                    Ver programas da loja
                </Link>
            </div>
            <p className={s.notice}>{RESULTS_DISCLAIMER}</p>
        </div>
    );
}
