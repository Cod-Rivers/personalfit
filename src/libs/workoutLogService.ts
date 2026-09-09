import { Api } from '@/libs/api';

export interface WorkoutExerciseRequest {
    name: string;
    series: number[];
    weight: number;
    notes: string;
}

export interface CreateWorkoutLogRequest {
    date: string;
    reference: string;
    completed: boolean;
    macrocycle_id?: string;
    duration_minutes?: number;
    notes: string;
    exercises: WorkoutExerciseRequest[];
}

export interface WorkoutLogResponse {
    id: string;
    personal_id: string;
    student_id: string;
    macrocycle_id?: string;
    date: string;
    reference: string;
    exercises: WorkoutExerciseRequest[];
    duration_minutes?: number;
    notes: string;
    completed: boolean;
    created_at: string;
}

/* ── Enhanced workout tracking types (new) ── */
export interface ExercisePerformanceResponse {
    id: string;
    exercise_id: string;
    name: string;
    series: number;
    reps: number;
    load_kg: number;
    rpe: number;
    notes?: string;
    /** Bissérie/trissérie/superssérie a que este exercício pertencia no
     * plano (espelha ExerciseResponse.group_id). Ausente = avulso. */
    group_id?: string;
}

export interface NewWorkoutLogResponse {
    id: string;
    macrocycle_id: string;
    mesocycle_id: string;
    microcycle_id: string;
    student_id: string;
    training_ref: string;
    status: 'pending' | 'completed' | 'skipped';
    planned_date: string;
    completed_date?: string;
    duration_minutes?: number;
    exercises: ExercisePerformanceResponse[];
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateNewWorkoutLogRequest {
    planned_date: string;
    training_ref: string;
}

export interface CompleteWorkoutLogRequest {
    duration_minutes?: number;
    exercises: Array<{
        exercise_id: string;
        series: number;
        reps: number;
        load_kg: number;
        rpe: number;
        notes?: string;
        group_id?: string;
    }>;
    notes?: string;
    /** Quando o aluno concluiu o treino NESTE aparelho, em RFC3339 com offset
     * de fuso. Preenchido com clientCompletedAtNow() no instante em que ele
     * finaliza — não no instante do envio.
     *
     * É o que impede que o tempo parado na fila offline vire "tardio": sem
     * este campo o servidor usa o relógio dele, e um treino feito no dia certo
     * que só sincronizou três dias depois seria marcado como atrasado. */
    client_completed_at?: string;
}

/** Instante atual em RFC3339 COM o offset de fuso do aparelho
 * ("2026-09-04T22:30:00-03:00").
 *
 * Não use `new Date().toISOString()` para isto: ele devolve UTC ("...Z"), e o
 * servidor precisa do offset para saber em que DIA o aluno estava. Às 22:30 em
 * Brasília já é o dia seguinte em UTC — com o offset perdido, um treino
 * concluído dentro do prazo apareceria como tardio, e essa marcação nunca é
 * reavaliada depois. */
export function clientCompletedAtNow(date: Date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    // getTimezoneOffset() devolve UTC menos local, invertido: em Brasília
    // (UTC-3) o retorno é +180. Daí o sinal trocado aqui.
    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMinutes);

    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
        `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
    );
}


/* ── Legacy API ── */
export async function saveWorkoutLog(
    _studentId: string,
    data: CreateWorkoutLogRequest,
): Promise<WorkoutLogResponse> {
    const res = await Api.post<WorkoutLogResponse>(
        `/my-workout-logs`,
        data,
    );
    return res.data;
}

/* ── New API ──
 * As rotas abaixo usam /me/planning/... (o aluno logado registrando o
 * próprio treino), não /students/:id/planning/... (essa é exclusiva do
 * personal — RequireRole(personal) rejeitava com 403 toda conta
 * role=student, que é o default do cadastro: pendência -16 do
 * TAREFAS_PENDENTES.md). studentId continua no parâmetro por compatibilidade
 * de assinatura com quem já chama essas funções, mas não entra mais na URL —
 * o backend resolve o aluno pelo usuário autenticado
 * (app_shared.ResolveStudentID). */
export async function createNewWorkoutLog(
    studentId: string,
    planningId: string,
    mesocycleId: string,
    microcycleId: string,
    body: CreateNewWorkoutLogRequest,
): Promise<NewWorkoutLogResponse> {
    const { data } = await Api.post<NewWorkoutLogResponse>(
        `/me/planning/${planningId}/mesocycle/${mesocycleId}/microcycle/${microcycleId}/workout-log`,
        body,
    );
    return data;
}

export async function getNewWorkoutLogs(
    studentId: string,
    planningId: string,
    mesocycleId: string,
    microcycleId: string,
): Promise<NewWorkoutLogResponse[]> {
    // "workout-log" no SINGULAR aqui — é o GetWorkoutLogs escopado a um
    // microciclo (meso.GET("", ...) em PeriodizedWorkoutLogRoutes), diferente
    // do "/workout-logs" plural do macrociclo inteiro (GetPlanWorkoutLogs).
    // Achado batendo esta função contra a rota real: chamava o plural aqui e
    // sempre voltava 404, então `ensurePendingWorkoutLogs`
    // (downloadManager.ts) nunca chegava a tentar pré-criar nada — o
    // try/catch engolia o 404 e retornava cedo demais.
    const { data } = await Api.get<NewWorkoutLogResponse[]>(
        `/me/planning/${planningId}/mesocycle/${mesocycleId}/microcycle/${microcycleId}/workout-log`,
    );
    return data ?? [];
}

/**
 * Logs do aluno logado através de todos os macro/meso/microciclos, filtrados
 * por planned_date. Usado pelo calendário de constância (histórico web).
 */
export async function getMyWorkoutLogsInRange(
    from: string,
    to: string,
): Promise<NewWorkoutLogResponse[]> {
    const { data } = await Api.get<NewWorkoutLogResponse[]>(
        `/me/workout-logs`,
        { params: { from, to } },
    );
    return data ?? [];
}

export async function completeNewWorkoutLog(
    studentId: string,
    planningId: string,
    mesocycleId: string,
    microcycleId: string,
    workoutLogId: string,
    body: CompleteWorkoutLogRequest,
): Promise<NewWorkoutLogResponse> {
    const { data } = await Api.patch<NewWorkoutLogResponse>(
        `/me/planning/${planningId}/mesocycle/${mesocycleId}/microcycle/${microcycleId}/workout-log/${workoutLogId}/complete`,
        body,
    );
    return data;
}

/* ── Endpoint de sessão idempotente (Sprint 3 — cria-ou-conclui numa
 * chamada só, sem depender de log pré-criado). Ver
 * dtos.WorkoutSessionRequest / workout-session-controller.go no backend. ── */

export interface WorkoutSessionExerciseRequest {
    exercise_id: string;
    name: string;
    series: number;
    // reps e load_kg NÃO são opcionais nem tratados como "vazio" quando 0:
    // 0 reps (série falhada) e 0kg (peso corporal) são valores legítimos —
    // o backend usa `binding:"gte=0"`, nunca `required`, por esse motivo
    // (já derrubou produção duas vezes tratando 0 como ausente).
    reps: number;
    load_kg: number;
    rpe: number;
    notes?: string;
    group_id?: string;
}

export interface WorkoutSessionCheckInRequest {
    confirmed_at: string;
}

export interface WorkoutSessionRequest {
    client_mutation_id: string;
    // Diferente de CompleteWorkoutLogRequest.client_completed_at (opcional):
    // aqui é obrigatório, porque todo cliente que já fala com /session já
    // sabe mandar o campo (não há compatibilidade retroativa a preservar
    // neste endpoint novo). RFC3339 COM offset — ver clientCompletedAtNow().
    client_completed_at: string;
    training_ref: string;
    planned_date: string; // YYYY-MM-DD
    duration_minutes?: number;
    notes?: string;
    check_in?: WorkoutSessionCheckInRequest;
    exercises: WorkoutSessionExerciseRequest[];
}

/** Cria-ou-conclui a sessão numa chamada só (POST idempotente por
 * client_mutation_id). Reenviar o mesmo corpo não duplica: o servidor
 * devolve 200 com o documento já gravado (C-1) em vez de criar de novo. */
export async function completeWorkoutSession(
    studentId: string,
    planningId: string,
    mesocycleId: string,
    microcycleId: string,
    body: WorkoutSessionRequest,
): Promise<NewWorkoutLogResponse> {
    const { data } = await Api.post<NewWorkoutLogResponse>(
        `/me/planning/${planningId}/mesocycle/${mesocycleId}/microcycle/${microcycleId}/workout-log/session`,
        body,
    );
    return data;
}

/* ── Foto de check-in (Sprint 4 / S4.3, mediaQueue.ts) — atrás da flag
 * ADHERENCE_PHOTO_ENABLED no backend; desligada, 404 nativo do gin. Mesmo
 * par (photo_key + upload_url) de fotos de evolução (evolutionService.ts):
 * a foto sobe por PUT presigned direto ao R2, nunca passando por estas
 * funções — elas só pedem a URL e depois confirmam. ── */

export interface CheckInPhotoUploadURLResponse {
    photo_key: string;
    upload_url: string;
}

export async function requestCheckInPhotoUploadUrl(
    studentId: string,
    planningId: string,
    mesocycleId: string,
    microcycleId: string,
    workoutLogId: string,
    contentType: string,
): Promise<CheckInPhotoUploadURLResponse> {
    const { data } = await Api.post<CheckInPhotoUploadURLResponse>(
        `/me/planning/${planningId}/mesocycle/${mesocycleId}/microcycle/${microcycleId}/workout-log/${workoutLogId}/check-in/photo-url`,
        { content_type: contentType },
    );
    return data;
}

/** Confirma ao backend que o PUT ao R2 terminou — devolve o log atualizado
 * com `check_in.photo_key`/`check_in.photo_added_at` preenchidos. Se a foto
 * estourar o limite de tamanho, o backend descarta SÓ a foto e mantém o
 * check-in (S-10) — mas isso chega como erro nesta chamada, não como
 * sucesso silencioso: quem chama precisa tratar o reject. */
export async function confirmCheckInPhoto(
    studentId: string,
    planningId: string,
    mesocycleId: string,
    microcycleId: string,
    workoutLogId: string,
    photoKey: string,
): Promise<NewWorkoutLogResponse> {
    const { data } = await Api.patch<NewWorkoutLogResponse>(
        `/me/planning/${planningId}/mesocycle/${mesocycleId}/microcycle/${microcycleId}/workout-log/${workoutLogId}/check-in/photo`,
        { photo_key: photoKey },
    );
    return data;
}

export async function skipNewWorkoutLog(
    studentId: string,
    planningId: string,
    mesocycleId: string,
    microcycleId: string,
    workoutLogId: string,
    reason: string,
): Promise<NewWorkoutLogResponse> {
    const { data } = await Api.patch<NewWorkoutLogResponse>(
        `/me/planning/${planningId}/mesocycle/${mesocycleId}/microcycle/${microcycleId}/workout-log/${workoutLogId}/skip`,
        { reason },
    );
    return data;
}
