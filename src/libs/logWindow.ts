// Apresentação da janela de registro de treino (RN-01/RN-02 do backend —
// ver internal/domain/user/log-window.go). Puro: sem chamada de rede, sem
// React. O acesso à API vive em logWindowService.ts, no mesmo espírito da
// separação autoregulationPolicy.ts / autoregulationPolicyService.ts.

/** Espelha user.ValidLogWindows do backend. Os 4 literais são fixos —
 * qualquer valor fora desta lista é tratado pelo backend como se não tivesse
 * sido configurado (EffectiveLogWindow cai no default). */
export type LogWindow = 'same_day' | '24h' | '48h' | 'unlimited';

export const LOG_WINDOW_VALUES: LogWindow[] = [
    'same_day',
    '24h',
    '48h',
    'unlimited',
];

/** Espelha user.LogWindowDefault (48h) — RN-02. Mantido em código (não só
 * lido da API) porque a tela precisa de um valor pra exibir antes da
 * primeira resposta do servidor chegar. */
export const LOG_WINDOW_DEFAULT: LogWindow = '48h';

export const LOG_WINDOW_LABELS: Record<LogWindow, string> = {
    same_day: 'Mesmo dia',
    '24h': '24 horas',
    '48h': '48 horas',
    unlimited: 'Sem limite',
};

export function isValidLogWindow(value: string): value is LogWindow {
    return (LOG_WINDOW_VALUES as string[]).includes(value);
}

// Dias civis de tolerância a partir da data planejada — espelha
// lateGraceDays em internal/domain/training/late.go. "unlimited" não entra
// no mapa por não ter prazo (tratado à parte em estimateIsLate).
const LOG_WINDOW_GRACE_DAYS: Record<'same_day' | '24h' | '48h', number> = {
    same_day: 0,
    '24h': 1,
    '48h': 2,
};

/**
 * Estimativa CLIENT-SIDE de registro tardio (RN-39). Espelha
 * `training.IsLate`/`LateLastDay` (late.go) o mais fielmente possível, para
 * poder avisar o aluno no passo de check-in MESMO offline — é o único jeito
 * de cumprir RN-39 sem depender de rede no instante da confirmação.
 *
 * O servidor é quem decide de verdade, no momento em que a mutação
 * sincronizar (RN-07: calculado uma única vez, lá). Esta função nunca
 * bloqueia nada (RN-05) — só alimenta um aviso informativo.
 *
 * `plannedDate` no formato "YYYY-MM-DD" (mesmo de WorkoutSessionRequest) e
 * `completedAt` um instante local do aparelho do aluno. Ambos são ancorados
 * em UTC pelos NÚMEROS do calendário civil (não pela hora real), do mesmo
 * jeito que o backend faz — comparar assim evita que a troca de fuso ou
 * horário de verão desloque a fronteira do dia.
 */
export function estimateIsLate(
    plannedDate: string,
    completedAt: Date,
    window: LogWindow,
): boolean {
    if (window === 'unlimited') return false;

    const grace = LOG_WINDOW_GRACE_DAYS[window];
    const [y, m, d] = plannedDate.split('-').map(Number);
    if (!y || !m || !d) return false; // data malformada — lado seguro (RN-05), não avisa

    const lastDay = Date.UTC(y, m - 1, d + grace);
    const registeredDay = Date.UTC(
        completedAt.getFullYear(),
        completedAt.getMonth(),
        completedAt.getDate(),
    );

    return registeredDay > lastDay;
}

/** Rótulo pronto pra exibir ao personal, deixando explícito quando o valor
 * é o default do app e não uma escolha dele (princípio: "quando um valor vem
 * de default e não de escolha explícita, diga isso"). */
export function formatLogWindowForDisplay(
    value: LogWindow,
    isDefault: boolean,
): string {
    const label = LOG_WINDOW_LABELS[value];
    return isDefault ? `${label} (padrão)` : label;
}
