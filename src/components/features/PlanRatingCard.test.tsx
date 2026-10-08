import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PlanRatingCard from './PlanRatingCard';
import { getMyRating, submitRating } from '@/libs/ratingService';

vi.mock('@/libs/ratingService', () => ({
    getMyRating: vi.fn(),
    submitRating: vi.fn(),
}));

describe('PlanRatingCard, comentário na loja (fase 3)', () => {
    beforeEach(() => {
        vi.mocked(getMyRating).mockReset().mockResolvedValue(null);
        vi.mocked(submitRating).mockReset().mockResolvedValue();
    });

    it('plano da loja: o comentário só vai para a página do programa com a autorização', async () => {
        const user = userEvent.setup();
        render(
            <PlanRatingCard
                planId="m1"
                category="celebrity"
                storeProgramId="p1"
            />,
        );
        await user.click(
            await screen.findByRole('radio', { name: '5 estrelas' }),
        );
        await user.type(
            screen.getByPlaceholderText('Comentário (opcional)'),
            'Muito bom',
        );
        await user.click(
            screen.getByRole('checkbox', {
                name: /Mostrar meu comentário na página do programa/,
            }),
        );
        await user.click(
            screen.getByRole('button', { name: 'Enviar avaliação' }),
        );
        expect(submitRating).toHaveBeenCalledWith({
            target_id: 'm1',
            target_type: 'macrocycle',
            stars: 5,
            comment: 'Muito bom',
            public_consent: true,
        });
    });

    it('mostra a situação da moderação do comentário enviado', async () => {
        vi.mocked(getMyRating).mockResolvedValue({
            id: 'r1',
            target_id: 'm1',
            target_type: 'macrocycle',
            stars: 4,
            comment: 'Bom',
            created_at: '2026-10-08T10:00:00Z',
            public: true,
            moderation: 'pending',
        });
        render(
            <PlanRatingCard
                planId="m1"
                category="celebrity"
                storeProgramId="p1"
            />,
        );
        expect(
            await screen.findByText(
                /aparece na página do programa depois da revisão/,
            ),
        ).toBeInTheDocument();
    });

    it('plano que não é da loja: sem a opção de publicar', async () => {
        render(<PlanRatingCard planId="m1" />);
        await screen.findByRole('radio', { name: '5 estrelas' });
        expect(
            screen.queryByRole('checkbox', {
                name: /Mostrar meu comentário/,
            }),
        ).not.toBeInTheDocument();
    });
});
