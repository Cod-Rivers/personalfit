/**
 * Comentário do aluno para o personal no fim do treino
 * (Todo/PLANO_COMENTARIO_POS_TREINO.md, Parte A). Lógica pura — sem React
 * nem axios — para ser testada ao lado (workoutComment.test.ts).
 *
 * As listas abaixo precisam ficar em sincronia com o backend:
 * Personal-fit-Back/internal/domain/training/workout-comment.go
 * (ValidWorkoutCommentTags, ValidPainRegions, ValidWorkoutCommentReactions).
 */
import {
    detectNewRecords,
    exerciseKeyFor,
    resolveExerciseKey,
    type LoadHistoryResponse,
    type PerformedExercise,
} from '@/libs/loadHistory';
import type { WorkoutSessionCommentRequest } from '@/libs/workoutLogService';

export const WORKOUT_COMMENT_MAX_TEXT = 1000;
export const WORKOUT_COMMENT_REPLY_MAX = 500;
/** Quanto tempo o comentário fica guardado (D1): some depois disso. */
export const WORKOUT_COMMENT_RETENTION_DAYS = 60;

export const PAIN_TAG = 'dor';

export const WORKOUT_COMMENT_TAGS = [
    { value: PAIN_TAG, label: 'Senti dor' },
    { value: 'carga_leve', label: 'Carga leve' },
    { value: 'carga_pesada', label: 'Carga pesada' },
    { value: 'cansado', label: 'Cansado' },
    { value: 'sem_tempo', label: 'Sem tempo' },
    { value: 'equipamento_ocupado', label: 'Aparelho ocupado' },
    { value: 'gostei', label: 'Gostei do treino' },
] as const;

/** As mesmas 9 regiões da Anamnese do personal. */
export const PAIN_REGIONS = [
    { value: 'cervical', label: 'Pescoço' },
    { value: 'ombro', label: 'Ombro' },
    { value: 'cotovelo', label: 'Cotovelo' },
    { value: 'punho', label: 'Punho / mão' },
    { value: 'toracica', label: 'Costas (alta)' },
    { value: 'lombar', label: 'Lombar' },
    { value: 'quadril', label: 'Quadril' },
    { value: 'joelho', label: 'Joelho' },
    { value: 'tornozelo', label: 'Tornozelo / pé' },
] as const;

export const FEELINGS = [
    { value: 1, emoji: '😫', label: 'Muito cansativo' },
    { value: 2, emoji: '😕', label: 'Difícil' },
    { value: 3, emoji: '😐', label: 'Normal' },
    { value: 4, emoji: '🙂', label: 'Bom' },
    { value: 5, emoji: '💪', label: 'Ótimo' },
] as const;

export const REPLY_REACTIONS = [
    { value: 'aplauso', emoji: '👏', label: 'Aplausos' },
    { value: 'forca', emoji: '💪', label: 'Força' },
    { value: 'fogo', emoji: '🔥', label: 'Mandou bem' },
    { value: 'coracao', emoji: '❤️', label: 'Carinho' },
    { value: 'joinha', emoji: '👍', label: 'Joinha' },
] as const;

const TAG_LABEL = new Map<string, string>(WORKOUT_COMMENT_TAGS.map((t) => [t.value, t.label]));
const REGION_LABEL = new Map<string, string>(PAIN_REGIONS.map((r) => [r.value, r.label]));
const FEELING_BY_VALUE = new Map<number, (typeof FEELINGS)[number]>(FEELINGS.map((f) => [f.value, f]));
const REACTION_BY_VALUE = new Map<string, (typeof REPLY_REACTIONS)[number]>(REPLY_REACTIONS.map((r) => [r.value, r]));

export function tagLabel(tag: string): string {
    return TAG_LABEL.get(tag) ?? tag;
}

export function painRegionLabel(region: string): string {
    return REGION_LABEL.get(region) ?? region;
}

export function feelingOption(value: number | null | undefined) {
    return value == null ? undefined : FEELING_BY_VALUE.get(value);
}

export function reactionOption(value: string | null | undefined) {
    return value ? REACTION_BY_VALUE.get(value) : undefined;
}

