import { Api } from '@/libs/api';


/* ── Types ── */

export interface TemplateResponse {
    id: string;
    personal_id: string;
    student_id: string;
    name: string;
    goal: string;
    start_date?: string;
    end_date?: string;
    status: string;
    is_template: boolean;
    is_public: boolean;
    created_by_admin: boolean;
    approval_status?: 'approved' | 'pending' | 'rejected' | '';
    rejection_reason?: string;
    featured: boolean;
    usage_count: number;
    owner_name?: string;
    owner_role?: string;
    mesocycles: MesocycleResponse[];
    created_at: string;
}

export interface MesocycleResponse {
    id: string;
    order: number;
    name: string;
    phase: string;
    duration_weeks: number;
    methodology: string;
    trainings: TrainingResponse[];
    microcycles: MicrocycleResponse[];
}

export interface TrainingResponse {
    id: string;
    reference: string;
    exercises: ExerciseResponse[];
}

export interface ExerciseResponse {
    id: string;
    name: string;
    series: number[];
    variations: string;
    comments?: string;
    video_url: string;
    video_thumb: string;
    timed: boolean;
}

export interface MicrocycleResponse {
    id: string;
    week_number: number;
    status: string;
}

export interface RatingResponse {
    id: string;
    user_id: string;
    target_id: string;
    target_type: string;
    stars: number;
    comment: string;
    created_at: string;
}

export interface RatingAggregationResponse {
    target_id: string;
    target_type: string;
    avg_stars: number;
    count: number;
    target_name?: string;
}

export interface ExerciseLibraryItem {
    id: string;
    name: string;
    muscle_group: string;
    category: string;
    video_url: string;
    video_thumb: string;
    description: string;
    tags: string[];
    created_at: string;
    updated_at: string;
}

export interface NotificationResponse {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    created_at: string;
}

export interface AuditLogResponse {
    id: string;
    user_id: string;
    user_email: string;
    action: string;
    resource: string;
    resource_id: string;
    details: string;
    created_at: string;
}

export interface PaginatedAuditLogs {
    logs: AuditLogResponse[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export interface MetricsResponse {
    total_users: number;
    total_personals: number;
    total_students: number;
    total_admins: number;
    total_macrocycles: number;
    total_templates: number;
}

export interface UserListItem {
    id: string;
    name: string;
    email: string;
    role: string;
    active: boolean;
    created_at: string;
}

/* ── Templates ── */

export async function getTemplates(): Promise<TemplateResponse[]> {
    const { data } = await Api.get<TemplateResponse[]>('/admin/templates');
    return data ?? [];
}

export async function getTemplate(id: string): Promise<TemplateResponse> {
    const { data } = await Api.get<TemplateResponse>(`/admin/templates/${id}`);
    return data;
}

export async function createTemplate(body: { name: string; goal: string; is_public?: boolean; mesocycles?: unknown[] }): Promise<TemplateResponse> {
    const { data } = await Api.post<TemplateResponse>('/admin/templates', body);
    return data;
}

export async function deleteTemplate(id: string): Promise<void> {
    await Api.delete(`/admin/templates/${id}`);
}

export async function assignTemplate(templateId: string, personalId: string, studentId: string): Promise<unknown> {
    const { data } = await Api.post(`/admin/templates/${templateId}/assign`, { personal_id: personalId, student_id: studentId });
    return data;
}

/** Templates públicos submetidos por personal trainers, aguardando revisão. */
export async function getPendingTemplates(): Promise<TemplateResponse[]> {
    const { data } = await Api.get<TemplateResponse[]>('/admin/templates/pending');
    return data ?? [];
}

export async function approveTemplate(id: string): Promise<TemplateResponse> {
    const { data } = await Api.post<TemplateResponse>(`/admin/templates/${id}/approve`, {});
    return data;
}

export async function rejectTemplate(id: string, reason?: string): Promise<TemplateResponse> {
    const { data } = await Api.post<TemplateResponse>(`/admin/templates/${id}/reject`, { reason: reason ?? '' });
    return data;
}

export async function setTemplateFeatured(id: string, featured: boolean): Promise<TemplateResponse> {
    const { data } = await Api.patch<TemplateResponse>(`/admin/templates/${id}/featured`, { featured });
    return data;
}

/* ── Ratings ── */

export async function getRatings(): Promise<RatingResponse[]> {
    const { data } = await Api.get<RatingResponse[]>('/admin/ratings');
    return data ?? [];
}

export async function getTopRated(type: string = 'macrocycle', limit: number = 10): Promise<RatingAggregationResponse[]> {
    const { data } = await Api.get<RatingAggregationResponse[]>(`/admin/ratings/top?type=${type}&limit=${limit}`);
    return data ?? [];
}

export async function promoteToTemplate(macrocycleId: string): Promise<TemplateResponse> {
    const { data } = await Api.post<TemplateResponse>(`/admin/ratings/${macrocycleId}/promote`, {});
    return data;
}

/* ── Exercises ── */

export async function getExercises(search?: string): Promise<ExerciseLibraryItem[]> {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    const { data } = await Api.get<ExerciseLibraryItem[]>(`/admin/exercises${q}`);
    return data ?? [];
}

export async function createExercise(body: Partial<ExerciseLibraryItem>): Promise<ExerciseLibraryItem> {
    const { data } = await Api.post<ExerciseLibraryItem>('/admin/exercises', body);
    return data;
}

export async function updateExercise(id: string, body: Partial<ExerciseLibraryItem>): Promise<ExerciseLibraryItem> {
    const { data } = await Api.put<ExerciseLibraryItem>(`/admin/exercises/${id}`, body);
    return data;
}

export async function deleteExercise(id: string): Promise<void> {
    await Api.delete(`/admin/exercises/${id}`);
}

export async function uploadExerciseImage(id: string, file: File): Promise<ExerciseLibraryItem> {
    const form = new FormData();
    form.append('image', file);
    const { data } = await Api.post<ExerciseLibraryItem>(`/admin/exercises/${id}/image`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
}

/** Solicita PUT presigned URL para upload direto ao Cloudflare R2 (Admin). */
export async function requestExerciseUploadUrl(exerciseId: string, file: File): Promise<{ upload_url: string; object_path: string; content_type: string }> {
    const { data } = await Api.post('/admin/exercises/upload-url', {
        exercise_id: exerciseId,
        content_type: file.type,
        filename: file.name,
    });
    return data;
}

/** Faz PUT direto ao R2 usando a presigned URL (sem Authorization header). */
export async function uploadToR2(signedUrl: string, file: File, onProgress?: (pct: number) => void): Promise<void> {
    await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signedUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        if (onProgress) {
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
            };
        }
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload R2 falhou: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error('Erro de rede no upload R2'));
        xhr.send(file);
    });
}

