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

    it('does not leak the internal "not legally reviewed" notice to end users', () => {
        render(<PoliticaPrivacidadePage />);
        expect(
            screen.queryByText(/não passou por revisão jurídica/i),
        ).not.toBeInTheDocument();
    });

    // O Google Play reprova a política quando ela não é "abrangente". Uma
    // seção deixada como rascunho ("a preencher") é motivo de reprovação, e
    // já custou uma rejeição de atualização em 31/08/2026.
    it('has no drafting placeholders left in the published text', () => {
        const { container } = render(<PoliticaPrivacidadePage />);
        expect(container.textContent).not.toMatch(/a preencher/i);
    });

    // A política precisa identificar o controlador e oferecer um canal de
    // contato de privacidade — exigência da LGPD (Art. 41) e da revisão da
    // loja.
    it('names the data controller and a working privacy contact', () => {
        const { container } = render(<PoliticaPrivacidadePage />);
        expect(container.textContent).toContain('Riverson Morais');
        const contato = screen.getAllByRole('link', {
            name: 'riversonsmorais@gmail.com',
        });
        expect(contato.length).toBeGreaterThan(0);
        expect(contato[0]).toHaveAttribute(
            'href',
            'mailto:riversonsmorais@gmail.com',
        );
    });

    // Terceiros que recebem dados precisam estar listados nominalmente.
    it('lists every third party that receives user data', () => {
        const { container } = render(<PoliticaPrivacidadePage />);
        for (const operador of [
            'Asaas',
            'Google Play Billing',
            'Firebase Cloud Messaging',
            'MongoDB Atlas',
            'Cloudflare R2',
            'Google Gemini',
            'Google AdSense',
        ]) {
            expect(container.textContent).toContain(operador);
        }
    });
});
