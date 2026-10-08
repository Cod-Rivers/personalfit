import { describe, expect, it } from 'vitest';
import {
    authorProgramActions,
    EMPTY_LISTING,
    programFromSource,
    type AdminStoreProgram,
} from './storeService';

function program(patch: Partial<AdminStoreProgram>): AdminStoreProgram {
    return {
        id: 'p1',
        status: 'draft',
        author_can_publish: true,
        venafit_collection: false,
        template_id: 't1',
        source_template_id: 's1',
        listing: { ...EMPTY_LISTING, title: 'Glúteos' },
        days_per_week: 3,
        duration_weeks: 8,
        price_tier: '2990',
        price: 29.9,
        featured: false,
        sales_count: 0,
        version: 1,
        created_at: '2026-10-08T10:00:00Z',
        updated_at: '2026-10-08T10:00:00Z',
        in_review: false,
        ...patch,
    };
}

const REVISION = {
    has_content: true,
    listing: EMPTY_LISTING,
    price_tier: '2990',
    price: 29.9,
    submitted_at: '2026-10-08T10:00:00Z',
};

// Espelha as regras de domain/store/program.go: o que o autor pode fazer em
// cada situação.
describe('authorProgramActions', () => {
    it('rascunho e recusado: reenvio, com o motivo da recusa', () => {
        expect(authorProgramActions(program({})).submitMode).toBe('resubmit');
        const rejected = authorProgramActions(
            program({ status: 'rejected', rejection_reason: 'sem vídeo' }),
        );
        expect(rejected.submitMode).toBe('resubmit');
        expect(rejected.rejection).toBe('sem vídeo');
        expect(rejected.canCancelReview).toBe(false);
    });

    it('em revisão: só cancelar o envio', () => {
        const a = authorProgramActions(
            program({ status: 'pending', in_review: true }),
        );
        expect(a).toMatchObject({
            label: 'Em revisão',
            submitMode: null,
            canCancelReview: true,
            canPause: false,
            canResume: false,
        });
    });

    it('à venda: alteração e pausa; com alteração pendente, só cancelar', () => {
        const live = authorProgramActions(program({ status: 'published' }));
        expect(live).toMatchObject({
            submitMode: 'revision',
            canPause: true,
            canCancelReview: false,
        });

        const pending = authorProgramActions(
            program({
                status: 'published',
                revision: REVISION,
                in_review: true,
            }),
        );
        expect(pending.label).toBe('À venda · alteração em revisão');
        expect(pending.submitMode).toBeNull();
        expect(pending.canCancelReview).toBe(true);

        const lastRejected = authorProgramActions(
            program({
                status: 'published',
                revision_rejection_reason: 'música no vídeo',
            }),
        );
        expect(lastRejected.rejection).toBe('música no vídeo');
    });

    it('pausado: o autor devolve só o que ele pausou', () => {
        expect(
            authorProgramActions(
                program({ status: 'paused', paused_by: 'author' }),
            ).canResume,
        ).toBe(true);
        const team = authorProgramActions(
            program({ status: 'paused', paused_by: 'team' }),
        );
        expect(team.canResume).toBe(false);
        expect(team.label).toBe('Pausado pela equipe');
        expect(team.submitMode).toBe('revision');
    });

    it('encerrado: nada', () => {
        expect(
            authorProgramActions(program({ status: 'retired' })),
        ).toMatchObject({
            submitMode: null,
            canCancelReview: false,
            canPause: false,
            canResume: false,
        });
    });
});

describe('programFromSource', () => {
    it('acha o programa do treino, ignorando o encerrado', () => {
        const retired = program({ id: 'old', status: 'retired' });
        const live = program({ id: 'new', status: 'published' });
        expect(programFromSource([retired, live], 's1')?.id).toBe('new');
        expect(programFromSource([retired], 's1')).toBeUndefined();
        expect(programFromSource([live], 'outro')).toBeUndefined();
    });
});
