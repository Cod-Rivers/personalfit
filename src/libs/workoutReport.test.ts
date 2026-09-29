import { describe, expect, it } from 'vitest';
import {
    attentionSignalLabel,
    canRetryAI,
    formatDelta,
    reportActionLabel,
    reviewStateLabel,
    shortDate,
} from './workoutReport';
import { commentDeliveryState } from './workoutCommentService';

describe('workoutReport', () => {
    it('variação com sinal e igualdade', () => {
        expect(formatDelta(80, 70)).toBe('+10');
        expect(formatDelta(3.2, 4.1, 1)).toBe('−0.9');
        expect(formatDelta(5, 5)).toBe('=');
        expect(formatDelta(undefined, 5)).toBeNull();
    });

    it('só oferece "tentar de novo" quando faz sentido', () => {
        expect(canRetryAI('ia_indisponivel')).toBe(true);
        expect(canRetryAI('teto_do_periodo')).toBe(true);
        expect(canRetryAI('aluno_optou_sair')).toBe(false);
        expect(canRetryAI('poucos_comentarios')).toBe(false);
    });

    it('estado de leitura', () => {
        expect(reviewStateLabel('new', 'ai_pending')).toBe('Gerando');
        expect(reviewStateLabel('new', 'generated')).toBe('Novo');
        expect(reviewStateLabel('decided', 'numbers_only')).toBe('Decidido');
    });

    it('rótulos', () => {
        expect(shortDate('2026-08-12')).toBe('12/08');
        expect(reportActionLabel('trocar_exercicio')).toBe('Trocar exercício');
        expect(attentionSignalLabel('dor')).toBe('Dor recorrente');
    });
});

describe('commentDeliveryState', () => {
    it('enviado → visto → respondido', () => {
        expect(commentDeliveryState({})).toBe('sent');
        expect(commentDeliveryState({ read_at: 'x' })).toBe('seen');
        expect(commentDeliveryState({ read_at: 'x', reply: { at: 'y' } })).toBe('replied');
        expect(commentDeliveryState({ reply: { at: 'y', seen_at: 'z' } })).toBe('reply_seen');
    });
});
