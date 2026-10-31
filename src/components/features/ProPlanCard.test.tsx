import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import ProPlanCard from './ProPlanCard';
import { getPlans, getProPlanStatus, type ProPlanStatus } from '@/libs/paymentService';
import { hasNativeBilling } from '@/libs/nativeBridge';

/**
 * Renovação do plano no cartão em atraso (auditoria de 2026-10-31): antes o
 * plano nunca caía e a tela dizia "sem assinatura recorrente, nada a
 * cancelar". Agora ela mostra até quando o plano vale e as três saídas —
 * pagar a fatura em aberto (só no site), assinar de novo e cancelar.
 */

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/libs/paymentService', () => ({
    cancelSubscription: vi.fn(),
    getPlans: vi.fn(),
    getProPlanStatus: vi.fn(),
    switchToPersonalPlus: vi.fn(),
}));
vi.mock('@/libs/nativeBridge', () => ({ hasNativeBilling: vi.fn() }));
vi.mock('@/libs/session', () => ({
    planRank: (plan?: string) => (plan === 'pro' ? 2 : plan === 'plus' ? 1 : 0),
    updateSessionPlanType: vi.fn(),
}));
vi.mock('@/libs/androidApp', () => ({
    PLAY_SUBSCRIPTIONS_URL: 'https://play.google.com/store/account/subscriptions',
}));

const OVERDUE: ProPlanStatus = {
    plan_type: 'pro',
    is_plus: true,
    is_pro: true,
    has_active_subscription: false,
    subscription_status: 'SUSPENDED',
    subscription_tier: 'pro',
    subscription_billing_type: 'CREDIT_CARD',
    payment_overdue_tier: 'pro',
    payment_overdue_until: '2026-11-07T13:00:00Z',
    payment_overdue_invoice_url: 'https://www.asaas.com/i/pay_1',
};

describe('ProPlanCard com a renovação em atraso', () => {
    beforeEach(() => {
        vi.mocked(getPlans).mockResolvedValue({
            pro: [],
            personal_plus: { cycle: 'MONTHLY', value: 19.9, play_product_id: 'personal_plus_monthly' },
            library_plan: { value: 29.9, play_product_id: 'library_plan' },
            student_plus: { cycle: 'MONTHLY', value: 9.9, play_product_id: 'aluno_plus_monthly' },
        });
        vi.mocked(getProPlanStatus).mockResolvedValue(OVERDUE);
    });

    it('no site: mostra até quando vale, a fatura em aberto e as saídas', async () => {
        vi.mocked(hasNativeBilling).mockReturnValue(false);
        render(<ProPlanCard />);

        expect(await screen.findByText(/não foi paga/)).toHaveTextContent('07/11/2026');
        expect(screen.getByRole('link', { name: 'Pagar a cobrança em aberto' })).toHaveAttribute(
            'href',
            OVERDUE.payment_overdue_invoice_url,
        );
        expect(screen.getByRole('button', { name: 'Assinar com outro cartão' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cancelar assinatura' })).toBeInTheDocument();
    });

    it('no app: sem link de pagamento fora do Google Play', async () => {
        vi.mocked(hasNativeBilling).mockReturnValue(true);
        render(<ProPlanCard />);

        await screen.findByText(/não foi paga/);
        expect(screen.queryByRole('link', { name: 'Pagar a cobrança em aberto' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Assinar de novo' })).toBeInTheDocument();
    });
});
