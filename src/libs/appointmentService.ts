import { Api } from '@/libs/api';

export type AppointmentType = 'presencial' | 'online' | 'consultoria';
export type AppointmentStatus = 'pending' | 'confirmed' | 'attended' | 'missed' | 'cancelled' | 'cancelled_advance';
export type ExceptionStatus = 'pending' | 'accepted' | 'rejected';


export interface AppointmentResponse {
    id: string;
    personal_id: string;
    student_id: string;
    type: AppointmentType;
    status: AppointmentStatus;
    start_at: string; // ISO 8601
    end_at: string;
    meeting_link?: string;
    notes?: string;
    created_by: 'personal' | 'student';
    created_at: string;
}

export interface RecurrenceResponse {
    id: string;
    personal_id: string;
    student_id: string;
    type: AppointmentType;
    days_of_week: number[]; // 0=Sun … 6=Sat
    start_time: string;  // "HH:MM"
    end_time: string;
    meeting_link?: string;
    notes?: string;
    active_until?: string;
    created_at: string;
}

export interface RecurrenceExceptionResponse {
    id: string;
    recurrence_id: string;
    original_date: string;
    new_day_of_week?: number;
    new_start_time?: string;
    new_end_time?: string;
    status: ExceptionStatus;
    reason?: string;
    created_by: 'personal' | 'student';
    created_at: string;
}

export interface CreateAppointmentRequest {
    student_id: string;
    type: AppointmentType;
    start_at: string;
    end_at: string;
    meeting_link?: string;
    notes?: string;
}

export interface UpdateAppointmentRequest {
    start_at?: string;
    end_at?: string;
    meeting_link?: string;
    notes?: string;
}

export interface CreateRecurrenceRequest {
    student_id: string;
    type: AppointmentType;
    days_of_week: number[];
    start_time: string;
    end_time: string;
    meeting_link?: string;
    notes?: string;
    active_until?: string;
}

export interface CreateRecurrenceExceptionRequest {
    original_date: string;
    new_day_of_week?: number;
    new_start_time?: string;
    new_end_time?: string;
    reason?: string;
}

export interface StudentCreateAppointmentRequest {
    type: AppointmentType;
    start_at: string;
    end_at: string;
    meeting_link?: string;
    notes?: string;
}

// ── Personal API ──

export async function createAppointment(data: CreateAppointmentRequest): Promise<AppointmentResponse> {
    const res = await Api.post<AppointmentResponse>('/appointments', data);
    return res.data;
}

export async function listPersonalAppointments(from?: string, to?: string): Promise<AppointmentResponse[]> {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const res = await Api.get<AppointmentResponse[]>('/appointments', { params });
    return res.data;
}

export async function listStudentAppointments(studentId: string, from?: string, to?: string): Promise<AppointmentResponse[]> {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const res = await Api.get<AppointmentResponse[]>(`/students/${studentId}/appointments`, { params });
    return res.data;
}

export async function updateAppointment(id: string, data: UpdateAppointmentRequest): Promise<AppointmentResponse> {
    const res = await Api.patch<AppointmentResponse>(`/appointments/${id}`, data);
    return res.data;
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<void> {
    await Api.patch(`/appointments/${id}/status`, { status });
}

export async function deleteAppointment(id: string): Promise<void> {
    await Api.delete(`/appointments/${id}`);
}

export async function createRecurrence(studentId: string, data: CreateRecurrenceRequest): Promise<RecurrenceResponse> {
    const res = await Api.post<RecurrenceResponse>(`/students/${studentId}/recurrences`, data);
    return res.data;
}

export async function listStudentRecurrences(studentId: string): Promise<RecurrenceResponse[]> {
    const res = await Api.get<RecurrenceResponse[]>(`/students/${studentId}/recurrences`);
    return res.data;
}

export async function listAllRecurrences(): Promise<RecurrenceResponse[]> {
    const res = await Api.get<RecurrenceResponse[]>('/recurrences');
    return res.data;
}

export async function deleteRecurrence(id: string): Promise<void> {
    await Api.delete(`/recurrences/${id}`);
}

// ── Recurrence Exceptions API ──

export async function createException(recurrenceId: string, data: CreateRecurrenceExceptionRequest): Promise<RecurrenceExceptionResponse> {
    const res = await Api.post<RecurrenceExceptionResponse>(`/recurrences/${recurrenceId}/exceptions`, data);
    return res.data;
}

export async function listExceptions(recurrenceId: string): Promise<RecurrenceExceptionResponse[]> {
    const res = await Api.get<RecurrenceExceptionResponse[]>(`/recurrences/${recurrenceId}/exceptions`);
    return res.data;
}

export async function acceptException(excId: string): Promise<void> {
    await Api.patch(`/recurrences/exceptions/${excId}/accept`, {});
}

export async function rejectException(excId: string): Promise<void> {
    await Api.patch(`/recurrences/exceptions/${excId}/reject`, {});
}

export async function requestException(recurrenceId: string, data: CreateRecurrenceExceptionRequest): Promise<RecurrenceExceptionResponse> {
    const res = await Api.post<RecurrenceExceptionResponse>(`/my-recurrences/${recurrenceId}/exceptions`, data);
    return res.data;
}

export async function listMyExceptions(recurrenceId: string): Promise<RecurrenceExceptionResponse[]> {
    const res = await Api.get<RecurrenceExceptionResponse[]>(`/my-recurrences/${recurrenceId}/exceptions`);
    return res.data;
}

// ── Student API ──

/** Aviso retornado quando o personal vinculado ainda não é PRO: a Agenda é um
 *  recurso PRO, então nenhum agendamento é criado — o personal é apenas avisado. */
export interface AppointmentPendingProResponse {
    pending_pro: true;
    message: string;
}

export type RequestAppointmentResult =
    | AppointmentResponse
    | AppointmentPendingProResponse;

export function isPendingProResponse(
    r: RequestAppointmentResult,
): r is AppointmentPendingProResponse {
    return (r as AppointmentPendingProResponse).pending_pro === true;
}

export async function requestAppointment(
    data: StudentCreateAppointmentRequest,
): Promise<RequestAppointmentResult> {
    const res = await Api.post<RequestAppointmentResult>(
        '/my-appointments',
        data,
    );
    return res.data;
}

export async function listMyAppointments(from?: string, to?: string): Promise<AppointmentResponse[]> {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const res = await Api.get<AppointmentResponse[]>('/my-appointments', { params });
    return res.data;
}

export async function confirmMyAppointment(id: string): Promise<void> {
    await Api.patch(`/my-appointments/${id}/confirm`, {});
}

export async function cancelMyAppointment(id: string): Promise<void> {
    await Api.patch(`/my-appointments/${id}/cancel`, {});
}

export async function cancelMyAppointmentAdvance(id: string): Promise<void> {
    await Api.patch(`/my-appointments/${id}/cancel-advance`, {});
}

export async function updateCancelAdvanceHours(hours: number): Promise<void> {
    await Api.patch('/settings/cancel-advance-hours', { hours });
}

// ── Helpers ──

export const APPOINTMENT_TYPE_LABEL: Record<AppointmentType, string> = {
    presencial: 'Presencial',
    online: 'Online',
    consultoria: 'Consultoria',
};

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    attended: 'Presente',
    missed: 'Faltou',
    cancelled: 'Cancelado',
    cancelled_advance: 'Cancelado c/ antecedência',
};

export const DAY_OF_WEEK_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const EXCEPTION_STATUS_LABEL: Record<ExceptionStatus, string> = {
    pending: 'Pendente',
    accepted: 'Aceita',
    rejected: 'Rejeitada',
};
