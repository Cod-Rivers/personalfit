import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './page';
import {
    getMyAuthorApplication,
    submitAuthorApplication,
    type AuthorApplication,
} from '@/libs/storeService';

const guard = vi.hoisted(() => ({ role: 'personal' as string | null }));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@/libs/session', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/libs/session')>()),
    getToken: () => (guard.role ? 'token' : null),
    getUser: () => (guard.role ? { id: 'u1', role: guard.role } : null),
}));
vi.mock('@/libs/storeService', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/libs/storeService')>()),
    getMyAuthorApplication: vi.fn(),
    submitAuthorApplication: vi.fn(),
}));

const PENDING: AuthorApplication = {
    id: 'a1',
    status: 'pending',
    public_name: 'Ana Treinos',
    cref: '012345-G',
    cref_state: 'SP',
    specialties: [],
    pitch: 'Hipertrofia para iniciantes',
    created_at: '2026-10-08T12:00:00Z',
};

describe('/loja/vender', () => {
    beforeEach(() => {
        guard.role = 'personal';
        vi.mocked(getMyAuthorApplication).mockReset();
        vi.mocked(submitAuthorApplication).mockReset();
    });

    it('aluno vê o aviso, sem formulário', () => {
        guard.role = 'student';
        render(<Page />);
        expect(
            screen.getByText(/A candidatura é feita com uma conta de personal/),
        ).toBeInTheDocument();
        expect(getMyAuthorApplication).not.toHaveBeenCalled();
    });

    it('envia a candidatura com as especialidades em lista e mostra a análise', async () => {
        const user = userEvent.setup();
        vi.mocked(getMyAuthorApplication)
            .mockResolvedValueOnce({
                application: null,
                is_author: false,
                is_partner: false,
            })
            .mockResolvedValueOnce({
                application: PENDING,
                is_author: false,
                is_partner: false,
            });
        vi.mocked(submitAuthorApplication).mockResolvedValue(PENDING);
        render(<Page />);

        await user.type(
            await screen.findByRole('textbox', { name: /Nome público/ }),
            'Ana Treinos',
        );
        await user.type(
            screen.getByRole('textbox', { name: /^CREF/ }),
            '12345-G',
        );
        await user.selectOptions(
            screen.getByRole('combobox', { name: /UF do CREF/ }),
            'SP',
        );
        await user.type(
            screen.getByRole('textbox', { name: /O que você pretende vender/ }),
            'Hipertrofia para iniciantes',
        );
        await user.type(
            screen.getByRole('textbox', { name: /Especialidades/ }),
            'Hipertrofia, glúteos, ',
        );
        await user.click(
            screen.getByRole('button', { name: 'Enviar candidatura' }),
        );

        expect(submitAuthorApplication).toHaveBeenCalledWith(
            expect.objectContaining({
                public_name: 'Ana Treinos',
                cref: '12345-G',
                cref_state: 'SP',
                specialties: ['Hipertrofia', 'glúteos'],
            }),
        );
        expect(
            await screen.findByText('Candidatura em análise'),
        ).toBeInTheDocument();
    });

    it('código já usado: explica e mantém o formulário', async () => {
        const user = userEvent.setup();
        vi.mocked(getMyAuthorApplication).mockResolvedValue({
            application: null,
            is_author: false,
            is_partner: false,
        });
        vi.mocked(submitAuthorApplication).mockRejectedValue(
            new AxiosError('conflict', '409', undefined, undefined, {
                status: 409,
                data: { error: 'x', code: 'referral_code_taken' },
            } as AxiosResponse),
        );
        render(<Page />);

        await user.type(
            await screen.findByRole('textbox', { name: /Nome público/ }),
            'Ana',
        );
        await user.type(screen.getByRole('textbox', { name: /^CREF/ }), '1-G');
        await user.selectOptions(
            screen.getByRole('combobox', { name: /UF do CREF/ }),
            'RJ',
        );
        await user.type(
            screen.getByRole('textbox', { name: /O que você pretende vender/ }),
            'Programas de corrida para iniciantes',
        );
        await user.click(
            screen.getByRole('button', { name: 'Enviar candidatura' }),
        );
        expect(
            await screen.findByText(/Esse código já é de outro parceiro/),
        ).toBeInTheDocument();
    });

    it('conta que já é autora vai para o painel e a biblioteca', async () => {
        vi.mocked(getMyAuthorApplication).mockResolvedValue({
            application: { ...PENDING, status: 'approved' },
            is_author: true,
            is_partner: true,
        });
        render(<Page />);
        expect(
            await screen.findByText('Você já é autor da loja'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Minha biblioteca' }),
        ).toHaveAttribute('href', '/personal?tab=ciclos');
    });
});

describe('/loja/vender sem login (fase 3)', () => {
    it('explica e leva ao cadastro de personal, voltando para a candidatura', () => {
        guard.role = null;
        vi.mocked(getMyAuthorApplication).mockReset();
        render(<Page />);
        expect(
            screen.getByRole('link', { name: 'Criar conta de personal' }),
        ).toHaveAttribute('href', '/cadastro?redirect=%2Floja%2Fvender');
        expect(screen.getByText(/70% do líquido/)).toBeInTheDocument();
        expect(getMyAuthorApplication).not.toHaveBeenCalled();
    });
});
