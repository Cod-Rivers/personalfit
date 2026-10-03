import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePlanStoreHidden } from './usePlanStoreHidden';

const branding: {
    effectivePlanType: string | null;
    personalName: string | null;
} = { effectivePlanType: null, personalName: null };

vi.mock('@/context/BrandingContext', () => ({
    useBranding: () => branding,
}));

function hidden(hasPersonal: boolean) {
    return renderHook(() => usePlanStoreHidden(hasPersonal)).result.current;
}

describe('usePlanStoreHidden', () => {
    beforeEach(() => {
        branding.effectivePlanType = null;
        branding.personalName = null;
    });

    it('esconde para aluno de personal PRO', () => {
        branding.effectivePlanType = 'pro';
        branding.personalName = 'Riverson';
        expect(hidden(true)).toBe(true);
    });

    it('mostra para aluno de personal free', () => {
        branding.effectivePlanType = 'free';
        branding.personalName = 'Riverson';
        expect(hidden(true)).toBe(false);
    });

    it('mostra para aluno sem personal, mesmo com plano próprio "pro"', () => {
        // Sem personal, effective_plan_type é o plano do próprio aluno — não
        // é "aluno de personal PRO".
        branding.effectivePlanType = 'pro';
        expect(hidden(false)).toBe(false);
    });

    it('sem resposta do /branding: não sabe para quem tem personal', () => {
        expect(hidden(true)).toBeNull();
    });

    it('sem resposta do /branding: mostra para quem não tem personal', () => {
        expect(hidden(false)).toBe(false);
    });

    it('sessão desatualizada: vinculado a um PRO depois do login esconde', () => {
        // has_personal da sessão ainda é false, mas o /branding já traz o
        // personal PRO.
        branding.effectivePlanType = 'pro';
        branding.personalName = 'Riverson';
        expect(hidden(false)).toBe(true);
    });
});
