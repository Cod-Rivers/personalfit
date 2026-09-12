import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExcluirContaPage from './page';

// A página é um Server Component estático, mas embute o formulário client.
// O formulário só é exercitado aqui como "existe e aponta para o lugar
// certo" — o comportamento dele (envio, erro, rate limit) é do backend.
vi.mock('@/libs/api', () => ({ Api: { post: vi.fn() } }));

// Estes testes existem para travar os requisitos da política de exclusão de
// dados do Google Play, que é o que mantém o app publicado: a URL precisa
// identificar o app, aceitar um pedido de exclusão sem login, e dizer o que é
// apagado, o que é retido e por quanto tempo. Perder qualquer um desses
// pedaços num refactor reprova a próxima versão na loja.
describe('ExcluirContaPage', () => {
    it('identifies the app and the developer, as the store review requires', () => {
        const { container } = render(<ExcluirContaPage />);
        expect(container.textContent).toContain('Venafit');
        expect(container.textContent).toContain('Riverson Morais');
    });

    it('offers a deletion request channel that needs no login', () => {
        render(<ExcluirContaPage />);
        expect(
            screen.getByLabelText(/e-mail cadastrado/i),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /pedir exclusão/i }),
        ).toBeInTheDocument();
    });

    it('explains the in-app deletion path as well', () => {
        const { container } = render(<ExcluirContaPage />);
        expect(container.textContent).toContain('Minha Conta');
        expect(container.textContent).toMatch(/zona de perigo/i);
    });

    it('states what is deleted and what is retained, with the retention period', () => {
        const { container } = render(<ExcluirContaPage />);
        const text = container.textContent ?? '';
        expect(text).toMatch(/o que é apagado/i);
        expect(text).toMatch(/anamnese/i);
        // Prazos e base legal de cada retenção.
        expect(text).toContain('5 anos');
        expect(text).toContain('Lei 9.249/95');
        expect(text).toContain('6 meses');
        expect(text).toMatch(/marco civil/i);
    });

    it('warns that deleting the account does not cancel the subscription', () => {
        const { container } = render(<ExcluirContaPage />);
        expect(container.textContent).toMatch(
            /não cancela sua assinatura/i,
        );
    });

    it('links to the privacy policy', () => {
        render(<ExcluirContaPage />);
        expect(
            screen.getByRole('link', { name: /política de privacidade/i }),
        ).toHaveAttribute('href', '/politica-privacidade');
    });

    it('has no drafting placeholders left in the published text', () => {
        const { container } = render(<ExcluirContaPage />);
        expect(container.textContent).not.toMatch(/a preencher|lorem ipsum/i);
    });
});