/* ── Rascunho do comentário na tela de check-in ── */

export interface WorkoutCommentDraft {
    text: string;
    feeling: number | null;
    tags: string[];
    painRegions: string[];
}

export const EMPTY_COMMENT_DRAFT: WorkoutCommentDraft = {
    text: '',
    feeling: null,
    tags: [],
    painRegions: [],
};

export function isCommentDraftEmpty(d: WorkoutCommentDraft): boolean {
    return d.text.trim() === '' && d.feeling == null && d.tags.length === 0;
}

/** Liga/desliga um valor numa lista (chip de múltipla escolha). Tirar o
 * marcador de dor apaga as regiões: região só vale junto de dor. */
export function toggleTag(d: WorkoutCommentDraft, tag: string): WorkoutCommentDraft {
    const has = d.tags.includes(tag);
    const tags = has ? d.tags.filter((t) => t !== tag) : [...d.tags, tag];
    const painRegions = tag === PAIN_TAG && has ? [] : d.painRegions;
    return { ...d, tags, painRegions };
}

export function toggleRegion(d: WorkoutCommentDraft, region: string): WorkoutCommentDraft {
    const painRegions = d.painRegions.includes(region)
        ? d.painRegions.filter((r) => r !== region)
        : [...d.painRegions, region];
    return { ...d, painRegions };
}

/** Converte o rascunho no corpo da sessão. `undefined` quando não há nada a
 * mandar — o campo nem vai no corpo. */
export function toCommentRequest(d: WorkoutCommentDraft): WorkoutSessionCommentRequest | undefined {
    if (isCommentDraftEmpty(d)) return undefined;
    const text = d.text.trim().slice(0, WORKOUT_COMMENT_MAX_TEXT);
    const out: WorkoutSessionCommentRequest = {};
    if (text) out.text = text;
    if (d.feeling != null) out.feeling = d.feeling;
    if (d.tags.length) out.tags = [...d.tags];
    if (d.tags.includes(PAIN_TAG) && d.painRegions.length) out.pain_regions = [...d.painRegions];
    return out;
}

/* ── Pergunta que muda com o treino (seção 5.2 do plano) ── */

export interface CommentPromptContext {
    personalName: string | null;
    /** Exercício em que o aluno bateu recorde neste treino. */
    recordExercise: string | null;
    /** RPE médio das séries deste treino. */
    avgRpe: number | null;
    /** Dias desde o treino anterior, pelo histórico em cache. */
    daysSinceLastWorkout: number | null;
    /** Exercício que o aluno fez pela primeira vez. */
    firstTimeExercise: string | null;
    /** O registro deve ficar marcado como tardio. */
    late: boolean;
}

/** A pergunta do campo de comentário, por prioridade: recorde, treino puxado,
 * volta depois de pausa, exercício novo, tardio, padrão. */
export function workoutCommentPrompt(ctx: CommentPromptContext): string {
    const who = ctx.personalName?.trim() || 'seu personal';
    if (ctx.recordExercise) {
        return `Bateu recorde no ${ctx.recordExercise}! Conta pra ${who} como foi.`;
    }
    if (ctx.avgRpe != null && ctx.avgRpe >= 9) {
        return `Treino puxado. Deu tudo certo? Conta pra ${who}.`;
    }
    if (ctx.daysSinceLastWorkout != null && ctx.daysSinceLastWorkout >= 7) {
        return 'Bem-vindo de volta! Como foi retomar?';
    }
    if (ctx.firstTimeExercise) {
        return `Primeira vez no ${ctx.firstTimeExercise}. O que achou?`;
    }
    if (ctx.late) {
        return 'Treino registrado depois do prazo. Quer contar o que houve?';
    }
    // Sem artigo antes do nome ("a Ana", "o João"): o app não sabe o gênero.
    return `Como foi o treino? ${ctx.personalName?.trim() ? who : 'Seu personal'} lê todos os comentários.`;
}

/** Monta o contexto da pergunta a partir do que o aparelho já tem: as séries
 * lançadas e o histórico de carga em cache (pode ser null offline). */
