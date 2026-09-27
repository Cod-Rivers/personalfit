// Histórico de carga do aluno — a aba "Cargas" da Evolução
// (Todo/PLANO_EVOLUCAO_DE_CARGA.md).
//
// O cálculo de verdade mora no backend (training/load-history.go): este
// módulo só tem os TIPOS da resposta e as contas que o cliente precisa fazer
// sem o servidor — a chave estável do exercício (para o card achar o próprio
// histórico), o recorde no fim do treino (que acontece antes de a sessão
// sincronizar, às vezes offline) e as comparações da tela. Toda regra que
// também existe no Go está espelhada com o mesmo nome e o mesmo número, e os
// testes em loadHistory.test.ts fixam isso.

import { estimate1RM } from './loadSuggestion';

/* ── Tipos da resposta (dtos/load-history.go) ── */

export type LoadHistoryMetric = 'load' | 'reps';

export interface LoadHistorySet {
    series: number;
    reps: number;
    load_kg: number;
    rpe: number;
}

export interface LoadHistorySession {
    /** Dia civil da sessão, no fuso do aluno (YYYY-MM-DD). */
    date: string;
    log_id: string;
    mesocycle_id?: string;
    deload?: boolean;
    recorded_via?: string;
    sets: LoadHistorySet[];
    top_load_kg: number;
    top_reps: number;
    e1rm?: number;
    volume_kg: number;
    max_reps: number;
    planned_load_kg?: number;
    outlier?: boolean;
    record?: boolean;
    /** Só no cliente: sessão ainda na fila offline deste aparelho. */
    pending?: boolean;
}

export interface LoadHistoryPoint {
    date: string;
    top_load_kg: number;
    top_reps: number;
    e1rm?: number;
    max_reps: number;
}

export interface LoadHistorySummary {
    sessions_count: number;
    first?: LoadHistoryPoint;
    last?: LoadHistoryPoint;
    record_e1rm?: LoadHistoryPoint;
    record_load?: LoadHistoryPoint;
    record_reps?: LoadHistoryPoint;
    change_pct_30d?: number;
    change_pct_total?: number;
    last_record_date?: string;
}

export interface LoadHistoryRecentPoint {
    date: string;
    value: number;
}

export interface ExerciseLoadHistory {
    exercise_key: string;
    name: string;
    muscle_group?: string;
    metric: LoadHistoryMetric;
    summary: LoadHistorySummary;
    /** Só no resumo. */
    recent?: LoadHistoryRecentPoint[];
    last_sets?: LoadHistorySet[];
    /** Só no detalhe. */
    sessions?: LoadHistorySession[];
}

export interface LoadHistoryMesocycle {
    id: string;
    macrocycle_id: string;
    macrocycle_name?: string;
    name: string;
    phase?: string;
    start_date?: string;
    end_date?: string;
}

export interface LoadHistoryResponse {
    exercises: ExerciseLoadHistory[];
    mesocycles: LoadHistoryMesocycle[];
    /** chave por nome → chave da biblioteca em que foi emendada. */
    aliases?: Record<string, string>;
}

/* ── Regras espelhadas do backend ── */

/** LoadHistoryMaxRepsForE1RM: acima disso a série não entra no 1RM estimado. */
export const MAX_REPS_FOR_E1RM = 12;
/** LoadHistoryOutlierFactor: carga acima de N× a mediana das outras sessões é
 * tratada como erro de digitação (o 400 no lugar de 40). */
export const OUTLIER_FACTOR = 3;
/** loadHistoryOutlierMinPeers. */
const OUTLIER_MIN_PEERS = 2;

// Mesmo mapa de stripAccents (training/exercise-equipment.go). Só estes
// caracteres: normalizar mais que o Go faria o cliente calcular uma chave que
// o servidor nunca gera.
const ACCENTS: Record<string, string> = {
    á: 'a', à: 'a', ã: 'a', â: 'a',
    é: 'e', ê: 'e',
    í: 'i',
    ó: 'o', õ: 'o', ô: 'o',
    ú: 'u',
    ç: 'c',
};

/** Espelho de training.NormalizeExerciseName. */
export function normalizeExerciseName(name: string): string {
    const lowered = name.trim().toLowerCase().replace(/[áàãâéêíóõôúç]/g, (c) => ACCENTS[c] ?? c);
    return lowered.split(/\s+/).filter(Boolean).join(' ');
}

