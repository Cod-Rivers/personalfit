'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import { getStoreCollection, type StoreCollection } from '@/libs/storeService';
import { ProgramCard } from '../../_components/StoreParts';
import { useStoreGuard } from '../../_components/useStoreGuard';
import s from '../../loja.module.css';

/** Coleção temática da loja (fase 3): os programas na ordem da equipe.
 *  Pública; o servidor manda a coleção (initial). */
export default function CollectionView({
    slug,
    initial,
    initialNotFound = false,
}: {
    slug: string;
    initial: StoreCollection | null;
    initialNotFound?: boolean;
}) {
    const { ready } = useStoreGuard();
    const [collection, setCollection] = useState<StoreCollection | null>(
        initial,
    );
    const [error, setError] = useState(
        initialNotFound ? 'Esta coleção não está na loja.' : '',
    );

    useEffect(() => {
        if (!ready || collection || initialNotFound) return;
        getStoreCollection(slug)
            .then(setCollection)
            .catch(() => setError('Não foi possível carregar a coleção.'));
    }, [ready, slug, collection, initialNotFound]);

    return (
        <div className={s.page}>
            <Link href="/loja" className={s.back}>
                <FiArrowLeft /> Voltar para a loja
            </Link>
            {!collection ? (
                error ? (
                    <div className={s.errorMsg}>{error}</div>
                ) : (
                    <p className={s.loading}>Carregando...</p>
                )
            ) : (
                <>
                    <h1 className={s.title}>{collection.title}</h1>
                    {collection.description && (
                        <p className={s.subtitle}>{collection.description}</p>
                    )}
                    <div className={s.grid}>
                        {collection.programs.map((p) => (
                            <ProgramCard key={p.id} program={p} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
