import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { captureAcquisitionRef, readAcquisitionRef } from './acquisition';

describe('acquisition — ref de primeiro toque', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('guarda o ?ref= sem espaços e com a caixa original', () => {
        // Código de parceiro é comparado exatamente: "JOAO10" ≠ "joao10".
        captureAcquisitionRef('?ref=  JOAO10 ');
        expect(readAcquisitionRef()).toBe('JOAO10');
    });

    it('ignora a URL sem ref', () => {
        captureAcquisitionRef('?utm_source=instagram');
        expect(readAcquisitionRef()).toBeNull();
    });

    it('vale o PRIMEIRO toque: um segundo link não sobrescreve', () => {
        captureAcquisitionRef('?ref=parceiro_joao');
        captureAcquisitionRef('?ref=share_card');
        expect(readAcquisitionRef()).toBe('parceiro_joao');
    });

    it('corta em 60 caracteres, o mesmo teto do backend', () => {
        captureAcquisitionRef(`?ref=${'a'.repeat(100)}`);
        expect(readAcquisitionRef()).toHaveLength(60);
    });

    it('expira depois de 30 dias e aceita um toque novo', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-09-01T12:00:00Z'));
        captureAcquisitionRef('?ref=antigo');

        vi.setSystemTime(new Date('2026-10-02T12:00:00Z'));
        expect(readAcquisitionRef()).toBeNull();

        captureAcquisitionRef('?ref=novo');
        expect(readAcquisitionRef()).toBe('novo');
    });

    it('storage bloqueado não quebra a página nem o cadastro', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('SecurityError');
        });

        expect(() => captureAcquisitionRef('?ref=x')).not.toThrow();
        expect(readAcquisitionRef()).toBeNull();
    });
});
