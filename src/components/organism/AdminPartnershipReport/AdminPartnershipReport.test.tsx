import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AdminPartnershipReport from './index';
import {
    createPartnerExpense,
    getPartnershipReport,
    type PartnershipReport,
    type PartnershipRow,
} from '@/libs/referralPartnerService';

vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/components/system/Modal', () => ({
    default: ({
        open,
        children,
        footer,
    }: {
        open: boolean;
        children: React.ReactNode;
        footer: React.ReactNode;
    }) =>
        open ? (
            <div role="dialog">
                {children}
                {footer}
            </div>
        ) : null,
}));
vi.mock('@/libs/referralPartnerService', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@/libs/referralPartnerService')>();
    return {
        ...actual,
        getAllReferralPartners: vi.fn().mockResolvedValue([
            {
                id: 'p1',
                name: 'Ana Fit',
                code: 'ANA',
                commission_type: 'percentage',
                commission_value: 10,
                renewal_commission_value: 5,
                renewal_months: 0,
                is_active: true,
                created_at: '',
                updated_at: '',
            },
        ]),
        getPartnershipReport: vi.fn(),
        createPartnerExpense: vi.fn().mockResolvedValue({}),
        deletePartnerExpense: vi.fn(),
    };
});

const row: PartnershipRow = {
    key: 'partner:p1',
    kind: 'partner',
    label: 'Ana Fit',
    partner_id: 'p1',
    code: 'ANA',
    is_active: true,
    commission_type: 'percentage',
    commission_value: 10,
    renewal_commission_value: 5,
    renewal_months: 0,
    signups: 4,
    trials: 2,
    new_sales: 3,
    renewals: 1,
    one_time: 0,
    refunds: 0,
    gross: 159.6,
    net: 135.66,
    commission: 11.97,
    commission_paid: 0,
    other_expenses: 50,
    result: 73.69,
    holding: 7.98,
    available: 3.99,
    paid_total: 0,
    due: 3.99,
};

const REPORT: PartnershipReport = {
    from: '2026-10-01',
    to: '2026-10-06',
    commission_hold_days: 30,
    summary: { ...row, key: '', label: '' },
    rows: [row],
    sales: [
        {
            id: 's1',
            occurred_at: '2026-10-03T10:00:00-03:00',
            origin_key: 'partner:p1',
            origin_label: 'Ana Fit',
            attribution_source: 'link',
            user_id: 'u1',
            user_name: 'Bia',
            user_email: 'bia@x.com',
            product: 'pro',
            cycle: 'MONTHLY',
            gateway: 'GOOGLE_PLAY',
            kind: 'new',
            status: 'confirmed',
            gross: 39.9,
            net: 33.92,
            net_estimated: true,
            commission: 3.99,
            commission_status: 'holding',
        },
    ],
    expenses: [],
    months: [
        {
            month: '2026-10',
            gross: 159.6,
            net: 135.66,
            commission: 11.97,
            other_expenses: 50,
        },
    ],
};

describe('AdminPartnershipReport', () => {
    beforeEach(() => {
        vi.mocked(getPartnershipReport).mockResolvedValue(REPORT);
        vi.mocked(createPartnerExpense).mockClear();
    });

    it('mostra ganhos, gastos, saldo a repassar e a venda com a comissão em carência', async () => {
        render(<AdminPartnershipReport />);

        expect(await screen.findByText('Ganhos (líquido)')).toBeInTheDocument();
        expect(getPartnershipReport).toHaveBeenCalledWith(
            expect.objectContaining({ origin: 'partners' }),
        );
        // Gastos = comissões + outros.
        expect(screen.getByText(/R\$\s61,97/)).toBeInTheDocument();
        expect(screen.getAllByText('Bia').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Carência até 02/11')[0]).toHaveAttribute(
            'title',
            'Liberada para repasse em 02/11/2026',
        );
        expect(screen.getByText('pelo link')).toBeInTheDocument();
    });

    it('"Registrar repasse" lança o saldo liberado como repasse de comissão do parceiro', async () => {
        const user = userEvent.setup();
        render(<AdminPartnershipReport />);

        await user.click(
            (
                await screen.findAllByRole('button', {
                    name: 'Registrar repasse',
                })
            )[0],
        );
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByLabelText('Valor (R$)')).toHaveValue('3,99');
        await user.click(
            within(dialog).getByRole('button', { name: 'Lançar' }),
        );

        await waitFor(() =>
            expect(createPartnerExpense).toHaveBeenCalledWith(
                expect.objectContaining({
                    partner_id: 'p1',
                    category: 'commission_payout',
                    amount: 3.99,
                }),
            ),
        );
    });
});
