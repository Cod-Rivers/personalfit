// Parâmetros configuráveis do Controle de Microciclo (Autorregulação) e do
// motor de sugestão de carga. Todo campo é opcional: quando o personal não
// define um valor, o resolver usa o padrão do app. A precedência é
// campo a campo (não objeto a objeto) e, na v1, tem um único nível
// sobrepondo o padrão: personal > app. O tipo já é desenhado para caber
// níveis adicionais (macrociclo, microciclo) no futuro sem quebrar quem já
// usa o resolver — basta passar mais camadas em resolveAutoregulationPolicy.

export interface AutoregulationPolicy {
    // Zonas do motor de autorregulação (balanço aptidão-fadiga)
    superBalanceThreshold: number;
    fatigueBalanceThreshold: number;
    // Ajustes aplicados em cada zona (%)
    superVolumePct: number;
    superIntensityPct: number;
    superIntraSessionPct: number;
    fatigueVolumePct: number;
    fatigueIntensityPct: number;
    fatigueIntraSessionPct: number;
    // Gatilho de deload
    deloadConsecutiveDays: number;
    deloadRpeTrigger: number;
    // Progressão de carga sugerida a partir do histórico do aluno (%)
    progressUpBigPct: number;
    progressUpSmallPct: number;
    progressDownPct: number;
    /** Ajuste aplicado só na primeira sugestão de um exercício, quando ainda
     * não há nenhuma sessão concluída no histórico (source 'personal' puro
     * em loadSuggestion.ts) — sem isso, a primeira sugestão é sempre uma
     * cópia idêntica da carga prescrita, o que passa a impressão de que o
     * motor de progressão "não faz nada" até o aluno acumular histórico. */
    firstSuggestionNudgePct: number;
    /** Até quanto a sugestão pode se afastar da carga prescrita pelo
     * personal (%), sem dimensão de tempo — renomeado de "weeklyCapPct",
     * que nunca teve componente temporal apesar do nome (ver
     * weeklyProgressionCapPct abaixo para o teto que de fato é medido numa
     * janela de 7 dias). */
    maxDeviationFromPrescribedPct: number;
    abovePrescribedTolerancePct: number;
    /** Regra "2-for-2" (ACSM, Progression Models in Resistance Training for
     * Healthy Adults, 2009; NSCA, Essentials of Strength Training and
     * Conditioning): só libera aumento de carga depois que o aluno bate a
     * meta de RPE/reps em N sessões CONSECUTIVAS do mesmo exercício — não a
     * cada sessão isolada. Reduções continuam imediatas (segurança). */
    minConsecutiveSessionsBeforeIncrease: number;
    /** Teto real de calendário (janela móvel de 7 dias corridos): quanto a
     * carga de trabalho pode subir no total nesse período, mesmo que vários
     * eventos de progressão sejam liberados nele. A literatura-âncora
     * (ACSM/NSCA) gateia por desempenho (2 sessões consecutivas), não por
     * tempo — este teto é uma tradução de engenharia da faixa de evento
     * (2-10% por progressão) para uma janela de calendário, não uma
     * citação direta da literatura. */
    weeklyProgressionCapPct: number;
}

export type PartialAutoregulationPolicy = Partial<AutoregulationPolicy>;

/** Origem de onde cada campo resolvido veio, exibida ao personal/aluno para
 * deixar claro o que é padrão do app e o que foi customizado. */
export type AutoregulationPolicyLayer = 'app' | 'personal' | 'macro' | 'micro';

export const DEFAULT_AUTOREGULATION_POLICY: AutoregulationPolicy = {
    superBalanceThreshold: 20,
    fatigueBalanceThreshold: -12,
    superVolumePct: 8,
    superIntensityPct: 3,
    superIntraSessionPct: 3,
    fatigueVolumePct: -20,
    fatigueIntensityPct: -7,
    fatigueIntraSessionPct: -7,
    deloadConsecutiveDays: 2,
    deloadRpeTrigger: 9,
    progressUpBigPct: 5,
    progressUpSmallPct: 2.5,
    progressDownPct: -5,
    firstSuggestionNudgePct: 2.5,
    maxDeviationFromPrescribedPct: 10,
    abovePrescribedTolerancePct: 10,
    // ACSM 2009 / NSCA "2-for-2 rule": 2 sessões consecutivas dentro da meta.
    minConsecutiveSessionsBeforeIncrease: 2,
    // Tradução de engenharia da faixa de evento (2-10%/progressão) da ACSM/
    // NSCA para uma janela de calendário — não um número citado literalmente.
    weeklyProgressionCapPct: 5,
};

