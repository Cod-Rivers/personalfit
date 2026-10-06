import { localDateKey } from '@/libs/currentWeek';
import type { StudentPlanSummaryItem } from '@/libs/planningService';

/** Quantos dias antes do término o cartão já avisa "Vence em N dias". */
export const PLAN_EXPIRING_DAYS = 7;

export type StudentPlanStatus =
    | { state: 'none' }
    | { state: 'expired'; endDate: string }
    | { state: 'expiring'; daysLeft: number }
    | { state: 'ok' };

/** Dias de calendário entre duas datas "YYYY-MM-DD" (b - a). */
function daysBetween(a: string, b: string): number {
    const [ay, am, ad] = a.split('-').map(Number);
    const [by, bm, bd] = b.split('-').map(Number);
    return Math.round(
        (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000,
    );
}

/**
 * Situação do treino do aluno no cartão do personal. O término é um dia do
 * calendário: vale até o fim dele, então vence no dia seguinte. `ended` vem
 * do servidor quando o treino saiu do aluno sozinho ("arquivar ao
 * terminar") e não há outro no lugar.
 */
export function studentPlanStatus(
    plan: StudentPlanSummaryItem | undefined,
    today: Date = new Date(),
): StudentPlanStatus {
    if (!plan) return { state: 'none' };
    const end = plan.end_date?.slice(0, 10);
    if (plan.ended) return { state: 'expired', endDate: end ?? '' };
    if (!end) return { state: 'ok' };
    const daysLeft = daysBetween(localDateKey(today), end);
    if (daysLeft < 0) return { state: 'expired', endDate: end };
    if (daysLeft <= PLAN_EXPIRING_DAYS) return { state: 'expiring', daysLeft };
    return { state: 'ok' };
}

/** Sem treino que o aluno veja: o cartão oferece "Montar treino". */
export function needsNewPlan(plan: StudentPlanSummaryItem | undefined): boolean {
    return !plan || !!plan.ended;
}
