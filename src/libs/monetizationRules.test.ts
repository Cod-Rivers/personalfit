import { describe, expect, it } from 'vitest';
import { shouldShowAds } from './adsense';
import { daysUntil } from './paymentService';
import { PDF_IMPORT_LIMITS, pdfImportMonthlyLimit } from './trainingPdfImportService';

/**
 * Regras puras da divisão Free × PRO × Aluno Plus
 * (Todo/PLANO_MONETIZACAO_FREE_PRO.md). O backend é quem decide de verdade;
 * estas cópias só evitam a tela oferecer o que vai dar 403 ou mostrar anúncio
 * para quem pagou para não ver.
 */

describe('shouldShowAds', () => {
    it('não mostra enquanto o plano não carregou', () => {
        expect(shouldShowAds(null)).toBe(false);
    });

    it('mostra para o plano free e esconde para o PRO efetivo', () => {
        expect(shouldShowAds('free')).toBe(true);
        expect(shouldShowAds('pro')).toBe(false);
    });

    it('Aluno Plus não vê anúncio, mesmo sem o PRO efetivo', () => {
        // O Plus não vira "pro" no effectivePlanType — isso liberaria recursos
        // do PRO do personal que ele não inclui.
        expect(shouldShowAds('free', true)).toBe(false);
    });
});

describe('daysUntil', () => {
    const now = Date.parse('2026-09-27T12:00:00Z');

    it('arredonda para cima o que falta', () => {
        expect(daysUntil('2026-10-11T12:00:00Z', now)).toBe(14);
        expect(daysUntil('2026-09-27T13:00:00Z', now)).toBe(1);
    });

    it('vencido ou ausente é zero', () => {
        expect(daysUntil('2026-09-26T12:00:00Z', now)).toBe(0);
        expect(daysUntil(undefined, now)).toBe(0);
    });
});

describe('pdfImportMonthlyLimit', () => {
    it('espelha os tetos do backend, reduzidos à metade (3 + 3 → 2 + 1)', () => {
        expect(PDF_IMPORT_LIMITS.fromPersonal + PDF_IMPORT_LIMITS.self).toBe(3);
    });

    it('personal importando para o aluno usa o teto do personal', () => {
        expect(pdfImportMonthlyLimit({ byPersonal: true, studentPlus: true })).toBe(2);
    });

    it('auto-importação: 1 no gratuito, 2 com o Aluno Plus', () => {
        expect(pdfImportMonthlyLimit({ byPersonal: false, studentPlus: false })).toBe(1);
        expect(pdfImportMonthlyLimit({ byPersonal: false, studentPlus: true })).toBe(2);
    });
});