/** Espelho de training.ExerciseKeyFor: "lib:<id>" com vínculo à biblioteca,
 * senão "name:<nome normalizado>"; vazio sem nenhum dos dois. */
export function exerciseKeyFor(ex: {
    exercise_library_id?: string | null;
    name?: string | null;
}): string {
    if (ex.exercise_library_id) return `lib:${ex.exercise_library_id}`;
    const normalized = normalizeExerciseName(ex.name ?? '');
    return normalized ? `name:${normalized}` : '';
}

/** Espelho de LoadHistory.ResolveKey: a chave por nome que foi emendada no
 * histórico da biblioteca passa a apontar para ele. */
export function resolveExerciseKey(
    key: string,
    aliases?: Record<string, string> | null,
): string {
    return aliases?.[key] ?? key;
}

export interface SessionMetrics {
    topLoadKg: number;
    topReps: number;
    /** 1RM estimado SEM arredondar (0 = não calculável). */
    e1rm: number;
    volumeKg: number;
    maxReps: number;
}

/** Espelho de computeLoadHistorySessionMetrics: série com 0 reps não vale
 * como marca; 1RM só com até MAX_REPS_FOR_E1RM reps e com carga. */
export function computeSessionMetrics(
    sets: Array<{ reps: number; loadKg: number }>,
): SessionMetrics {
    const m: SessionMetrics = { topLoadKg: 0, topReps: 0, e1rm: 0, volumeKg: 0, maxReps: 0 };
    for (const set of sets) {
        if (!(set.reps >= 1)) continue;
        if (set.reps > m.maxReps) m.maxReps = set.reps;
        if (!(set.loadKg > 0)) continue;
        m.volumeKg += set.loadKg * set.reps;
        if (set.loadKg > m.topLoadKg || (set.loadKg === m.topLoadKg && set.reps > m.topReps)) {
            m.topLoadKg = set.loadKg;
            m.topReps = set.reps;
        }
        if (set.reps <= MAX_REPS_FOR_E1RM) {
            const e = estimate1RM(set.loadKg, set.reps);
            if (e > m.e1rm) m.e1rm = e;
        }
    }
    return m;
}

export function median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Carga fora do padrão frente às sessões de comparação (mesma regra de
 * markLoadHistoryOutliers). */
export function isOutlierLoad(topLoadKg: number, peers: number[]): boolean {
    const valid = peers.filter((v) => v > 0);
    if (topLoadKg <= 0 || valid.length < OUTLIER_MIN_PEERS) return false;
    return topLoadKg > OUTLIER_FACTOR * median(valid);
}

/* ── Recorde no fim do treino ── */

export interface PerformedExercise {
    exerciseId: string;
    name: string;
    exerciseLibraryId?: string;
    timed?: boolean;
    sets: Array<{ reps: number; loadKg: number }>;
}

export type RecordKind = 'e1rm' | 'load' | 'reps';

export interface NewRecord {
    key: string;
    name: string;
    kind: RecordKind;
    /** Valor anterior e o novo, na unidade do tipo (kg ou reps). */
    previous: number;
    current: number;
    topLoadKg: number;
    topReps: number;
}

/**
 * Quais exercícios do treino que acabou de terminar bateram recorde, contra
 * o histórico conhecido (o resumo que a tela já carregou, ou o do cache
 * offline). Roda no aparelho porque o treino ainda nem sincronizou — é o
 * mesmo critério de markLoadHistoryRecords no backend:
 *  - primeira vez no exercício não é recorde (não havia o que superar);
 *  - carga: supera o melhor 1RM estimado OU a maior carga;
 *  - peso do corpo: supera as repetições máximas;
 *  - carga fora do padrão (erro de digitação) nunca é recorde.
 * Séries por tempo guardam segundos em reps e ficam de fora.
 */
