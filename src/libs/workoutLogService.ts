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
    }>;
    notes?: string;
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
