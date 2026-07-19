/**
 * exerciseVideoService.ts
 *
 * Serviço de vídeo/mídia para exercícios personalizados e forks de biblioteca.
 * Toda comunicação HTTP passa pelo cliente Axios em api.ts (injeta Authorization).
 * Uploads vão direto ao Cloudflare R2 via presigned URL (sem passar pelo backend).
 * O bucket é público via domínio próprio: o video_url retornado pela API já é a
 * URL final pronta para tocar, sem necessidade de nenhuma URL assinada de leitura.
 */

import { Api } from '@/libs/api';

// ─────────────────────────────────────────────
// EXERCÍCIOS PERSONALIZADOS (my-exercises)
// ─────────────────────────────────────────────

/** Solicita PUT presigned URL para upload direto ao R2 (exercício pessoal). Requer PlanPro. */
export async function requestPersonalUploadUrl(
    exerciseId: string,
    file: File,
): Promise<{ upload_url: string; object_path: string; content_type: string }> {
    const { data } = await Api.post('/my-exercises/upload-url', {
        exercise_id: exerciseId,
        content_type: file.type,
        filename: file.name,
    });
    return data;
}

/** Confirma upload e salva a key R2 no exercício pessoal. */
export async function confirmPersonalVideo(exerciseId: string, objectPath: string) {
    const { data } = await Api.post(`/my-exercises/${exerciseId}/video-confirm`, {
        object_path: objectPath,
    });
    return data;
}

/** Define link externo (YouTube/Vimeo/Instagram: qualquer plano; TikTok: requer Pro) para exercício pessoal. */
export async function setPersonalVideoUrl(exerciseId: string, videoUrl: string) {
    const { data } = await Api.put(`/my-exercises/${exerciseId}/video-url`, { video_url: videoUrl });
    return data;
}

// ─────────────────────────────────────────────
// FORKS DE BIBLIOTECA (exercises/:libraryId/fork-*)
// ─────────────────────────────────────────────

/** Solicita PUT presigned URL para upload de mídia em fork de exercício da biblioteca. Requer PlanPro. */
export async function requestForkUploadUrl(
    libraryId: string,
    file: File,
): Promise<{ upload_url: string; object_path: string; content_type: string; library_id: string }> {
    const { data } = await Api.post(`/exercises/${libraryId}/fork-upload-url`, {
        content_type: file.type,
        filename: file.name,
    });
    return data;
}

/** Confirma upload de fork e cria/atualiza exercício personalizado vinculado. */
export async function confirmFork(libraryId: string, objectPath: string) {
    const { data } = await Api.post(`/exercises/${libraryId}/fork-confirm`, {
        object_path: objectPath,
    });
    return data;
}

/** Define link externo (YouTube/Vimeo/Instagram: qualquer plano; TikTok: requer Pro) para fork de exercício da biblioteca. */
export async function setForkVideoUrl(libraryId: string, videoUrl: string) {
    const { data } = await Api.put(`/exercises/${libraryId}/fork-url`, { video_url: videoUrl });
    return data;
}

// ─────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────

/**
 * Faz PUT direto ao R2 usando a presigned URL (sem Authorization header).
 * @param onProgress callback com porcentagem (0–100)
 */
export async function uploadToR2(
    signedUrl: string,
    file: File,
    onProgress?: (pct: number) => void,
): Promise<void> {
    await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signedUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        if (onProgress) {
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
            };
        }
        xhr.onload = () =>
            xhr.status >= 200 && xhr.status < 300
                ? resolve()
                : reject(new Error(`Upload R2 falhou: ${xhr.status}`));
        xhr.onerror = () => reject(new Error('Erro de rede no upload R2'));
        xhr.send(file);
    });
}

/** Tamanho máximo de upload (20MB) — mantido em sincronia com storage.MaxUploadBytes no backend. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/** Duração máxima de um clipe de exercício enviado por upload (90s). */
export const MAX_UPLOAD_DURATION_SECONDS = 90;

/** Extensões de arquivo aceitas para upload — MP4/WebM (vídeo) e JPG/PNG/WebP (imagem).
 * Sem MOV/AVI (contêineres pesados, sem compressão adequada) nem GIF (muito maior
 * que um vídeo equivalente com loop automático). */
export const ACCEPTED_UPLOAD_EXTENSIONS = '.mp4,.webm,.jpg,.jpeg,.png,.webp';

/** Detecta se é URL do YouTube. */
export function isYouTubeUrl(videoUrl: string): boolean {
    return videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
}

/** Detecta se é URL do Vimeo. */
export function isVimeoUrl(videoUrl: string): boolean {
    return videoUrl.includes('vimeo.com');
}

/** Detecta se é URL do TikTok. */
export function isTikTokUrl(videoUrl: string): boolean {
    return videoUrl.includes('tiktok.com');
}

/** Detecta se é URL do Instagram (post/reel/perfil). Instagram não é embutido
 * inline — o app mostra um botão de redirecionamento para o link original. */
export function isInstagramUrl(videoUrl: string): boolean {
    return videoUrl.includes('instagram.com');
}

/** Detecta se é um link embutível via iframe (YouTube/Vimeo/TikTok). */
export function isEmbeddableUrl(videoUrl: string): boolean {
    return isYouTubeUrl(videoUrl) || isVimeoUrl(videoUrl) || isTikTokUrl(videoUrl);
}

/** Detecta se é um link de provedor externo suportado (embutível ou redirecionamento). */
export function isSupportedExternalVideoUrl(videoUrl: string): boolean {
    return isEmbeddableUrl(videoUrl) || isInstagramUrl(videoUrl);
}

/** Detecta se o caminho/URL representa um arquivo de vídeo (não imagem). Mantém
 * mov/avi no reconhecimento de exibição para não quebrar vídeos legados já
 * enviados antes da restrição de formatos de upload. */
export function isVideoExtension(path: string): boolean {
    return /\.(mp4|webm|mov|avi)(\?|$)/i.test(path);
}

/**
 * Valida um arquivo de vídeo/imagem antes do upload: tamanho máximo e,
 * para vídeos, duração máxima (lida do próprio arquivo no navegador).
 * Retorna uma mensagem de erro, ou null se o arquivo for válido.
 */
export async function validateMediaFile(file: File): Promise<string | null> {
    if (file.size > MAX_UPLOAD_BYTES) {
        return `Arquivo excede o limite de ${MAX_UPLOAD_BYTES / 1024 / 1024}MB`;
    }
    if (!file.type.startsWith('video/')) {
        return null;
    }
    const duration = await new Promise<number | null>((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
            URL.revokeObjectURL(video.src);
            resolve(video.duration);
        };
        video.onerror = () => {
            URL.revokeObjectURL(video.src);
            resolve(null);
        };
        video.src = URL.createObjectURL(file);
    });
    if (duration != null && duration > MAX_UPLOAD_DURATION_SECONDS) {
        return `Vídeo excede o limite de ${MAX_UPLOAD_DURATION_SECONDS}s (duração: ${Math.round(duration)}s)`;
    }
    return null;
}
