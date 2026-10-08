'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { isAxiosError } from 'axios';
import { FiArrowLeft, FiCheckCircle, FiStar } from 'react-icons/fi';
import {
    equipmentLabel,
    getStoreProgram,
    goalLabel,
    levelLabel,
    type StoreProgramDetail,
} from '@/libs/storeService';
import { saveStoreSaleRef } from '@/libs/storeSaleRef';
import {
    formatBRL,
    programFacts,
    STORE_HEALTH_NOTICE,
} from '@/libs/storeFormat';
import {
    AuthorAvatar,
    StoreAuthor,
    StoreCover,
    StoreStars,
} from '../../_components/StoreParts';
import { useStoreGuard } from '../../_components/useStoreGuard';
import s from '../../loja.module.css';

/** Página do programa: ficha, autor, estrelas, comentários de quem comprou
 *  e só a PRÉVIA do plano — estrutura e grupos musculares de cada treino e os
 *  nomes dos exercícios do 1º treino, nunca séries nem repetições (§5.6 do
 *  plano da loja). Pública desde a fase 3: o servidor manda o programa
 *  (initial), e sem login a compra passa pelo cadastro. */
export default function ProgramView({
    id,
    initial,
    initialNotFound = false,
}: {
    id: string;
    initial: StoreProgramDetail | null;
    initialNotFound?: boolean;
}) {
    const { ready, loggedIn } = useStoreGuard();
    const [program, setProgram] = useState<StoreProgramDetail | null>(initial);
    const [error, setError] = useState(
        initialNotFound ? 'Este programa não está à venda.' : '',
    );

    // ?ref= do link do programa: vai junto com a compra (storeSaleRef).
    useEffect(() => {
        saveStoreSaleRef(
            new URLSearchParams(window.location.search).get('ref'),
        );
    }, []);

    // Sem o programa do servidor (backend fora do ar na renderização), busca
    // pelo navegador.
    useEffect(() => {
        if (!ready || !id || program || initialNotFound) return;
        getStoreProgram(id)
            .then(setProgram)
            .catch((err) =>
                setError(
                    isAxiosError(err) && err.response?.status === 404
                        ? 'Este programa não está à venda.'
                        : 'Não foi possível carregar o programa.',
                ),
            );
    }, [ready, id, program, initialNotFound]);

    if (!program && !error) {
        return <p className={s.loading}>Carregando o programa...</p>;
    }

    if (!program) {
        return (
            <div className={s.page}>
                <Link href="/loja" className={s.back}>
                    <FiArrowLeft /> Voltar para a loja
                </Link>
                <div className={s.errorMsg}>{error}</div>
            </div>
        );
    }

    const facts = programFacts({
        level: levelLabel(program.level),
        days: program.days_per_week,
        weeks: program.duration_weeks,
        equipment: equipmentLabel(program.equipment),
    });
    const trainings = program.preview?.trainings ?? [];
    const reviews = program.reviews ?? [];
    const checkout = `/pagamento?produto=programa&programId=${program.id}`;

    return (
        <div className={s.page}>
            <Link href="/loja" className={s.back}>
                <FiArrowLeft /> Voltar para a loja
            </Link>

            <div className={s.hero}>
                <StoreCover program={program} className={s.heroCover} />
                <div className={s.heroInfo}>
                    <h1 className={s.title}>{program.title}</h1>
                    {program.summary && (
                        <p className={s.subtitle}>{program.summary}</p>
                    )}
                    <StoreAuthor author={program.author} link />
                    <StoreStars
                        avg={program.rating_avg}
                        count={program.rating_count}
                    />
                    {facts && <p className={s.meta}>{facts}</p>}
                    {program.goals.length > 0 && (
                        <div className={s.chips}>
                            {program.goals.map((g) => (
                                <span key={g} className={s.chip}>
                                    {goalLabel(g)}
                                </span>
                            ))}
                        </div>
                    )}
                    <div className={s.buyBox}>
                        <span className={s.price}>
                            {formatBRL(program.price)}
                        </span>
                        <span className={s.meta}>
                            Pagamento único. O plano fica na sua conta.
                        </span>
                        {loggedIn === false ? (
                            <>
                                <Link
                                    href={`/cadastro?redirect=${encodeURIComponent(checkout)}`}
                                    className={s.btnBuy}
                                >
                                    Criar conta e comprar
                                </Link>
                                <Link
                                    href={`/?redirect=${encodeURIComponent(checkout)}`}
                                    className={s.btnSecondary}
                                >
                                    Já tenho conta: entrar
                                </Link>
                            </>
                        ) : (
                            <Link href={checkout} className={s.btnBuy}>
                                Comprar programa
                            </Link>
                        )}
                        <p className={s.notice}>{STORE_HEALTH_NOTICE}</p>
                    </div>
                </div>
            </div>

            {program.description && (
                <section className={s.section}>
                    <h2 className={s.sectionTitle}>Sobre o programa</h2>
                    <p className={s.text}>{program.description}</p>
                </section>
            )}
            {program.audience && (
                <section className={s.section}>
                    <h2 className={s.sectionTitle}>Para quem é</h2>
                    <p className={s.text}>{program.audience}</p>
                </section>
            )}
            {program.prerequisites && (
                <section className={s.section}>
                    <h2 className={s.sectionTitle}>Pré-requisitos</h2>
                    <p className={s.text}>{program.prerequisites}</p>
                </section>
            )}

            {trainings.length > 0 && (
                <section className={s.section}>
                    <h2 className={s.sectionTitle}>Estrutura</h2>
                    <p className={s.meta}>
                        {program.preview.phases > 1
                            ? `${program.preview.phases} fases; abaixo, os treinos da primeira.`
                            : 'Os treinos que se revezam na semana.'}
                    </p>
                    <div
                        className={s.trainings}
                        style={{ marginTop: 'var(--space-3)' }}
                    >
                        {trainings.map((t, i) => (
                            <div
                                key={`${t.reference}-${i}`}
                                className={s.training}
                            >
                                <p className={s.trainingTitle}>
                                    Treino {t.reference}
                                    {t.name ? ` · ${t.name}` : ''}
                                </p>
                                <span className={s.meta}>
                                    {t.exercise_count}{' '}
                                    {t.exercise_count === 1
                                        ? 'exercício'
                                        : 'exercícios'}
                                </span>
                                {t.muscle_groups.length > 0 && (
                                    <div className={s.chips}>
                                        {t.muscle_groups.map((g) => (
                                            <span key={g} className={s.chip}>
                                                {g}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {t.exercise_names &&
                                    t.exercise_names.length > 0 && (
                                        <ul className={s.sample}>
                                            {t.exercise_names.map((n, j) => (
                                                <li key={`${n}-${j}`}>{n}</li>
                                            ))}
                                        </ul>
                                    )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {reviews.length > 0 && (
                <section className={s.section} aria-labelledby="avaliacoes">
                    <h2 id="avaliacoes" className={s.sectionTitle}>
                        O que dizem quem comprou
                    </h2>
                    <ul className={s.reviews}>
                        {reviews.map((r, i) => (
                            <li
                                key={`${r.first_name}-${r.created_at}-${i}`}
                                className={s.review}
                            >
                                <div className={s.reviewHead}>
                                    <span
                                        className={s.reviewStars}
                                        aria-label={`${r.stars} de 5 estrelas`}
                                    >
                                        {[1, 2, 3, 4, 5].map((n) => (
                                            <FiStar
                                                key={n}
                                                aria-hidden="true"
                                                style={{
                                                    fill:
                                                        n <= r.stars
                                                            ? 'currentColor'
                                                            : 'none',
                                                }}
                                            />
                                        ))}
                                    </span>
                                    <span className={s.reviewName}>
                                        {r.first_name}
                                    </span>
                                    {r.verified && (
                                        <span className={s.verified}>
                                            <FiCheckCircle aria-hidden="true" />{' '}
                                            Compra verificada
                                        </span>
                                    )}
                                </div>
                                <p className={s.text}>{r.comment}</p>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {program.author && (
                <section className={s.section}>
                    <h2 className={s.sectionTitle}>Quem montou</h2>
                    <div className={s.authorBox}>
                        <AuthorAvatar author={program.author} large />
                        <div>
                            <StoreAuthor author={program.author} link />
                            {program.author_bio && (
                                <p
                                    className={s.text}
                                    style={{ marginTop: 'var(--space-2)' }}
                                >
                                    {program.author_bio}
                                </p>
                            )}
                            {program.author_specialties &&
                                program.author_specialties.length > 0 && (
                                    <div
                                        className={s.chips}
                                        style={{ marginTop: 'var(--space-2)' }}
                                    >
                                        {program.author_specialties.map(
                                            (sp) => (
                                                <span
                                                    key={sp}
                                                    className={s.chip}
                                                >
                                                    {sp}
                                                </span>
                                            ),
                                        )}
                                    </div>
                                )}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
