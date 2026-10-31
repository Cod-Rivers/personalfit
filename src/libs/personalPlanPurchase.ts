import type { ProPlanStatus } from '@/libs/paymentService';

/** Níveis pagos do plano do personal, na ordem da escada (ver
 *  domain/user/plan-tier.go no backend). */
export type PersonalTier = 'plus' | 'pro';

const TIER_RANK: Record<string, number> = { plus: 1, pro: 2 };
const TIER_NAME: Record<string, string> = { plus: 'Plus', pro: 'PRO' };
const CYCLE_MONTHS: Record<string, number> = { MONTHLY: 1, SEMIANNUALLY: 6, YEARLY: 12 };

function rank(tier?: string): number {
    return TIER_RANK[tier ?? ''] ?? 0;
}

function months(cycle?: string): number {
    return CYCLE_MONTHS[(cycle ?? '').trim().toUpperCase()] ?? 1;
}

/**
 * Por que comprar este plano faria a conta pagar em dobro: o mesmo plano e
 * período que ela já assina, um nível abaixo da assinatura ativa, ou um nível
 * abaixo do que está pago por PIX. '' = pode comprar.
 *
 * É a regra do backend (commands.planPurchaseConflict) repetida aqui porque,
 * dentro do app, a compra pelo Google Play acontece antes de o servidor ser
 * consultado: a tela é a única trava. Subir de nível e trocar de período
 * passam — a confirmação do pagamento encerra a assinatura anterior.
 */
export function personalPlanPurchaseConflict(
    status: ProPlanStatus | null,
    tier: PersonalTier,
    cycle: string,
): string {
    if (!status) return '';
    const current = status.subscription_tier;
    if (status.has_active_subscription && current) {
        if (rank(current) > rank(tier)) {
            return status.subscription_billing_type === 'GOOGLE_PLAY'
                ? `Sua conta já assina o ${TIER_NAME[current]} pelo Google Play. Para mudar de plano, use as assinaturas da Play Store.`
                : `Sua conta já assina o ${TIER_NAME[current]}. Para passar ao ${TIER_NAME[tier]}, use "Mudar para o Plus" em Minha conta.`;
        }
        if (current === tier && months(status.subscription_cycle) === months(cycle)) {
            return `Você já assina o ${TIER_NAME[tier]} neste período.`;
        }
    }
    if (status.prepaid_tier && status.prepaid_until && rank(status.prepaid_tier) > rank(tier)) {
        const until = new Date(status.prepaid_until).toLocaleDateString('pt-BR');
        return `Seu ${TIER_NAME[status.prepaid_tier]} está pago por PIX até ${until}. O ${TIER_NAME[tier]} pode ser contratado a partir dessa data.`;
    }
    return '';
}

/**
 * Aviso do resumo quando a compra substitui a assinatura que a conta tem
 * (subir para o PRO, trocar o período, sair do atraso com outro cartão): a
 * antiga é encerrada quando o pagamento novo for confirmado. Antes de
 * 2026-10-31 as duas seguiam cobrando. '' = nada a encerrar.
 */
export function replacedSubscriptionNotice(status: ProPlanStatus | null): string {
    const current = status?.subscription_tier;
    if (!status?.subscription_status || !current) return '';
    const where = status.subscription_billing_type === 'GOOGLE_PLAY' ? 'no Google Play' : 'no cartão';
    return `Quando este pagamento for confirmado, sua assinatura atual do ${TIER_NAME[current] ?? current} ${where} é encerrada: você não paga as duas.`;
}
