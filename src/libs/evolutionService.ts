import { Api } from '@/libs/api';
import { compressImageToBlob } from '@/libs/imageCompression';

export type BodyFatMethod = 'caliper' | 'bioimpedance';

export interface EvolutionEntry {
    id: string;
    date: string; // YYYY-MM-DD
    photo_urls?: string[];
    weight_kg?: number;
    body_fat_percent?: number;
    body_fat_method?: BodyFatMethod;
    measurements?: Record<string, number>;
    notes?: string;
    created_by_role: 'personal' | 'student';
    created_at: string;
}

export interface CreateEvolutionEntryPayload {
    date: string;
    photo_keys?: string[];
    weight_kg?: number;
    body_fat_percent?: number;
    body_fat_method?: BodyFatMethod;
    measurements?: Record<string, number>;
    notes?: string;
}

/** studentId presente = view do personal (/students/:id/evolution*); ausente = view do próprio aluno (/my-evolution*). */
function basePath(studentId?: string) {
    return studentId ? `/students/${studentId}/evolution` : '/my-evolution';
}

export async function listEvolutionEntries(
    studentId?: string,
): Promise<EvolutionEntry[]> {
    const { data } = await Api.get<EvolutionEntry[]>(basePath(studentId));
    return data;
}

interface UploadUrlEntry {
    photo_key: string;
    upload_url: string;
}

/** Comprime cada foto no client, pede URLs assinadas e sobe direto ao R2. Retorna as keys salvas. */
export async function uploadEvolutionPhotos(
    files: File[],
    studentId?: string,
): Promise<string[]> {
    if (files.length === 0) return [];

    const compressed = await Promise.all(
        files.map((f) => compressImageToBlob(f)),
    );

    const { data } = await Api.post<{ uploads: UploadUrlEntry[] }>(
        `${basePath(studentId)}/upload-urls`,
        { content_types: compressed.map(() => 'image/jpeg') },
    );

    await Promise.all(
        data.uploads.map((u, i) =>
            fetch(u.upload_url, {
                method: 'PUT',
                headers: { 'Content-Type': 'image/jpeg' },
                body: compressed[i],
            }),
        ),
    );

    return data.uploads.map((u) => u.photo_key);
}

export async function createEvolutionEntry(
    payload: CreateEvolutionEntryPayload,
    studentId?: string,
): Promise<EvolutionEntry> {
    const { data } = await Api.post<EvolutionEntry>(
        basePath(studentId),
        payload,
    );
    return data;
}

export async function deleteEvolutionEntry(
    entryId: string,
    studentId?: string,
): Promise<void> {
    await Api.delete(`${basePath(studentId)}/${entryId}`);
}
