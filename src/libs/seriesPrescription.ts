/**
 * Prescrição de séries em forma editável.
 *
 * Espelha exatamente o mapeamento que o editor de mesociclo usa nos dois
 * sentidos (`responseToLocal` e `localToMesoRequest`, em
 * `app/personal/_shared/periodizacao/lib/mesocycleTransforms.ts`): o que é
 * gravado aqui precisa ser lido de volta lá do mesmo jeito, senão o mesmo
 * exercício apareceria com séries diferentes nas duas telas.
 *
 * Mora em `libs/` — e não junto do editor — porque quem edita é o card do
 * exercício (`components/features/ExerciseDetailCard`), compartilhado com a
 * tela do aluno, e ele não deve importar de dentro da área do personal.
 */

/** reps = séries × repetições · time = séries × segundos · free = texto livre. */
export type SeriesPrescriptionMode = 'reps' | 'time' | 'free';

/** Estado do formulário. Campos ficam como string para casar direto com os
 * inputs, mesmo padrão de LocalExercise no editor. */
export interface SeriesPrescriptionDraft {
    mode: SeriesPrescriptionMode;
    /** Quantidade de séries (modos reps/time). */
    sets: string;
    /** Repetições por série (reps) ou segundos por série (time). */
    value: string;
    /** Texto livre (modo free) — vai para series_label. */
    free: string;
}

/** Recorte de ExerciseRequest que uma edição de séries altera. */
export interface SeriesPrescriptionPatch {
    series: number[];
    /** undefined limpa o texto livre no backend (o campo é omitempty). */
    series_label?: string;
    timed: boolean;
}

/** Fonte mínima aceita — casa tanto com ExerciseResponse quanto com ExerciseLog. */
interface SeriesSource {
    series?: number[];
    series_label?: string;
    timed?: boolean;
}

/** Teto de séries por exercício. Não existe no editor, mas aqui a edição é de
 * um toque só, em cima do treino que o aluno está fazendo: um dedo errado no
 * campo numérico não pode virar uma prescrição de 300 séries. */
export const MAX_SETS = 30;
/** Reps por série, ou segundos por série no modo tempo (~16 min). */
export const MAX_SERIES_VALUE = 999;

export function toSeriesDraft(ex: SeriesSource): SeriesPrescriptionDraft {
    const series = ex.series ?? [];

    if (ex.series_label) {
        return { mode: 'free', sets: '3', value: '10', free: ex.series_label };
    }
    if (ex.timed) {
        return {
            mode: 'time',
            sets: String(series.length || 3),
            value: String(series[0] ?? 30),
            free: '',
        };
    }
    // Séries não-uniformes (ex: 12/10/8) não cabem em "N × M" — viram texto
    // livre, que é o mesmo que o editor faz ao carregar o plano.
    const uniform = series.every((v) => v === series[0]);
    if (!uniform && series.length > 0) {
        return {
            mode: 'free',
            sets: String(series.length),
            value: String(series[0]),
            free: series.join(' × '),
        };
    }
    return {
        mode: 'reps',
        sets: String(series.length || 3),
        value: String(series[0] ?? 10),
        free: '',
    };
}

function clamp(raw: string, min: number, max: number, fallback: number): number {
    const parsed = parseInt(raw.trim(), 10);
    if (Number.isNaN(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
}

export function fromSeriesDraft(
    draft: SeriesPrescriptionDraft,
): SeriesPrescriptionPatch {
    if (draft.mode === 'free') {
        return {
            series: [],
            timed: false,
            series_label: draft.free.trim() || undefined,
        };
    }
    const sets = clamp(draft.sets, 1, MAX_SETS, 1);
    const value = clamp(draft.value, 0, MAX_SERIES_VALUE, 0);
    return {
        series: Array(sets).fill(value),
        timed: draft.mode === 'time',
        // Sair do modo livre precisa APAGAR o texto livre: se ele
        // sobrevivesse, o aluno continuaria vendo o rótulo antigo, que tem
        // prioridade sobre o array de séries na exibição.
        series_label: undefined,
    };
}

/** Texto da prescrição, na mesma forma usada pelos cards de exercício. */
export function formatSeries(ex: SeriesSource): string {
    if (ex.series_label) return ex.series_label;
    const series = ex.series ?? [];
    if (series.length === 0) return '—';
    return ex.timed
        ? series.map((n) => `${n}s`).join(' - ')
        : series.join(' - ');
}

/** Assinatura estável do que uma edição de séries altera. Serve para saber se
 * o valor de fato mudou sem depender da identidade dos objetos/arrays, que os
 * chamadores recriam a cada render. */
export function seriesSignature(ex: SeriesSource): string {
    return [
        (ex.series ?? []).join(','),
        ex.series_label ?? '',
        ex.timed ? '1' : '0',
    ].join('|');
}
