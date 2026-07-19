export interface AutoregulationInput {
    readinessScore: number; // 1-10
    sleepHours: number;
    stressScore: number; // 1-10
    sorenessScore: number; // 1-10
    previousRPE: number; // 1-10
    hrvDeltaMs?: number; // positivo = melhor que baseline
    targetRPE?: number;
    plannedVolumeAdjustPct?: number;
    plannedIntensityAdjustPct?: number;
    consecutiveHighFatigueDays?: number;
}

export interface AutoregulationDecision {
    zone: 'supercompensacao' | 'manutencao' | 'fadiga';
    fatigueScore: number;
    fitnessScore: number;
    balance: number;
    volumeAdjustPct: number;
    intensityAdjustPct: number;
    intraSessionLoadAdjustPct: number;
    triggerDeload: boolean;
    message: string;
    reasons: string[];
}

const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

export function computeAutoregulationDecision(
    input: AutoregulationInput,
): AutoregulationDecision {
    const readiness = clamp(input.readinessScore, 1, 10);
    const sleep = clamp(input.sleepHours, 0, 12);
    const stress = clamp(input.stressScore, 1, 10);
    const soreness = clamp(input.sorenessScore, 1, 10);
    const prevRPE = clamp(input.previousRPE, 1, 10);
    const hrvDelta = clamp(input.hrvDeltaMs ?? 0, -30, 30);

    // Modelo aptidão-fadiga (heurístico inspirado em Banister para uso prático).
    const fitnessScore =
        readiness * 9 +
        clamp((sleep - 6) * 6, -18, 24) +
        clamp(hrvDelta * 1.8, -25, 25) +
        clamp((8 - prevRPE) * 4, -8, 20);

    const fatigueScore =
        stress * 8 +
        soreness * 9 +
        clamp(prevRPE >= 8 ? (prevRPE - 7) * 10 : 0, 0, 30) +
        clamp(hrvDelta < 0 ? Math.abs(hrvDelta) * 2 : 0, 0, 40);

    const balance = Math.round(fitnessScore - fatigueScore);
    const reasons: string[] = [];

    if (hrvDelta >= 5) reasons.push('VFC acima do basal');
    if (hrvDelta <= -5) reasons.push('VFC abaixo do basal');
    if (prevRPE >= 9) reasons.push('RPE prévio muito alto');
    if (stress >= 7) reasons.push('estresse elevado');
    if (soreness >= 7) reasons.push('dor muscular elevada');
    if (sleep < 6) reasons.push('sono insuficiente');

    const baseVolume = clamp(input.plannedVolumeAdjustPct ?? 0, -100, 100);
    const baseIntensity = clamp(input.plannedIntensityAdjustPct ?? 0, -100, 100);
    const targetRPE = clamp(input.targetRPE ?? 7, 1, 10);

    let zone: AutoregulationDecision['zone'] = 'manutencao';
    let volumeAdjustPct = baseVolume;
    let intensityAdjustPct = baseIntensity;
    let intraSessionLoadAdjustPct = 0;

    if (balance >= 20 && prevRPE <= targetRPE) {
        zone = 'supercompensacao';
        volumeAdjustPct = clamp(baseVolume + 8, -100, 100);
        intensityAdjustPct = clamp(baseIntensity + 3, -100, 100);
        intraSessionLoadAdjustPct = 3;
    } else if (balance <= -12 || (prevRPE >= targetRPE + 2 && hrvDelta <= 0)) {
        zone = 'fadiga';
        volumeAdjustPct = clamp(baseVolume - 20, -100, 100);
        intensityAdjustPct = clamp(baseIntensity - 7, -100, 100);
        intraSessionLoadAdjustPct = -7;
    } else {
        zone = 'manutencao';
        intraSessionLoadAdjustPct = 0;
    }

    const highFatigueDays = input.consecutiveHighFatigueDays ?? 0;
    const triggerDeload =
        zone === 'fadiga' && (highFatigueDays >= 2 || prevRPE >= 9);

    let message = 'Manter plano do microciclo.';
    if (zone === 'supercompensacao') {
        message =
            'Sinais de supercompensação: progredir carga levemente e/ou adicionar 1 série nos exercícios principais.';
    }
    if (zone === 'fadiga') {
        message =
            'Sinais de fadiga acumulada: reduzir volume e intensidade para preservar recuperação e técnica.';
    }
    if (triggerDeload) {
        message =
            'Gatilho de deload detectado: priorize semana de descarga com redução significativa de carga total.';
    }

    return {
        zone,
        fatigueScore: Math.round(fatigueScore),
        fitnessScore: Math.round(fitnessScore),
        balance,
        volumeAdjustPct,
        intensityAdjustPct,
        intraSessionLoadAdjustPct,
        triggerDeload,
        message,
        reasons,
    };
}
