import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MinhaContaPage from './page';
import { Api } from '@/libs/api';

const pushMock = vi.fn();
// Real Next.js `useRouter()` returns a stable reference across renders.
// Returning a fresh object on every call would make the page's
// `useEffect(..., [router])` re-fire on every render and loop forever.
const mockRouter = { push: pushMock };

vi.mock('next/navigation', () => ({
    useRouter: () => mockRouter,
}));

vi.mock('@/libs/api', () => ({
    Api: { delete: vi.fn(), get: vi.fn(), patch: vi.fn() },
}));

// jsdom doesn't implement these; the export/download flow relies on them.
const createObjectURLMock = vi.fn(() => 'blob:mock-url');
const revokeObjectURLMock = vi.fn();
URL.createObjectURL = createObjectURLMock;
URL.revokeObjectURL = revokeObjectURLMock;

const storedUser = {
    id: 'user-1',
    name: 'Maria Silva',
    email: 'maria@venafit.com',
    phone: '11987654321',
    cpf: '529.982.247-25',
    role: 'student',
};

describe('MinhaContaPage', () => {
    beforeEach(() => {
        pushMock.mockClear();
        vi.mocked(Api.delete).mockReset();
        vi.mocked(Api.get).mockReset();
        vi.mocked(Api.patch).mockReset();
        createObjectURLMock.mockClear();
        revokeObjectURLMock.mockClear();
        localStorage.clear();
    });

    it('redirects to the home page when there is no logged-in user', () => {
        render(<MinhaContaPage />);
        expect(pushMock).toHaveBeenCalledWith('/');
    });

    it("shows the user's personal data (LGPD Art. 9 - transparency) loaded from the session", () => {
        localStorage.setItem('user', JSON.stringify(storedUser));
        render(<MinhaContaPage />);

        expect(screen.getByText('Maria Silva')).toBeInTheDocument();
        expect(screen.getByText('maria@venafit.com')).toBeInTheDocument();
        expect(screen.getByText('11987654321')).toBeInTheDocument();
        expect(screen.getByText('529.982.247-25')).toBeInTheDocument();
    });

    it('requires an explicit confirmation step before deleting the account', async () => {
        const user = userEvent.setup();
        localStorage.setItem('user', JSON.stringify(storedUser));
        render(<MinhaContaPage />);

        expect(
            screen.queryByText('Confirmar exclusão'),
        ).not.toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: 'Excluir minha conta' }),
        );

        expect(screen.getByText('Confirmar exclusão')).toBeInTheDocument();
        expect(vi.mocked(Api.delete)).not.toHaveBeenCalled();
    });

    it('mentions LGPD anonymization in the confirmation copy so consent is informed', async () => {
        const user = userEvent.setup();
        localStorage.setItem('user', JSON.stringify(storedUser));
        render(<MinhaContaPage />);

        await user.click(
            screen.getByRole('button', { name: 'Excluir minha conta' }),
        );

        expect(
            screen.getByText(/anonimizados\s*conforme a lgpd/i),
        ).toBeInTheDocument();
    });

    it('calls DELETE /me, clears the local session, and redirects on confirmed deletion', async () => {
        const user = userEvent.setup();
        vi.mocked(Api.delete).mockResolvedValueOnce({ status: 204 });
        localStorage.setItem('user', JSON.stringify(storedUser));
        localStorage.setItem('token', 'a-jwt-token');
        render(<MinhaContaPage />);

        await user.click(
            screen.getByRole('button', { name: 'Excluir minha conta' }),
        );
        await user.click(
            screen.getByRole('button', { name: 'Sim, excluir minha conta' }),
        );

        await waitFor(() => {
            expect(Api.delete).toHaveBeenCalledWith('/me');
        });
        expect(localStorage.getItem('user')).toBeNull();
        expect(localStorage.getItem('token')).toBeNull();
        expect(pushMock).toHaveBeenCalledWith('/');
    });

    it('shows an error and keeps the session intact when the deletion request fails', async () => {
        const user = userEvent.setup();
        vi.mocked(Api.delete).mockRejectedValueOnce(new Error('network error'));
        localStorage.setItem('user', JSON.stringify(storedUser));
        localStorage.setItem('token', 'a-jwt-token');
        render(<MinhaContaPage />);

        await user.click(
            screen.getByRole('button', { name: 'Excluir minha conta' }),
        );
        await user.click(
            screen.getByRole('button', { name: 'Sim, excluir minha conta' }),
        );

        expect(
            await screen.findByText('Erro ao excluir conta. Tente novamente.'),
        ).toBeInTheDocument();
        expect(localStorage.getItem('user')).not.toBeNull();
        expect(localStorage.getItem('token')).not.toBeNull();
    });

    it('downloads the data export (LGPD Art. 18, V - portability) when "Baixar meus dados" is clicked', async () => {
        const user = userEvent.setup();
        vi.mocked(Api.get).mockResolvedValueOnce({ data: 'fake-export-content' });
        const clickSpy = vi
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(() => {});
        localStorage.setItem('user', JSON.stringify(storedUser));
        render(<MinhaContaPage />);

        await user.click(
            screen.getByRole('button', { name: 'Baixar meus dados' }),
        );

        await waitFor(() => {
            expect(Api.get).toHaveBeenCalledWith('/me/export', {
                responseType: 'blob',
            });
        });
        expect(createObjectURLMock).toHaveBeenCalled();
        expect(clickSpy).toHaveBeenCalled();
        expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');

        clickSpy.mockRestore();
    });

    it('shows an error when the data export request fails', async () => {
        const user = userEvent.setup();
        vi.mocked(Api.get).mockRejectedValueOnce(new Error('network error'));
        localStorage.setItem('user', JSON.stringify(storedUser));
        render(<MinhaContaPage />);

        await user.click(
            screen.getByRole('button', { name: 'Baixar meus dados' }),
        );

        expect(
            await screen.findByText('Erro ao baixar seus dados. Tente novamente.'),
        ).toBeInTheDocument();
    });

    it('rectifies name, email, and phone (LGPD Art. 18, III) without exposing CPF as editable', async () => {
        const user = userEvent.setup();
        vi.mocked(Api.patch).mockResolvedValueOnce({
            data: {
                id: 'user-1',
                name: 'Maria Souza',
                email: 'maria.souza@venafit.com',
                phone: '11900001111',
                mobile_phone: '',
                updated_at: 'now',
            },
        });
        localStorage.setItem('user', JSON.stringify(storedUser));
        render(<MinhaContaPage />);

        await user.click(screen.getByRole('button', { name: 'Editar' }));
        expect(
            screen.getByText('O CPF não pode ser alterado por aqui.'),
        ).toBeInTheDocument();

        const nameInput = screen.getByLabelText('Nome');
        await user.clear(nameInput);
        await user.type(nameInput, 'Maria Souza');

        await user.click(screen.getByRole('button', { name: 'Salvar' }));

        await waitFor(() => {
            expect(Api.patch).toHaveBeenCalledWith('/me', {
                name: 'Maria Souza',
                email: storedUser.email,
                phone: storedUser.phone,
            });
        });
        expect(await screen.findByText('Maria Souza')).toBeInTheDocument();
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        expect(stored.name).toBe('Maria Souza');
        expect(stored.cpf).toBe(storedUser.cpf);
    });

    it('shows a specific message when the new email is already taken (409)', async () => {
        const user = userEvent.setup();
        vi.mocked(Api.patch).mockRejectedValueOnce({
            response: { status: 409 },
        });
        localStorage.setItem('user', JSON.stringify(storedUser));
        render(<MinhaContaPage />);

        await user.click(screen.getByRole('button', { name: 'Editar' }));
        await user.click(screen.getByRole('button', { name: 'Salvar' }));

        expect(
            await screen.findByText(
                'Este e-mail já está em uso por outra conta.',
            ),
        ).toBeInTheDocument();
    });

    it('discards changes when editing is cancelled', async () => {
        const user = userEvent.setup();
        localStorage.setItem('user', JSON.stringify(storedUser));
        render(<MinhaContaPage />);

        await user.click(screen.getByRole('button', { name: 'Editar' }));
        const nameInput = screen.getByLabelText('Nome');
        await user.clear(nameInput);
        await user.type(nameInput, 'Nome Descartado');

        await user.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(screen.getByText('Maria Silva')).toBeInTheDocument();
        expect(Api.patch).not.toHaveBeenCalled();
    });
});
