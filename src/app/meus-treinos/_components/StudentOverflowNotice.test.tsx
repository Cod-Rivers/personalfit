import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const branding: { studentOverflow: unknown } = { studentOverflow: null };
vi.mock('@/context/BrandingContext', () => ({ useBranding: () => branding }));

import StudentOverflowNotice from './StudentOverflowNotice';

describe('StudentOverflowNotice', () => {
    it('sem excedente: nada', () => {
        branding.studentOverflow = null;
        const { container } = render(<StudentOverflowNotice />);
        expect(container.textContent).toBe('');
    });

    it('personal escolhendo: avisa que o aluno pode entrar em espera', () => {
        branding.studentOverflow = {
            status: 'pending',
            until: '2026-12-03T10:00:00Z',
            limit: 3,
        };
        render(<StudentOverflowNotice />);
        expect(
            screen.getByText('Seu personal está escolhendo quem continua'),
        ).toBeTruthy();
    });

    it('em espera: mostra o prazo e que o treino continua', () => {
        branding.studentOverflow = {
            status: 'standby',
            until: '2026-12-03T10:00:00Z',
            limit: 3,
        };
        render(<StudentOverflowNotice />);
        expect(
            screen.getByText(/Seu acompanhamento está em espera até/),
        ).toBeTruthy();
        expect(
            screen.getByText(/Você continua treinando o plano atual/),
        ).toBeTruthy();
    });
});
