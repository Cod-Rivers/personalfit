// Motor de sugestão de carga do Controle de Microciclo (Autorregulação).
// Combina a carga prescrita pelo personal com o histórico executado pelo
// aluno (quando existe) e aplica por cima o ajuste intrassessão decidido
// pelo motor de zona (ver microcycleAutoregulation.ts). Nunca inventa um
// número: sem prescrição e sem histórico, não há sugestão.

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
    reason: string;
}

export interface LoadHistoryEntry {
    /** Data ISO (planned_date/completed_date) do registro, mais recente
     * primeiro não é exigido — a função ordena internamente. */
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
     * qualquer janela temporal — a função usa só a sessão mais recente. */
    history: LoadHistoryEntry[];
    /** RPE alvo do microciclo (ou o ajustado pela zona do dia). */
    targetRPE: number;
    /** Ajuste intrassessão sugerido pela zona do dia (%), já resolvido por
     * computeAutoregulationDecision — 0 em manutenção, positivo em
     * supercompensação, negativo em fadiga. */
    autoregulationAdjustPct: number;
    /** Deload ativo (either por configuração do microciclo ou gatilho):
     * corta qualquer incremento e mantém só a redução da autorregulação. */
    isDeload?: boolean;
    policy?: AutoregulationPolicy;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

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

export function computeLoadSuggestion(
    input: ComputeLoadSuggestionInput,
): LoadSuggestion {
    const policy = input.policy ?? DEFAULT_AUTOREGULATION_POLICY;
    const prescribedKg =
        input.prescribedKg != null && input.prescribedKg > 0
            ? input.prescribedKg
            : null;

    const sortedHistory = [...input.history]
        .filter((h) => h.loadKg > 0 && h.reps > 0)
        .sort((a, b) => (a.date < b.date ? 1 : -1));
    const lastSession = sortedHistory[0] ?? null;

    if (!prescribedKg && !lastSession) {
        return {
            suggestedKg: null,
            source: 'nenhuma',
            baseKg: null,
            deltaPct: 0,
            abovePrescribed: false,
            reason:
                'Sem carga prescrita e sem histórico registrado — registre a carga de hoje para receber sugestão a partir da próxima sessão.',
        };
    }

    // Base a partir do histórico do aluno: progressão pelo RPE da última
    // sessão comparado ao alvo do microciclo.
    let alunoBaseKg: number | null = null;
    let alunoReason = '';
    if (lastSession) {
        const gap = input.targetRPE - lastSession.rpe;
        let progressPct = 0;
        if (gap >= 2) progressPct = policy.progressUpBigPct;
        else if (gap >= 1) progressPct = policy.progressUpSmallPct;
        else if (lastSession.rpe > input.targetRPE) progressPct = policy.progressDownPct;

        alunoBaseKg = lastSession.loadKg * (1 + progressPct / 100);
        alunoReason = `última série ${lastSession.loadKg}kg × ${lastSession.reps} @ RPE ${lastSession.rpe} → ${progressPct >= 0 ? '+' : ''}${progressPct}%`;
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
        baseKg = prescribedKg as number;
        source = 'personal';
        reason = `carga prescrita pelo personal (${prescribedKg}kg), sem histórico ainda`;
    }

    // Teto semanal: não deixa a base do histórico se afastar mais que
    // weeklyCapPct da prescrição, quando ela existe.
    if (prescribedKg) {
        const capKg = prescribedKg * (1 + policy.weeklyCapPct / 100);
        const floorKg = prescribedKg * (1 - policy.weeklyCapPct / 100);
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
    const abovePrescribed = prescribedKg != null
        ? suggestedKg > prescribedKg * (1 + policy.abovePrescribedTolerancePct / 100)
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
        reason,
    };
}

// Referenciado por estimate1RM ao comparar sessões com reps diferentes;
// exportado para permitir uso direto (ex: converter %1RM prescrito).
export { estimate1RM };
