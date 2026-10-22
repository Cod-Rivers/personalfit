import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import ResultCardView from './ResultCardView';
import { readStoreEntryPoint } from '@/libs/storeSaleRef';
import { formatDelta, type ResultCard } from '@/libs/resultService';

const base: ResultCard = {
    id: '0123456789abcdef01234567',
    display_name: 'Ana',
    caption: 'Treinei 3x por semana',
    goal: 'emagrecimento',
    weeks_between: 12,
    before_url: 'https://cdn.test/a.jpg',
    after_url: 'https://cdn.test/b.jpg',
    before_date: '2026-06-01',
    after_date: '2026-08-24',
    stats: { weight_delta_kg: -6.5, measurements: { cintura: -8 } },
    verified: true,
    workouts_logged: 34,
    adherence_pct: 94,
    program: { id: 'fedcba9876543210fedcba98', title: 'Escada 9 Meses' },
    cheers_count: 3,
};

describe('ResultCardView', () => {
    beforeEach(() => window.localStorage.clear());

    it('mostra selo, números com sinal tipográfico e o programa', () => {
        render(<ResultCardView result={base} />);
        expect(screen.getByText(/Resultado verificado/)).toBeInTheDocument();
        // O normalizador do Testing Library troca o espaço fino por espaço comum.
        expect(screen.getByText('−6,5 kg')).toBeInTheDocument();
        expect(screen.getByText('Cintura')).toBeInTheDocument();
        expect(screen.getByText(/34 treinos registrados · 94% do plano/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Feito com: Escada 9 Meses/ })).toHaveAttribute(
            'href',
            '/loja/programa/fedcba9876543210fedcba98',
        );
    });

    it('o link do programa guarda a origem "mural:<id>" para a compra', async () => {
        const user = userEvent.setup();
        render(<ResultCardView result={base} />);
        const link = screen.getByRole('link', { name: /Feito com/ });
        link.addEventListener('click', (e) => e.preventDefault());
        await user.click(link);
        expect(readStoreEntryPoint()).toBe(`mural:${base.id}`);
    });

    it('sem programa e sem selo: nada de link da loja', () => {
        render(<ResultCardView result={{ ...base, program: undefined, verified: false, stats: {} }} />);
        expect(screen.queryByText(/Resultado verificado/)).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Feito com/ })).not.toBeInTheDocument();
    });

    it('na página do programa, esconde o link dele', () => {
        render(<ResultCardView result={base} hideProgram />);
        expect(screen.queryByRole('link', { name: /Feito com/ })).not.toBeInTheDocument();
    });
});

describe('formatDelta', () => {
    it('usa sinal de menos tipográfico, vírgula e espaço fino antes da unidade', () => {
        expect(formatDelta(-6.5, 'kg')).toBe('−6,5 kg');
        expect(formatDelta(1.25, 'cm')).toBe('+1,3 cm');
        expect(formatDelta(0, 'kg')).toBe('0 kg');
    });
});
