'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import {
    listStorePrograms,
    STORE_EQUIPMENT,
    STORE_GOALS,
    STORE_LEVELS,
    STORE_SORTS,
    type StoreCollection,
    type StoreFilters,
    type StoreProgramCard,
    type StoreSort,
} from '@/libs/storeService';
import { getStudentHomeRoute } from '@/libs/session';
import { ProgramCard } from './_components/StoreParts';
import { useStoreGuard } from './_components/useStoreGuard';
import s from './loja.module.css';

const DAYS = [
    { value: 2, label: '2 dias' },
    { value: 3, label: '3 dias' },
    { value: 4, label: '4 dias' },
    { value: 5, label: '5 ou mais' },
];

const DEFAULT_SORT: StoreSort = 'featured';

/** Loja de treinos: programas de profissionais com CREF e a Coleção
 *  Venafit (Todo/PLANO_LOJA_DE_TREINOS.md §5.6). Substitui
 *  /meus-treinos/escolher-plano. Pública desde a fase 3: o servidor manda a
 *  vitrine sem filtro e as coleções (initialPrograms/initialCollections);
 *  os filtros buscam pelo navegador. */
export default function StoreHome({
    initialPrograms,
    initialCollections,
}: {
    initialPrograms: StoreProgramCard[] | null;
    initialCollections: StoreCollection[];
}) {
    const { ready, loggedIn } = useStoreGuard();
    const [filters, setFilters] = useState<StoreFilters>({
        sort: DEFAULT_SORT,
    });
    const [programs, setPrograms] = useState<StoreProgramCard[] | null>(
        initialPrograms,
    );
    const [error, setError] = useState('');
    const isDefault =
        !filters.goal &&
        !filters.level &&
        !filters.equipment &&
        !filters.days &&
        (filters.sort ?? DEFAULT_SORT) === DEFAULT_SORT;

    useEffect(() => {
        if (!ready) return;
        // A vitrine sem filtro já veio do servidor.
        if (isDefault && initialPrograms) {
            setPrograms(initialPrograms);
            return;
        }
        let cancelled = false;
        setError('');
        listStorePrograms(filters)
            .then((list) => !cancelled && setPrograms(list))
            .catch(() => {
                if (cancelled) return;
                setPrograms([]);
                setError(
                    'Não foi possível carregar a loja. Tente de novo em instantes.',
                );
            });
        return () => {
            cancelled = true;
        };
    }, [ready, filters, isDefault, initialPrograms]);

    const set = (patch: Partial<StoreFilters>) =>
        setFilters((f) => ({ ...f, ...patch }));
    const filtered = !!(
        filters.goal ||
        filters.level ||
        filters.equipment ||
        filters.days
    );

    return (
        <div className={s.page}>
            {loggedIn && (
                <Link href={getStudentHomeRoute()} className={s.back}>
                    <FiArrowLeft /> Voltar para Meus Treinos
                </Link>
            )}
            <h1 className={s.title}>Programas de profissionais</h1>
            <p className={s.subtitle}>
                Programas de treino completos, montados por profissionais de
                Educação Física com CREF. Pagamento único, e o plano entra na
                sua conta na hora.
            </p>

            <div className={s.filters}>
                <select
                    className={s.filter}
                    aria-label="Objetivo"
                    value={filters.goal ?? ''}
                    onChange={(e) => set({ goal: e.target.value || undefined })}
                >
                    <option value="">Todos os objetivos</option>
                    {STORE_GOALS.map((g) => (
                        <option key={g.value} value={g.value}>
                            {g.label}
                        </option>
                    ))}
                </select>
                <select
                    className={s.filter}
                    aria-label="Nível"
                    value={filters.level ?? ''}
                    onChange={(e) =>
                        set({ level: e.target.value || undefined })
                    }
                >
                    <option value="">Todos os níveis</option>
                    {STORE_LEVELS.map((l) => (
                        <option key={l.value} value={l.value}>
                            {l.label}
                        </option>
                    ))}
                </select>
                <select
                    className={s.filter}
                    aria-label="Local"
                    value={filters.equipment ?? ''}
                    onChange={(e) =>
                        set({ equipment: e.target.value || undefined })
                    }
                >
                    <option value="">Qualquer local</option>
                    {STORE_EQUIPMENT.map((q) => (
                        <option key={q.value} value={q.value}>
                            {q.label}
                        </option>
                    ))}
                </select>
                <select
                    className={s.filter}
                    aria-label="Dias por semana"
                    value={filters.days ?? ''}
                    onChange={(e) =>
                        set({ days: Number(e.target.value) || undefined })
                    }
                >
                    <option value="">Dias por semana</option>
                    {DAYS.map((d) => (
                        <option key={d.value} value={d.value}>
                            {d.label}
                        </option>
                    ))}
                </select>
                <select
                    className={s.filter}
                    aria-label="Ordenar"
                    value={filters.sort ?? 'featured'}
                    onChange={(e) => set({ sort: e.target.value as StoreSort })}
                >
                    {STORE_SORTS.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
            </div>

            {isDefault && initialCollections.length > 0 && (
                <div className={s.collections}>
                    {initialCollections.map((c) => (
                        <section key={c.slug} aria-labelledby={`col-${c.slug}`}>
                            <div className={s.collectionHead}>
                                <h2
                                    id={`col-${c.slug}`}
                                    className={s.collectionTitle}
                                >
                                    {c.title}
                                </h2>
                                <Link
                                    href={`/loja/colecao/${c.slug}`}
                                    className={s.collectionLink}
                                >
                                    Ver coleção
                                </Link>
                            </div>
                            <div className={s.row}>
                                {c.programs.map((p) => (
                                    <ProgramCard key={p.id} program={p} />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            {error && <div className={s.errorMsg}>{error}</div>}

            {programs === null ? (
                <p className={s.loading}>Carregando programas...</p>
            ) : programs.length === 0 ? (
                <div className={s.empty}>
                    {filtered ? (
                        <>
                            <p>Nenhum programa com esses filtros.</p>
                            <button
                                type="button"
                                className={s.btnSecondary}
                                onClick={() =>
                                    setFilters({ sort: filters.sort })
                                }
                            >
                                Limpar filtros
                            </button>
                        </>
                    ) : (
                        <p>Nenhum programa à venda no momento.</p>
                    )}
                </div>
            ) : (
                <div className={s.grid}>
                    {programs.map((p) => (
                        <ProgramCard key={p.id} program={p} />
                    ))}
                </div>
            )}
        </div>
    );
}
