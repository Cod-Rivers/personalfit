import { ExerciseResponse } from './planningService';

export type TrainingAccent = 'push' | 'pull' | 'legs' | 'core' | 'mixed';

const PUSH_GROUPS = new Set(['Peito', 'Ombros', 'Tríceps']);
const PULL_GROUPS = new Set(['Costas', 'Bíceps']);
const LEG_GROUPS = new Set([
    'Quadríceps',
    'Glúteos',
    'Posteriores',
    'Panturrilha',
]);
const CORE_GROUPS = new Set(['Core']);

export interface TrainingSummary {
    /** Grupos musculares dominantes, ex. "Peito, Ombros e Tríceps". */
    focusLabel?: string;
    accent: TrainingAccent;
    exerciseCount: number;
    seriesCount: number;
    estimatedMinutes: number;
}

function joinWithE(items: string[]): string {
    if (items.length <= 1) return items[0] ?? '';
    return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

/**
 * Deriva um resumo do treino a partir dos exercícios já carregados
 * (sem custo de rede — os dados já vêm no macrociclo).
 */
export function summarizeTraining(
    exercises: ExerciseResponse[] = [],
): TrainingSummary {
    const counts = new Map<string, number>();
    for (const ex of exercises) {
        const group = ex.muscle_group?.trim();
        if (!group) continue;
        counts.set(group, (counts.get(group) ?? 0) + 1);
    }

    const topGroups = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);

    let accent: TrainingAccent = 'mixed';
    const dominant = topGroups[0];
    if (dominant) {
        if (PUSH_GROUPS.has(dominant)) accent = 'push';
        else if (PULL_GROUPS.has(dominant)) accent = 'pull';
        else if (LEG_GROUPS.has(dominant)) accent = 'legs';
        else if (CORE_GROUPS.has(dominant)) accent = 'core';
    }

    const exerciseCount = exercises.length;
    const seriesCount = exercises.reduce(
        (sum, ex) => sum + (ex.series?.length ?? 0),
        0,
    );

    // Estimativa heurística: tempo ativo por série (fixo p/ exercícios normais,
    // tempo_seconds p/ isométricos) + descanso configurado, somados por série.
    const estimatedSeconds = exercises.reduce((total, ex) => {
        const sets = ex.series?.length ?? 0;
        const activePerSet = ex.timed ? (ex.tempo_seconds ?? 30) : 35;
        const restPerSet = ex.rest_seconds ?? 90;
        return total + sets * (activePerSet + restPerSet);
    }, 0);
    const estimatedMinutes =
        exerciseCount > 0 ? Math.max(15, Math.round(estimatedSeconds / 60)) : 0;

    return {
        focusLabel: topGroups.length > 0 ? joinWithE(topGroups) : undefined,
        accent,
        exerciseCount,
        seriesCount,
        estimatedMinutes,
    };
}

/** "hoje" / "ontem" / "há N dias" a partir de uma data ISO. */
export function formatRelativeDays(dateStr?: string): string | undefined {
    if (!dateStr) return undefined;
    const days = Math.floor(
        (Date.now() - new Date(dateStr).getTime()) / 86_400_000,
    );
    if (days <= 0) return 'hoje';
    if (days === 1) return 'ontem';
    return `há ${days} dias`;
}