/** Faixas válidas por campo — espelham as constraints do backend
 * (internal/domain/training/autoregulation_policy.go) para o clamp
 * otimista da UI. O backend é a fonte da verdade final. */
export const AUTOREGULATION_POLICY_RANGES: Record<
    keyof AutoregulationPolicy,
    { min: number; max: number; label: string }
> = {
    superBalanceThreshold: { min: 5, max: 60, label: 'Limiar de supercompensação' },
    fatigueBalanceThreshold: { min: -60, max: -5, label: 'Limiar de fadiga' },
    superVolumePct: { min: 0, max: 25, label: 'Volume em supercompensação' },
    superIntensityPct: { min: 0, max: 15, label: 'Intensidade em supercompensação' },
    superIntraSessionPct: { min: 0, max: 15, label: 'Carga intrassessão em supercompensação' },
    fatigueVolumePct: { min: -40, max: 0, label: 'Volume em fadiga' },
    fatigueIntensityPct: { min: -20, max: 0, label: 'Intensidade em fadiga' },
    fatigueIntraSessionPct: { min: -20, max: 0, label: 'Carga intrassessão em fadiga' },
    deloadConsecutiveDays: { min: 1, max: 7, label: 'Dias consecutivos para gatilho de deload' },
    deloadRpeTrigger: { min: 6, max: 10, label: 'RPE gatilho de deload' },
    progressUpBigPct: { min: 0, max: 15, label: 'Progressão de carga (folga grande)' },
    progressUpSmallPct: { min: 0, max: 15, label: 'Progressão de carga (folga pequena)' },
    progressDownPct: { min: -30, max: 0, label: 'Redução de carga (RPE acima do alvo)' },
    firstSuggestionNudgePct: { min: 0, max: 10, label: 'Progressão da primeira sugestão (sem histórico)' },
    maxDeviationFromPrescribedPct: { min: 0, max: 25, label: 'Margem de desvio da carga prescrita' },
    abovePrescribedTolerancePct: { min: 0, max: 30, label: 'Margem acima do prescrito' },
    minConsecutiveSessionsBeforeIncrease: { min: 1, max: 4, label: 'Sessões consecutivas para liberar aumento' },
    weeklyProgressionCapPct: { min: 0, max: 15, label: 'Teto de progressão por semana' },
};

export const AUTOREGULATION_POLICY_KEYS = Object.keys(
    DEFAULT_AUTOREGULATION_POLICY,
) as ReadonlyArray<keyof AutoregulationPolicy>;

export function clampAutoregulationPolicyField(
    key: keyof AutoregulationPolicy,
    value: number,
): number {
    const range = AUTOREGULATION_POLICY_RANGES[key];
    return Math.max(range.min, Math.min(range.max, value));
}

export interface ResolveAutoregulationPolicyLayers {
    /** Sobreposição do personal (nível único suportado na v1). */
    personal?: PartialAutoregulationPolicy | null;
    /** Reservado para sobreposição por macrociclo (ainda não persistido). */
    macro?: PartialAutoregulationPolicy | null;
    /** Reservado para sobreposição por microciclo (ainda não persistido). */
    micro?: PartialAutoregulationPolicy | null;
}

export interface ResolvedAutoregulationPolicy {
    policy: AutoregulationPolicy;
    sources: Record<keyof AutoregulationPolicy, AutoregulationPolicyLayer>;
}

/**
 * Mescla os overrides campo a campo, do mais específico para o mais
 * genérico (micro > macro > personal > app). Usa `!= null` (não `||`) para
 * que um valor 0 definido explicitamente por um nível seja respeitado — se
 * usássemos `||`, `0 || default` sempre cairia no default, quebrando
 * qualquer campo onde 0 é um valor legítimo (ex: progressão 0%).
 */
export function resolveAutoregulationPolicy(
    layers: ResolveAutoregulationPolicyLayers,
): ResolvedAutoregulationPolicy {
    const policy = {} as AutoregulationPolicy;
    const sources = {} as Record<keyof AutoregulationPolicy, AutoregulationPolicyLayer>;

    for (const key of AUTOREGULATION_POLICY_KEYS) {
        if (layers.micro?.[key] != null) {
            policy[key] = layers.micro[key] as number;
            sources[key] = 'micro';
        } else if (layers.macro?.[key] != null) {
            policy[key] = layers.macro[key] as number;
            sources[key] = 'macro';
        } else if (layers.personal?.[key] != null) {
            policy[key] = layers.personal[key] as number;
            sources[key] = 'personal';
        } else {
            policy[key] = DEFAULT_AUTOREGULATION_POLICY[key];
            sources[key] = 'app';
        }
    }

    return { policy, sources };
}
