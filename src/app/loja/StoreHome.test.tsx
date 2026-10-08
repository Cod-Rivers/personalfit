import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StoreHome from './StoreHome';
import { listStorePrograms, type StoreProgramCard } from '@/libs/storeService';

const guard = vi.hoisted(() => ({ loggedIn: false as boolean | null }));
vi.mock('./_components/useStoreGuard', () => ({
    useStoreGuard: () => ({ ready: true, loggedIn: guard.loggedIn }),
}));
vi.mock('@/components/features/ExerciseThumbnail', () => ({
    default: () => null,
}));
vi.mock('@/libs/storeService', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/libs/storeService')>()),
    listStorePrograms: vi.fn(),
}));

const CARD: StoreProgramCard = {
    id: 'p1',
    title: 'Glúteos em 8 semanas',
    goals: ['gluteos'],
    days_per_week: 3,
    duration_weeks: 8,
    price: 29.9,
    price_tier: '2990',
    play_product_id: 'library_plan',
    sales_count: 3,
    rating_avg: 0,
    rating_count: 0,
    venafit_collection: false,
    author: { code: 'CARLA', name: 'Carla', cref: 'CREF 012345-G/SP' },
};

describe('/loja pública (fase 3)', () => {
    beforeEach(() => {
        vi.mocked(listStorePrograms).mockReset();
        guard.loggedIn = false;
    });

    it('mostra o que veio do servidor e as coleções, sem buscar de novo e sem o voltar do aluno', () => {
        render(
            <StoreHome
                initialPrograms={[CARD]}
                initialCollections={[
                    {
                        slug: 'para-comecar',
                        title: 'Para começar',
                        programs: [CARD],
                    },
                ]}
            />,
        );
        expect(
            screen.getByRole('heading', { name: 'Para começar' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Ver coleção' }),
        ).toHaveAttribute('href', '/loja/colecao/para-comecar');
        expect(screen.getAllByText('Glúteos em 8 semanas').length).toBe(2);
        expect(listStorePrograms).not.toHaveBeenCalled();
        expect(
            screen.queryByText('Voltar para Meus Treinos'),
        ).not.toBeInTheDocument();
    });
});
