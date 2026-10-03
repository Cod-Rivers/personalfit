'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiArrowLeft } from 'react-icons/fi';
import {
    getCelebrityTemplates,
    MacrocycleResponse,
    ExerciseResponse,
} from '@/libs/planningService';
import { getPlans } from '@/libs/paymentService';
import ExerciseThumbnail from '@/components/features/ExerciseThumbnail';
import { getStudentHomeRoute, getUser } from '@/libs/session';
import { usePlanStoreHidden } from '@/hooks/usePlanStoreHidden';
import s from './escolher-plano.module.css';

/** Primeiro exercício com mídia (thumb ou vídeo) entre todos os treinos do
 * plano, usado como capa do card — na ordem em que os mesociclos/treinos
 * aparecem no plano. */
function findCoverExercise(
    tpl: MacrocycleResponse,
): ExerciseResponse | undefined {
    for (const meso of tpl.mesocycles ?? []) {
        for (const training of meso.trainings ?? []) {
            const withMedia = training.exercises?.find(
                (ex) => ex.video_thumb || ex.video_url,
            );
            if (withMedia) return withMedia;
        }
    }
    return tpl.mesocycles?.[0]?.trainings?.[0]?.exercises?.[0];
}

function extractErrorMessage(err: unknown, fallback: string): string {
    const data = (
        err as { response?: { data?: { error?: string; message?: string } } }
    )?.response?.data;
    return data?.error || data?.message || fallback;
}

function formatBRL(value: number): string {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
}

export default function EscolherPlanoPage() {
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);
    const [templates, setTemplates] = useState<MacrocycleResponse[]>([]);
    const [price, setPrice] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasPersonal, setHasPersonal] = useState(false);
    const storeHidden = usePlanStoreHidden(hasPersonal);

    useEffect(() => {
        setIsMounted(true);
        setHasPersonal(!!getUser()?.has_personal);
    }, []);

    // Aluno de personal PRO não vê a loja: o atalho já some em Meus Treinos;
    // isto cobre o acesso direto pela URL.
    useEffect(() => {
        if (storeHidden === true) router.replace(getStudentHomeRoute());
    }, [storeHidden, router]);

    useEffect(() => {
        if (!isMounted) return;

        async function fetchData() {
            setLoading(true);
            setError(null);
            try {
                if (
                    !localStorage.getItem('user') ||
                    !localStorage.getItem('token')
                ) {
                    router.push('/app');
                    return;
                }

                const [list, catalog] = await Promise.all([
                    getCelebrityTemplates(),
                    getPlans().catch(() => null),
                ]);
                setTemplates(list);
                if (catalog) setPrice(catalog.library_plan.value);
            } catch (e) {
                setError(
                    extractErrorMessage(
                        e,
                        'Não foi possível carregar os planos.',
                    ),
                );
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [isMounted, router]);

    function handleBuy(tpl: MacrocycleResponse) {
        router.push(`/pagamento?produto=plano&templateId=${tpl.id}`);
    }

    if (!isMounted || loading || storeHidden === true) {
        return <p className={s.loading}>Carregando planos...</p>;
    }

    return (
        <div className="container mx-auto p-4">
            <Link
                href={getStudentHomeRoute()}
                className="btn btn-outline-secondary btn-sm mb-3 d-inline-flex align-items-center gap-2"
            >
                <FiArrowLeft /> Voltar para Meus Treinos
            </Link>
            <div className={s.header}>
                <div>
                    <h1 className={s.title}>Treine como os famosos</h1>
                    <p className={s.subtitle}>
                        Planos completos inspirados na rotina de grandes
                        atletas. Pagamento único, e você começa agora mesmo
                        {price != null ? ` por ${formatBRL(price)}` : ''}.
                    </p>
                </div>
            </div>

            {error && <div className={s.errorMsg}>{error}</div>}

            {templates.length === 0 ? (
                <p className={s.subtitle}>
                    Nenhum plano disponível no momento.
                </p>
            ) : (
                <div className={s.grid}>
                    {templates.map((tpl) => {
                        const cover = findCoverExercise(tpl);
                        return (
                            <div key={tpl.id} className={s.card}>
                                <div className={s.cardCover}>
                                    <ExerciseThumbnail
                                        name={tpl.name}
                                        videoThumb={cover?.video_thumb}
                                        videoUrl={cover?.video_url}
                                        width="100%"
                                        height="100%"
                                        borderRadius={10}
                                        captureFrame={false}
                                        lazyCapture
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                        }}
                                    />
                                </div>
                                <p className={s.cardName}>
                                    {tpl.name}
                                    {tpl.mesocycles?.[0]?.trainings?.length ? (
                                        <span
                                            style={{
                                                fontWeight: 400,
                                                fontSize: '0.75rem',
                                                color: 'var(--text-muted)',
                                            }}
                                        >
                                            {tpl.mesocycles[0].trainings.length}{' '}
                                            treinos
                                        </span>
                                    ) : null}
                                </p>
                                {tpl.goal && (
                                    <p className={s.cardGoal}>{tpl.goal}</p>
                                )}
                                <button
                                    className={s.btnApply}
                                    onClick={() => handleBuy(tpl)}
                                >
                                    {price != null
                                        ? `Comprar por ${formatBRL(price)}`
                                        : 'Comprar este plano'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
