/**
 * Nome do treino como o aluno vê: "Segunda · Treino A · Peito e Tríceps".
 *
 * O personal escolhe quais partes entram (dia da semana, letra OU número, nome
 * livre), em qualquer combinação; a ordem de exibição é sempre a de
 * PART_ORDER. Esta é a ÚNICA função que monta esse nome — a tela do aluno, o
 * editor, o /acompanhar e a lista da periodização chamam daqui, para o mesmo
 * treino nunca aparecer com dois nomes diferentes.
 *
 * Espelha internal/domain/training/training-label.go no backend.
 */

export type TrainingLabelPart = 'weekday' | 'letter' | 'number' | 'name';

const PART_ORDER: TrainingLabelPart[] = ['weekday', 'letter', 'number', 'name'];

/** Mesmo limite de MaxTrainingNameLength no backend. */
export const MAX_TRAINING_NAME_LENGTH = 60;

// 0=domingo..6=sábado, a convenção de Date.getDay() e do backend.
const WEEKDAY_NAMES: Record<number, string> = {
    0: 'Domingo',
    1: 'Segunda',
    2: 'Terça',
    3: 'Quarta',
    4: 'Quinta',
    5: 'Sexta',
    6: 'Sábado',
};

export function weekdayName(weekday?: number | null): string | undefined {
    if (weekday === undefined || weekday === null) return undefined;
    return WEEKDAY_NAMES[weekday];
}

/** Opções do seletor de partes, na ordem de exibição. */
export const LABEL_PART_OPTIONS: {
    part: TrainingLabelPart;
    title: string;
    example: string;
}[] = [
    { part: 'weekday', title: 'Dia da semana', example: 'Segunda' },
    { part: 'letter', title: 'Letra', example: 'Treino A' },
    { part: 'number', title: 'Número', example: 'Treino 1' },
    { part: 'name', title: 'Nome livre', example: 'Peito e Tríceps' },
];

/**
 * Descarta repetidos e desconhecidos, ordena, e resolve letra × número (são o
 * mesmo papel: vence a letra). Pode devolver lista vazia — quem salva precisa
 * recusar isso (ver canSaveLabelParts).
 */
export function normalizeLabelParts(
    parts: readonly string[] | undefined | null,
): TrainingLabelPart[] {
    const chosen = new Set(parts ?? []);
    if (chosen.has('letter')) chosen.delete('number');
    return PART_ORDER.filter((p) => chosen.has(p));
}

export function canSaveLabelParts(parts: readonly string[]): boolean {
    return normalizeLabelParts(parts).length > 0;
}

/**
 * Liga/desliga uma parte. Ligar a letra desliga o número e vice-versa — o
 * seletor funciona como caixas de seleção, com essa única exclusão.
 */
export function toggleLabelPart(
    parts: readonly TrainingLabelPart[],
    part: TrainingLabelPart,
): TrainingLabelPart[] {
    if (parts.includes(part)) return parts.filter((p) => p !== part);
    const rival =
        part === 'letter' ? 'number' : part === 'number' ? 'letter' : null;
    return normalizeLabelParts([...parts.filter((p) => p !== rival), part]);
}

/**
 * Partes que valem para o plano. O backend já devolve training_label_parts
 * preenchido, inclusive em planos antigos; o fallback aqui cobre respostas
 * de cache offline gravadas antes do campo existir.
 */
export function labelPartsOf(macro?: {
    training_label_parts?: readonly string[];
    planning_mode?: string;
    simple_day_label?: string;
} | null): TrainingLabelPart[] {
    const parts = normalizeLabelParts(macro?.training_label_parts);
    if (parts.length > 0) return parts;
    if (macro?.planning_mode !== 'simple') return ['letter'];
    return macro?.simple_day_label === 'number' ? ['number'] : ['weekday'];
}

interface LabelableTraining {
    reference?: string;
    weekday?: number | null;
    name?: string;
}

/**
 * Nome por extenso. Uma parte ligada mas vazia (treino sem dia, sem nome) é
 * pulada; se não sobrar nada, cai em "Treino N" para nenhum treino ficar sem
 * identidade.
 */
export function trainingDisplayLabel(
    training: LabelableTraining,
    index: number,
    parts: readonly TrainingLabelPart[],
): string {
    const pieces: string[] = [];
    for (const part of parts) {
        if (part === 'weekday') {
            const day = weekdayName(training.weekday);
            if (day) pieces.push(day);
        } else if (part === 'letter') {
            if (training.reference) pieces.push(`Treino ${training.reference}`);
        } else if (part === 'number') {
            pieces.push(`Treino ${index + 1}`);
        } else if (part === 'name') {
            const name = training.name?.trim();
            if (name) pieces.push(name);
        }
    }
    return pieces.length > 0 ? pieces.join(' · ') : `Treino ${index + 1}`;
}

/** Nome de exemplo para a pré-visualização do seletor de partes. */
export function labelPartsPreview(parts: readonly TrainingLabelPart[]): string {
    return trainingDisplayLabel(
        { reference: 'A', weekday: 1, name: 'Peito e Tríceps' },
        0,
        parts,
    );
}

/** O dia da semana faz parte do nome — o editor mostra o seletor de dia e a
 * tela do aluno destaca o treino de hoje. */
export function showsWeekday(parts: readonly TrainingLabelPart[]): boolean {
    return parts.includes('weekday');
}

/**
 * A letra acompanha a posição dos treinos (ver relabelByPosition) quando é ela,
 * ou o número, que identifica o treino. Quando só o dia identifica, renomear
 * as letras a cada arrasto só geraria renomeação de histórico à toa.
 */
export function relabelsByPosition(
    parts: readonly TrainingLabelPart[],
): boolean {
    return parts.includes('letter') || !parts.includes('weekday');
}
