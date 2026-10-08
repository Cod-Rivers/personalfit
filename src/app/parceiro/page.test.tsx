import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './page';
import { acceptAuthorTerms, getMyPartnerPanel, type PartnerPanel } from '@/libs/referralPartnerService';
import { listMyStorePrograms, runMyStoreProgramAction, type AdminStoreProgram } from '@/libs/storeService';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/hooks/useAuthGuard', () => ({ useAuthGuard: () => ({ checking: false, authorized: true, user: { id: 'u1' } }) }));
vi.mock('@/libs/referralPartnerService', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/libs/referralPartnerService')>();
    return { ...actual, getMyPartnerPanel: vi.fn(), acceptAuthorTerms: vi.fn() };
});
vi.mock('@/libs/storeService', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/libs/storeService')>();
    return { ...actual, listMyStorePrograms: vi.fn().mockResolvedValue([]), runMyStoreProgramAction: vi.fn() };
});

const PANEL: PartnerPanel = {
    partner: {
        name: 'Ana Fit', code: 'ANAFIT', is_active: true, commission_type: 'percentage',
        commission_value: 15, renewal_commission_value: 10, renewal_months: 0, commission_base: 'net',
    },
    settings: { min_payout: 50, payout_day: 15, next_payout: '2026-11-15', hold_days: 30 },
    from: '2026-10-01',
    to: '2026-10-20',
    period: { signups: 4, trials: 1, purchases: 2, renewals: 3, refunds: 0, program_sales: 0, commission: 20.35, author_earnings: 0 },
    balance: { holding: 13.57, available: 60.2, paid: 5.09, due: 55.11 },
    sales: [
        {
            ref: 'a1b2c3', occurred_at: '2026-10-10T10:00:00-03:00', product: 'pro', cycle: 'MONTHLY', gateway: 'GOOGLE_PLAY',
            kind: 'new', status: 'confirmed', gross: 39.9, net: 33.91, net_estimated: false, commission_type: 'percentage',
            commission_value: 15, commission_base: 'net', commission: 5.09, role: 'referral', amount: 5.09, commission_status: 'holding', release_at: '2026-11-09',
        },
    ],
    statements: [{ month: '2026-10', generated: 20.35, generated_referral: 20.35, generated_programs: 0, voided: 0, paid: 0, balance: 68.68 }],
    years: [{ year: 2026, total: 5.09, payments: [{ date: '2026-09-15', amount: 5.09, description: 'Repasse de agosto' }] }],
    programs: [],
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

describe('/parceiro do autor da loja', () => {
    beforeEach(() => vi.mocked(getMyPartnerPanel).mockReset());

    it('mostra as duas fontes de receita, a aba Meus programas e nenhuma comissão alheia', async () => {
        const user = userEvent.setup();
        vi.mocked(getMyPartnerPanel).mockResolvedValue({
            ...PANEL,
            partner: {
                ...PANEL.partner,
                author: { enabled: true, public_name: 'Ana Fit', cref: 'CREF 012345-G/SP', store_share: 70, direct_share: 85, can_publish: true, cref_verified: true, terms_accepted: true, terms_version: 'v1' },
            },
            period: { ...PANEL.period, program_sales: 2, author_earnings: 39.39 },
            sales: [
                {
                    ref: 'f00001', occurred_at: '2026-10-11T10:00:00-03:00', product: 'library_plan', gateway: 'GOOGLE_PLAY',
                    kind: 'one_time', status: 'confirmed', gross: 29.9, net: 25.41, net_estimated: true,
                    commission_value: 0, commission: 0, role: 'author', amount: 17.79,
                    program_title: 'Glúteos em 8 semanas', author_share_value: 70, author_amount: 17.79,
                    commission_status: 'holding', release_at: '2026-11-10',
                },
            ],
            statements: [{ month: '2026-10', generated: 22.88, generated_referral: 5.09, generated_programs: 17.79, voided: 0, paid: 0, balance: 22.88 }],
            programs: [{ id: 'p1', title: 'Glúteos em 8 semanas', status: 'published', price: 29.9, sales: 2, revenue: 39.39, rating_avg: 4.7, rating_count: 3 }],
        });
        render(<Page />);

        expect(await screen.findByText(/Como autor \(CREF 012345-G\/SP\)/)).toBeInTheDocument();
        expect(screen.getByText('Programa Glúteos em 8 semanas')).toBeInTheDocument();
        expect(screen.getByText('Venda de programa')).toBeInTheDocument();
        expect(screen.getByText(/sua parte: 70% sobre R\$\s25,41/)).toBeInTheDocument();

        await user.click(screen.getByRole('tab', { name: 'Meus programas (1)' }));
        expect(screen.getByText(/À venda · R\$\s29,90 · ★ 4,7 \(3\)/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Copiar link do programa/ })).toBeInTheDocument();

        await user.click(screen.getByRole('tab', { name: 'Extrato mensal' }));
        expect(screen.getByText('Venda de programa')).toBeInTheDocument();
    });
});

