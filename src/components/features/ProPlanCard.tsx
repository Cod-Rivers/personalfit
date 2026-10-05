'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    type ProPlanStatus,
    cancelSubscription,
    getPlans,
    getProPlanStatus,
    switchToPersonalPlus,
} from '@/libs/paymentService';
import { planRank, updateSessionPlanType } from '@/libs/session';

const CYCLE_LABELS: Record<string, string> = {
    MONTHLY: 'mensal',
    SEMIANNUALLY: 'semestral',
    YEARLY: 'anual',
};

const PLAN_LABELS: Record<string, string> = {
    free: 'Gratuito',
    plus: 'Plus',
    pro: 'PRO',
};

/** Último dia de PRO: `pro_access_until` é o instante em que o acesso acaba
 *  (00:00 do vencimento), então o último dia inteiro é a véspera. */
function formatLastDay(iso: string): string {
    return new Date(Date.parse(iso) - 1).toLocaleDateString('pt-BR');
}

function formatDay(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR');
}

/**
 * Plano do personal em Minha conta: situação, assinar, trocar de plano e
 * cancelar.
 *
 * Cancelar precisa ser tão fácil quanto assinar (CDC) — mesmo motivo do
 * StudentPlusCard. As cobranças param na hora e o plano continua até o fim
 * do período já pago (pro_access_until). Assinatura do Google Play só se
 * cancela (e só troca de plano) pela loja; o backend recusa e a mensagem
 * dele aparece aqui.
 *
 * Antes de cancelar, quem está no PRO vê a OFERTA DE RETENÇÃO: descer para o
 * Personal Plus e manter alunos ilimitados, a marca e o financeiro. Quem
 * clica em cancelar quase sempre está dizendo que o preço não cabe, não que
 * o produto não serve — e a troca não passa por um checkout novo (o cartão
 * da assinatura continua o mesmo).
 */