export function detectNewRecords(
    performed: PerformedExercise[],
    history: LoadHistoryResponse | null | undefined,
): NewRecord[] {
    if (!history) return [];
    const byKey = new Map(history.exercises.map((e) => [e.exercise_key, e]));
    const out: NewRecord[] = [];
    const seen = new Set<string>();

    for (const ex of performed) {
        if (ex.timed) continue;
        const key = resolveExerciseKey(
            exerciseKeyFor({ exercise_library_id: ex.exerciseLibraryId, name: ex.name }),
            history.aliases,
        );
        if (!key || seen.has(key)) continue;
        const known = byKey.get(key);
        if (!known?.summary.first) continue;
        const m = computeSessionMetrics(ex.sets);

        if (known.metric === 'reps') {
            // Exercício do peso do corpo que hoje ganhou carga: a régua
            // mudou, não é comparável.
            if (m.topLoadKg > 0) continue;
            const best = known.summary.record_reps?.max_reps ?? known.summary.first.max_reps;
            if (m.maxReps > best) {
                seen.add(key);
                out.push({ key, name: known.name, kind: 'reps', previous: best, current: m.maxReps, topLoadKg: 0, topReps: m.maxReps });
            }
            continue;
        }

        if (m.topLoadKg <= 0) continue;
        const peers = (known.recent ?? []).map((p) => p.value);
        if (isOutlierLoad(m.topLoadKg, peers)) continue;

        const bestE1RM = known.summary.record_e1rm?.e1rm ?? 0;
        const bestLoad = known.summary.record_load?.top_load_kg ?? known.summary.first.top_load_kg;
        // O resumo traz o 1RM arredondado em uma casa: a folga evita chamar de
        // recorde uma sessão IGUAL à melhor só por causa do arredondamento.
        const e1rmBeaten = m.e1rm > 0 && m.e1rm > bestE1RM + 0.05;
        const loadBeaten = m.topLoadKg > bestLoad;
        if (!e1rmBeaten && !loadBeaten) continue;
        seen.add(key);
        out.push(
            loadBeaten
                ? { key, name: known.name, kind: 'load', previous: bestLoad, current: m.topLoadKg, topLoadKg: m.topLoadKg, topReps: m.topReps }
                : { key, name: known.name, kind: 'e1rm', previous: bestE1RM, current: round1(m.e1rm), topLoadKg: m.topLoadKg, topReps: m.topReps },
        );
    }
    return out;
}

/* ── Sessões ainda na fila offline ── */

export interface PendingSessionInput {
    /** client_completed_at (RFC3339 com offset) — os 10 primeiros caracteres
     * já são o dia civil do aluno. */
    completedAt: string;
    exercises: Array<{
        exercise_id: string;
        name: string;
        series: number;
        reps: number;
        load_kg: number;
        rpe: number;
    }>;
}

/** Converte os treinos ainda na fila deste aparelho em sessões "pendentes de
 * envio" do exercício `key`. A fila não sabe o vínculo com a biblioteca, então
 * a chave sai pelo nome e passa pelos apelidos do histórico — que é
 * justamente o que emenda o nome do plano na chave da biblioteca. */
export function pendingSessionsFor(
    key: string,
    pending: PendingSessionInput[],
    aliases?: Record<string, string> | null,
): LoadHistorySession[] {
    const out: LoadHistorySession[] = [];
    pending.forEach((p, i) => {
        const sets = p.exercises
            .filter((e) => resolveExerciseKey(exerciseKeyFor({ name: e.name }), aliases) === key)
            .map((e) => ({ series: e.series, reps: e.reps, load_kg: e.load_kg, rpe: e.rpe }));
        if (sets.length === 0) return;
        const m = computeSessionMetrics(sets.map((s) => ({ reps: s.reps, loadKg: s.load_kg })));
        out.push({
            date: p.completedAt.slice(0, 10),
            log_id: `pending-${i}`,
            sets: [...sets].sort((a, b) => a.series - b.series),
            top_load_kg: m.topLoadKg,
            top_reps: m.topReps,
            e1rm: m.e1rm > 0 ? round1(m.e1rm) : undefined,
            volume_kg: round1(m.volumeKg),
            max_reps: m.maxReps,
            pending: true,
        });
    });
    return out;
}

/* ── Leitura e comparação ── */

export type ChartMetric = 'top' | 'e1rm' | 'volume' | 'reps';