const AUTHOR = { enabled: true, public_name: 'Ana Fit', cref: 'CREF 012345-G/SP', store_share: 70, direct_share: 85, can_publish: false, cref_verified: true, terms_accepted: false, terms_version: 'v1' };

function storeProgram(patch: Partial<AdminStoreProgram>): AdminStoreProgram {
    return {
        id: 'p1', status: 'pending', author_can_publish: true, venafit_collection: false, template_id: 't1', source_template_id: 's1',
        listing: { title: 'Glúteos em 8 semanas', summary: '', description: '', audience: '', prerequisites: '', level: '', goals: [], equipment: '', session_minutes: 0 },
        days_per_week: 3, duration_weeks: 8, price_tier: '2990', price: 29.9, featured: false, sales_count: 0, version: 1,
        created_at: '2026-10-08T10:00:00Z', updated_at: '2026-10-08T10:00:00Z', in_review: true,
        ...patch,
    };
}

describe('/parceiro, loja fase 2', () => {
    beforeEach(() => {
        vi.mocked(getMyPartnerPanel).mockReset();
        vi.mocked(acceptAuthorTerms).mockReset();
        vi.mocked(listMyStorePrograms).mockReset();
        vi.mocked(runMyStoreProgramAction).mockReset();
    });

    it('pede o aceite do Termo do Autor e manda a versão lida', async () => {
        const user = userEvent.setup();
        vi.mocked(getMyPartnerPanel).mockResolvedValue({ ...PANEL, partner: { ...PANEL.partner, author: AUTHOR } });
        vi.mocked(listMyStorePrograms).mockResolvedValue([]);
        vi.mocked(acceptAuthorTerms).mockResolvedValue({ terms_version: 'v1', can_publish: true });
        render(<Page />);

        await user.click(await screen.findByRole('button', { name: 'Ler e aceitar o termo' }));
        const accept = screen.getByRole('button', { name: 'Aceitar' });
        expect(accept).toBeDisabled();
        await user.click(screen.getByRole('checkbox', { name: /Li e aceito o Termo do Autor/ }));
        await user.click(accept);
        expect(acceptAuthorTerms).toHaveBeenCalledWith('v1');
    });

    it('mostra a situação do programa em revisão e deixa cancelar o envio', async () => {
        const user = userEvent.setup();
        vi.mocked(getMyPartnerPanel).mockResolvedValue({
            ...PANEL,
            partner: { ...PANEL.partner, author: { ...AUTHOR, can_publish: true, terms_accepted: true } },
            programs: [{ id: 'p1', title: 'Glúteos em 8 semanas', status: 'pending', price: 29.9, sales: 0, revenue: 0, rating_avg: 0, rating_count: 0 }],
        });
        vi.mocked(listMyStorePrograms).mockResolvedValue([storeProgram({})]);
        vi.mocked(runMyStoreProgramAction).mockResolvedValue(storeProgram({ status: 'draft', in_review: false }));
        render(<Page />);

        await user.click(await screen.findByRole('tab', { name: 'Meus programas (1)' }));
        const cancel = await screen.findByRole('button', { name: 'Cancelar envio' });
        expect(screen.queryByRole('button', { name: 'Pausar' })).not.toBeInTheDocument();
        await user.click(cancel);
        expect(runMyStoreProgramAction).toHaveBeenCalledWith('p1', 'cancel-review');
    });

    it('programa à venda pausado pela equipe: o autor não devolve à vitrine', async () => {
        const user = userEvent.setup();
        vi.mocked(getMyPartnerPanel).mockResolvedValue({
            ...PANEL,
            partner: { ...PANEL.partner, author: { ...AUTHOR, can_publish: true, terms_accepted: true } },
            programs: [{ id: 'p1', title: 'Glúteos em 8 semanas', status: 'paused', price: 29.9, sales: 4, revenue: 70, rating_avg: 0, rating_count: 0 }],
        });
        vi.mocked(listMyStorePrograms).mockResolvedValue([storeProgram({ status: 'paused', paused_by: 'team', in_review: false })]);
        render(<Page />);

        await user.click(await screen.findByRole('tab', { name: 'Meus programas (1)' }));
        expect(await screen.findByText(/Pausado pela equipe/)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Voltar à vitrine/ })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Alterar/ })).toBeInTheDocument();
    });
});
