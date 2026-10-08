import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PublishProgramModal from './index';
import {
    checkStoreSource,
    createMyStoreProgram,
    EMPTY_LISTING,
    getAuthorStoreMeta,
    submitMyStoreProgram,
    type AdminStoreProgram,
    type AuthorStoreMeta,
} from '@/libs/storeService';

vi.mock('@/components/atoms/HelpTooltip', () => ({ default: () => null }));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@/libs/storeService', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/libs/storeService')>()),
    getAuthorStoreMeta: vi.fn(),
    checkStoreSource: vi.fn(),
    createMyStoreProgram: vi.fn(),
    submitMyStoreProgram: vi.fn(),
}));

const META: AuthorStoreMeta = {
    price_tiers: [
        { id: '2990', value: 29.9, play_product_id: 'library_plan' },
        { id: '4990', value: 49.9, play_product_id: 'program_4990' },
    ],
    levels: [],
    goals: [],
    equipment: [],
    code: 'ANA10',
    can_publish: true,
    cref_verified: true,
    terms_accepted: true,
};

const PUBLISHED: AdminStoreProgram = {
    id: 'p1',
    status: 'published',
    author_can_publish: true,
    venafit_collection: false,
    template_id: 't1',
    source_template_id: 's1',
    listing: { ...EMPTY_LISTING, title: 'Glúteos em 8 semanas' },
    days_per_week: 3,
    duration_weeks: 8,
    price_tier: '2990',
    price: 29.9,
    featured: false,
    sales_count: 4,
    version: 1,
    published_at: '2026-09-01T10:00:00Z',
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
    in_review: false,
};

describe('PublishProgramModal', () => {
    beforeEach(() => {
        vi.mocked(getAuthorStoreMeta).mockReset().mockResolvedValue(META);
        vi.mocked(checkStoreSource).mockReset();
        vi.mocked(createMyStoreProgram).mockReset();
        vi.mocked(submitMyStoreProgram).mockReset();
    });

    it('não envia um treino com problema que bloqueia', async () => {
        vi.mocked(checkStoreSource).mockResolvedValue({
            issues: [
                {
                    code: 'missing_video',
                    severity: 'block',
                    message: 'Prancha (Treino A) está sem vídeo.',
                },
            ],
            blocked: true,
            in_library: false,
        });
        render(
            <PublishProgramModal
                open
                onClose={vi.fn()}
                onDone={vi.fn()}
                template={{ id: 's1', name: 'Glúteos' }}
            />,
        );
        expect(
            await screen.findByText(/Prancha \(Treino A\) está sem vídeo/),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Enviar para revisão' }),
        ).toBeDisabled();
    });

    it('treino da biblioteca pública: só envia confirmando a retirada', async () => {
        const user = userEvent.setup();
        vi.mocked(checkStoreSource).mockResolvedValue({
            issues: [],
            blocked: false,
            in_library: true,
        });
        vi.mocked(createMyStoreProgram).mockResolvedValue({
            ...PUBLISHED,
            status: 'pending',
        });
        const onDone = vi.fn();
        render(
            <PublishProgramModal
                open
                onClose={vi.fn()}
                onDone={onDone}
                template={{ id: 's1', name: 'Glúteos' }}
            />,
        );
        const send = await screen.findByRole('button', {
            name: 'Enviar para revisão',
        });
        expect(send).toBeDisabled();
        await user.click(
            screen.getByRole('checkbox', {
                name: /Tirar este treino da biblioteca pública/,
            }),
        );
        await user.click(send);
        expect(createMyStoreProgram).toHaveBeenCalledWith(
            expect.objectContaining({
                source_template_id: 's1',
                remove_source_from_library: true,
                listing: expect.objectContaining({ title: 'Glúteos' }),
            }),
        );
        expect(onDone).toHaveBeenCalled();
        expect(
            await screen.findByText(/Programa enviado para revisão/),
        ).toBeInTheDocument();
    });

    it('programa à venda: manda a alteração com o conteúdo e a nota', async () => {
        const user = userEvent.setup();
        vi.mocked(checkStoreSource).mockResolvedValue({
            issues: [],
            blocked: false,
            in_library: false,
        });
        vi.mocked(submitMyStoreProgram).mockResolvedValue(PUBLISHED);
        render(
            <PublishProgramModal
                open
                onClose={vi.fn()}
                onDone={vi.fn()}
                program={PUBLISHED}
            />,
        );
        expect(
            await screen.findByText(/continua à venda como está/),
        ).toBeInTheDocument();
        await user.type(
            screen.getByRole('textbox', { name: /O que mudou/ }),
            'troquei o treino B',
        );
        await user.click(
            screen.getByRole('button', { name: 'Enviar alteração' }),
        );
        expect(submitMyStoreProgram).toHaveBeenCalledWith('p1', {
            listing: PUBLISHED.listing,
            price_tier: '2990',
            cover_key: '',
            include_content: true,
            note: 'troquei o treino B',
        });
    });

    it('sem o termo aceito, avisa e não deixa enviar', async () => {
        vi.mocked(getAuthorStoreMeta).mockResolvedValue({
            ...META,
            can_publish: false,
            terms_accepted: false,
        });
        vi.mocked(checkStoreSource).mockResolvedValue({
            issues: [],
            blocked: false,
            in_library: false,
        });
        render(
            <PublishProgramModal
                open
                onClose={vi.fn()}
                onDone={vi.fn()}
                template={{ id: 's1', name: 'Glúteos' }}
            />,
        );
        expect(
            await screen.findByText(/aceite o Termo do Autor no seu painel/),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Enviar para revisão' }),
        ).toBeDisabled();
    });
});
