import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import PoliticaPrivacidadePage from './page';

describe('PoliticaPrivacidadePage', () => {
    it('discloses the sensitive health data category (LGPD Art. 9 - transparency)', () => {
        render(<PoliticaPrivacidadePage />);
        expect(
            screen.getByText(/dados de saúde \(dado pessoal sensível\)/i),
        ).toBeInTheDocument();
    });

    it('links to Minha Conta for exercising access, portability, and deletion rights', () => {
        render(<PoliticaPrivacidadePage />);
        const links = screen.getAllByRole('link', { name: 'Minha Conta' });
        expect(links.length).toBeGreaterThan(0);
        for (const link of links) {
            expect(link).toHaveAttribute('href', '/minha-conta');
        }
    });

    it('flags itself as pending legal review so it is not mistaken for a final policy', () => {
        render(<PoliticaPrivacidadePage />);
        expect(
            screen.getByText(/não passou por revisão jurídica/i),
        ).toBeInTheDocument();
    });
});
