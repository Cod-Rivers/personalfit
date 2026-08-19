import { Api } from '@/libs/api';
import type { TechniqueParamsResponse } from '@/libs/planningService';

/** Deve espelhar storage.MaxTrainingPdfImportBytes no backend (r2.go). */
export const MAX_TRAINING_PDF_IMPORT_MB = 10;

/** Deve espelhar training.MaxPdfImportsPerStudentPerMonth no backend. */
export const MAX_TRAINING_PDF_IMPORTS_PER_MONTH = 3;

export type TrainingPdfImportStatus =
    | 'processing'
    | 'ready_for_review'
    | 'failed'
    | 'confirmed';

export type TrainingPdfMatchStatus = 'matched' | 'unmatched' | 'manual';

export interface ExtractedExercise {
    raw_name: string;
    series_label?: string;
    load_kg?: number;
    rest_seconds?: number;
    technique?: string;
    technique_params?: TechniqueParamsResponse;
    notes?: string;
    exercise_library_id?: string;
    match_score?: number;
    match_status: TrainingPdfMatchStatus;
}

export interface ExtractedTraining {
    reference: string;
    exercises: ExtractedExercise[];
}

export interface TrainingPdfImport {
    id: string;
    student_id: string;
    uploader_role: 'personal' | 'student';
    file_name: string;
    status: TrainingPdfImportStatus;
    extracted_trainings: ExtractedTraining[];
    error_message?: string;
    result_macrocycle_id?: string;
    created_at: string;
    updated_at: string;
}

/** studentId presente = view do personal (/students/:id/training-pdf-imports*);
 * ausente = auto-importação do próprio aluno (/my-training-pdf-imports*). */
function basePath(studentId?: string) {
    return studentId
        ? `/students/${studentId}/training-pdf-imports`
        : '/my-training-pdf-imports';
}

interface UploadUrlResponse {
    upload_url: string;
    pdf_key: string;
    file_name: string;
}

/** Pede a URL assinada e sobe o PDF direto ao R2 — não cria o rascunho ainda. */
export async function uploadTrainingPdf(
    file: File,
    studentId?: string,
): Promise<{ pdf_key: string; file_name: string }> {
    const { data } = await Api.post<UploadUrlResponse>(
        `${basePath(studentId)}/upload-url`,
        { filename: file.name },
    );
    await fetch(data.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf' },
        body: file,
    });
    return { pdf_key: data.pdf_key, file_name: data.file_name };
}

/** Cria o rascunho a partir do PDF já enviado e dispara a extração síncrona
 * (pode levar até ~45s quando o Gemini está configurado). Sujeito ao teto
 * mensal de importações (ver MAX_TRAINING_PDF_IMPORTS_PER_MONTH) — 403 com
 * code "training_pdf_import_limit_reached" quando atingido. */
export async function createTrainingPdfImport(
    pdfKey: string,
    fileName: string,
    studentId?: string,
): Promise<TrainingPdfImport> {
    const { data } = await Api.post<TrainingPdfImport>(basePath(studentId), {
        pdf_key: pdfKey,
        file_name: fileName,
    });
    return data;
}

export async function getTrainingPdfImport(
    importId: string,
    studentId?: string,
): Promise<TrainingPdfImport> {
    const { data } = await Api.get<TrainingPdfImport>(
        `${basePath(studentId)}/${importId}`,
    );
    return data;
}

/** Salva a revisão manual (correções, resolução de exercícios sem match). */
export async function updateTrainingPdfImport(
    importId: string,
    extractedTrainings: ExtractedTraining[],
    studentId?: string,
): Promise<TrainingPdfImport> {
    const { data } = await Api.put<TrainingPdfImport>(
        `${basePath(studentId)}/${importId}`,
        { extracted_trainings: extractedTrainings },
    );
    return data;
}

export async function retryTrainingPdfImport(
    importId: string,
    studentId?: string,
): Promise<TrainingPdfImport> {
    const { data } = await Api.post<TrainingPdfImport>(
        `${basePath(studentId)}/${importId}/retry`,
        {},
    );
    return data;
}

/** Só o aluno confirma — materializa o rascunho como o novo macrociclo ativo,
 * substituindo o plano ativo anterior. */
export async function confirmMyTrainingPdfImport(importId: string) {
    const { data } = await Api.post(
        `/my-training-pdf-imports/${importId}/confirm`,
        {},
    );
    return data;
}

/** Só o aluno descarta um rascunho não confirmado. */
export async function deleteMyTrainingPdfImport(
    importId: string,
): Promise<void> {
    await Api.delete(`/my-training-pdf-imports/${importId}`);
}
