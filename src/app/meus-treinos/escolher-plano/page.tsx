'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    getCelebrityTemplates,
    MacrocycleResponse,
} from '@/libs/planningService';
import { getPlans } from '@/libs/paymentService';
import s from './escolher-plano.module.css';

function extractErrorMessage(err: unknown, fallback: string): string {
    const data = (
        err as { response?: { data?: { error?: string; message?: string } } }
    )?.response?.data;
    return data?.error || data?.message || fallback;
}

function formatBRL(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function EscolherPlanoPage() {
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);
    const [templates, setTemplates] = useState<MacrocycleResponse[]>([]);
    const [price, setPrice] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted) return;

        async function fetchData() {
            setLoading(true);
            setError(null);
            try {
                if (!localStorage.getItem('user') || !localStorage.getItem('token')) {
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
                setError(extractErrorMessage(e, 'Não foi possível carregar os planos.'));
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [isMounted, router]);

    function handleBuy(tpl: MacrocycleResponse) {
        router.push(`/pagamento?produto=plano&templateId=${tpl.id}`);
    }

    if (!isMounted || loading) {
        return <p className={s.loading}>Carregando planos...</p>;
    }

    return (
        <div className="container mx-auto p-4">
            <div className={s.header}>
                <div>
                    <h1 className={s.title}>Planos estilo famosos</h1>
                    <p className={s.subtitle}>
                        Escolha um plano pronto, inspirado no estilo de treino
                        de grandes atletas, e comece agora mesmo
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
                    {templates.map((tpl) => (
                        <div key={tpl.id} className={s.card}>
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
                    ))}
                </div>
            )}
        </div>
    );
}
