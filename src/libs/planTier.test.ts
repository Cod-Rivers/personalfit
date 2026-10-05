import { afterEach, describe, expect, it, vi } from 'vitest';

import { planRank } from './session';

// Testa a escada de planos do personal (free → plus → pro) e a confirmação
// de pagamento por nível. Ver Todo/PLANO_PERSONAL_PLUS.md e, no backend,
// internal/domain/user/plan-tier.go.

describe('planRank', () => {
    it('ordena free < plus < pro', () => {
        expect(planRank('free')).toBeLessThan(planRank('plus'));
        expect(planRank('plus')).toBeLessThan(planRank('pro'));
    });

    it('trata plano ausente ou desconhecido como free', () => {
        // Negar é o erro seguro: um plano que a tela não conhece não pode
        // liberar recurso pago (espelha user.PlanRank no backend).
        expect(planRank(undefined)).toBe(planRank('free'));
        expect(planRank('')).toBe(planRank('free'));
        expect(planRank('enterprise')).toBe(planRank('free'));
    });

    it('o Plus passa no gate do Plus e falha no gate do PRO', () => {
        expect(planRank('plus') >= 1).toBe(true);
        expect(planRank('plus') >= 2).toBe(false);
    });
});

describe('isPersonalPlanPaymentConfirmed', () => {
    afterEach(() => {
        vi.resetModules();
        vi.restoreAllMocks();
    });

    /** Carrega o paymentService com o /me e o status do teste controlados. */
    async function load(me: Record<string, unknown>, trialActive = false) {
        vi.resetModules();
        vi.doMock('./api', () => ({
            Api: {
                get: vi.fn(async (url: string) => {
                    if (url === '/me') return { data: me };
                    if (url === '/personal/pro-trial') {
                        return { data: { pro_trial_active: trialActive } };
                    }
                    return { data: {} };
                }),
                post: vi.fn(async () => ({ data: {} })),
            },
        }));
        vi.doMock('./nativeBridge', () => ({
            hasNativeBilling: () => false,
            nativeBillingAvailable: async () => false,
            nativeBillingPurchase: async () => ({}),
        }));
        return import('./paymentService');
    }

    it('confirma o PRO quando o plano virou pro e não há período cancelado', async () => {
        const { isPersonalPlanPaymentConfirmed } = await load({ plan_type: 'pro' });
        await expect(isPersonalPlanPaymentConfirmed('pro', false)).resolves.toBe(true);
    });

    it('não confirma o PRO de quem já estava no PRO por um cancelamento em curso', async () => {
        // Sem isto, o polling do PIX daria "pago" antes de o PIX ser pago:
        // a conta já estava em "pro" pelo período que ela cancelou.
        const { isPersonalPlanPaymentConfirmed } = await load({
            plan_type: 'pro',
            pro_access_until: '2026-12-01T00:00:00Z',
        });
        await expect(isPersonalPlanPaymentConfirmed('pro', false)).resolves.toBe(false);
    });

    it('não confirma o PRO enquanto o teste grátis ainda explica o plano', async () => {
        const { isPersonalPlanPaymentConfirmed } = await load({ plan_type: 'pro' }, true);
        await expect(isPersonalPlanPaymentConfirmed('pro', true)).resolves.toBe(false);
    });

    it('confirma o Plus quando o plano efetivo virou plus', async () => {
        const { isPersonalPlanPaymentConfirmed } = await load({ plan_type: 'plus' });
        await expect(isPersonalPlanPaymentConfirmed('plus', false)).resolves.toBe(true);
    });

    it('confirma o Plus comprado durante o teste do PRO, em que o plano segue pro', async () => {
        // Comprar o Plus no meio do teste NÃO rebaixa a conta (o PRO
        // emprestado vale até o fim), então o sinal da compra é a assinatura
        // nova ter sido reconhecida pelo backend.
        const { isPersonalPlanPaymentConfirmed } = await load(
            { plan_type: 'pro', is_plus: true, has_active_subscription: true },
            true,
        );
        await expect(isPersonalPlanPaymentConfirmed('plus', true)).resolves.toBe(true);
    });

    it('não confirma o Plus sem assinatura reconhecida', async () => {
        const { isPersonalPlanPaymentConfirmed } = await load({
            plan_type: 'free',
            is_plus: false,
            has_active_subscription: false,
        });
        await expect(isPersonalPlanPaymentConfirmed('plus', false)).resolves.toBe(false);
    });
});
