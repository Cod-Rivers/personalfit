import type { MacrocycleResponse } from '@/libs/planningService';

type PlanningLike = Pick<
    MacrocycleResponse,
    'status' | 'category' | 'start_date'
>;

function startMs(p: PlanningLike): number {
    const ms = p.start_date ? Date.parse(p.start_date) : NaN;
    return Number.isNaN(ms) ? 0 : ms;
}

/**
 * Plano que o personal acompanha, entre os planos do aluno: o ativo que ele
 * mesmo montou (sem categoria), o de início mais recente. Espelha
 * training.PrescribedActiveMacrocycle do backend.
 *
 * Por que não "o primeiro ativo": desde 2026-10-02 a compra na loja não
 * encerra o plano do personal, então o aluno pode ter também um plano
 * comprado ativo — e ele vem antes na lista, por ser o mais recente.
 *
 * Sem plano do personal ativo, vale qualquer ativo; sem ativo, o primeiro.
 */
export function pickPrescribedPlanning<T extends PlanningLike>(
    plannings: T[],
): T | undefined {
    const prescribed = plannings
        .filter((p) => p.status === 'active' && !p.category)
        .sort((a, b) => startMs(b) - startMs(a))[0];
    return (
        prescribed ??
        plannings.find((p) => p.status === 'active') ??
        plannings[0]
    );
}
