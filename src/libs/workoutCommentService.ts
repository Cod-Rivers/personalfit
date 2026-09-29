import { Api } from '@/libs/api';

/** Comentário pós-treino como o servidor devolve
 * (dtos.WorkoutCommentResponse). */
export interface WorkoutCommentReply {
    reaction?: string;
    text?: string;
    at: string;
    seen_at?: string;
}

export interface WorkoutCommentWorkout {
    duration_minutes?: number;
    exercise_count: number;
    volume_kg: number;
    rpe_avg?: number;
    late: boolean;
    assisted: boolean;
    photo_url?: string;
    exercise_notes?: { exercise: string; note: string }[];
}

export interface WorkoutComment {
    id: string;
    student_id: string;
    student_name?: string;
    workout_log_id: string;
    client_mutation_id: string;
    training_ref: string;
    workout_at: string;
    text?: string;
    feeling?: number;
    tags: string[];
    pain_regions: string[];
    read_at?: string;
    reply?: WorkoutCommentReply;
    created_at: string;
    expires_at: string;
    workout?: WorkoutCommentWorkout;
}

export interface WorkoutCommentList {
    items: WorkoutComment[];
    next_cursor?: string;
}

export type WorkoutCommentStatusFilter = 'unread' | 'pain' | 'all';

/* ── Personal ── */

export async function listPersonalComments(params: {
    status?: WorkoutCommentStatusFilter;
    studentId?: string;
    before?: string;
    limit?: number;
}): Promise<WorkoutCommentList> {
    const { data } = await Api.get<WorkoutCommentList>('/personal/workout-comments', {
        params: {
            status: params.status,
            student_id: params.studentId,
            before: params.before,
            limit: params.limit,
        },
    });
    return { items: data.items ?? [], next_cursor: data.next_cursor };
}

export interface UnreadCommentCounts {
    total: number;
    by_student: Record<string, number>;
}

export async function getUnreadCommentCounts(): Promise<UnreadCommentCounts> {
    const { data } = await Api.get<UnreadCommentCounts>('/personal/workout-comments/unread-count');
    return { total: data.total ?? 0, by_student: data.by_student ?? {} };
}

export async function markCommentRead(commentId: string): Promise<void> {
    await Api.patch(`/personal/workout-comments/${commentId}/read`, {});
}

export async function replyToComment(
    commentId: string,
    body: { reaction?: string; text?: string },
): Promise<WorkoutComment> {
    const { data } = await Api.put<WorkoutComment>(`/personal/workout-comments/${commentId}/reply`, body);
    return data;
}

export async function listStudentComments(studentId: string): Promise<WorkoutComment[]> {
    const { data } = await Api.get<WorkoutCommentList>(`/students/${studentId}/workout-comments`);
    return data.items ?? [];
}

/* ── Aluno ── */

export async function listMyComments(): Promise<WorkoutComment[]> {
    const { data } = await Api.get<WorkoutCommentList>('/me/workout-comments');
    return data.items ?? [];
}

export async function markReplySeen(commentId: string): Promise<void> {
    await Api.patch(`/me/workout-comments/${commentId}/reply-seen`, {});
}

export async function getMyAIReportPrivacy(): Promise<{ opt_out: boolean }> {
    const { data } = await Api.get<{ opt_out: boolean }>('/me/privacy/ai-reports');
    return data;
}

export async function setMyAIReportPrivacy(optOut: boolean): Promise<{ opt_out: boolean }> {
    const { data } = await Api.put<{ opt_out: boolean }>('/me/privacy/ai-reports', { opt_out: optOut });
    return data;
}

/** Estado do comentário para o aluno: enviado (✓), visto (✓✓) ou com
 * resposta nova. */
export type CommentDeliveryState = 'sent' | 'seen' | 'replied' | 'reply_seen';

export function commentDeliveryState(c: Pick<WorkoutComment, 'read_at' | 'reply'>): CommentDeliveryState {
    if (c.reply) return c.reply.seen_at ? 'reply_seen' : 'replied';
    return c.read_at ? 'seen' : 'sent';
}