export function buildCommentPromptContext(
    performed: PerformedExercise[],
    rpes: number[],
    history: LoadHistoryResponse | null | undefined,
    personalName: string | null,
    today: Date = new Date(),
): Omit<CommentPromptContext, 'late'> {
    const records = detectNewRecords(performed, history);
    const valid = rpes.filter((r) => r > 0);
    const avgRpe = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;

    let daysSinceLastWorkout: number | null = null;
    let firstTimeExercise: string | null = null;
    if (history && history.exercises.length) {
        let last = '';
        for (const ex of history.exercises) {
            const d = ex.summary.last?.date ?? '';
            if (d > last) last = d;
        }
        if (last) {
            const [y, m, d] = last.split('-').map(Number);
            const lastDay = new Date(y, m - 1, d);
            const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            daysSinceLastWorkout = Math.round((todayDay.getTime() - lastDay.getTime()) / 86_400_000);
        }
        const known = new Set(history.exercises.map((e) => e.exercise_key));
        for (const ex of performed) {
            if (ex.timed) continue;
            const key = resolveExerciseKey(
                exerciseKeyFor({ exercise_library_id: ex.exerciseLibraryId, name: ex.name }),
                history.aliases,
            );
            if (key && !known.has(key)) {
                firstTimeExercise = ex.name;
                break;
            }
        }
    }

    return {
        personalName,
        recordExercise: records[0]?.name ?? null,
        avgRpe,
        daysSinceLastWorkout,
        firstTimeExercise,
    };
}

/* ── Lembrete leve (no máximo um por semana) ── */

const NUDGE_KEY = 'venafit:comment-nudge';
const NUDGE_AFTER_EMPTY = 3;
const NUDGE_INTERVAL_MS = 7 * 86_400_000;

export interface CommentNudgeState {
    /** Treinos seguidos concluídos sem comentário. */
    emptyStreak: number;
    lastNudgeAt?: string;
}

/** O lembrete aparece quando o aluno não comenta há 3 treinos e não viu
 * lembrete nos últimos 7 dias. Função pura. */
export function shouldNudge(state: CommentNudgeState, now: Date = new Date()): boolean {
    if (state.emptyStreak < NUDGE_AFTER_EMPTY) return false;
    if (!state.lastNudgeAt) return true;
    return now.getTime() - new Date(state.lastNudgeAt).getTime() >= NUDGE_INTERVAL_MS;
}

export function readNudgeState(): CommentNudgeState {
    if (typeof window === 'undefined') return { emptyStreak: 0 };
    try {
        const raw = window.localStorage.getItem(NUDGE_KEY);
        if (!raw) return { emptyStreak: 0 };
        const parsed = JSON.parse(raw) as CommentNudgeState;
        return { emptyStreak: Number(parsed.emptyStreak) || 0, lastNudgeAt: parsed.lastNudgeAt };
    } catch {
        return { emptyStreak: 0 };
    }
}

function writeNudgeState(state: CommentNudgeState): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(NUDGE_KEY, JSON.stringify(state));
    } catch {
        // Preferência do aparelho: sem storage, o lembrete só não aparece.
    }
}

export function markNudged(now: Date = new Date()): void {
    writeNudgeState({ ...readNudgeState(), lastNudgeAt: now.toISOString() });
}

/** Registra o resultado de um check-in: comentou zera a sequência. */
export function recordCommentOutcome(commented: boolean): void {
    const state = readNudgeState();
    writeNudgeState({ ...state, emptyStreak: commented ? 0 : state.emptyStreak + 1 });
}

/* ── Rótulos para a tela ── */

/** "Senti dor (joelho, lombar) · Carga leve" */
export function describeCommentFacts(tags: string[], regions: string[]): string {
    return tags
        .map((t) =>
            t === PAIN_TAG && regions.length
                ? `${tagLabel(t)} (${regions.map((r) => painRegionLabel(r).toLowerCase()).join(', ')})`
                : tagLabel(t),
        )
        .join(' · ');
}

/** Dias que faltam para o comentário expirar (0 = expira hoje). */
export function daysUntilExpiry(expiresAt: string, now: Date = new Date()): number {
    const ms = new Date(expiresAt).getTime() - now.getTime();
    return Math.max(0, Math.ceil(ms / 86_400_000));
}
