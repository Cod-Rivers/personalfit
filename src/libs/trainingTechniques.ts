/**
 * Catálogo de técnicas de treinamento avançadas, aplicáveis a um exercício
 * dentro de um treino. Fonte única usada pelo editor do personal
 * (TrainingsEditor) e pela exibição ao aluno (ExerciseDetailCard) — evita
 * duplicar labels/regras nos dois lugares.
 *
 * Os 5 campos genéricos (rounds/round_reduction_pct/pause_seconds/extra_reps/
 * hold_seconds) espelham training.TechniqueParams no backend e são
 * reaproveitados com significado diferente por técnica — por isso cada
 * technique declara só os campos que faz sentido exibir, com seu próprio
 * label/unidade/limites.
 *
 * Técnicas com fields: [] (negativas, superlento, GVT) não precisam de
 * parâmetro extra: já são bem representadas pelos campos de prescrição
 * existentes (Cadência, Séries, % de 1RM, Descanso) — a técnica funciona só
 * como rótulo/instrução para o aluno.
 *
 * Escopo desta feature (decisão consciente, não pendência — ver
 * Todo/TAREFAS_PENDENTES.md > Concluídas > "Técnicas de treinamento
 * avançadas", 2026-08-01):
 * - Só o sistema de macrociclo/periodização usa este catálogo. O sistema
 *   legado `trainingprotocol` (templates admin/anamnese) não recebeu
 *   Technique/TechniqueParams/GroupTechnique.
 * - WorkoutLogger não registra sub-série estruturada (ex: cada "queda" de um
 *   dropset) — o aluno só vê a técnica como badge/instrução aqui e em
 *   ExerciseDetailCard; o registro de série continua 1 linha por série.
 * - Progressão de carga por série em pirâmide/onda não é um array
 *   estruturado — continua em texto livre (SeriesLabel/Comments).
 */

export type TechniqueParamKey =
    | 'rounds'
    | 'round_reduction_pct'
    | 'pause_seconds'
    | 'extra_reps'
    | 'hold_seconds';

export interface TechniqueParamField {
    key: TechniqueParamKey;
    /** Label do input no editor do personal. */
    label: string;
    /** Rótulo curto usado no resumo/badge (ex: "3 reduções"). */
    shortLabel: string;
    unit: string;
    min: number;
    max: number;
}

export interface TechniqueDefinition {
    label: string;
    category: string;
    fields: TechniqueParamField[];
}

export const TECHNIQUE_CATEGORIES = [
    'Alta intensidade & falha muscular',
    'Fases da contração & tempo',
    'Pirâmide & organização de carga',
    'Métodos específicos',
] as const;

