/**
 * Relatório de acompanhamento (Todo/PLANO_COMENTARIO_POS_TREINO.md, Parte B,
 * PRO): tipos e rótulos. Em sincronia com o backend:
 * Personal-fit-Back/internal/domain/training/workout-report*.go.
 */

export type ReportStatus = 'pending' | 'ai_pending' | 'generated' | 'numbers_only';
export type ReportReviewState = 'new' | 'reviewed' | 'decided';

export interface ReportWeek {
    start: string;
    planned: number;
    done: number;
    feeling_avg?: number;
    rpe_avg?: number;
    comments: number;
}

export interface ReportExerciseMark {
    name: string;
    date: string;
    load_kg: number;
}

export interface ReportMetrics {
    weeks: ReportWeek[] | null;
    planned: number;
    done: number;
    sessions: number;
    adherence_pct?: number;
    comments: number;
    feeling_avg?: number;
    rpe_avg?: number;
    pain_total: number;
    pain_by_region?: Record<string, number>;
    tag_counts?: Record<string, number>;
    late: number;
    photos: number;
    records?: ReportExerciseMark[];
    stalled?: ReportExerciseMark[];
    deload_weeks: number;
    phases?: string[];
    previous?: {
        period_key: string;
        adherence_pct?: number;
        feeling_avg?: number;
        pain_total: number;
        comments: number;
    };
}

export interface ReportAttention {
    title: string;
    description: string;
    category: string;
    severity: 'alta' | 'media' | 'baixa' | string;
    evidence: string[];
}

export interface ReportSuggestion {
    action: string;
    exercise?: string;
    justification: string;
    evidence: string[];
}

export interface ReportAI {
    summary: string;
    attention?: ReportAttention[];
    positives?: { description: string; evidence: string[] }[];
    suggestions?: ReportSuggestion[];
    previous_decisions_effect?: string;
    model: string;
    prompt_version: string;
    generated_at: string;
}

export interface ReportEvidence {
    ref: string;
    comment_id?: string;
    date: string;
    training_ref?: string;
    tags?: string[];
    pain_regions?: string[];
    feeling?: number;
    has_text?: boolean;
}

export interface ReportDecision {
    id: string;
    action: string;
    exercise?: string;
    text?: string;
    suggestion_index?: number;
    done: boolean;
    created_at: string;
    updated_at: string;
}

export interface WorkoutReport {
    id: string;
    student_id: string;
    student_name?: string;
    period_key: string;
    period_kind: 'monthly' | 'bimonthly' | 'on_demand';
    period_label: string;
    period_start: string;
    period_end: string;
    status: ReportStatus;
    numbers_only_reason?: string;
    review_state: ReportReviewState;
    attention_score: number;
    attention_signals: string[];
    metrics: ReportMetrics;
    ai?: ReportAI;
    evidence: ReportEvidence[];
    decisions: ReportDecision[];
    reviewed_at?: string;
    decided_at?: string;
    created_at: string;
    updated_at: string;
}

export interface ReportPanel {
    period_key: string;
    period_label: string;
    periods: { key: string; label: string }[];
    items: WorkoutReport[];
    total: number;
    decided: number;
    reviewed: number;
    pending: number;
    attention: number;
    is_pro: boolean;
}

export type ReportFrequency = 'monthly' | 'bimonthly' | 'off';

export const REPORT_FREQUENCIES: { value: ReportFrequency; label: string; hint: string }[] = [
    { value: 'monthly', label: 'Mensal', hint: 'Fecha no dia 3 de cada mês.' },
    { value: 'bimonthly', label: 'Bimestral', hint: 'Fecha a cada dois meses (jan–fev, mar–abr…).' },
    { value: 'off', label: 'Desligado', hint: 'Nenhum relatório novo.' },
];

/** Ações de sugestão e de decisão ("outra" só na decisão). */
export const REPORT_ACTIONS: { value: string; label: string }[] = [
    { value: 'ajustar_carga', label: 'Ajustar carga' },
    { value: 'trocar_exercicio', label: 'Trocar exercício' },
    { value: 'deload', label: 'Semana de deload' },
    { value: 'reavaliar', label: 'Marcar reavaliação' },
    { value: 'conversar', label: 'Conversar com o aluno' },
    { value: 'manter', label: 'Manter como está' },
    { value: 'outra', label: 'Outra' },
];

const ACTION_LABEL = new Map(REPORT_ACTIONS.map((a) => [a.value, a.label]));
export function reportActionLabel(action: string): string {
    return ACTION_LABEL.get(action) ?? action;
}

export const ATTENTION_SIGNALS: Record<string, string> = {
    dor: 'Dor recorrente',
    sensacao_em_queda: 'Sensação em queda',
    aderencia: 'Aderência baixa',
    parou_de_comentar: 'Parou de comentar',
    tardios: 'Registros tardios',
    carga_parada: 'Carga parada',
};

export function attentionSignalLabel(signal: string): string {
    return ATTENTION_SIGNALS[signal] ?? signal;
}

export const NUMBERS_ONLY_REASONS: Record<string, string> = {
    poucos_comentarios: 'Poucos comentários no período: sem leitura por IA, para ela não inventar padrão.',
    aluno_optou_sair: 'O aluno pediu para não ter os comentários lidos por IA.',
    teto_do_periodo: 'O limite de leituras por IA deste fechamento foi atingido.',
    ia_indisponivel: 'A leitura da IA falhou depois de várias tentativas.',
    ia_nao_configurada: 'A leitura por IA não está disponível no momento.',
};

/** Motivos em que "tentar de novo" faz sentido. */
export function canRetryAI(reason?: string): boolean {
    return reason === 'ia_indisponivel' || reason === 'teto_do_periodo' || reason === 'ia_nao_configurada';
}

export const EVIDENCE_METRIC_LABELS: Record<string, string> = {
    m_aderencia: 'Aderência',
    m_sensacao: 'Sensação',
    m_rpe: 'RPE',
    m_dor: 'Dor',
    m_carga: 'Carga',
    m_tardios: 'Tardios',
};

export const SEVERITY_LABELS: Record<string, string> = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };

export function reviewStateLabel(state: ReportReviewState, status: ReportStatus): string {
    if (status === 'pending' || status === 'ai_pending') return 'Gerando';
    if (state === 'decided') return 'Decidido';
    if (state === 'reviewed') return 'Lido';
    return 'Novo';
}

/** "12/08" a partir de "2026-08-12". */
export function shortDate(iso: string): string {
    const [, m, d] = iso.split('-');
    return d && m ? `${d}/${m}` : iso;
}

/** Variação em pontos, com sinal ("+5", "−12"). */
export function formatDelta(current?: number, previous?: number, digits = 0): string | null {
    if (current == null || previous == null) return null;
    const delta = current - previous;
    if (Math.abs(delta) < 10 ** -digits / 2) return '=';
    const sign = delta > 0 ? '+' : '−';
    return `${sign}${Math.abs(delta).toFixed(digits)}`;
}