/** Valor da sessão na métrica escolhida; null quando ela não tem o dado. */
export function sessionValue(s: LoadHistorySession, metric: ChartMetric): number | null {
    switch (metric) {
        case 'top':
            return s.top_load_kg > 0 ? s.top_load_kg : null;
        case 'e1rm':
            return s.e1rm && s.e1rm > 0 ? s.e1rm : null;
        case 'volume':
            return s.volume_kg > 0 ? s.volume_kg : null;
        case 'reps':
            return s.max_reps > 0 ? s.max_reps : null;
    }
}

/** Sessões que contam para comparações: sem as fora do padrão e sem as que
 * não têm a métrica do exercício. */
export function eligibleSessions(
    sessions: LoadHistorySession[],
    metric: LoadHistoryMetric,
): LoadHistorySession[] {
    return sessions.filter(
        (s) => !s.outlier && (metric === 'reps' ? s.max_reps > 0 : s.top_load_kg > 0),
    );
}

export interface PeriodStats {
    count: number;
    bestTopLoadKg: number | null;
    bestE1RM: number | null;
    bestReps: number | null;
    avgVolumeKg: number | null;
    /** Sessões por semana no intervalo pedido. */
    perWeek: number | null;
    firstDate: string | null;
    lastDate: string | null;
}

/** Resumo de um período [from, to] (datas civis, inclusive). */
export function periodStats(
    sessions: LoadHistorySession[],
    metric: LoadHistoryMetric,
    from: string,
    to: string,
): PeriodStats {
    const inRange = eligibleSessions(sessions, metric).filter(
        (s) => s.date >= from && s.date <= to,
    );
    const max = (vals: number[]) => (vals.length ? Math.max(...vals) : null);
    const volumes = inRange.map((s) => s.volume_kg).filter((v) => v > 0);
    const days = Math.max(1, daysBetween(from, to) + 1);
    return {
        count: inRange.length,
        bestTopLoadKg: max(inRange.map((s) => s.top_load_kg).filter((v) => v > 0)),
        bestE1RM: max(inRange.map((s) => s.e1rm ?? 0).filter((v) => v > 0)),
        bestReps: max(inRange.map((s) => s.max_reps).filter((v) => v > 0)),
        avgVolumeKg: volumes.length ? round1(volumes.reduce((a, b) => a + b, 0) / volumes.length) : null,
        perWeek: inRange.length ? round1((inRange.length / days) * 7) : null,
        firstDate: inRange[0]?.date ?? null,
        lastDate: inRange[inRange.length - 1]?.date ?? null,
    };
}

/** Variação percentual de a para b; null quando não há base. */
export function pctChange(a: number | null | undefined, b: number | null | undefined): number | null {
    if (a == null || b == null || a <= 0) return null;
    return round1(((b - a) / a) * 100);
}

/** Série normalizada em % da primeira sessão (base 100) — é o que deixa um
 * agachamento de 100 kg e uma rosca de 12 kg no mesmo gráfico. Usa o 1RM
 * estimado quando a sessão tem; senão a maior carga; no peso do corpo, reps. */
export function normalizedProgress(
    sessions: LoadHistorySession[],
    metric: LoadHistoryMetric,
): Array<{ date: string; pct: number }> {
    const eligible = eligibleSessions(sessions, metric);
    // Um tipo de valor só para a série inteira: misturar 1RM estimado com
    // carga crua (sessão de 15 reps não tem 1RM) distorceria a curva.
    const useE1RM = metric === 'load' && eligible.every((s) => (s.e1rm ?? 0) > 0);
    const value = (s: LoadHistorySession) =>
        metric === 'reps' ? s.max_reps : useE1RM ? (s.e1rm as number) : s.top_load_kg;
    const base = eligible.length ? value(eligible[0]) : 0;
    if (!(base > 0)) return [];
    return eligible.map((s) => ({ date: s.date, pct: round1((value(s) / base) * 100) }));
}

/** Semanas desde a última melhora (último recorde, ou a primeira sessão
 * quando nunca houve recorde). null sem histórico. */
export function weeksSinceImprovement(
    summary: LoadHistorySummary,
    today: string,
): number | null {
    const ref = summary.last_record_date ?? summary.first?.date;
    if (!ref) return null;
    return Math.floor(daysBetween(ref, today) / 7);
}

export type OverviewSort = 'trained' | 'progress' | 'stalled' | 'name';

