/**
 * "Semana atual" do plano, pelo CALENDÁRIO — a única régua das telas que
 * mostram ou registram o treino da semana (lista do aluno, tela de treino,
 * "Treino do aluno" do personal e a pré-criação de registros offline).
 *
 * Até 2026-09-28 cada tela escolhia a semana pelo STATUS do microciclo
 * (pickActiveMicrocycle): "em andamento", senão a próxima "pendente". Como o
 * status é derivado dos registros, o primeiro treino fechava a semana e o
 * seguinte já era gravado na semana 2; e quando todas fechavam, tudo caía na
 * última para sempre. Nos planos simples (uma semana só, que se repete) o
 * "Concluído" nunca mais saía do card, porque ninguém olhava a data.
 *
 * Semana = segunda a domingo, a mesma da gamificação no backend
 * (get-gamification.go/weekIndex). A semana 1 de uma fase é a semana do dia
 * em que ela começa.
 */
import {
    pickActiveMicrocycle,
    type MacrocycleResponse,
    type MesocycleResponse,
    type MicrocycleResponse,
} from '@/libs/planningService';

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

/** Teto da meta semanal: dias de uma semana. Espelha MaxWeeklyTargetDays
 * (internal/domain/training/planning.go). */
export const MAX_WEEKLY_TARGET_DAYS = 7;

/** "YYYY-MM-DD" do dia LOCAL (do aparelho). É o formato de `planned_date`.
 * `toISOString().split('T')[0]` dá o dia em UTC — no Brasil, depois das 21h
 * já é o dia seguinte, e o treino de domingo à noite caía na outra semana. */
export function localDateKey(d: Date = new Date()): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** Data civil ("YYYY-MM-DD", com ou sem hora depois) → meia-noite LOCAL.
 * `new Date("2026-09-01")` seria meia-noite UTC, que no Brasil é o dia 31. */
function parseCivilDate(s?: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s ?? '');
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function addDays(d: Date, days: number): Date {
    const r = new Date(d);
    r.setDate(r.getDate() + days);
    return r;
}

/** Segunda-feira 00:00 (local) da semana de `d`. */
export function startOfWeek(d: Date): Date {
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return addDays(day, -((day.getDay() + 6) % 7));
}

/** Semanas inteiras entre as semanas de `from` e `to` (negativo se `to` vem
 * antes). O arredondamento absorve a hora a mais/a menos do horário de verão. */
function weeksBetween(from: Date, to: Date): number {
    return Math.round(
        (startOfWeek(to).getTime() - startOfWeek(from).getTime()) / WEEK_MS,
    );
}

function sortedMesos(macro: MacrocycleResponse): MesocycleResponse[] {
    return [...(macro.mesocycles ?? [])].sort((a, b) => a.order - b.order);
}

/**
 * Início de cada fase: a data própria dela, senão encadeada a partir do fim
 * da anterior — mesma regra do Gantt (macroToGanttPhases). A âncora do plano
 * é `start_date` e, na falta dela, `created_at`: plano montado pelo personal
 * nem sempre tem data de início, e plano clonado de template nunca herda uma.
 */
export function mesocycleStarts(macro: MacrocycleResponse): Map<string, Date> {
    const starts = new Map<string, Date>();
    let cursor =
        parseCivilDate(macro.start_date) ?? parseCivilDate(macro.created_at);
    for (const meso of sortedMesos(macro)) {
        const start = parseCivilDate(meso.start_date) ?? cursor;
        if (!start) continue;
        starts.set(meso.id, start);
        cursor =
            parseCivilDate(meso.end_date) ??
            addDays(start, Math.max(1, meso.duration_weeks) * 7);
    }
    return starts;
}

/**
 * Microciclo da semana de `now` dentro da fase. Antes do início da fase,
 * semana 1; depois do fim, a última — o aluno continua treinando até o
 * personal renovar o plano, e o que vale daí em diante é o filtro por data de
 * logsOfWeek. Sem data nenhuma para ancorar, volta à heurística por status.
 */
export function currentMicrocycleOf(
    macro: MacrocycleResponse,
    meso: MesocycleResponse,
    now: Date = new Date(),
): MicrocycleResponse | null {
    const micros = [...(meso.microcycles ?? [])].sort(
        (a, b) => a.week_number - b.week_number,
    );
    if (micros.length === 0) return null;
    const start = mesocycleStarts(macro).get(meso.id);
    if (!start) return pickActiveMicrocycle(meso.microcycles);
    const index = Math.min(
        Math.max(weeksBetween(start, now), 0),
        micros.length - 1,
    );
    return micros[index];
}

/**
 * Fase + semana valendo em `now`: a última fase que já começou, preferindo
 * uma com treinos montados (fase nova ainda vazia não tem o que mostrar nem o
 * que registrar). Antes do início do plano, a primeira fase.
 */
