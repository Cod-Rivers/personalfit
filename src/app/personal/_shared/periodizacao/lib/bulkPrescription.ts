import type { BulkPrescriptionFields } from '../components/fields/PrescriptionFields';
import type { LocalExercise } from './mesocycleTransforms';

/**
 * Aplica a Prescrição geral a UM exercício do treino. Só o que foi
 * preenchido muda; o que ficou em branco fica como está.
 *
 * Séries e repetições não são cópia direta de campo:
 *
 * - `series_sets` vale para qualquer modo (3 × 10 reps, 3 × 30 s, ou a
 *   contagem opcional do texto livre).
 * - `series_reps` só entra nos exercícios em modo reps. Num exercício por
 *   tempo o mesmo campo guarda SEGUNDOS (series_value) — "20" viraria 20 s
 *   de prancha; num de texto livre ("12-10-8", pirâmide) sobrescrever
 *   apagaria a progressão que o personal escreveu. Esses ficam como estão.
 *
 * Não há teto de repetições: 3 × 20, 4 × 50, o que o personal quiser.
 */
export function applyBulkPrescription(
    ex: LocalExercise,
    fields: BulkPrescriptionFields,
): LocalExercise {
    const { series_sets, series_reps, ...rest } = fields;
    const next: LocalExercise = { ...ex };
    for (const [key, value] of Object.entries(rest) as [
        keyof typeof rest,
        string,
    ][]) {
        if (value !== '') next[key] = value;
    }
    if (series_sets !== '') next.series_sets = series_sets;
    if (series_reps !== '' && ex.series_mode === 'reps') {
        next.series_value = series_reps;
    }
    return next;
}
