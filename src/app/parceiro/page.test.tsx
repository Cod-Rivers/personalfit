import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './page';
import { getMyPartnerPanel, type PartnerPanel } from '@/libs/referralPartnerService';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/hooks/useAuthGuard', () => ({ useAuthGuard: () => ({ checking: false, authorized: true, user: { id: 'u1' } }) }));
vi.mock('@/libs/referralPartnerService', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/libs/referralPartnerService')>();
    return { ...actual, getMyPartnerPanel: vi.fn() };
});

const PANEL: PartnerPanel = {
    partner: {
        name: 'Ana Fit', code: 'ANAFIT', is_active: true, commission_type: 'percentage',
        commission_value: 15, renewal_commission_value: 10, renewal_months: 0, commission_base: 'net',
    },
    settings: { min_payout: 50, payout_day: 15, next_payout: '2026-11-15', hold_days: 30 },
    from: '2026-10-01',
    to: '2026-10-20',
    period: { signups: 4, trials: 1, purchases: 2, renewals: 3, refunds: 0, commission: 20.35 },
    balance: { holding: 13.57, available: 60.2, paid: 5.09, due: 55.11 },
    sales: [
        {
            ref: 'a1b2c3', occurred_at: '2026-10-10T10:00:00-03:00', product: 'pro', cycle: 'MONTHLY', gateway: 'GOOGLE_PLAY',
            kind: 'new', status: 'confirmed', gross: 39.9, net: 33.91, net_estimated: false, commission_type: 'percentage',
            commission_value: 15, commission_base: 'net', commission: 5.09, commission_status: 'holding', release_at: '2026-11-09',
        },
    ],
    statements: [{ month: '2026-10', generated: 20.35, voided: 0, paid: 0, balance: 68.68 }],
    years: [{ year: 2026, total: 5.09, payments: [{ date: '2026-09-15', amount: 5.09, description: 'Repasse de agosto' }] }],
};

describe('/parceiro', () => {
    beforeEach(() => vi.mocked(getMyPartnerPanel).mockReset());

    it('mostra saldo, regra, a conta de cada comissão e os pagamentos', async () => {
        const user = userEvent.setup();
        vi.mocked(getMyPartnerPanel).mockResolvedValue(PANEL);
        render(<Page />);

        expect(await screen.findByText('Liberado para repasse')).toBeInTheDocument();
        expect(screen.getByText(/Pago até 15\/11\/2026/)).toBeInTheDocument();
        expect(screen.getByText(/15% na 1ª compra · 10% nas renovações do mensal · sobre o líquido/)).toBeInTheDocument();
        expect(screen.getByText(/15% sobre R\$\s33,91 \(líquido\)/)).toBeInTheDocument();
        expect(screen.getByText('Em carência até 09/11/2026')).toBeInTheDocument();
        // Nenhum dado do comprador: só o código da venda.
        expect(screen.getByText(/#a1b2c3/)).toBeInTheDocument();

        await user.click(screen.getByRole('tab', { name: 'Pagamentos recebidos' }));
        expect(screen.getByText(/Total recebido: R\$\s5,09/)).toBeInTheDocument();
        expect(screen.getByText('Repasse de agosto')).toBeInTheDocument();
    });

    it('saldo abaixo do mínimo acumula; conta sem parceiro vê o aviso', async () => {
        vi.mocked(getMyPartnerPanel).mockResolvedValueOnce({ ...PANEL, balance: { ...PANEL.balance, due: 12 } });
        const { unmount } = render(<Page />);
        expect(await screen.findByText(/Pago quando chegar a R\$\s50,00/)).toBeInTheDocument();
        unmount();

        vi.mocked(getMyPartnerPanel).mockRejectedValueOnce(
            new AxiosError('nf', '404', undefined, undefined, { status: 404 } as AxiosResponse),
        );
        render(<Page />);
        expect(await screen.findByText(/não está vinculada a um parceiro/)).toBeInTheDocument();
    });
});