export const TECHNIQUE_CATALOG: Record<string, TechniqueDefinition> = {
    dropset: {
        label: 'Dropset',
        category: 'Alta intensidade & falha muscular',
        fields: [
            {
                key: 'rounds',
                label: 'Nº de reduções',
                shortLabel: 'reduções',
                unit: '',
                min: 1,
                max: 10,
            },
            {
                key: 'round_reduction_pct',
                label: '% de redução por queda',
                shortLabel: 'de redução por queda',
                unit: '%',
                min: 1,
                max: 90,
            },
        ],
    },
    rest_pause: {
        label: 'Rest-pause',
        category: 'Alta intensidade & falha muscular',
        fields: [
            {
                key: 'pause_seconds',
                label: 'Pausa entre mini-séries',
                shortLabel: 'de pausa',
                unit: 'seg',
                min: 1,
                max: 60,
            },
            {
                key: 'extra_reps',
                label: 'Meta de reps extras',
                shortLabel: 'reps extras',
                unit: 'reps',
                min: 1,
                max: 50,
            },
        ],
    },
    forced_reps: {
        label: 'Repetições forçadas',
        category: 'Alta intensidade & falha muscular',
        fields: [
            {
                key: 'extra_reps',
                label: 'Reps assistidas extras',
                shortLabel: 'reps assistidas',
                unit: 'reps',
                min: 1,
                max: 20,
            },
        ],
    },
    partial_reps: {
        label: 'Repetições parciais',
        category: 'Alta intensidade & falha muscular',
        fields: [
            {
                key: 'extra_reps',
                label: 'Reps parciais extras',
                shortLabel: 'reps parciais',
                unit: 'reps',
                min: 1,
                max: 30,
            },
        ],
    },
    eccentric: {
        label: 'Negativas (excêntrico)',
        category: 'Fases da contração & tempo',
        fields: [],
    },
    isometric: {
        label: 'Isometria / ponto de tensão',
        category: 'Fases da contração & tempo',
        fields: [
            {
                key: 'hold_seconds',
                label: 'Tempo de contração',
                shortLabel: 'de contração estática',
                unit: 'seg',
                min: 1,
                max: 120,
            },
        ],
    },
    peak_contraction: {
        label: 'Pico de contração',
        category: 'Fases da contração & tempo',
        fields: [
            {
                key: 'hold_seconds',
                label: 'Tempo de pico de contração',
                shortLabel: 'de pico de contração',
                unit: 'seg',
                min: 1,
                max: 10,
            },
        ],
    },
    super_slow: {
        label: 'Superlento (super slow)',
        category: 'Fases da contração & tempo',
        fields: [],
    },
    pyramid_ascending: {
        label: 'Pirâmide crescente',
        category: 'Pirâmide & organização de carga',
        fields: [
            {
                key: 'rounds',
                label: 'Nº de degraus',
                shortLabel: 'degraus crescentes',
                unit: '',
                min: 2,
                max: 8,
            },
        ],
    },
    pyramid_descending: {
        label: 'Pirâmide decrescente',
        category: 'Pirâmide & organização de carga',
        fields: [
            {
                key: 'rounds',
                label: 'Nº de degraus',
                shortLabel: 'degraus decrescentes',
                unit: '',
                min: 2,
                max: 8,
            },
        ],
    },
    pyramid_truncated: {
        label: 'Pirâmide truncada',
        category: 'Pirâmide & organização de carga',
        fields: [
            {
                key: 'rounds',
                label: 'Nº de degraus',
                shortLabel: 'degraus',
                unit: '',
                min: 2,
                max: 8,
            },
        ],
    },
    wave_loading: {
        label: 'Onda (wave loading)',
        category: 'Pirâmide & organização de carga',
        fields: [
            {
                key: 'rounds',
                label: 'Nº de ondas',
                shortLabel: 'ondas',
                unit: '',
                min: 2,
                max: 6,
            },
        ],
    },
    method_21: {
        label: 'Método 21',
        category: 'Métodos específicos',
        fields: [
            {
                key: 'rounds',
                label: 'Nº de blocos',
                shortLabel: 'blocos',
                unit: '',
                min: 2,
                max: 4,
            },
            {
                key: 'extra_reps',
                label: 'Reps por bloco',
                shortLabel: 'reps por bloco',
                unit: 'reps',
                min: 1,
                max: 15,
            },
        ],
    },
    cluster_set: {
        label: 'Cluster set',
        category: 'Métodos específicos',
        fields: [
            {
                key: 'rounds',
                label: 'Nº de blocos',
                shortLabel: 'blocos',
                unit: '',
                min: 2,
                max: 10,
            },
            {
                key: 'extra_reps',
                label: 'Reps por bloco',
                shortLabel: 'reps por bloco',
                unit: 'reps',
                min: 1,
                max: 10,
            },
            {
                key: 'pause_seconds',
                label: 'Pausa entre blocos',
                shortLabel: 'de pausa entre blocos',
                unit: 'seg',
                min: 5,
                max: 60,
            },
        ],
    },
    fst7: {
        label: 'FST-7',
        category: 'Métodos específicos',
        fields: [
            {
                key: 'pause_seconds',
                label: 'Descanso entre séries',
                shortLabel: 'de descanso',
                unit: 'seg',
                min: 15,
                max: 60,
            },
        ],
    },
    gvt: {
        label: 'GVT (German Volume Training)',
        category: 'Métodos específicos',
        fields: [],
    },
};

export interface GroupTechniqueDefinition {
    value: string;
    label: string;
}

export const GROUP_TECHNIQUE_CATALOG: GroupTechniqueDefinition[] = [
    { value: 'biset', label: 'Bi-set (mesmo grupo muscular)' },
    { value: 'superset', label: 'Superset (grupos antagonistas)' },
    { value: 'triset', label: 'Tri-set (3 exercícios)' },
    { value: 'giant_set', label: 'Série gigante (4+ exercícios)' },
    { value: 'pre_exhaustion', label: 'Pré-exaustão (isolado → composto)' },
    { value: 'post_exhaustion', label: 'Pós-exaustão (composto → isolado)' },
];

export function groupTechniqueLabel(value?: string): string | undefined {
    return GROUP_TECHNIQUE_CATALOG.find((g) => g.value === value)?.label;
}

export interface TechniqueParamsValue {
    rounds?: number;
    round_reduction_pct?: number;
    pause_seconds?: number;
    extra_reps?: number;
    hold_seconds?: number;
}

/** Resumo humano de uma técnica + seus parâmetros, ex: "Dropset · 3 reduções,
 * 20% de redução por queda". Usado no resumo do editor e no badge do aluno. */
export function formatTechniqueSummary(
    technique?: string,
    params?: TechniqueParamsValue,
): string {
    if (!technique) return '';
    const entry = TECHNIQUE_CATALOG[technique];
    if (!entry) return '';
    if (!params) return entry.label;

    const parts = entry.fields
        .filter((f) => params[f.key] !== undefined && params[f.key] !== null)
        .map((f) => {
            const value = params[f.key];
            const unit = f.unit ? ` ${f.unit}` : '';
            return `${value}${unit} ${f.shortLabel}`;
        });

    return parts.length > 0 ? `${entry.label} · ${parts.join(', ')}` : entry.label;
}