export default function ProPlanCard() {
    const router = useRouter();
    const [status, setStatus] = useState<ProPlanStatus | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [offeringPlus, setOfferingPlus] = useState(false);
    // Preço do Plus vem do backend (GET /plans), nunca escrito na tela: o
    // valor é resolvido no servidor e pode mudar por variável de ambiente.
    const [plusPrice, setPlusPrice] = useState<number | null>(null);

    useEffect(() => {
        getProPlanStatus()
            .then(setStatus)
            .catch(() => setStatus(null));
        getPlans()
            .then((c) => setPlusPrice(c.personal_plus?.value ?? null))
            .catch(() => setPlusPrice(null));
    }, []);

    if (!status) return null;

    const rank = planRank(status.plan_type);
    const isPro = rank >= 2;
    const isPlus = rank >= 1;
    const cycle = status.subscription_cycle ? CYCLE_LABELS[status.subscription_cycle] : '';
    const planLabel = PLAN_LABELS[status.plan_type ?? 'free'] ?? 'Gratuito';

    const errorMessage = (err: unknown, fallback: string): string => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        return msg || fallback;
    };

    const reload = async () => {
        const fresh = await getProPlanStatus();
        setStatus(fresh);
        // A sessão guarda o plano para as telas não oferecerem o que daria
        // 403. Depois de uma troca ou cancelamento ela fica velha.
        if (fresh.plan_type) updateSessionPlanType(fresh.plan_type);
    };

    const handleSwitchToPlus = async () => {
        setBusy(true);
        setError('');
        try {
            await switchToPersonalPlus();
            setOfferingPlus(false);
            await reload();
        } catch (err: unknown) {
            setError(errorMessage(err, 'Não foi possível trocar de plano. Tente novamente.'));
        } finally {
            setBusy(false);
        }
    };

    const handleCancel = async () => {
        if (
            !confirm(
                `Cancelar o ${planLabel}? Nada mais será cobrado, e você continua com o plano até o fim do período já pago. Depois, a conta volta ao plano gratuito (até 3 alunos).`,
            )
        )
            return;
        setBusy(true);
        setError('');
        try {
            await cancelSubscription();
            setOfferingPlus(false);
            await reload();
        } catch (err: unknown) {
            setError(errorMessage(err, 'Não foi possível cancelar. Tente novamente.'));
        } finally {
            setBusy(false);
        }
    };

    /** Oferta de retenção, no lugar dos botões, quando o personal pede para
     *  cancelar o PRO. Diz o que ele PERDE e o que mantém — sem isso a
     *  escolha não é informada. */
    const plusPriceLabel =
        plusPrice === null
            ? 'menos'
            : plusPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const plusOffer = (
        <div className="alert alert-light border mb-0">
            <p className="mb-2 fw-semibold">
                Antes de cancelar: fica no Plus por {plusPriceLabel}?
            </p>
            <p className="text-secondary mb-2" style={{ fontSize: '0.85rem' }}>
                Você <strong>mantém</strong> alunos ilimitados, a sua marca no app do aluno,
                o painel financeiro e o app sem anúncios.
            </p>
            <p className="text-secondary mb-3" style={{ fontSize: '0.85rem' }}>
                Você <strong>perde</strong> a Substituição Inteligente por IA, a importação
                de treino por PDF, o upload de vídeo próprio e a agenda de aulas.
            </p>
            <p className="text-secondary mb-3" style={{ fontSize: '0.85rem' }}>
                O PRO continua valendo até o fim do período já pago; a partir daí a
                cobrança passa a ser de {plusPriceLabel}.
            </p>
            <div className="d-flex flex-wrap gap-2">
                <button className="btn btn-primary" onClick={handleSwitchToPlus} disabled={busy}>
                    {busy ? 'Trocando...' : 'Mudar para o Plus'}
                </button>
                <button
                    className="btn btn-outline-secondary"
                    onClick={handleCancel}
                    disabled={busy}
                >
                    Cancelar mesmo assim
                </button>
                <button
                    className="btn btn-link"
                    onClick={() => setOfferingPlus(false)}
                    disabled={busy}
                >
                    Voltar
                </button>
            </div>
        </div>
    );

    return (
        <div className="card mb-4">
            <div className="card-header fw-semibold d-flex justify-content-between align-items-center">
                Plano {planLabel}
                {isPlus && <span className="badge bg-success">Ativo</span>}
            </div>
            <div className="card-body">
                {error && <div className="alert alert-danger py-2">{error}</div>}

                {/* Troca de plano agendada: o personal precisa ver que o PRO
                    tem data de validade e o que vem depois. */}
                {status.plan_change_to && status.plan_change_at && (
                    <div className="alert alert-info py-2" style={{ fontSize: '0.85rem' }}>
                        Seu {planLabel} vale até{' '}
                        <strong>{formatLastDay(status.plan_change_at)}</strong>. A partir de{' '}
                        {formatDay(status.plan_change_at)} sua conta passa para o{' '}
                        <strong>{PLAN_LABELS[status.plan_change_to] ?? status.plan_change_to}</strong>.
                    </div>
                )}

                {offeringPlus ? (
                    plusOffer
                ) : status.pro_access_until ? (
                    <>
                        <p className="text-secondary mb-3" style={{ fontSize: '0.9rem' }}>
                            Assinatura cancelada. Nada mais será cobrado, e o plano continua
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
                ) : isPlus && status.has_active_subscription ? (
                    <>
                        <p className="text-secondary mb-3" style={{ fontSize: '0.9rem' }}>
                            Assinatura {cycle || 'ativa'}. Se cancelar, as cobranças param na
                            hora e você mantém o plano até o fim do período já pago.
                        </p>
                        <div className="d-flex flex-wrap gap-2">
                            {/* Subir para o PRO é um checkout novo (produto
                                diferente), então vai para /pagamento. */}
                            {!isPro && (
                                <button
                                    className="btn btn-primary"
                                    onClick={() => router.push('/pagamento?produto=pro')}
                                >
                                    Subir para o PRO
                                </button>
                            )}
                            <button
                                className="btn btn-outline-secondary"
                                onClick={() =>
                                    isPro && !status.plan_change_to
                                        ? setOfferingPlus(true)
                                        : handleCancel()
                                }
                                disabled={busy}
                            >
                                {busy ? 'Processando...' : 'Cancelar assinatura'}
                            </button>
                        </div>
                    </>
                ) : status.prepaid_until ? (
                    // Pago por PIX: cobrança única, sem nada a cancelar, mas com
                    // data de fim — sem renovar, a conta volta ao gratuito.
                    <>
                        <p className="text-secondary mb-3" style={{ fontSize: '0.9rem' }}>
                            Pago por PIX até{' '}
                            <strong>{formatDay(status.prepaid_until)}</strong>. O PIX não
                            renova sozinho: pague um novo antes dessa data para não voltar ao
                            plano gratuito (até 3 alunos).
                        </p>
                        <div className="d-flex flex-wrap gap-2">
                            <button
                                className="btn btn-primary"
                                onClick={() =>
                                    router.push(
                                        status.prepaid_tier === 'plus'
                                            ? '/pagamento?produto=personal-plus'
                                            : '/pagamento?produto=pro',
                                    )
                                }
                            >
                                Renovar
                            </button>
                            {status.prepaid_tier === 'plus' && !isPro && (
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={() => router.push('/pagamento?produto=pro')}
                                >
                                    Subir para o PRO
                                </button>
                            )}
                        </div>
                    </>
                ) : isPlus ? (
                    <p className="text-secondary mb-0" style={{ fontSize: '0.9rem' }}>
                        Sua conta está no {planLabel} sem assinatura recorrente (teste grátis
                        ou liberação da equipe), então não há nada a cancelar.
                    </p>
                ) : (
                    <>
                        <p className="text-secondary mb-3" style={{ fontSize: '0.9rem' }}>
                            Você está no plano gratuito, com até 3 alunos. O{' '}
                            <strong>Plus</strong> libera alunos ilimitados, sua marca no app e
                            o financeiro; o <strong>PRO</strong> acrescenta IA, upload de vídeo
                            e agenda.
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={() => router.push('/pagamento')}
                        >
                            Ver os planos
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
