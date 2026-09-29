import { describe, expect, it } from 'vitest';
import type { LoadHistoryResponse } from '@/libs/loadHistory';
import {
    EMPTY_COMMENT_DRAFT,
    buildCommentPromptContext,
    daysUntilExpiry,
    describeCommentFacts,
    isCommentDraftEmpty,
    shouldNudge,
    toCommentRequest,
    toggleRegion,
    toggleTag,
    workoutCommentPrompt,
    type CommentPromptContext,
} from './workoutComment';

const base: CommentPromptContext = {
    personalName: 'Ana',
    recordExercise: null,
    avgRpe: null,
    daysSinceLastWorkout: null,
    firstTimeExercise: null,
    late: false,
};

describe('workoutCommentPrompt', () => {
    it('segue a prioridade: recorde vence tudo', () => {
        expect(
            workoutCommentPrompt({ ...base, recordExercise: 'Supino', avgRpe: 10, late: true }),
        ).toBe('Bateu recorde no Supino! Conta pra Ana como foi.');
    });

    it('treino puxado com RPE médio 9 ou mais', () => {
        expect(workoutCommentPrompt({ ...base, avgRpe: 9, daysSinceLastWorkout: 10 })).toBe(
            'Treino puxado. Deu tudo certo? Conta pra Ana.',
        );
    });

    it('volta depois de 7 dias', () => {
        expect(workoutCommentPrompt({ ...base, daysSinceLastWorkout: 7, firstTimeExercise: 'Remo' })).toBe(
            'Bem-vindo de volta! Como foi retomar?',
        );
    });

    it('exercício novo antes do tardio', () => {
        expect(workoutCommentPrompt({ ...base, firstTimeExercise: 'Remo', late: true })).toBe(
            'Primeira vez no Remo. O que achou?',
        );
    });

    it('tardio', () => {
        expect(workoutCommentPrompt({ ...base, late: true })).toContain('depois do prazo');
    });

    it('padrão, com e sem nome, sem artigo', () => {
        expect(workoutCommentPrompt(base)).toBe('Como foi o treino? Ana lê todos os comentários.');
        expect(workoutCommentPrompt({ ...base, personalName: null })).toBe(
            'Como foi o treino? Seu personal lê todos os comentários.',
        );
    });
});

describe('rascunho do comentário', () => {
    it('vazio não vai no corpo da sessão', () => {
        expect(isCommentDraftEmpty(EMPTY_COMMENT_DRAFT)).toBe(true);
        expect(toCommentRequest({ ...EMPTY_COMMENT_DRAFT, text: '   ' })).toBeUndefined();
    });

    it('um toque num chip já é comentário', () => {
        expect(toCommentRequest(toggleTag(EMPTY_COMMENT_DRAFT, 'gostei'))).toEqual({ tags: ['gostei'] });
    });

    it('região só vai junto de dor, e tirar a dor apaga as regiões', () => {
        let d = toggleTag(EMPTY_COMMENT_DRAFT, 'dor');
        d = toggleRegion(d, 'joelho');
        expect(toCommentRequest(d)).toEqual({ tags: ['dor'], pain_regions: ['joelho'] });
        d = toggleTag(d, 'dor');
        expect(d.painRegions).toEqual([]);
    });

    it('corta o texto em 1000 caracteres', () => {
        const req = toCommentRequest({ ...EMPTY_COMMENT_DRAFT, text: 'a'.repeat(1200), feeling: 4 });
        expect(req?.text).toHaveLength(1000);
        expect(req?.feeling).toBe(4);
    });
});

describe('buildCommentPromptContext', () => {
    const history: LoadHistoryResponse = {
        mesocycles: [],
        exercises: [
            {
                exercise_key: 'name:supino reto',
                name: 'Supino reto',
                metric: 'load',
                summary: {
                    sessions_count: 3,
                    first: { date: '2026-09-01', top_load_kg: 40, top_reps: 10, e1rm: 53.3, max_reps: 10 },
                    last: { date: '2026-09-10', top_load_kg: 45, top_reps: 8, e1rm: 57, max_reps: 8 },
                    record_e1rm: { date: '2026-09-10', top_load_kg: 45, top_reps: 8, e1rm: 57, max_reps: 8 },
                    record_load: { date: '2026-09-10', top_load_kg: 45, top_reps: 8, e1rm: 57, max_reps: 8 },
                },
            },
        ],
    };

    it('acha recorde, exercício novo, RPE e a pausa', () => {
        const ctx = buildCommentPromptContext(
            [
                { exerciseId: '1', name: 'Supino reto', sets: [{ reps: 8, loadKg: 50 }] },
                { exerciseId: '2', name: 'Remada curvada', sets: [{ reps: 10, loadKg: 30 }] },
            ],
            [8, 9, 0],
            history,
            'Ana',
            new Date(2026, 8, 20),
        );
        expect(ctx.recordExercise).toBe('Supino reto');
        expect(ctx.firstTimeExercise).toBe('Remada curvada');
        expect(ctx.avgRpe).toBe(8.5);
        expect(ctx.daysSinceLastWorkout).toBe(10);
    });

    it('sem histórico (offline, aparelho novo) não inventa nada', () => {
        const ctx = buildCommentPromptContext([], [], null, null);
        expect(ctx).toMatchObject({ recordExercise: null, firstTimeExercise: null, daysSinceLastWorkout: null, avgRpe: null });
    });
});

describe('lembrete leve', () => {
    const now = new Date('2026-09-28T12:00:00Z');
    it('só depois de 3 treinos sem comentário', () => {
        expect(shouldNudge({ emptyStreak: 2 }, now)).toBe(false);
        expect(shouldNudge({ emptyStreak: 3 }, now)).toBe(true);
    });
    it('no máximo um por semana', () => {
        expect(shouldNudge({ emptyStreak: 5, lastNudgeAt: '2026-09-25T12:00:00Z' }, now)).toBe(false);
        expect(shouldNudge({ emptyStreak: 5, lastNudgeAt: '2026-09-20T12:00:00Z' }, now)).toBe(true);
    });
});

describe('rótulos', () => {
    it('descreve dor com regiões', () => {
        expect(describeCommentFacts(['dor', 'carga_leve'], ['joelho'])).toBe('Senti dor (joelho) · Carga leve');
    });
    it('dias até expirar', () => {
        expect(daysUntilExpiry('2026-10-01T12:00:00Z', new Date('2026-09-28T12:00:00Z'))).toBe(3);
        expect(daysUntilExpiry('2026-09-01T12:00:00Z', new Date('2026-09-28T12:00:00Z'))).toBe(0);
    });
});
