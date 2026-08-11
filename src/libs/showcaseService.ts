import { Api } from '@/libs/api';
import { compressImageToBlob } from '@/libs/imageCompression';

/**
 * Vitrine do personal — a página de divulgação da marca dele, exibida como
 * tela inicial para os alunos vinculados (plano Pro).
 *
 * Todo o conteúdo é por PERSONAL, nunca por aluno: um único documento que se
 * reflete para todos os alunos daquele personal.
 */

/** Slots de mídia. Cada um é sobrescrito no bucket a cada troca de imagem. */
export type ShowcaseSlot =
    | 'capa'
    | 'avatar'
    | 'depoimento'
    | 'aviso'
    | `resultado-${number}`;

export type AnnouncementType = 'none' | 'text' | 'image';

export interface ShowcaseSections {
    bio: boolean;
    specialties: boolean;
    stats: boolean;
    social: boolean;
    results: boolean;
    testimonial: boolean;
}

export interface ShowcaseResult {
    photo_key: string;
    photo_url: string;
    caption: string;
}

export interface Showcase {
    enabled: boolean;
    personal_name: string;
    theme_id: string;

    cover_key: string;
    cover_url: string;
    avatar_key: string;
    avatar_url: string;
    tagline: string;
    bio: string;
    specialties: string[];
    specialties_raw: string;

    // stat_students e stat_rating são CALCULADOS pelo servidor a partir de
    // dados reais (alunos ativos vinculados e avaliações deles) — vêm vazios
    // quando não há dados suficientes, para a UI omitir o card em vez de
    // mostrar "0". Só stat_years é editável (ver ShowcasePayload).
    stat_students: string;
    stat_years: string;
    stat_rating: string;

    instagram_url: string;
    youtube_url: string;
    whatsapp_url: string;

    results: ShowcaseResult[];

    testimonial_text: string;
    testimonial_author: string;
    testimonial_photo_key: string;
    testimonial_photo_url: string;

    announcement_type: AnnouncementType;
    announcement_text: string;
    announcement_image_key: string;
    announcement_image_url: string;
    announcement_url: string;

    sections: ShowcaseSections;

    /** Presente só nas respostas de leitura: o personal dono pode editar. */
    can_edit?: boolean;
    plan_type?: string;
}

/**
 * Payload de escrita — só keys de mídia, nunca URLs (o servidor resolve).
 * Não inclui stat_students nem stat_rating: são calculados pelo servidor a
 * cada leitura e o backend nem aceita esses campos no PUT.
 */
export interface ShowcasePayload {
    enabled: boolean;
    theme_id: string;
    cover_key: string;
    avatar_key: string;
    tagline: string;
    bio: string;
    specialties: string;
    stat_years: string;
    instagram_url: string;
    youtube_url: string;
    whatsapp_url: string;
    results: { photo_key: string; caption: string }[];
    testimonial_text: string;
    testimonial_author: string;
    testimonial_photo_key: string;
    announcement_type: AnnouncementType;
    announcement_text: string;
    announcement_image_key: string;
    announcement_url: string;
    sections: ShowcaseSections;
}

/**
 * Vitrine do personal vinculado ao usuário autenticado.
 *
 * Retorna `null` — e a UI segue para o fluxo atual (Meus Treinos direto) —
 * quando o aluno não tem personal, quando o personal não é Pro, ou quando ele
 * não publicou a página. A decisão é do servidor: o cliente não sabe o plano do
 * personal e não deveria saber.
 */
export async function getLinkedShowcase(): Promise<Showcase | null> {
    const res = await Api.get<{ showcase: Showcase | null }>('/showcase');
    return res.data.showcase;
}

/** Vitrine do personal autenticado, para edição (funciona mesmo em plano free). */
export async function getMyShowcase(): Promise<Showcase> {
    const res = await Api.get<Showcase>('/personal/showcase');
    return res.data;
}

/** Salva a vitrine inteira (o editor sempre envia o estado completo). */
export async function updateMyShowcase(
    payload: ShowcasePayload,
): Promise<Showcase> {
    const res = await Api.put<Showcase>('/personal/showcase', payload);
    return res.data;
}

interface UploadUrlResponse {
    upload_url: string;
    object_key: string;
    public_url: string;
}

/**
 * Comprime a imagem no client, pede uma URL assinada e sobe direto ao bucket.
 * Devolve a key (que vai no payload) e a URL pública (para preview imediato,
 * antes mesmo de salvar).
 *
 * A capa é o único slot largo — 1600px de lado maior mantém o banner nítido em
 * telas grandes sem carregar o original de câmera.
 */
export async function uploadShowcaseImage(
    file: File,
    slot: ShowcaseSlot,
): Promise<{ key: string; url: string }> {
    const blob = await compressImageToBlob(file, {
        maxDimension: slot === 'capa' ? 1600 : 900,
        quality: 0.85,
    });

    const { data } = await Api.post<UploadUrlResponse>(
        '/personal/showcase/upload-url',
        { slot, content_type: 'image/jpeg', filename: `${slot}.jpg` },
    );

    const put = await fetch(data.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob,
    });
    if (!put.ok) {
        throw new Error('Falha ao enviar a imagem. Tente novamente.');
    }

    // Cada envio recebe uma key própria do servidor, então a URL pública já é
    // nova a cada troca — nem o cache do navegador nem o cache-first do service
    // worker podem devolver a imagem anterior no preview.
    return { key: data.object_key, url: data.public_url };
}

/** Estado inicial de um personal que ainda não configurou nada. */
export function emptyShowcasePayload(): ShowcasePayload {
    return {
        enabled: false,
        theme_id: 'mint-noir',
        cover_key: '',
        avatar_key: '',
        tagline: '',
        bio: '',
        specialties: '',
        stat_years: '',
        instagram_url: '',
        youtube_url: '',
        whatsapp_url: '',
        results: [],
        testimonial_text: '',
        testimonial_author: '',
        testimonial_photo_key: '',
        announcement_type: 'none',
        announcement_text: '',
        announcement_image_key: '',
        announcement_url: '',
        sections: {
            bio: true,
            specialties: true,
            stats: true,
            social: true,
            results: true,
            testimonial: true,
        },
    };
}

/** Converte a resposta de leitura no payload de escrita (descarta as URLs). */
export function showcaseToPayload(sc: Showcase): ShowcasePayload {
    return {
        enabled: sc.enabled,
        theme_id: sc.theme_id,
        cover_key: sc.cover_key ?? '',
        avatar_key: sc.avatar_key ?? '',
        tagline: sc.tagline ?? '',
        bio: sc.bio ?? '',
        specialties: sc.specialties_raw ?? '',
        stat_years: sc.stat_years ?? '',
        instagram_url: sc.instagram_url ?? '',
        youtube_url: sc.youtube_url ?? '',
        whatsapp_url: sc.whatsapp_url ?? '',
        results: (sc.results ?? []).map((r) => ({
            photo_key: r.photo_key,
            caption: r.caption,
        })),
        testimonial_text: sc.testimonial_text ?? '',
        testimonial_author: sc.testimonial_author ?? '',
        testimonial_photo_key: sc.testimonial_photo_key ?? '',
        announcement_type: sc.announcement_type ?? 'none',
        announcement_text: sc.announcement_text ?? '',
        announcement_image_key: sc.announcement_image_key ?? '',
        announcement_url: sc.announcement_url ?? '',
        sections: sc.sections,
    };
}
