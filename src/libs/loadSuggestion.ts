// Motor de sugestão de carga do Controle de Microciclo (Autorregulação).
// Combina a carga prescrita pelo personal com o histórico executado pelo
// aluno (quando existe) e aplica por cima o ajuste intrassessão decidido
// pelo motor de zona (ver microcycleAutoregulation.ts). Nunca inventa um
// número: sem prescrição e sem histórico, não há sugestão.
//
// Progressão temporal (ver /ajuda#progressao-carga para as fontes completas):
// além do ajuste reativo por RPE (existia desde a v1), duas camadas
// adicionais, fundamentadas na literatura de treinamento resistido,
// controlam a VELOCIDADE da progressão ao longo do tempo:
//   1. Regra "2-for-2" (ACSM 2009; NSCA): um aumento de carga só é liberado
//      depois que o aluno bate a meta de RPE (e reps, quando informado) em
//      N sessões CONSECUTIVAS do mesmo exercício — não a cada sessão
//      isolada. Reduções continuam imediatas (critério de segurança).
//   2. Teto de progressão semanal: mesmo com o gate liberado, a carga de
//      trabalho não pode subir mais que policy.weeklyProgressionCapPct
//      dentro de uma janela móvel de 7 dias corridos. A literatura-âncora
//      não expressa isso em "%/semana" (gateia por evento de desempenho,
//      não por calendário) — este teto é uma tradução de engenharia da
//      faixa de evento (2-10% por progressão) para uma janela de tempo.

import {
    AutoregulationPolicy,
    DEFAULT_AUTOREGULATION_POLICY,
} from './autoregulationPolicy';

export type LoadSuggestionSource = 'personal' | 'aluno' | 'ambos' | 'nenhuma';

export interface LoadSuggestion {
    suggestedKg: number | null;
    source: LoadSuggestionSource;
    /** Carga antes do ajuste intrassessão da autorregulação (prescrito,
     * histórico ou a mistura dos dois). Referência para o cálculo do
     * ajuste percentual final aplicado. */
    baseKg: number | null;
    /** Ajuste total efetivamente aplicado sobre a carga prescrita (%). */
    deltaPct: number;
    /** true quando a sugestão ultrapassa a tolerância acima do prescrito —
     * sinaliza que vale o personal revisar a prescrição. */
    abovePrescribed: boolean;
    /** true quando um aumento seria justificado pelo RPE da última sessão,
     * mas está retido aguardando confirmação em sessões consecutivas
     * (regra 2-for-2) — útil para a UI diferenciar "sem progresso hoje" de
     * "progresso represado, quase liberando". */
    progressionGated: boolean;
    /** true quando o aumento foi limitado pelo teto de progressão semanal
     * (janela de 7 dias), não pela regra 2-for-2 nem pela margem do
     * prescrito. */
    weeklyCapped: boolean;
    reason: string;
}

export interface LoadHistoryEntry {
    /** Data ISO (planned_date/completed_date) do registro — aceita
     * "YYYY-MM-DD" ou "YYYY-MM-DD HH:mm:ss"; a função normaliza para o dia
     * ao comparar. Mais recente primeiro não é exigido — a função ordena
     * internamente. */
    date: string;
    loadKg: number;
    reps: number;
    rpe: number;
}

