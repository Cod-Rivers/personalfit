import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudentPlusCard from './StudentPlusCard';
import {
    cancelStudentPlus,
    getStudentPlusStatus,
    type StudentPlusStatus,
} from '@/libs/paymentService';

/**
 * O card do Aluno Plus em Minha conta é o único lugar onde o aluno cancela a
 * assinatura. Cancelar precisa ser tão fácil quanto assinar (CDC), e a
 * assinatura do Google Play só se cancela pela loja — por isso os estados
 * abaixo são travados em teste.
 */

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/libs/paymentService', () => ({
    getStudentPlusStatus: vi.fn(),
    cancelStudentPlus: vi.fn(),
}));

function status(partial: Partial<StudentPlusStatus>): StudentPlusStatus {
    return {
        active: false,
        eligible: true,
        price: 9.9,
        cycle: 'MONTHLY',
        own_pro: false,
        ...partial,
    };
}

describe('StudentPlusCard', () => {
    beforeEach(() => {
        pushMock.mockClear();
        vi.mocked(getStudentPlusStatus).mockReset();
        vi.mocked(cancelStudentPlus).mockReset();
    });

    it('oferece a assinatura, com o preço do servidor, a quem pode assinar', async () => {
        const user = userEvent.setup();
        vi.mocked(getStudentPlusStatus).mockResolvedValue(status({}));
        render(<StudentPlusCard />);

        const button = await screen.findByRole('button', { name: 'Assinar o Aluno Plus' });
        expect(screen.getByText(/R\$\s?9,90\/mês/)).toBeInTheDocument();
        await user.click(button);
        expect(pushMock).toHaveBeenCalledWith('/pagamento?produto=plus');
    });

    it('com o Plus ativo pelo cartão, cancela e mostra o novo estado', async () => {
        const user = userEvent.setup();
        vi.mocked(getStudentPlusStatus)
            .mockResolvedValueOnce(status({ active: true, status: 'ACTIVE', billing_type: 'CREDIT_CARD' }))
            .mockResolvedValueOnce(status({ active: false, status: 'CANCELED', billing_type: 'CREDIT_CARD' }));
        vi.mocked(cancelStudentPlus).mockResolvedValue();
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        render(<StudentPlusCard />);

        await user.click(await screen.findByRole('button', { name: 'Cancelar assinatura' }));

        await waitFor(() => expect(cancelStudentPlus).toHaveBeenCalled());
        expect(await screen.findByRole('button', { name: 'Assinar o Aluno Plus' })).toBeInTheDocument();
    });

    it('assinatura do Google Play: explica que o cancelamento é pela loja e não oferece o botão', async () => {
        vi.mocked(getStudentPlusStatus).mockResolvedValue(
            status({ active: true, status: 'ACTIVE', billing_type: 'GOOGLE_PLAY' }),
        );
        render(<StudentPlusCard />);

        expect(await screen.findByText(/cancelar, use o app da Play Store/)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Cancelar assinatura' })).toBeNull();
    });

    it('aluno com personal vinculado não recebe oferta de compra', async () => {
        vi.mocked(getStudentPlusStatus).mockResolvedValue(status({ eligible: false }));
        render(<StudentPlusCard />);

        expect(await screen.findByText(/os recursos extras vêm do plano dele/)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Assinar o Aluno Plus' })).toBeNull();
    });

    it('não mostra nada se o status não carregar (offline)', async () => {
        vi.mocked(getStudentPlusStatus).mockRejectedValue(new Error('Network Error'));
        const { container } = render(<StudentPlusCard />);
        await waitFor(() => expect(getStudentPlusStatus).toHaveBeenCalled());
        expect(container).toBeEmptyDOMElement();
    });
});
