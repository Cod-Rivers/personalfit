'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    getCelebrityTemplates,
    applyCelebrityTemplate,
    MacrocycleResponse,
} from '@/libs/planningService';
import s from './escolher-plano.module.css';

function extractErrorMessage(err: unknown, fallback: string): string {
    const data = (
        err as { response?: { data?: { error?: string; message?: string } } }
    )?.response?.data;
    return data?.error || data?.message || fallback;
}

export default function EscolherPlanoPage() {
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);
    const [isPro, setIsPro] = useState(false);
    const [templates, setTemplates] = useState<MacrocycleResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<MacrocycleResponse | null>(null);
    const [applying, setApplying] = useState(false);
    const [applyError, setApplyError] = useState('');

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted) return;

        async function fetchData() {
            setLoading(true);
            setError(null);
            try {
                const userString = localStorage.getItem('user');
                if (!userString || !localStorage.getItem('token')) {
                    router.push('/app');
                    return;
                }

                let planType = '';
                try {
                    planType = JSON.parse(userString)?.plan_type || '';
                } catch {}
                setIsPro(planType === 'pro');

                if (planType !== 'pro') {
                    setLoading(false);
                    return;
                }

                const list = await getCelebrityTemplates();
                setTemplates(list);
            } catch (e) {
                setError(extractErrorMessage(e, 'Não foi possível carregar os planos.'));
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [isMounted, router]);

    async function handleApply() {
        if (!selected) return;
        setApplying(true);
        setApplyError('');
        try {
            await applyCelebrityTemplate(selected.id);
            router.push('/meus-treinos');
        } catch (e) {
            setApplyError(
                extractErrorMessage(e, 'Erro ao aplicar plano.'),
            );
        } finally {
            setApplying(false);
        }
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
                        de grandes atletas, e comece agora mesmo.
                    </p>
                </div>
            </div>

            {error && <div className={s.errorMsg}>{error}</div>}

            {!isPro ? (
                <div className={s.proGate}>
                    <div className={s.proGateIcon}>🔒</div>
                    <h3 className={s.proGateTitle}>
                        Recurso exclusivo do plano PRO
                    </h3>
                    <p className={s.proGateText}>
                        A biblioteca de planos estilo famosos está disponível
                        apenas para alunos do plano PRO. Fale com seu personal
                        trainer ou com o suporte para fazer o upgrade.
                    </p>
                </div>
            ) : templates.length === 0 ? (
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
                                onClick={() => setSelected(tpl)}
                            >
                                Aplicar este plano
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {selected && (
                <div
                    className={s.overlay}
                    onClick={() => !applying && setSelected(null)}
                >
                    <div
                        className={s.modal}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={s.modalHeader}>
                            <h2 className={s.modalTitle}>Aplicar plano</h2>
                            <button
                                className={s.btnClose}
                                onClick={() => setSelected(null)}
                                disabled={applying}
                            >
                                ×
                            </button>
                        </div>
                        {applyError && (
                            <div className={s.errorMsg}>{applyError}</div>
                        )}
                        <p className={s.confirmText}>
                            Plano: <strong>{selected.name}</strong>
                            <br />
                            Este plano passará a ser o seu treino ativo. Se
                            você já tiver um plano em andamento, ele será
                            marcado como concluído.
                        </p>
                        <div className={s.formActions}>
                            <button
                                className={s.btnCancel}
                                onClick={() => setSelected(null)}
                                disabled={applying}
                            >
                                Cancelar
                            </button>
                            <button
                                className={s.btnSubmit}
                                onClick={handleApply}
                                disabled={applying}
                            >
                                {applying ? 'Aplicando...' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
