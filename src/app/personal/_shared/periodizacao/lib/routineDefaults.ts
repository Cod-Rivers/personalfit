/**
 * Valores que a tela "Nova rotina" já traz preenchidos, para o personal só
 * confirmar: nome, início e término. Lógica pura (sem React), testada em
 * routineDefaults.test.ts.
 */

import { localDateKey } from '@/libs/currentWeek';

export type PlanningMode = 'simple' | 'periodized';

const MONTHS = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
];

/** Como cada modo se chama para o personal. "Rotina" é o termo da ficha de
 * academia; macrociclo/mesociclo só aparecem dentro da periodização. */
export function planKindLabel(mode: PlanningMode | undefined): string {
    return mode === 'simple' ? 'Rotina' : 'Periodização';
}

/** "Rotina de outubro", "Periodização de outubro". */
export function defaultPlanName(mode: PlanningMode, today: Date): string {
    return `${planKindLabel(mode)} de ${MONTHS[today.getMonth()]}`;
}

/** Atalhos de duração oferecidos no formulário. */
export const DURATION_SHORTCUTS_WEEKS = [4, 8, 12] as const;

/**
 * Término de uma rotina de `weeks` semanas que começa em `startKey`
 * ("YYYY-MM-DD"), contando o dia do início: 4 semanas a partir de uma segunda
 * terminam num domingo. Data civil local, nunca UTC.
 */
export function endDateForWeeks(startKey: string, weeks: number): string {
    const [y, m, d] = startKey.slice(0, 10).split('-').map(Number);
    return localDateKey(new Date(y, m - 1, d + weeks * 7 - 1));
}

/** Quantas semanas cheias cabem entre início e término, se for um dos
 * atalhos — para o chip correspondente aparecer marcado. */
export function matchingShortcut(
    startKey: string,
    endKey: string,
): number | null {
    if (!startKey || !endKey) return null;
    for (const weeks of DURATION_SHORTCUTS_WEEKS) {
        if (endDateForWeeks(startKey, weeks) === endKey.slice(0, 10)) {
            return weeks;
        }
    }
    return null;
}
