import { Api } from '@/libs/api';

export interface MealItem {
    name: string;
    time?: string;
    description?: string;
    calories?: number;
}

export interface MealPlanVersion {
    id: string;
    meals: MealItem[];
    pdf_url?: string;
    pdf_file_name?: string;
    notes?: string;
    created_by_role: 'personal' | 'student';
    created_at: string;
}

export interface MealPlanResponse {
    current: MealPlanVersion | null;
    student_can_edit: boolean;
    can_edit: boolean;
}

export interface CreateMealPlanVersionPayload {
    meals: MealItem[];
    pdf_key?: string;
    pdf_file_name?: string;
    notes?: string;
}

/** studentId presente = view do personal (/students/:id/meal-plan*); ausente = view do próprio aluno (/my-meal-plan*). */
function basePath(studentId?: string) {
    return studentId ? `/students/${studentId}/meal-plan` : '/my-meal-plan';
}

export async function getCurrentMealPlan(
    studentId?: string,
): Promise<MealPlanResponse> {
    const { data } = await Api.get<MealPlanResponse>(basePath(studentId));
    return data;
}

export async function getMealPlanHistory(
    studentId?: string,
): Promise<MealPlanVersion[]> {
    const { data } = await Api.get<MealPlanVersion[]>(
        `${basePath(studentId)}/history`,
    );
    return data;
}

interface PdfUploadUrlResponse {
    upload_url: string;
    pdf_key: string;
    version_id: string;
    file_name: string;
}

/** Pede a URL assinada, sobe o PDF direto ao R2 e retorna a key salva + nome do arquivo. */
export async function uploadMealPlanPdf(
    file: File,
    studentId?: string,
): Promise<{ pdf_key: string; pdf_file_name: string }> {
    const { data } = await Api.post<PdfUploadUrlResponse>(
        `${basePath(studentId)}/pdf-upload-url`,
        { filename: file.name },
    );
    await fetch(data.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf' },
        body: file,
    });
    return { pdf_key: data.pdf_key, pdf_file_name: data.file_name };
}

export async function createMealPlanVersion(
    payload: CreateMealPlanVersionPayload,
    studentId?: string,
): Promise<MealPlanVersion> {
    const { data } = await Api.post<MealPlanVersion>(
        basePath(studentId),
        payload,
    );
    return data;
}

/** Só o personal chama — liga/desliga a permissão do aluno editar o próprio plano. */
export async function setMealPlanPermission(
    studentId: string,
    studentCanEdit: boolean,
): Promise<void> {
    await Api.put(`/students/${studentId}/meal-plan/permission`, {
        student_can_edit: studentCanEdit,
    });
}