/** Confirma que o upload foi concluído e salva a key R2 no exercício. */
export async function confirmExerciseVideo(id: string, objectPath: string): Promise<ExerciseLibraryItem> {
    const { data } = await Api.post<ExerciseLibraryItem>(`/admin/exercises/${id}/video-confirm`, { object_path: objectPath });
    return data;
}

/** Define URL YouTube/Vimeo para um exercício da biblioteca. */
export async function setExerciseVideoUrl(id: string, videoUrl: string): Promise<ExerciseLibraryItem> {
    const { data } = await Api.put<ExerciseLibraryItem>(`/admin/exercises/${id}/video-url`, { video_url: videoUrl });
    return data;
}

/* ── Notifications ── */

export async function getAdminNotifications(): Promise<NotificationResponse[]> {
    const { data } = await Api.get<NotificationResponse[]>('/admin/notifications');
    return data ?? [];
}

export async function sendNotification(body: { user_id?: string; title: string; message: string; type?: string }): Promise<NotificationResponse> {
    const { data } = await Api.post<NotificationResponse>('/admin/notifications', body);
    return data;
}

/* ── Audit Logs ── */

export async function getAuditLogs(page: number = 1, pageSize: number = 20, filters?: { action?: string; resource?: string }): Promise<PaginatedAuditLogs> {
    let q = `?page=${page}&page_size=${pageSize}`;
    if (filters?.action) q += `&action=${encodeURIComponent(filters.action)}`;
    if (filters?.resource) q += `&resource=${encodeURIComponent(filters.resource)}`;
    const { data } = await Api.get<PaginatedAuditLogs>(`/admin/audit-logs${q}`);
    return data;
}

/* ── Metrics ── */

export async function getMetrics(): Promise<MetricsResponse> {
    const { data } = await Api.get<MetricsResponse>('/admin/metrics');
    return data;
}

/* ── Users ── */

export async function getUsers(): Promise<UserListItem[]> {
    const { data } = await Api.get<UserListItem[]>('/admin/users');
    return data ?? [];
}

export async function updateUserRole(id: string, role: string): Promise<{ id: string; role: string }> {
    const { data } = await Api.patch(`/admin/users/${id}/role`, { role });
    return data;
}

export async function setUserActive(id: string, active: boolean): Promise<{ id: string; active: boolean }> {
    const { data } = await Api.patch(`/admin/users/${id}/active`, { active });
    return data;
}

export async function deleteUser(id: string): Promise<void> {
    await Api.delete(`/admin/users/${id}`);
}

/* ── BI Reports ── */

