'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { isAxiosError } from 'axios';
import { FiArrowLeft, FiAward } from 'react-icons/fi';
import { getStoreAuthor, type StoreAuthorPage } from '@/libs/storeService';
import { saveStoreSaleRef } from '@/libs/storeSaleRef';
import { AuthorAvatar, ProgramCard } from '../../_components/StoreParts';
import { useStoreGuard } from '../../_components/useStoreGuard';
import s from '../../loja.module.css';

/** Página do autor: perfil e programas à venda. É o link de divulgação dele
 *  (/loja/autor/CODIGO): abrir a página guarda o código para a compra.
 *  Pública desde a fase 3: o servidor manda a página (initial). */
export default function AuthorView({
    code,
    initial,
    initialNotFound = false,
}: {
    code: string;
    initial: StoreAuthorPage | null;
    initialNotFound?: boolean;
}) {
    const { ready } = useStoreGuard();
    const [page, setPage] = useState<StoreAuthorPage | null>(initial);
    const [error, setError] = useState(
        initialNotFound ? 'Este autor não tem programas na loja.' : '',
    );

    useEffect(() => {
        if (code) saveStoreSaleRef(decodeURIComponent(code));
    }, [code]);

    useEffect(() => {
        if (!ready || !code || page || initialNotFound) return;
        getStoreAuthor(decodeURIComponent(code))
            .then(setPage)
            .catch((err) =>
                setError(
                    isAxiosError(err) && err.response?.status === 404
                        ? 'Este autor não tem programas na loja.'
                        : 'Não foi possível carregar a página do autor.',
                ),
            );
    }, [ready, code, page, initialNotFound]);

    if (!page && !error) return <p className={s.loading}>Carregando...</p>;

    return (
        <div className={s.page}>
            <Link href="/loja" className={s.back}>
                <FiArrowLeft /> Voltar para a loja
            </Link>
            {!page ? (
                <div className={s.errorMsg}>{error}</div>
            ) : (
                <>
                    <div className={s.authorBox}>
                        <AuthorAvatar author={page.author} large />
                        <div>
                            <h1 className={s.title}>{page.author.name}</h1>
                            <span className={s.cref}>
                                <FiAward aria-hidden="true" />{' '}
                                {page.author.cref}
                            </span>
                            {page.author.bio && (
                                <p
                                    className={s.text}
                                    style={{ marginTop: 'var(--space-2)' }}
                                >
                                    {page.author.bio}
                                </p>
                            )}
                            {page.author.specialties.length > 0 && (
                                <div
                                    className={s.chips}
                                    style={{ marginTop: 'var(--space-2)' }}
                                >
                                    {page.author.specialties.map((sp) => (
                                        <span key={sp} className={s.chip}>
                                            {sp}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <section className={s.section}>
                        <h2 className={s.sectionTitle}>Programas</h2>
                        {page.programs.length === 0 ? (
                            <p className={s.empty}>
                                Nenhum programa à venda no momento.
                            </p>
                        ) : (
                            <div className={s.grid}>
                                {page.programs.map((p) => (
                                    <ProgramCard key={p.id} program={p} />
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
