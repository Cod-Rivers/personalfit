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
    weeklyCapPct: number;
    abovePrescribedTolerancePct: number;
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
    weeklyCapPct: 10,
    abovePrescribedTolerancePct: 10,
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
    weeklyCapPct: { min: 0, max: 25, label: 'Teto de variação semanal' },
    abovePrescribedTolerancePct: { min: 0, max: 30, label: 'Margem acima do prescrito' },
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
