import { Api } from '@/libs/api';
import type { ReportFrequency, ReportPanel, WorkoutReport } from '@/libs/workoutReport';

export async function getReportPanel(period?: string): Promise<ReportPanel> {
    const { data } = await Api.get<ReportPanel>('/personal/workout-reports', { params: { period } });
    return {
        ...data,
        periods: data.periods ?? [],
        items: data.items ?? [],
    };
}

/** Pede ao servidor para gerar os relatórios pendentes deste personal (rede
 * de segurança do agendador). A tela repete enquanto `remaining > 0`. */
export async function processMyReports(): Promise<{ seeded: number; processed: number; remaining: number }> {
    const { data } = await Api.post('/personal/workout-reports/process', {});
    return data;
}

export async function getReport(reportId: string): Promise<WorkoutReport> {
    const { data } = await Api.get<WorkoutReport>(`/personal/workout-reports/${reportId}`);
    return data;
}

export async function markReportReviewed(reportId: string): Promise<WorkoutReport> {
    const { data } = await Api.patch<WorkoutReport>(`/personal/workout-reports/${reportId}/review`, {});
    return data;
}

export interface DecisionInput {
    action: string;
    exercise?: string;
    text?: string;
    suggestion_index?: number;
    done?: boolean;
}

export async function addReportDecision(reportId: string, body: DecisionInput): Promise<WorkoutReport> {
    const { data } = await Api.post<WorkoutReport>(`/personal/workout-reports/${reportId}/decisions`, body);
    return data;
}

export async function updateReportDecision(
    reportId: string,
    decisionId: string,
    body: DecisionInput,
): Promise<WorkoutReport> {
    const { data } = await Api.patch<WorkoutReport>(
        `/personal/workout-reports/${reportId}/decisions/${decisionId}`,
        body,
    );
    return data;
}

export async function markReportDecided(reportId: string): Promise<WorkoutReport> {
    const { data } = await Api.patch<WorkoutReport>(`/personal/workout-reports/${reportId}/decide`, {});
    return data;
}

export async function retryReportAI(reportId: string): Promise<WorkoutReport> {
    const { data } = await Api.post<WorkoutReport>(`/personal/workout-reports/${reportId}/retry`, {});
    return data;
}

export async function getStudentReports(studentId: string): Promise<WorkoutReport[]> {
    const { data } = await Api.get<WorkoutReport[]>(`/students/${studentId}/workout-reports`);
    return data ?? [];
}

export async function createOnDemandReport(studentId: string): Promise<WorkoutReport> {
    const { data } = await Api.post<WorkoutReport>(`/students/${studentId}/workout-reports/on-demand`, {});
    return data;
}

export interface ReportSettings {
    frequency: ReportFrequency;
    is_pro: boolean;
    on_demand_used: number;
    on_demand_limit: number;
}

export async function getReportSettings(): Promise<ReportSettings> {
    const { data } = await Api.get<ReportSettings>('/personal/settings/workout-report');
    return data;
}

export async function setReportFrequency(frequency: ReportFrequency): Promise<ReportSettings> {
    const { data } = await Api.put<ReportSettings>('/personal/settings/workout-report', { frequency });
    return data;
}

export interface ReportPreview {
    period_key: string;
    period_label: string;
    comments: number;
    pain_students: number;
}

export async function getReportPreview(): Promise<ReportPreview> {
    const { data } = await Api.get<ReportPreview>('/personal/workout-reports/preview');
    return data;
}
