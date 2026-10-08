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
import {
    getStoreProgram,
    purchaseStoreProgramPix,
    type StoreProgramDetail,
} from '@/libs/storeService';

/**
 * Compra de um programa da loja (produto=programa): o preço e o produto do
 * Google Play vêm da faixa do PROGRAMA, não do plano avulso único, e a
 * compra leva o ?ref= do link do programa (Todo/PLANO_LOJA_DE_TREINOS.md
 * §5.3 e §5.4).
 */

let searchParams = new URLSearchParams('produto=programa&programId=p1');
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
    useSearchParams: () => searchParams,
}));

vi.mock('@/libs/paymentService', () => ({
    daysUntil: () => 0,
    getPlans: vi.fn(),
    getProTrialStatus: vi.fn(),
    getStudentPlusStatus: vi.fn(),
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

vi.mock('@/libs/storeService', () => ({
    getStoreProgram: vi.fn(),
    purchaseStoreProgramPix: vi.fn(),
    purchaseStoreProgramCard: vi.fn(),
}));

vi.mock('@/libs/session', () => ({
    getUser: () => ({ id: 'u1', role: 'student', plan_type: 'free' }),
    planRank: () => 0,
    getStudentHomeRoute: () => '/meus-treinos',
    updateSessionPlanType: vi.fn(),
}));

vi.mock('@/libs/nativeBridge', () => ({ hasNativeBilling: vi.fn() }));
vi.mock('@/libs/planningService', () => ({
    getMyPlannings: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/libs/analytics', () => ({ trackTrialStarted: vi.fn() }));
vi.mock('@/hooks/useCloseOnBack', () => ({ useCloseOnBack: () => {} }));

const CATALOG: PlanCatalog = {
    pro: [{ cycle: 'MONTHLY', value: 39.9, play_product_id: 'pro_monthly' }],
    personal_plus: { cycle: 'MONTHLY', value: 19.9, play_product_id: 'personal_plus_monthly' },
    library_plan: { value: 29.9, play_product_id: 'library_plan' },
    student_plus: { cycle: 'MONTHLY', value: 9.9, play_product_id: 'aluno_plus_monthly' },
};

const PROGRAM = {
    id: 'p1',
    title: 'Glúteos em 8 semanas',
    goals: [],
    days_per_week: 3,
    duration_weeks: 8,
    price: 49.9,
    price_tier: '4990',
    play_product_id: 'program_4990',
    sales_count: 0,
    rating_avg: 0,
    rating_count: 0,
    venafit_collection: false,
    author: { code: 'CARLA', name: 'Carla Souza', cref: 'CREF 012345-G/SP' },
    preview: { id: 't', name: 'x', phases: 1, duration_weeks: 8, days_per_week: 3, trainings: [] },
} as StoreProgramDetail;

describe('/pagamento?produto=programa', () => {
    beforeEach(() => {
        searchParams = new URLSearchParams('produto=programa&programId=p1');
        vi.mocked(getPlans).mockResolvedValue(CATALOG);
        vi.mocked(getStoreProgram).mockReset();
        vi.mocked(getStoreProgram).mockResolvedValue(PROGRAM);
        vi.mocked(launchGooglePlayPurchase).mockReset();
        vi.mocked(verifyGooglePlayPurchase).mockReset();
        vi.mocked(purchaseStoreProgramPix).mockReset();
        window.localStorage.clear();
        // O link do programa abriu com ?ref=CARLA (libs/storeSaleRef).
        window.localStorage.setItem(
            'venafit_store_sale_ref',
            JSON.stringify({ ref: 'CARLA', savedAt: Date.now() }),
        );
    });

    it('no app, compra o produto da faixa do programa e leva o ref ao verify', async () => {
        const user = userEvent.setup();
        vi.mocked(hasNativeBilling).mockReturnValue(true);
        vi.mocked(launchGooglePlayPurchase).mockResolvedValue({
            status: 'success',
            productId: 'program_4990',
            purchaseToken: 'tok',
        });
        vi.mocked(verifyGooglePlayPurchase).mockResolvedValue({ success: true, message: '' });
        render(<Payment />);

        expect(await screen.findByText('Programa Glúteos em 8 semanas')).toBeInTheDocument();
        expect(screen.getByText(/R\$\s?49,90/)).toBeInTheDocument();
        expect(screen.getByText(/Montado por Carla Souza \(CREF 012345-G\/SP\)/)).toBeInTheDocument();
        expect(screen.getByText(/não substitui uma avaliação individual/)).toBeInTheDocument();

        const pay = screen.getByRole('button', { name: 'Continuar para o pagamento' });
        await waitFor(() => expect(pay).toBeEnabled());
        await user.click(pay);

        expect(await screen.findByText('Pagamento confirmado!')).toBeInTheDocument();
        expect(launchGooglePlayPurchase).toHaveBeenCalledWith('program_4990', 'inapp', 'u1');
        expect(verifyGooglePlayPurchase).toHaveBeenCalledWith(
            'program_4990',
            'tok',
            'inapp',
            undefined,
            undefined,
            undefined,
            { programId: 'p1', ref: 'CARLA' },
        );
    });

    it('no site, o PIX é do programa, com o ref', async () => {
        const user = userEvent.setup();
        vi.mocked(hasNativeBilling).mockReturnValue(false);
        vi.mocked(isGooglePlayBillingAvailable).mockResolvedValue(false);
        vi.mocked(purchaseStoreProgramPix).mockResolvedValue({
            success: true,
            message: '',
            method: 'PIX',
            applied: false,
            qr_code_payload: 'pix-copia-e-cola',
        });
        render(<Payment />);

        await screen.findByRole('heading', { name: 'Confira seu pedido' });
        const next = screen.getByRole('button', { name: 'Escolher forma de pagamento' });
        await waitFor(() => expect(next).toBeEnabled());
        await user.click(next);
        // O total do passo é o preço da faixa do programa.
        expect(await screen.findByText(/R\$\s?49,90/)).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Gerar QR Code PIX' }));

        await waitFor(() => expect(purchaseStoreProgramPix).toHaveBeenCalledWith('p1', 'CARLA', undefined));
    });

    it('programa fora de venda não deixa pagar', async () => {
        vi.mocked(hasNativeBilling).mockReturnValue(true);
        vi.mocked(getStoreProgram).mockRejectedValue(new Error('404'));
        render(<Payment />);

        expect(await screen.findByText('Este programa não está à venda no momento.')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Continuar para o pagamento' })).not.toBeInTheDocument();
    });
});
