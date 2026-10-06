import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Payment from './page';
import {
    getPlans,
    isGooglePlayBillingAvailable,
    launchGooglePlayPurchase,
    verifyGooglePlayPurchase,
    type PlanCatalog,
} from '@/libs/paymentService';
import { hasNativeBilling } from '@/libs/nativeBridge';

/**
 * Checkout em passos. Os casos travam os três defeitos relatados pelo dono em
 * 2026-10-06 no app: "Quero o PRO" não fazia nada (navegava para a própria
 * URL), "Continuar para o pagamento" parecia não fazer nada (o erro do Google
 * aparecia no topo, fora da vista) e a indicação se perdia na compra pelo
 * Google Play (o verify não a levava).
 */

let searchParams = new URLSearchParams('produto=personal-plus');
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: pushMock }),
    useSearchParams: () => searchParams,
}));

vi.mock('@/libs/paymentService', () => ({
    daysUntil: () => 0,
    getPlans: vi.fn(),
    getProTrialStatus: vi.fn().mockResolvedValue({
        plan_type: 'free',
        pro_trial_eligible: false,
        pro_trial_active: false,
    }),
    getStudentPlusStatus: vi.fn().mockResolvedValue({ active: false, eligible: true, own_pro: false }),
    isGooglePlayBillingAvailable: vi.fn(),
    isPersonalPlanPaymentConfirmed: vi.fn(),
    getProPlanStatus: vi.fn(),
    pixPlanPaymentConfirmed: vi.fn(),
    launchGooglePlayPurchase: vi.fn(),
    purchaseLibraryPlanCard: vi.fn(),
    purchaseLibraryPlanPix: vi.fn(),
    purchaseLockedPlanCard: vi.fn(),
    purchaseLockedPlanPix: vi.fn(),
    startProTrial: vi.fn(),
    subscribeProCard: vi.fn(),
    subscribeProPix: vi.fn(),
    subscribeStudentPlusCard: vi.fn(),
    verifyGooglePlayPurchase: vi.fn(),
}));

vi.mock('@/libs/referralPartnerService', () => ({
    getActiveReferralPartners: vi
        .fn()
        .mockResolvedValue([{ id: 'p1', code: 'joao', name: 'João Personal' }]),
}));

vi.mock('@/libs/session', () => ({
    getUser: () => ({ id: 'u1', role: 'personal', plan_type: 'free' }),
    planRank: () => 0,
    getStudentHomeRoute: () => '/meus-treinos',
    updateSessionPlanType: vi.fn(),
}));

vi.mock('@/libs/nativeBridge', () => ({ hasNativeBilling: vi.fn() }));
vi.mock('@/libs/planningService', () => ({ getMyPlannings: vi.fn() }));
vi.mock('@/libs/analytics', () => ({ trackTrialStarted: vi.fn() }));
// O voltar do histórico tem teste próprio (Modal.test.tsx).
vi.mock('@/hooks/useCloseOnBack', () => ({ useCloseOnBack: () => {} }));

const CATALOG: PlanCatalog = {
    pro: [
        { cycle: 'MONTHLY', value: 39.9, play_product_id: 'pro_monthly' },
        { cycle: 'SEMIANNUALLY', value: 199.9, play_product_id: 'pro_semiannual' },
        { cycle: 'YEARLY', value: 399.9, play_product_id: 'pro_yearly' },
    ],
    personal_plus: { cycle: 'MONTHLY', value: 19.9, play_product_id: 'personal_plus_monthly' },
    library_plan: { value: 29.9, play_product_id: 'library_plan' },
    student_plus: { cycle: 'MONTHLY', value: 9.9, play_product_id: 'aluno_plus_monthly' },
};

async function continueTo(user: ReturnType<typeof userEvent.setup>, label: RegExp, title: string) {
    await user.click(screen.getByRole('button', { name: label }));
    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
}