export interface PlatformEventLog {
    id: string;
    event_type: 'subscription' | 'cancellation';
    user_id: string;
    user_name: string;
    user_email: string;
    payment_method?: string;
    created_at: string;
}

export interface DailyEventCount {
    date: string;
    subscriptions: number;
    cancellations: number;
}

export interface PlatformEventLogSummary {
    total_subscriptions: number;
    total_cancellations: number;
    net_growth: number;
    churn_rate: number;
    daily_counts: DailyEventCount[];
}

export interface PaginatedPlatformEvents {
    data: PlatformEventLog[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export async function getSubscriptionEvents(params?: {
    type?: string;
    from?: string;
    to?: string;
    page?: number;
    page_size?: number;
    personal_id?: string;
}): Promise<PaginatedPlatformEvents> {
    const q = new URLSearchParams();
    if (params?.type) q.set('type', params.type);
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    if (params?.page) q.set('page', String(params.page));
    if (params?.page_size) q.set('page_size', String(params.page_size));
    if (params?.personal_id) q.set('personal_id', params.personal_id);
    const qs = q.toString() ? `?${q.toString()}` : '';
    const { data } = await Api.get<PaginatedPlatformEvents>(`/admin/reports/subscriptions${qs}`);
    return data;
}

export async function getSubscriptionSummary(params?: {
    from?: string;
    to?: string;
    personal_id?: string;
}): Promise<PlatformEventLogSummary> {
    const q = new URLSearchParams();
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    if (params?.personal_id) q.set('personal_id', params.personal_id);
    const qs = q.toString() ? `?${q.toString()}` : '';
    const { data } = await Api.get<PlatformEventLogSummary>(`/admin/reports/subscriptions/summary${qs}`);
    return data;
}

/* ── CSV Export ── */

export async function exportCSV(endpoint: string, filename: string) {
    const token = localStorage.getItem('token') ?? '';
    const baseURL = Api.defaults.baseURL ?? '';
    const url = `${baseURL}/admin/export/${endpoint}`;

    try {
        const res = await fetch(url, { headers: { Authorization: token } });
        if (!res.ok) {
            throw new Error(`Export failed with status ${res.status}`);
        }
        const blob = await res.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    } catch (err) {
        console.error('Erro ao exportar CSV:', err);
        alert('Erro ao exportar arquivo. Tente novamente.');
    }
}

/* ── Diagnostics ── */

export interface DiagnosticsUserItem {
    id: string;
    name: string;
    email: string;
    cpf: string;
    role: string;
    active: boolean;
    plan_type: string;
}

export interface DiagnosticsProfileItem {
    id: string;
    personal_id?: string;
    personal_name?: string;
    personal_email?: string;
    link_status: string;
    created_at: string;
    updated_at: string;
}

export interface DiagnosticsSubscriptionItem {
    id: string;
    status: string;
    value: number;
    cycle: string;
    billing_type: string;
    created_at: string;
}

export interface DiagnosticsRosterItem {
    id: string;
    name: string;
    email: string;
}

export interface UserDiagnostics {
    user: DiagnosticsUserItem;
    phone: string;
    mobile_phone: string;
    created_at: string;
    profiles?: DiagnosticsProfileItem[];
    roster?: DiagnosticsRosterItem[];
    roster_count?: number;
    subscription?: DiagnosticsSubscriptionItem;
}

export async function searchDiagnosticsUsers(q: string): Promise<DiagnosticsUserItem[]> {
    const { data } = await Api.get<DiagnosticsUserItem[]>('/admin/diagnostics/search', {
        params: { q },
    });
    return data ?? [];
}

export async function getUserDiagnostics(id: string): Promise<UserDiagnostics> {
    const { data } = await Api.get<UserDiagnostics>(`/admin/diagnostics/users/${id}`);
    return data;
}

export async function relinkStudent(userId: string, personalId: string): Promise<void> {
    await Api.post(`/admin/diagnostics/students/${userId}/relink`, { personal_id: personalId });
}

export async function unlinkStudentDiagnostics(userId: string): Promise<void> {
    await Api.post(`/admin/diagnostics/students/${userId}/unlink`, {});
}

export async function deleteStudentProfile(profileId: string): Promise<void> {
    await Api.delete(`/admin/diagnostics/student-profiles/${profileId}`);
}

export async function resyncSubscription(userId: string): Promise<DiagnosticsSubscriptionItem | { message: string }> {
    const { data } = await Api.post(`/admin/diagnostics/users/${userId}/resync-subscription`, {});
    return data;
}

export async function updateSubscriptionStatus(subscriptionId: string, status: string): Promise<void> {
    await Api.patch(`/admin/diagnostics/subscriptions/${subscriptionId}/status`, { status });
}
