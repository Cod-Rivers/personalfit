import { describe, expect, it } from 'vitest';
import { pickPrescribedPlanning } from './prescribedPlan';

type P = {
    id: string;
    status: string;
    category?: string;
    start_date?: string;
};

describe('pickPrescribedPlanning', () => {
    it('prefere o plano do personal ao comprado na loja, que vem antes na lista', () => {
        const plans: P[] = [
            {
                id: 'comprado',
                status: 'active',
                category: 'celebrity',
                start_date: '2026-10-01',
            },
            { id: 'personal', status: 'active', start_date: '2026-09-01' },
        ];
        expect(pickPrescribedPlanning(plans)?.id).toBe('personal');
    });

    it('entre planos do personal, o de início mais recente', () => {
        const plans: P[] = [
            { id: 'antigo', status: 'active', start_date: '2026-08-01' },
            { id: 'novo', status: 'active', start_date: '2026-09-15' },
        ];
        expect(pickPrescribedPlanning(plans)?.id).toBe('novo');
    });

    it('sem plano do personal ativo, qualquer ativo', () => {
        const plans: P[] = [
            { id: 'concluido', status: 'completed' },
            { id: 'comprado', status: 'active', category: 'celebrity' },
        ];
        expect(pickPrescribedPlanning(plans)?.id).toBe('comprado');
    });

    it('sem nenhum ativo, o primeiro da lista', () => {
        const plans: P[] = [
            { id: 'rascunho', status: 'draft' },
            { id: 'concluido', status: 'completed' },
        ];
        expect(pickPrescribedPlanning(plans)?.id).toBe('rascunho');
    });

    it('lista vazia', () => {
        expect(pickPrescribedPlanning([])).toBeUndefined();
    });

    it('pula a rotina arquivada, mesmo a mais recente', () => {
        const plans: (P & { archived?: boolean })[] = [
            {
                id: 'arquivada',
                status: 'active',
                start_date: '2026-10-01',
                archived: true,
            },
            { id: 'atual', status: 'active', start_date: '2026-09-01' },
        ];
        expect(pickPrescribedPlanning(plans)?.id).toBe('atual');
    });

    it('só arquivadas: nenhuma para acompanhar', () => {
        const plans: (P & { archived?: boolean })[] = [
            { id: 'arquivada', status: 'active', archived: true },
        ];
        expect(pickPrescribedPlanning(plans)).toBeUndefined();
    });
});