export function sortExercises(
    list: ExerciseLoadHistory[],
    sort: OverviewSort,
    today: string,
): ExerciseLoadHistory[] {
    const copy = [...list];
    const byName = (a: ExerciseLoadHistory, b: ExerciseLoadHistory) =>
        a.name.localeCompare(b.name, 'pt-BR');
    switch (sort) {
        case 'trained':
            return copy.sort((a, b) => b.summary.sessions_count - a.summary.sessions_count || byName(a, b));
        case 'progress': {
            const v = (e: ExerciseLoadHistory) => e.summary.change_pct_total ?? Number.NEGATIVE_INFINITY;
            return copy.sort((a, b) => v(b) - v(a) || byName(a, b));
        }
        case 'stalled': {
            const v = (e: ExerciseLoadHistory) => weeksSinceImprovement(e.summary, today) ?? -1;
            return copy.sort((a, b) => v(b) - v(a) || byName(a, b));
        }
        default:
            return copy.sort(byName);
    }
}

/** Nome do grupo muscular para agrupar a lista ("peitoral" → "Peitoral"). */
export function muscleGroupLabel(raw?: string | null): string {
    const t = (raw ?? '').trim();
    if (!t) return 'Outros';
    return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Séries compactas: "2×10 · 40 kg, 8 · 42,5 kg" / "8, 7, 6 reps". */
export function formatSets(sets: LoadHistorySet[], metric: LoadHistoryMetric): string {
    const valid = sets.filter((s) => s.reps > 0);
    if (valid.length === 0) return '—';
    if (metric === 'reps' || valid.every((s) => !(s.load_kg > 0))) {
        return `${valid.map((s) => s.reps).join(', ')} reps`;
    }
    const groups: Array<{ reps: number; load: number; count: number }> = [];
    for (const s of valid) {
        const last = groups[groups.length - 1];
        if (last && last.reps === s.reps && last.load === s.load_kg) last.count++;
        else groups.push({ reps: s.reps, load: s.load_kg, count: 1 });
    }
    return groups
        .map((g) => `${g.count > 1 ? `${g.count}×` : ''}${g.reps} · ${g.load > 0 ? `${formatKg(g.load)} kg` : 'sem carga'}`)
        .join(', ');
}

export function formatKg(v: number): string {
    return v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

export function formatPct(v: number | null | undefined): string {
    if (v == null) return '—';
    const sign = v > 0 ? '+' : '';
    return `${sign}${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

export function formatDateBR(iso: string): string {
    const [y, m, d] = iso.slice(0, 10).split('-');
    return y && m && d ? `${d}/${m}/${y}` : iso;
}

/** Data local de hoje (YYYY-MM-DD) — toISOString() é UTC. */
export function todayLocalISO(date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDaysISO(iso: string, days: number): string {
    const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

export function daysBetween(fromISO: string, toISO: string): number {
    const a = Date.parse(`${fromISO.slice(0, 10)}T00:00:00Z`);
    const b = Date.parse(`${toISO.slice(0, 10)}T00:00:00Z`);
    return Math.round((b - a) / 86_400_000);
}

function round1(v: number): number {
    return Math.round(v * 10) / 10;
}

/* ── 1RM testado na avaliação física ── */

/** Medidas de 1RM da avaliação (EvolutionTimeline) e os exercícios a que
 * correspondem. Casamento conservador por nome: melhor não mostrar o ponto do
 * teste do que colá-lo no exercício errado. */
const TESTED_1RM: Array<{ measurement: string; matches: (normalizedName: string) => boolean }> = [
    { measurement: 'rm_supino', matches: (n) => n === 'supino' || n.startsWith('supino reto') },
    {
        measurement: 'rm_agachamento',
        matches: (n) => n === 'agachamento' || n.startsWith('agachamento livre') || n.startsWith('agachamento com barra'),
    },
    { measurement: 'rm_terra', matches: (n) => n === 'terra' || n.startsWith('levantamento terra') || n === 'terra convencional' },
];

/** Chave de medida do 1RM testado que corresponde ao exercício, se houver. */
export function testedOneRepMaxMeasurement(exerciseName: string): string | null {
    const n = normalizeExerciseName(exerciseName);
    return TESTED_1RM.find((t) => t.matches(n))?.measurement ?? null;
}
