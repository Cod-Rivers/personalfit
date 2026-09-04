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

/* ── New API ── */
export async function createNewWorkoutLog(
    studentId: string,
    planningId: string,
    mesocycleId: string,
    microcycleId: string,
    body: CreateNewWorkoutLogRequest,
): Promise<NewWorkoutLogResponse> {
    const { data } = await Api.post<NewWorkoutLogResponse>(
        `/students/${studentId}/planning/${planningId}/mesocycle/${mesocycleId}/microcycle/${microcycleId}/workout-log`,
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
    const { data } = await Api.get<NewWorkoutLogResponse[]>(
        `/students/${studentId}/planning/${planningId}/mesocycle/${mesocycleId}/microcycle/${microcycleId}/workout-logs`,
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
        `/students/${studentId}/planning/${planningId}/mesocycle/${mesocycleId}/microcycle/${microcycleId}/workout-log/${workoutLogId}/complete`,
        body,
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
        `/students/${studentId}/planning/${planningId}/mesocycle/${mesocycleId}/microcycle/${microcycleId}/workout-log/${workoutLogId}/skip`,
        { reason },
    );
    return data;
}