export interface ComputeLoadSuggestionInput {
    /** Carga prescrita pelo personal (ExerciseResponse.load_kg), quando
     * disponível. */
    prescribedKg?: number | null;
    /** Histórico de séries executadas deste exercício pelo aluno, de
     * qualquer janela temporal — a função usa as sessões mais recentes. */
    history: LoadHistoryEntry[];
    /** RPE alvo do microciclo (ou o ajustado pela zona do dia). */
    targetRPE: number;
    /** Topo da faixa de reps prescrita (dupla progressão): um aumento de
     * carga só é considerado "sessão qualificada" se a sessão também
     * atingiu esse número de reps, além do RPE. Opcional — quando omitido,
     * a checagem de reps é ignorada e só o RPE decide. */
    plannedReps?: number;
    /** Ajuste intrassessão sugerido pela zona do dia (%), já resolvido por
     * computeAutoregulationDecision — 0 em manutenção, positivo em
     * supercompensação, negativo em fadiga. */
    autoregulationAdjustPct: number;
    /** Deload ativo (either por configuração do microciclo ou gatilho):
     * corta qualquer incremento e mantém só a redução da autorregulação. */
    isDeload?: boolean;
    /** Data de referência ("hoje"), ISO "YYYY-MM-DD". Default: data atual.
     * Exposto para tornar a janela semanal testável deterministicamente. */
    referenceDate?: string;
    policy?: AutoregulationPolicy;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Normaliza para "YYYY-MM-DD", aceitando datas com horário (formato do
 * completed_date do backend, "YYYY-MM-DD HH:mm:ss"). */
const dateKey = (iso: string) => iso.slice(0, 10);

function daysBetween(fromISO: string, toISO: string): number {
    const from = new Date(`${dateKey(fromISO)}T00:00:00Z`).getTime();
    const to = new Date(`${dateKey(toISO)}T00:00:00Z`).getTime();
    return Math.round((to - from) / 86_400_000);
}

/** Estimativa de 1RM por Epley — usada só para comparar sessões com
 * esquemas de reps diferentes ao decidir a base de progressão; nunca é
 * devolvida como sugestão diretamente. */
function estimate1RM(loadKg: number, reps: number): number {
    if (reps <= 1) return loadKg;
    return loadKg * (1 + reps / 30);
}

/** Arredonda para o incremento prático de anilha mais próximo, por faixa. */
function roundToPlateStep(kg: number): number {
    const step = kg <= 20 ? 0.5 : kg <= 60 ? 1 : 2.5;
    return Math.round(kg / step) * step;
}

function pickBlendWeight(sessionCount: number): number {
    if (sessionCount <= 0) return 1;
    if (sessionCount <= 2) return 0.5;
    return 0.3;
}

/** Uma sessão "qualifica" para liberar progressão quando o RPE ficou na
 * meta (ou abaixo) e, se plannedReps foi informado, as reps executadas
 * bateram o topo da faixa prescrita (princípio de dupla progressão). */
function sessionQualifies(
    session: LoadHistoryEntry,
    targetRPE: number,
    plannedReps: number | undefined,
): boolean {
    const rpeOk = session.rpe <= targetRPE;
    const repsOk = plannedReps == null || session.reps >= plannedReps;
    return rpeOk && repsOk;
}

export function computeLoadSuggestion(
    input: ComputeLoadSuggestionInput,
): LoadSuggestion {
    const policy = input.policy ?? DEFAULT_AUTOREGULATION_POLICY;
    const referenceDate =
        input.referenceDate ?? new Date().toISOString().slice(0, 10);
    const prescribedKg =
        input.prescribedKg != null && input.prescribedKg > 0
            ? input.prescribedKg
            : null;

    const sortedHistory = [...input.history]
        .filter((h) => h.loadKg > 0 && h.reps > 0)
        .sort((a, b) => {
            const ak = dateKey(a.date);
            const bk = dateKey(b.date);
            return ak < bk ? 1 : ak > bk ? -1 : 0;
        });
    const lastSession = sortedHistory[0] ?? null;

    if (!prescribedKg && !lastSession) {
        return {
            suggestedKg: null,
            source: 'nenhuma',
            baseKg: null,
            deltaPct: 0,
            abovePrescribed: false,
            progressionGated: false,
            weeklyCapped: false,
            reason:
                'Sem carga prescrita e sem histórico registrado — registre a carga de hoje para receber sugestão a partir da próxima sessão.',
        };
    }

    // Base a partir do histórico do aluno: progressão pelo RPE (e reps,
    // quando plannedReps é informado) da última sessão comparada ao alvo.
    let alunoBaseKg: number | null = null;
    let alunoReason = '';
    let progressionGated = false;
    let weeklyCapped = false;

    if (lastSession) {
        const gap = input.targetRPE - lastSession.rpe;
        let intendedProgressPct = 0;
        if (gap >= 2) intendedProgressPct = policy.progressUpBigPct;
        else if (gap >= 1) intendedProgressPct = policy.progressUpSmallPct;
        else if (lastSession.rpe > input.targetRPE)
            intendedProgressPct = policy.progressDownPct;

        let progressPct = intendedProgressPct;

        // Regra 2-for-2 (ACSM/NSCA): só libera aumento (nunca redução) após
        // N sessões consecutivas qualificadas. Com N<=1 o gate é um no-op —
        // restaura o comportamento imediato para quem prefere assim.
        if (intendedProgressPct > 0) {
            const requiredStreak = Math.max(
                1,
                Math.round(policy.minConsecutiveSessionsBeforeIncrease),
            );
            if (requiredStreak > 1) {
                const recentWindow = sortedHistory.slice(0, requiredStreak);
                const qualifies =
                    recentWindow.length >= requiredStreak &&
                    recentWindow.every((s) =>
                        sessionQualifies(s, input.targetRPE, input.plannedReps),
                    );
                if (!qualifies) {
                    const metCount = recentWindow.filter((s) =>
                        sessionQualifies(s, input.targetRPE, input.plannedReps),
                    ).length;
                    progressPct = 0;
                    progressionGated = true;
                    alunoReason = `última série ${lastSession.loadKg}kg × ${lastSession.reps} @ RPE ${lastSession.rpe} → aumento represado (${metCount}/${requiredStreak} sessões consecutivas dentro da meta; regra 2-for-2)`;
                }
            }
        }

        if (!progressionGated) {
            alunoReason = `última série ${lastSession.loadKg}kg × ${lastSession.reps} @ RPE ${lastSession.rpe} → ${progressPct >= 0 ? '+' : ''}${progressPct}%`;
        }

        alunoBaseKg = lastSession.loadKg * (1 + progressPct / 100);

        // Teto de progressão semanal (janela móvel de 7 dias corridos):
        // ancora na sessão qualificada mais antiga já com >=7 dias — se
        // ainda não há uma semana de dados, o teto simplesmente não tem o
        // que limitar ainda.
        if (progressPct > 0) {
            const weekAgoSession = sortedHistory.find(
                (s) => daysBetween(s.date, referenceDate) >= 7,
            );
            if (weekAgoSession) {
                const weeklyCeilingKg =
                    weekAgoSession.loadKg *
                    (1 + policy.weeklyProgressionCapPct / 100);
                if (alunoBaseKg > weeklyCeilingKg) {
                    alunoBaseKg = weeklyCeilingKg;
                    weeklyCapped = true;
                }
            }
        }
    }

    let baseKg: number;
    let source: LoadSuggestionSource;
    let reason: string;

    if (prescribedKg && alunoBaseKg != null) {
        const weight = pickBlendWeight(sortedHistory.length);
        baseKg = weight * prescribedKg + (1 - weight) * alunoBaseKg;
        source = 'ambos';
        reason = `prescrito ${prescribedKg}kg combinado com histórico (${alunoReason})`;
    } else if (alunoBaseKg != null) {
        baseKg = alunoBaseKg;
        source = 'aluno';
        reason = alunoReason;
    } else {
        // Sem nenhuma sessão concluída ainda: sem o nudge, a primeira
        // sugestão seria idêntica ao prescrito, dando a impressão de que o
        // motor "não faz nada" até acumular histórico. O nudge é só
        // cosmético/motivacional (não é progressão real baseada em
        // desempenho) — some assim que houver histórico real, quando a
        // progressão passa a ser guiada pelo RPE das sessões.
        const nudgePct = policy.firstSuggestionNudgePct;
        baseKg = (prescribedKg as number) * (1 + nudgePct / 100);
        source = 'personal';
        reason =
            nudgePct > 0
                ? `carga prescrita pelo personal (${prescribedKg}kg) + progressão inicial padrão (+${nudgePct}%), sem histórico ainda`
                : `carga prescrita pelo personal (${prescribedKg}kg), sem histórico ainda`;
    }

    if (weeklyCapped) {
        reason += ` · limitado pelo teto de progressão semanal (${policy.weeklyProgressionCapPct}%/7 dias)`;
    }

    // Margem de desvio do prescrito: não deixa a base do histórico se
    // afastar mais que maxDeviationFromPrescribedPct da prescrição, quando
    // ela existe. Sem dimensão de tempo — só alinhamento com o que o
    // personal prescreveu.
    if (prescribedKg) {
        const capKg =
            prescribedKg * (1 + policy.maxDeviationFromPrescribedPct / 100);
        const floorKg =
            prescribedKg * (1 - policy.maxDeviationFromPrescribedPct / 100);
        baseKg = Math.min(capKg, Math.max(floorKg, baseKg));
    }

    // Ajuste intrassessão da autorregulação por cima da base — em deload,
    // nunca soma, só aplica a redução (ou 0 se o dia estivesse positivo).
    const adjustPct = input.isDeload
        ? Math.min(0, input.autoregulationAdjustPct)
        : input.autoregulationAdjustPct;
    const adjustedKg = baseKg * (1 + adjustPct / 100);

    const suggestedKg = roundToPlateStep(adjustedKg);
    const deltaPct = prescribedKg
        ? round2(((suggestedKg - prescribedKg) / prescribedKg) * 100)
        : round2(adjustPct);
    const abovePrescribed =
        prescribedKg != null
            ? suggestedKg >
              prescribedKg * (1 + policy.abovePrescribedTolerancePct / 100)
            : false;

    if (adjustPct !== 0) {
        reason += ` + ajuste do dia ${adjustPct >= 0 ? '+' : ''}${adjustPct}%`;
    }

    return {
        suggestedKg,
        source,
        baseKg: round2(baseKg),
        deltaPct,
        abovePrescribed,
        progressionGated,
        weeklyCapped,
        reason,
    };
}

// Referenciado por estimate1RM ao comparar sessões com reps diferentes;
// exportado para permitir uso direto (ex: converter %1RM prescrito).
export { estimate1RM };
