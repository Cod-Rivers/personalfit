import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Payment from './page';
import {
    getPlans,
    getProPlanStatus,
    isGooglePlayBillingAvailable,
    launchGooglePlayPurchase,
    verifyGooglePlayPurchase,
    type PlanCatalog,
} from '@/libs/paymentService';
import { hasNativeBilling } from '@/libs/nativeBridge';
import { checkReferralCode, normalizeReferralCode } from '@/libs/referralPartnerService';

/**
 * Checkout em passos. Os casos travam os três defeitos relatados pelo dono em
 * 2026-10-06 no app: "Quero o PRO" não fazia nada (navegava para a própria
 * URL), "Continuar para o pagamento" parecia não fazer nada (o erro do Google
 * aparecia no topo, fora da vista) e a indicação se perdia na compra pelo
 * Google Play (o verify não a levava). E o código de indicação: só vale o
 * código que o servidor confirmou ser de um parceiro ativo.
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
    registerGooglePlayIntent: vi.fn().mockResolvedValue(undefined),
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

// normalizeReferralCode é o de verdade; só a consulta ao servidor é falsa.
vi.mock('@/libs/referralPartnerService', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/libs/referralPartnerService')>()),
    checkReferralCode: vi.fn(),
}));

const JOAO = { code: 'JOAO10', partner_name: 'João Personal' };

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
    personal_plus_pix: [
        { cycle: 'MONTHLY', value: 19.9, play_product_id: '' },
        { cycle: 'SEMIANNUALLY', value: 99.9, play_product_id: '' },
        { cycle: 'YEARLY', value: 199.9, play_product_id: '' },
    ],
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
        vi.mocked(getProPlanStatus).mockResolvedValue({ plan_type: 'free' });
        vi.mocked(hasNativeBilling).mockReturnValue(true);
        vi.mocked(isGooglePlayBillingAvailable).mockResolvedValue(true);
        vi.mocked(launchGooglePlayPurchase).mockReset();
        vi.mocked(verifyGooglePlayPurchase).mockReset();
        vi.mocked(checkReferralCode).mockReset();
        vi.mocked(checkReferralCode).mockImplementation(async (raw: string) =>
            normalizeReferralCode(raw) === JOAO.code ? JOAO : null,
        );
        window.localStorage.clear();
    });

    it('quem chegou pelo link do parceiro já vem com o código confirmado', async () => {
        const user = userEvent.setup();
        // Primeiro toque salvo por libs/acquisition (código com hífen e minúsculas).
        window.localStorage.setItem(
            'venafit_acquisition_ref',
            JSON.stringify({ ref: 'joao-10', savedAt: Date.now() }),
        );
        render(<Payment />);

        await screen.findByRole('heading', { name: 'Escolha seu plano' });
        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Continuar com o Plus' })).toBeEnabled(),
        );
        await continueTo(user, /Continuar com o Plus/, 'Como você conheceu o Venafit?');

        expect(
            await screen.findByRole('radio', { name: 'Tenho um código de indicação' }),
        ).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByLabelText('Código de indicação')).toHaveValue('JOAO10');
        expect(screen.getByRole('status')).toHaveTextContent('Indicação de João Personal');
        expect(checkReferralCode).toHaveBeenCalledWith('joao-10');
        expect(screen.getByRole('button', { name: /^Continuar$/ })).toBeEnabled();
    });

    it('ref que não é parceiro não marca nada', async () => {
        const user = userEvent.setup();
        window.localStorage.setItem(
            'venafit_acquisition_ref',
            JSON.stringify({ ref: 'share_card', savedAt: Date.now() }),
        );
        render(<Payment />);

        await screen.findByRole('heading', { name: 'Escolha seu plano' });
        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Continuar com o Plus' })).toBeEnabled(),
        );
        await continueTo(user, /Continuar com o Plus/, 'Como você conheceu o Venafit?');

        expect(screen.getByRole('radio', { name: 'Tenho um código de indicação' })).toHaveAttribute(
            'aria-checked',
            'false',
        );
        expect(screen.getByRole('button', { name: /^Continuar$/ })).toBeDisabled();
    });

    it('código digitado que não é de parceiro ativo não deixa continuar', async () => {
        const user = userEvent.setup();
        render(<Payment />);

        await screen.findByRole('heading', { name: 'Escolha seu plano' });
        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Continuar com o Plus' })).toBeEnabled(),
        );
        await continueTo(user, /Continuar com o Plus/, 'Como você conheceu o Venafit?');
        await user.click(screen.getByRole('radio', { name: 'Tenho um código de indicação' }));
        await user.type(screen.getByLabelText('Código de indicação'), 'chute123');
        await user.click(screen.getByRole('button', { name: 'Aplicar' }));

        expect(await screen.findByText(/Código não encontrado/)).toBeInTheDocument();
        expect(checkReferralCode).toHaveBeenCalledWith('CHUTE123');
        expect(screen.getByRole('button', { name: /^Continuar$/ })).toBeDisabled();
        expect(screen.getByRole('heading', { name: 'Como você conheceu o Venafit?' })).toBeInTheDocument();
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
        await user.click(screen.getByRole('radio', { name: 'Tenho um código de indicação' }));
        expect(next).toBeDisabled();
        // Digitado e não aplicado: o "Continuar" confere o código e segue.
        await user.type(screen.getByLabelText('Código de indicação'), 'joao-10');
        expect(next).toBeEnabled();
        await continueTo(user, /^Continuar$/, 'Confira seu pedido');

        expect(screen.getByText('Plano PRO — Anual')).toBeInTheDocument();
        expect(screen.getByText('João Personal (código JOAO10)')).toBeInTheDocument();
    });

    // Auditoria de 2026-10-31: dentro do app, a compra pelo Google Play abria
    // uma segunda assinatura sem encerrar a primeira. A tela é a única trava
    // antes do Google.
    it('quem já assina o Plus não compra o Plus de novo', async () => {
        const user = userEvent.setup();
        vi.mocked(getProPlanStatus).mockResolvedValue({
            plan_type: 'plus',
            has_active_subscription: true,
            subscription_status: 'ACTIVE',
            subscription_tier: 'plus',
            subscription_cycle: 'MONTHLY',
            subscription_billing_type: 'GOOGLE_PLAY',
        });
        render(<Payment />);

        await screen.findByRole('heading', { name: 'Escolha seu plano' });
        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Continuar com o Plus' })).toBeEnabled(),
        );
        await continueTo(user, /Continuar com o Plus/, 'Como você conheceu o Venafit?');
        await user.click(screen.getByRole('radio', { name: 'Ninguém me indicou' }));
        await continueTo(user, /^Continuar$/, 'Confira seu pedido');

        expect(screen.getByText('Você já assina o Plus neste período.')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Continuar para o pagamento' })).not.toBeInTheDocument();
        expect(launchGooglePlayPurchase).not.toHaveBeenCalled();
    });

    it('subir do Plus para o PRO avisa que o Plus é encerrado', async () => {
        const user = userEvent.setup();
        searchParams = new URLSearchParams('produto=pro');
        vi.mocked(getProPlanStatus).mockResolvedValue({
            plan_type: 'plus',
            has_active_subscription: true,
            subscription_status: 'ACTIVE',
            subscription_tier: 'plus',
            subscription_cycle: 'MONTHLY',
            subscription_billing_type: 'GOOGLE_PLAY',
        });
        render(<Payment />);

        await screen.findByRole('heading', { name: 'Escolha seu plano' });
        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Continuar com o PRO' })).toBeEnabled(),
        );
        await continueTo(user, /Continuar com o PRO/, 'Escolha o período');
        await continueTo(user, /^Continuar$/, 'Como você conheceu o Venafit?');
        await user.click(screen.getByRole('radio', { name: 'Ninguém me indicou' }));
        await continueTo(user, /^Continuar$/, 'Confira seu pedido');

        expect(screen.getByRole('note')).toHaveTextContent(
            'sua assinatura atual do Plus no Google Play é encerrada',
        );
        expect(screen.getByRole('button', { name: 'Continuar para o pagamento' })).toBeEnabled();
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

    it('a compra pelo Google Play leva o código confirmado ao verify', async () => {
        const user = userEvent.setup();
        window.localStorage.setItem(
            'venafit_acquisition_ref',
            JSON.stringify({ ref: 'joao10', savedAt: Date.now() }),
        );
        vi.mocked(launchGooglePlayPurchase).mockResolvedValue({
            status: 'success',
            productId: 'personal_plus_monthly',
            purchaseToken: 'tok',
        });
        vi.mocked(verifyGooglePlayPurchase).mockResolvedValue({ success: true, message: '' });
        render(<Payment />);

        await screen.findByRole('heading', { name: 'Escolha seu plano' });
        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Continuar com o Plus' })).toBeEnabled(),
        );
        await continueTo(user, /Continuar com o Plus/, 'Como você conheceu o Venafit?');
        await screen.findByText('João Personal');
        await continueTo(user, /^Continuar$/, 'Confira seu pedido');
        await user.click(screen.getByRole('button', { name: 'Continuar para o pagamento' }));

        expect(await screen.findByText('Pagamento confirmado!')).toBeInTheDocument();
        expect(verifyGooglePlayPurchase).toHaveBeenCalledWith(
            'personal_plus_monthly',
            'tok',
            'subs',
            undefined,
            undefined,
            'JOAO10',
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
    it('no PIX do PRO mensal, oferece trocar para o anual', async () => {
        const user = userEvent.setup();
        searchParams = new URLSearchParams('produto=pro');
        vi.mocked(hasNativeBilling).mockReturnValue(false);
        vi.mocked(isGooglePlayBillingAvailable).mockResolvedValue(false);
        render(<Payment />);

        await screen.findByRole('heading', { name: 'Escolha seu plano' });
        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Continuar com o PRO' })).toBeEnabled(),
        );
        await continueTo(user, /Continuar com o PRO/, 'Escolha o período');
        expect(screen.getByRole('radio', { name: /^Anual/ })).toHaveTextContent('Melhor no PIX');
        await continueTo(user, /^Continuar$/, 'Como você conheceu o Venafit?');
        await user.click(screen.getByRole('radio', { name: 'Ninguém me indicou' }));
        await continueTo(user, /^Continuar$/, 'Confira seu pedido');
        await continueTo(user, /Escolher forma de pagamento/, 'Forma de pagamento');

        expect(screen.getByText(/No PIX, o anual vale mais/)).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Trocar para o anual' }));
        expect(screen.getByText('Plano PRO — Anual')).toBeInTheDocument();
        expect(screen.queryByText(/No PIX, o anual vale mais/)).not.toBeInTheDocument();
    });
    it('no PIX, o Plus pode ser pago por 6 ou 12 meses; no cartão volta ao mensal', async () => {
        const user = userEvent.setup();
        searchParams = new URLSearchParams('produto=personal-plus');
        vi.mocked(hasNativeBilling).mockReturnValue(false);
        vi.mocked(isGooglePlayBillingAvailable).mockResolvedValue(false);
        render(<Payment />);

        await screen.findByRole('heading', { name: 'Escolha seu plano' });
        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Continuar com o Plus' })).toBeEnabled(),
        );
        await continueTo(user, /Continuar com o Plus/, 'Como você conheceu o Venafit?');
        await user.click(screen.getByRole('radio', { name: 'Ninguém me indicou' }));
        await continueTo(user, /^Continuar$/, 'Confira seu pedido');
        await continueTo(user, /Escolher forma de pagamento/, 'Forma de pagamento');

        const anual = screen.getByRole('radio', { name: /^Anual/ });
        expect(anual).toHaveTextContent('Melhor no PIX');
        await user.click(anual);
        expect(screen.getByText('Personal Plus — Anual')).toBeInTheDocument();
        expect(screen.getByText(/O PIX paga\s+12 meses/)).toBeInTheDocument();

        await user.click(screen.getByRole('radio', { name: 'Cartão' }));
        expect(screen.getByText('Personal Plus — Mensal')).toBeInTheDocument();
        expect(screen.queryByRole('radio', { name: /^Anual/ })).not.toBeInTheDocument();
    });
});
