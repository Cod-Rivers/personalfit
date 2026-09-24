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
 * - `series_mode` ('reps' ou 'time') TROCA o modo de todos os exercícios —
 *   inclusive os de texto livre: quem escolhe o modo pediu isso, e o texto
 *   (ex.: pirâmide 12-10-8) fica guardado, só deixa de valer.
 * - `series_reps` é repetições ou, no modo tempo, SEGUNDOS por série. Sem um
 *   modo escolhido só entra nos exercícios em modo reps: num por tempo o
 *   mesmo campo guarda segundos ("20" viraria 20 s de prancha) e num de
 *   texto livre sobrescrever apagaria a progressão que o personal escreveu.
 *
 * Não há teto: 3 × 20 reps, 4 × 50, 3 × 90 s, o que o personal quiser.
 */
export function applyBulkPrescription(
    ex: LocalExercise,
    fields: BulkPrescriptionFields,
): LocalExercise {
    const { series_sets, series_mode, series_reps, ...rest } = fields;
    const next: LocalExercise = { ...ex };
    for (const [key, value] of Object.entries(rest) as [
        keyof typeof rest,
        string,
    ][]) {
        if (value !== '') next[key] = value;
    }
    if (series_sets !== '') next.series_sets = series_sets;
    if (series_mode !== '') {
        next.series_mode = series_mode;
        next.timed = series_mode === 'time';
        if (series_reps !== '') next.series_value = series_reps;
    } else if (series_reps !== '' && ex.series_mode === 'reps') {
        next.series_value = series_reps;
    }
    return next;
}