describe('/pagamento em passos (plano do personal)', () => {
    beforeEach(() => {
        searchParams = new URLSearchParams('produto=personal-plus');
        pushMock.mockClear();
        vi.mocked(getPlans).mockResolvedValue(CATALOG);
        vi.mocked(hasNativeBilling).mockReturnValue(true);
        vi.mocked(isGooglePlayBillingAvailable).mockResolvedValue(true);
        vi.mocked(launchGooglePlayPurchase).mockReset();
        vi.mocked(verifyGooglePlayPurchase).mockReset();
    });

    it('tocar no PRO troca o plano escolhido, e a indicação é obrigatória', async () => {
        const user = userEvent.setup();
        render(<Payment />);

        expect(await screen.findByRole('heading', { name: 'Escolha seu plano' })).toBeInTheDocument();
        const plus = screen.getByRole('radio', { name: /^Plus/ });
        const pro = screen.getByRole('radio', { name: /^PRO/ });
        expect(plus).toHaveAttribute('aria-checked', 'true');

        await user.click(pro);
        expect(pro).toHaveAttribute('aria-checked', 'true');
        expect(plus).toHaveAttribute('aria-checked', 'false');
        expect(pushMock).not.toHaveBeenCalled();

        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Continuar com o PRO' })).toBeEnabled(),
        );
        await continueTo(user, /Continuar com o PRO/, 'Escolha o período');
        await user.click(screen.getByRole('radio', { name: /^Anual/ }));
        await continueTo(user, /^Continuar$/, 'Como você conheceu o Venafit?');

        const next = screen.getByRole('button', { name: /^Continuar$/ });
        expect(next).toBeDisabled();
        await user.click(await screen.findByRole('radio', { name: 'João Personal' }));
        expect(next).toBeEnabled();
        await continueTo(user, /^Continuar$/, 'Confira seu pedido');

        expect(screen.getByText('Plano PRO — Anual')).toBeInTheDocument();
        expect(screen.getByText('João Personal')).toBeInTheDocument();
    });

    it('o erro do Google Play aparece junto do botão, com o que fazer', async () => {
        const user = userEvent.setup();
        vi.mocked(launchGooglePlayPurchase).mockRejectedValue(
            new Error('Produto não encontrado no Google Play (0)'),
        );
        render(<Payment />);

        await screen.findByRole('heading', { name: 'Escolha seu plano' });
        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Continuar com o Plus' })).toBeEnabled(),
        );
        await continueTo(user, /Continuar com o Plus/, 'Como você conheceu o Venafit?');
        await user.click(screen.getByRole('radio', { name: 'Ninguém me indicou' }));
        await continueTo(user, /^Continuar$/, 'Confira seu pedido');

        await user.click(screen.getByRole('button', { name: 'Continuar para o pagamento' }));

        expect(launchGooglePlayPurchase).toHaveBeenCalledWith('personal_plus_monthly', 'subs', 'u1');
        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent('não está disponível no Google Play');
        expect(screen.getByRole('button', { name: 'Continuar para o pagamento' })).toBeEnabled();
    });

    it('a compra pelo Google Play leva a indicação ao verify', async () => {
        const user = userEvent.setup();
        searchParams = new URLSearchParams('produto=pro');
        vi.mocked(launchGooglePlayPurchase).mockResolvedValue({
            status: 'success',
            productId: 'pro_monthly',
            purchaseToken: 'tok',
        });
        vi.mocked(verifyGooglePlayPurchase).mockResolvedValue({ success: true, message: '' });
        render(<Payment />);

        await screen.findByRole('heading', { name: 'Escolha seu plano' });
        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Continuar com o PRO' })).toBeEnabled(),
        );
        await continueTo(user, /Continuar com o PRO/, 'Escolha o período');
        await continueTo(user, /^Continuar$/, 'Como você conheceu o Venafit?');
        await user.click(screen.getByRole('radio', { name: 'Instagram' }));
        await continueTo(user, /^Continuar$/, 'Confira seu pedido');
        await user.click(screen.getByRole('button', { name: 'Continuar para o pagamento' }));

        expect(await screen.findByText('Pagamento confirmado!')).toBeInTheDocument();
        expect(verifyGooglePlayPurchase).toHaveBeenCalledWith(
            'pro_monthly',
            'tok',
            'subs',
            undefined,
            undefined,
            'instagram',
        );
    });

    it('no site, o resumo leva ao passo de PIX ou cartão', async () => {
        const user = userEvent.setup();
        searchParams = new URLSearchParams('produto=plus');
        vi.mocked(hasNativeBilling).mockReturnValue(false);
        vi.mocked(isGooglePlayBillingAvailable).mockResolvedValue(false);
        render(<Payment />);

        expect(await screen.findByRole('heading', { name: 'Confira seu pedido' })).toBeInTheDocument();
        expect(screen.getByText('Passo 1 de 2')).toBeInTheDocument();
        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Escolher forma de pagamento' })).toBeEnabled(),
        );
        await continueTo(user, /Escolher forma de pagamento/, 'Forma de pagamento');
        // Aluno Plus só no cartão: o botão de assinar fica no rodapé.
        expect(screen.getByRole('button', { name: /Assinar · R\$\s?9,90/ })).toBeInTheDocument();
        expect(screen.getByLabelText('Número do cartão')).toBeInTheDocument();
    });
});
