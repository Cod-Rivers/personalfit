import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProUpsell, { proMonthlyDelta } from './index';
import { getPlans, type PlanCatalog } from '@/libs/paymentService';
import { trackProUpsellClick, trackProUpsellView } from '@/libs/analytics';

vi.mock('@/libs/paymentService', () => ({ getPlans: vi.fn() }));
vi.mock('@/libs/analytics', () => ({
    trackProUpsellClick: vi.fn(),
    trackProUpsellView: vi.fn(),
}));

const CATALOG = {
    pro: [{ cycle: 'MONTHLY', value: 39.9, play_product_id: 'pro_monthly' }],
    personal_plus: { cycle: 'MONTHLY', value: 19.9, play_product_id: 'personal_plus_monthly' },
    library_plan: { value: 29.9, play_product_id: 'library_plan' },
    student_plus: { cycle: 'MONTHLY', value: 9.9, play_product_id: 'aluno_plus_monthly' },
} as PlanCatalog;

function login(role: string, plan: string) {
    window.localStorage.setItem('user', JSON.stringify({ role, plan_type: plan }));
}

describe('ProUpsell', () => {
    beforeEach(() => {
        window.localStorage.clear();
        vi.mocked(getPlans).mockClear().mockResolvedValue(CATALOG);
        vi.mocked(trackProUpsellClick).mockReset();
        vi.mocked(trackProUpsellView).mockReset();
    });

    it('para o Plus, mostra a diferença de preço e mede visão e clique', async () => {
        const user = userEvent.setup();
        login('personal', 'plus');
        render(
            <ProUpsell feature="agenda" title="A Agenda é do PRO">
                Texto do recurso.
            </ProUpsell>,
        );

        expect(await screen.findByText(/\+ R\$\s?20,00 por mês sobre o seu Plus/)).toBeInTheDocument();
        expect(trackProUpsellView).toHaveBeenCalledWith('agenda', 1);
        const cta = screen.getByRole('link', { name: 'Passar para o PRO' });
        expect(cta).toHaveAttribute('href', '/pagamento?produto=pro');
        await user.click(cta);
        expect(trackProUpsellClick).toHaveBeenCalledWith('agenda', 1);
    });

    it('para o free, convida a conhecer o PRO sem falar de diferença', async () => {
        login('personal', 'free');
        render(<ProUpsell feature="relatorios" variant="cta" />);

        expect(await screen.findByRole('link', { name: 'Conhecer o PRO' })).toBeInTheDocument();
        expect(screen.queryByText(/sobre o seu Plus/)).not.toBeInTheDocument();
        expect(getPlans).not.toHaveBeenCalled();
    });

    it('para o aluno, mostra só o texto: ele não assina o PRO', () => {
        login('student', 'free');
        render(<ProUpsell feature="evolucao_fotos" title="Fotos são do PRO">Texto.</ProUpsell>);

        expect(screen.getByText('Fotos são do PRO')).toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
        expect(trackProUpsellView).not.toHaveBeenCalled();
    });

    it('não aparece para quem já é PRO', () => {
        login('personal', 'pro');
        const { container } = render(<ProUpsell feature="agenda">Texto.</ProUpsell>);
        expect(container).toBeEmptyDOMElement();
    });

    it('a diferença só existe com os dois preços e o PRO mais caro', () => {
        expect(proMonthlyDelta(CATALOG)).toBe(20);
        expect(proMonthlyDelta(null)).toBeUndefined();
    });
});