export function currentCycle(
    macro: MacrocycleResponse,
    now: Date = new Date(),
): { meso: MesocycleResponse; micro: MicrocycleResponse } | null {
    const mesos = sortedMesos(macro).filter(
        (m) => (m.microcycles ?? []).length > 0,
    );
    if (mesos.length === 0) return null;

    const starts = mesocycleStarts(macro);
    let meso: MesocycleResponse | undefined;
    if (starts.size === 0) {
        meso =
            mesos.find((m) =>
                m.microcycles.some((mc) => mc.status === 'in_progress'),
            ) ??
            mesos.find((m) =>
                m.microcycles.some((mc) => mc.status === 'pending'),
            ) ??
            mesos[mesos.length - 1];
    } else {
        const thisWeek = startOfWeek(now).getTime();
        const started = mesos.filter((m) => {
            const s = starts.get(m.id);
            return s !== undefined && startOfWeek(s).getTime() <= thisWeek;
        });
        const hasTrainings = (m: MesocycleResponse) =>
            (m.trainings ?? []).length > 0;
        meso =
            [...started].reverse().find(hasTrainings) ??
            started[started.length - 1] ??
            mesos.find(hasTrainings) ??
            mesos[0];
    }

    const micro = currentMicrocycleOf(macro, meso, now);
    return micro ? { meso, micro } : null;
}

/** O mínimo de um registro de treino que as regras de semana precisam — vale
 * para NewWorkoutLogResponse e PeriodizedWorkoutLogResponse. */
export interface WeekLog {
    status: 'pending' | 'completed' | 'skipped';
    completed_date?: string;
    client_completed_at?: string;
    updated_at?: string;
}

/**
 * Instante em que o treino foi FEITO: `client_completed_at` (hora do aparelho,
 * RFC3339 com fuso) e, na falta dele, `completed_date` — a hora do SERVIDOR,
 * em UTC e sem fuso ("2026-09-28 01:00:00"). Mesma preferência do backend
 * (PeriodizedWorkoutLog.PerformedAt). null para registro não concluído.
 */
export function performedAt(log: WeekLog): Date | null {
    if (log.status !== 'completed') return null;
    if (log.client_completed_at) {
        const d = new Date(log.client_completed_at);
        if (!Number.isNaN(d.getTime())) return d;
    }
    if (log.completed_date) {
        const d = new Date(`${log.completed_date.replace(' ', 'T')}Z`);
        if (!Number.isNaN(d.getTime())) return d;
    }
    return null;
}

/** Quando o registro aconteceu, para saber de que semana ele é: concluído →
 * performedAt; pulado ou pendente (pré-criado para uso offline) → a última
 * vez que foi tocado. */
function recordedAt(log: WeekLog): Date | null {
    const at = performedAt(log);
    if (at) return at;
    if (!log.updated_at) return null;
    const d = new Date(log.updated_at);
    return Number.isNaN(d.getTime()) ? null : d;
}

/** Só os registros da semana de `now`. É o que faz o "Concluído" sair do card
 * na segunda-feira, inclusive no plano simples, em que toda semana cai no
 * mesmo microciclo. */
export function logsOfWeek<T extends WeekLog>(
    logs: T[],
    now: Date = new Date(),
): T[] {
    const from = startOfWeek(now).getTime();
    const to = addDays(startOfWeek(now), 7).getTime();
    return logs.filter((log) => {
        const at = recordedAt(log)?.getTime();
        return at !== undefined && at >= from && at < to;
    });
}

/** Dias (locais) distintos com treino concluído: dois treinos no mesmo dia
 * contam um dia, que é a unidade da meta semanal. Espelha TrainedDays do
 * backend. */
export function trainedDays(logs: WeekLog[]): number {
    const days = new Set<string>();
    for (const log of logs) {
        const at = performedAt(log);
        if (at) days.add(localDateKey(at));
    }
    return days.size;
}

/** Meta da semana: os dias que o personal definiu na prescrição e, sem isso
 * (0/ausente), o número de treinos da fase, até 7. Espelha
 * Macrocycle.WeeklyTargetFor do backend. */
export function weeklyTargetDays(
    macro: MacrocycleResponse,
    meso: MesocycleResponse | null | undefined,
): number {
    if (macro.weekly_target_days && macro.weekly_target_days > 0) {
        return Math.min(macro.weekly_target_days, MAX_WEEKLY_TARGET_DAYS);
    }
    return Math.min((meso?.trainings ?? []).length, MAX_WEEKLY_TARGET_DAYS);
}

export interface WeeklyProgress {
    /** Dias com treino concluído nesta semana. */
    done: number;
    /** Meta da semana (0 = não há o que cumprir: fase sem treino). */
    target: number;
    completed: boolean;
}

/** Progresso da semana de `now` contra a meta. */
export function weeklyProgress(
    logs: WeekLog[],
    target: number,
    now: Date = new Date(),
): WeeklyProgress {
    const done = trainedDays(logsOfWeek(logs, now));
    return { done, target, completed: target > 0 && done >= target };
}
