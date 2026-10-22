import { describe, expect, it } from 'vitest';
import {
    formatPhoneBR,
    leadWhatsappMessage,
    normalizeSlug,
    sourceLabel,
    timeAgo,
} from './leadFunnel';

describe('normalizeSlug', () => {
    it('segue a forma canônica do backend', () => {
        expect(normalizeSlug('João Silva')).toBe('joao-silva');
        expect(normalizeSlug('  Personal_Ana  ')).toBe('personal-ana');
        expect(normalizeSlug('Bia--Fit!!')).toBe('bia-fit');
        expect(normalizeSlug('-treino.com.voce-')).toBe('treino-com-voce');
        expect(normalizeSlug('MARÍLIA Gonçalves 2')).toBe('marilia-goncalves-2');
    });
});

describe('formatPhoneBR', () => {
    it('formata celular e fixo com ou sem 55', () => {
        expect(formatPhoneBR('5521999990000')).toBe('(21) 99999-0000');
        expect(formatPhoneBR('1132654321')).toBe('(11) 3265-4321');
        expect(formatPhoneBR('123')).toBe('123');
    });
});

describe('leadWhatsappMessage', () => {
    it('cita o objetivo e o nome do personal', () => {
        const msg = leadWhatsappMessage(
            { name: 'Ana Souza', goal: 'emagrecer', source: 'page' },
            'João Silva',
        );
        expect(msg).toContain('Oi, Ana!');
        expect(msg).toContain('Aqui é João');
        expect(msg).toContain('quer emagrecer');
    });

    it('cita o desafio quando veio dele', () => {
        const msg = leadWhatsappMessage(
            { name: 'Bia', source: 'challenge', source_ref: '30 dias' },
            'João',
        );
        expect(msg).toContain('desafio "30 dias"');
    });
});

describe('sourceLabel', () => {
    it('nomeia o aluno que indicou', () => {
        expect(
            sourceLabel({ source: 'card', referrer_name: 'Carla' }),
        ).toBe('Indicação de Carla');
        expect(sourceLabel({ source: 'page', source_ref: 'instagram' })).toBe(
            'Sua página (instagram)',
        );
    });
});

describe('timeAgo', () => {
    it('resume o tempo desde o pedido', () => {
        const now = new Date('2026-10-15T15:00:00Z');
        expect(timeAgo('2026-10-15T14:55:00Z', now)).toBe('há 5 min');
        expect(timeAgo('2026-10-15T12:00:00Z', now)).toBe('há 3 h');
        expect(timeAgo('2026-10-13T15:00:00Z', now)).toBe('há 2 dias');
    });
});
