'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    type ProPlanStatus,
    cancelSubscription,
    getProPlanStatus,
} from '@/libs/paymentService';

const CYCLE_LABELS: Record<string, string> = {
    MONTHLY: 'mensal',
    SEMIANNUALLY: 'semestral',
    YEARLY: 'anual',
};

/** Último dia de PRO: `pro_access_until` é o instante em que o acesso acaba
 *  (00:00 do vencimento), então o último dia inteiro é a véspera. */
function formatLastDay(iso: string): string {
    return new Date(Date.parse(iso) - 1).toLocaleDateString('pt-BR');
}

/**
 * Plano PRO do personal em Minha conta: situação, assinar e cancelar.
 *
 * Cancelar precisa ser tão fácil quanto assinar (CDC) — mesmo motivo do
 * StudentPlusCard. As cobranças param na hora e o PRO continua até o fim do
 * período já pago (pro_access_until). Assinatura do Google Play só se cancela
 * pela loja; o backend recusa e a mensagem dele aparece aqui.
 */
export default function ProPlanCard() {
    const router = useRouter();
    const [status, setStatus] = useState<ProPlanStatus | null>(null);
    const [canceling, setCanceling] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        getProPlanStatus()
            .then(setStatus)
            .catch(() => setStatus(null));
    }, []);

    if (!status) return null;

    const handleCancel = async () => {
        if (
            !confirm(
                'Cancelar o PRO? Nada mais será cobrado, e você continua com o PRO até o fim do período já pago. Depois, a conta volta ao plano gratuito (até 3 alunos).',
            )
        )
            return;
        setCanceling(true);
        setError('');
        try {
            await cancelSubscription();
            setStatus(await getProPlanStatus());
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            setError(msg || 'Não foi possível cancelar. Tente novamente.');
        } finally {
            setCanceling(false);
        }
    };

    const isPro = status.plan_type === 'pro';
    const cycle = status.subscription_cycle ? CYCLE_LABELS[status.subscription_cycle] : '';

    return (
        <div className="card mb-4">
            <div className="card-header fw-semibold d-flex justify-content-between align-items-center">
                Plano PRO
                {isPro && <span className="badge bg-success">Ativo</span>}
            </div>
            <div className="card-body">
                {error && <div className="alert alert-danger py-2">{error}</div>}

                {status.pro_access_until ? (
                    <>
                        <p className="text-secondary mb-3" style={{ fontSize: '0.9rem' }}>
                            Assinatura cancelada. Nada mais será cobrado, e o PRO continua
                            ativo até <strong>{formatLastDay(status.pro_access_until)}</strong>.
                            Depois, a conta volta ao plano gratuito, e o que você configurou
                            fica guardado.
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={() => router.push('/pagamento')}
                        >
                            Assinar de novo
                        </button>
                    </>
                ) : isPro && status.has_active_subscription ? (
                    <>
                        <p className="text-secondary mb-3" style={{ fontSize: '0.9rem' }}>
                            Assinatura {cycle || 'ativa'}. Se cancelar, as cobranças param na
                            hora e você mantém o PRO até o fim do período já pago.
                        </p>
                        <button
                            className="btn btn-outline-secondary"
                            onClick={handleCancel}
                            disabled={canceling}
                        >
                            {canceling ? 'Cancelando...' : 'Cancelar assinatura'}
                        </button>
                    </>
                ) : isPro ? (
                    <p className="text-secondary mb-0" style={{ fontSize: '0.9rem' }}>
                        Sua conta está no PRO sem assinatura recorrente (teste grátis ou
                        liberação da equipe), então não há nada a cancelar.
                    </p>
                ) : (
                    <>
                        <p className="text-secondary mb-3" style={{ fontSize: '0.9rem' }}>
                            Você está no plano gratuito, com até 3 alunos. O PRO libera alunos
                            ilimitados, agenda, financeiro e sua marca no app.
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={() => router.push('/pagamento')}
                        >
                            Conhecer o PRO
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
