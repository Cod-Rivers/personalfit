import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProgramView from './ProgramView';
import { getStoreProgram, type StoreProgramDetail } from '@/libs/storeService';
import { readStoreSaleRef } from '@/libs/storeSaleRef';

const guard = vi.hoisted(() => ({ loggedIn: true as boolean | null }));
vi.mock('../../_components/useStoreGuard', () => ({
    useStoreGuard: () => ({ ready: true, loggedIn: guard.loggedIn }),
}));
vi.mock('@/components/features/ExerciseThumbnail', () => ({
    default: () => null,
}));
vi.mock('@/libs/storeService', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/libs/storeService')>()),
    getStoreProgram: vi.fn(),
}));

const PROGRAM: StoreProgramDetail = {
    id: 'p1',
    title: 'Glúteos em 8 semanas',
    summary: 'Foco em glúteos, três vezes por semana',
    level: 'iniciante',
    goals: ['gluteos'],
    equipment: 'academia',
    days_per_week: 3,
    duration_weeks: 8,
    price: 49.9,
    price_tier: '4990',
    play_product_id: 'program_4990',
    sales_count: 12,
    rating_avg: 4.7,
    rating_count: 9,
    venafit_collection: false,
    author: { code: 'CARLA', name: 'Carla Souza', cref: 'CREF 012345-G/SP' },
    author_bio: 'Personal há 10 anos.',
    preview: {
        id: 'p1',
        name: 'Glúteos',
        phases: 1,
        duration_weeks: 8,
        days_per_week: 3,
        trainings: [
            {
                reference: 'A',
                exercise_count: 5,
                muscle_groups: ['Glúteos', 'Quadríceps'],
                exercise_names: ['Agachamento livre', 'Elevação pélvica'],
            },
            {
                reference: 'B',
                exercise_count: 4,
                muscle_groups: ['Posterior de coxa'],
            },
        ],
    },
};

describe('/loja/programa/[id]', () => {
    beforeEach(() => {
        window.localStorage.clear();
        window.history.replaceState({}, '', '/loja/programa/p1?ref=CARLA');
        vi.mocked(getStoreProgram).mockReset().mockResolvedValue(PROGRAM);
        guard.loggedIn = true;
    });

    it('mostra a ficha, o autor com CREF e só a prévia; o botão leva ao pagamento do programa', async () => {
        render(<ProgramView id="p1" initial={null} />);

        expect(
            await screen.findByRole('heading', {
                name: 'Glúteos em 8 semanas',
            }),
        ).toBeInTheDocument();
        expect(screen.getAllByText('CREF 012345-G/SP').length).toBeGreaterThan(
            0,
        );
        expect(
            screen.getByText(
                'Iniciante · 3x por semana · 8 semanas · Academia',
            ),
        ).toBeInTheDocument();
        expect(screen.getByText('Treino A')).toBeInTheDocument();
        expect(screen.getByText('5 exercícios')).toBeInTheDocument();
        expect(screen.getByText('Agachamento livre')).toBeInTheDocument();
        expect(screen.getByText('Personal há 10 anos.')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Comprar programa' }),
        ).toHaveAttribute('href', '/pagamento?produto=programa&programId=p1');
        // O ?ref= do link fica guardado para ir junto com a compra.
        expect(readStoreSaleRef()).toBe('CARLA');
    });

    it('programa fora de venda mostra o aviso', async () => {
        const { AxiosError } = await import('axios');
        vi.mocked(getStoreProgram).mockRejectedValue(
            new AxiosError('nf', '404', undefined, undefined, {
                status: 404,
            } as never),
        );
        render(<ProgramView id="p1" initial={null} />);
        expect(
            await screen.findByText('Este programa não está à venda.'),
        ).toBeInTheDocument();
    });
});

describe('/loja/programa/[id] pública (fase 3)', () => {
    beforeEach(() => {
        window.localStorage.clear();
        window.history.replaceState({}, '', '/loja/programa/p1');
        vi.mocked(getStoreProgram).mockReset();
    });

    it('com o programa do servidor, mostra sem buscar de novo, com os comentários verificados', () => {
        render(
            <ProgramView
                id="p1"
                initial={{
                    ...PROGRAM,
                    reviews: [
                        {
                            first_name: 'Ana',
                            stars: 5,
                            comment: 'Senti a diferença em 3 semanas',
                            created_at: '2026-10-08T10:00:00Z',
                            verified: true,
                        },
                    ],
                }}
            />,
        );
        expect(
            screen.getByRole('heading', { name: 'Glúteos em 8 semanas' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Senti a diferença em 3 semanas'),
        ).toBeInTheDocument();
        expect(screen.getByText(/Compra verificada/)).toBeInTheDocument();
        expect(getStoreProgram).not.toHaveBeenCalled();
    });

    it('sem login, a compra passa pelo cadastro e volta ao pagamento', () => {
        guard.loggedIn = false;
        render(<ProgramView id="p1" initial={PROGRAM} />);
        const checkout = encodeURIComponent(
            '/pagamento?produto=programa&programId=p1',
        );
        expect(
            screen.getByRole('link', { name: 'Criar conta e comprar' }),
        ).toHaveAttribute('href', `/cadastro?redirect=${checkout}`);
        expect(
            screen.getByRole('link', { name: 'Já tenho conta: entrar' }),
        ).toHaveAttribute('href', `/?redirect=${checkout}`);
    });

    it('programa que o servidor não achou mostra o aviso', () => {
        render(<ProgramView id="p1" initial={null} initialNotFound />);
        expect(
            screen.getByText('Este programa não está à venda.'),
        ).toBeInTheDocument();
        expect(getStoreProgram).not.toHaveBeenCalled();
    });
});
