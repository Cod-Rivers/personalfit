/**
 * Resumo de uma linha das séries registradas de um exercício.
 *
 * Existe para o registro de treino poder mostrar o exercício como uma LINHA em
 * vez de um bloco aberto com quatro campos por série: sem um resumo que diga o
 * que já está preenchido, a linha obrigaria o aluno a abrir cada exercício só
 * para descobrir se precisava mexer nele.
 *
 * As séries chegam pré-preenchidas com o que o personal prescreveu (ver
 * WorkoutLogger), então o resumo quase sempre já tem conteúdo — o aluno só
 * corrige o que saiu diferente.
 */

export interface SeriesEntry {
    reps: number;
    loadKg: number;
}

/** Formata um conjunto de números como valor único ou faixa: [10,10,10] → "10",
 * [8,10,12] → "8-12". Zeros são ignorados: representam "não preenchido". */
function rangeOf(values: number[]): string | null {
    const filled = values.filter((v) => v > 0);
    if (filled.length === 0) return null;
    const min = Math.min(...filled);
    const max = Math.max(...filled);
    return min === max ? String(min) : `${min}-${max}`;
}

/** Remove o zero à esquerda de cargas fracionadas (72.5 → "72,5"). */
function formatLoad(value: number): string {
    return Number.isInteger(value)
        ? String(value)
        : String(value).replace('.', ',');
}

function loadRangeOf(values: number[]): string | null {
    const filled = values.filter((v) => v > 0);
    if (filled.length === 0) return null;
    const min = Math.min(...filled);
    const max = Math.max(...filled);
    return min === max
        ? `${formatLoad(min)} kg`
        : `${formatLoad(min)}-${formatLoad(max)} kg`;
}

/**
 * Ex.: "3 séries · 10 reps · 80 kg", ou "3 séries · 8-12 reps · 60-80 kg"
 * quando o aluno registrou valores diferentes entre as séries.
 */
export function describeSeries(series: SeriesEntry[]): string {
    if (series.length === 0) return 'Nenhuma série';

    const parts = [`${series.length} série${series.length === 1 ? '' : 's'}`];

    const reps = rangeOf(series.map((s) => s.reps));
    if (reps) parts.push(`${reps} reps`);

    const load = loadRangeOf(series.map((s) => s.loadKg));
    if (load) parts.push(load);
    else parts.push('sem carga');

    return parts.join(' · ');
}

/**
 * Quantos exercícios ainda não foram abertos pelo aluno.
 *
 * O progresso NÃO pode ser medido por "tem reps preenchido": as séries já
 * nascem preenchidas com a prescrição, então essa contagem marcaria tudo como
 * pronto no instante em que a tela abre e não informaria nada.
 */
export function reviewProgress(
    totalBlocks: number,
    visited: ReadonlySet<string>,
): string {
    const seen = Math.min(visited.size, totalBlocks);
    if (totalBlocks === 0) return 'Nenhum exercício neste treino';
    if (seen === 0)
        return `${totalBlocks} exercício${totalBlocks === 1 ? '' : 's'} para conferir`;
    if (seen >= totalBlocks) return 'Todos os exercícios conferidos';
    return `${seen} de ${totalBlocks} exercícios conferidos`;
}
