import { Api } from '@/libs/api';

/**
 * Cliente do pacote antifraude/motivação do "Desafio entre Alunos": pose do
 * dia, curadoria das fotos, prêmio, conteúdo exclusivo e grupo.
 *
 * Vive num arquivo separado de `studentChallengeService.ts` (que já passa de
 * 400 linhas) mas fala com o MESMO recurso — os tipos de desafio vêm de lá,
 * nunca são redeclarados aqui.
 *
 * Todas as rotas abaixo só existem com `ADHERENCE_ANTIFRAUD_ENABLED` ligado no
 * servidor. Desligada, elas devolvem 404, e é por isso que toda tela que as
 * consome trata ausência como "recurso não disponível" em vez de erro.
 */

export type CountPolicy = 'trust' | 'strict';

export interface AntiFraudConfig {
    enabled: boolean;
    pose_enabled: boolean;
    deck_id?: string;
    count_policy: CountPolicy;
    auto_accept_after_hours: number;
}

export interface Pose {
    id: string;
    label: string;
    image_url?: string;
    order: number;
}

export interface PoseDeck {
    id: string;
    /** Baralho da plataforma: grátis para todos. O próprio do personal é PRO. */
    is_platform: boolean;
    name: string;
    active: boolean;
    poses: Pose[];
}

/** Carta e código do dia. O código é do aluno que pediu, e de mais ninguém —
 * é isso que impede a foto de um servir para o outro. */
export interface PoseOfDay {
    day: string;
    pose_id: string;
    label: string;
    image_url?: string;
    code: string;
}

export type ReviewStatus = 'pending' | 'accepted' | 'rejected';

export type RejectReason =
    | 'pose_incorreta'
    | 'foto_repetida'
    | 'sem_codigo'
    | 'nao_e_o_aluno'
    | 'fora_do_contexto'
    | 'outro';

export type CheckInSignal =
    | 'foto_repetida'
    | 'relogio_adulterado'
    | 'registro_tardio'
    | 'sem_exif'
    | 'exif_divergente'
    | 'sessao_vazia'
    | 'sem_prova';

export interface ReviewQueueEntry {
    log_id: string;
    student_id: string;
    name: string;
    day: string;
    photo_url?: string;
    photo_added_at?: string;
    pose_label?: string;
    pose_image_url?: string;
    pose_code?: string;
    pose_status?: string;
    review_status: ReviewStatus;
    reason?: string;
    reason_note?: string;
    reviewed_at?: string;
    contested_at?: string;
    /** Rótulos de atenção. NUNCA são uma decisão — só ordenam a fila. */
    signals: CheckInSignal[];
    counts_now: boolean;
}

export interface ReviewQueue {
    challenge_id: string;
    entries: ReviewQueueEntry[];
    pending_count: number;
    accepted_count: number;
    rejected_count: number;
    pose_required: boolean;
    count_policy: CountPolicy;
}

export interface ChallengePrize {
    title: string;
    description?: string;
    image_url?: string;
    positions: number;
    awarded_to?: string[];
    awarded_at?: string;
    award_note?: string;
    delivery_pending: boolean;
}

export interface ChallengeGroup {
    platform: 'whatsapp' | 'telegram';
    url: string;
    note?: string;
}

export interface ChallengeContentExercise {
    name: string;
    exercise_library_id?: string;
    sets?: string;
    reps?: string;
    rest?: string;
    notes?: string;
    video_url?: string;
    thumb_url?: string;
}

export interface ChallengeWorkout {
    title: string;
    description?: string;
    exercises: ChallengeContentExercise[];
}

export interface ChallengeGuide {
    title: string;
    body?: string;
    media_url?: string;
    /** Aviso fixo, vindo do servidor. Não é editável pelo personal e não pode
     * ser omitido pela UI: prescrição de dieta individualizada é ato privativo
     * de nutricionista, e o guia do desafio fica do lado educativo da linha. */
    disclaimer: string;
}

export interface ChallengeContent {
    /** O desafio TEM conteúdo e quem pediu ainda não pode vê-lo (convite não
     * aceito). Nesse caso os demais campos vêm vazios de propósito. */
    locked: boolean;
    has_content: boolean;
    workout?: ChallengeWorkout;
    nutrition_guide?: ChallengeGuide;
    group?: ChallengeGroup;
    prize?: ChallengePrize;
}

/** Texto que a UI mostra ao aluno para cada motivo de recusa. Espelha
 * `rejectReasonText` do backend — os dois precisam dizer a mesma coisa. */
export const REJECT_REASON_LABELS: Record<RejectReason, string> = {
    pose_incorreta: 'A pose não confere com a do dia',
    foto_repetida: 'A foto parece repetida',
    sem_codigo: 'O código do dia não aparece na foto',
    nao_e_o_aluno: 'Não foi possível identificar o aluno na foto',
    fora_do_contexto: 'A foto não parece ser do treino',
    outro: 'Outro motivo',
};

/** Rótulo curto de cada sinal automático. O tom importa: são avisos para o
 * personal olhar com atenção, nunca acusações já formadas. */
export const SIGNAL_LABELS: Record<CheckInSignal, string> = {
    foto_repetida: 'Parece repetida',
    relogio_adulterado: 'Relógio do aparelho fora de hora',
    registro_tardio: 'Registro tardio',
    sem_exif: 'Sem data de captura',
    exif_divergente: 'Data da foto não bate',
    sessao_vazia: 'Treino sem exercícios',
    sem_prova: 'Sem pose (registrado offline)',
};

// ── Configuração (organizador) ──────────────────────────────────────────

export async function setAntiFraud(
    challengeId: string,
    payload: {
        enabled: boolean;
        deck_id?: string;
        count_policy?: CountPolicy;
        auto_accept_after_hours?: number;
    },
): Promise<void> {
    await Api.patch(`/student-challenges/${challengeId}/anti-fraud`, payload);
}

export async function listPoseDecks(): Promise<PoseDeck[]> {
    const { data } = await Api.get<PoseDeck[]>('/pose-decks');
    return data;
}

export async function createPoseDeck(payload: {
    name: string;
    poses: { id: string; label: string; image_key: string; order: number }[];
}): Promise<PoseDeck> {
    const { data } = await Api.post<PoseDeck>('/pose-decks', payload);
    return data;
}

// ── Pose do dia (aluno) ─────────────────────────────────────────────────

/**
 * Busca a carta e o código do dia.
 *
 * `day` é opcional e o servidor RECUSA data futura — sem isso o aluno pediria
 * as quinze cartas de uma vez e fotografaria todas num domingo. O chamador
 * trata a recusa como "sem pose hoje", nunca como erro de tela.
 */
export async function getPoseOfDay(
    challengeId: string,
    day?: string,
): Promise<PoseOfDay> {
    const { data } = await Api.get<PoseOfDay>(
        `/me/student-challenges/${challengeId}/pose`,
        day ? { params: { day } } : undefined,
    );
    return data;
}

// ── Curadoria (personal) ────────────────────────────────────────────────

export async function getReviewQueue(
    challengeId: string,
    filter?: { day?: string; status?: ReviewStatus },
): Promise<ReviewQueue> {
    const { data } = await Api.get<ReviewQueue>(
        `/student-challenges/${challengeId}/review`,
        { params: filter },
    );
    return data;
}

export async function reviewCheckInPhoto(
    challengeId: string,
    logId: string,
    payload: { accept: boolean; reason?: RejectReason; reason_note?: string },
): Promise<void> {
    await Api.patch(
        `/student-challenges/${challengeId}/review/${logId}`,
        payload,
    );
}

/** Aceite em lote. É o que torna a conferência diária viável — sem ele, vinte
 * alunos por trinta dias vira abandono da feature na segunda semana. */
export async function bulkAcceptPhotos(
    challengeId: string,
    logIds: string[],
): Promise<number> {
    const { data } = await Api.post<{ accepted: number }>(
        `/student-challenges/${challengeId}/review/bulk-accept`,
        { log_ids: logIds },
    );
    return data.accepted;
}

/** O aluno discorda de uma recusa. Não é recurso automatizado e não desfaz
 * nada: avisa o personal e põe o caso no topo da fila dele. */
export async function contestReview(logId: string): Promise<void> {
    await Api.post(`/me/workout-logs/${logId}/contest-review`);
}

// ── Prêmio ──────────────────────────────────────────────────────────────

export async function setPrize(
    challengeId: string,
    payload: {
        remove?: boolean;
        title?: string;
        description?: string;
        image_key?: string;
        positions?: number;
    },
): Promise<void> {
    await Api.put(`/student-challenges/${challengeId}/prize`, payload);
}

/** Registra a entrega. Os vencedores são apurados no SERVIDOR, a partir da
 * classificação oficial — o cliente não escolhe quem ganhou. */
export async function awardPrize(
    challengeId: string,
    note?: string,
): Promise<void> {
    await Api.post(`/student-challenges/${challengeId}/prize/award`, { note });
}

// ── Conteúdo exclusivo e grupo ──────────────────────────────────────────

export async function setChallengeContent(
    challengeId: string,
    payload: {
        workout?: {
            title: string;
            description?: string;
            exercises: {
                name: string;
                exercise_library_id?: string;
                sets?: string;
                reps?: string;
                rest?: string;
                notes?: string;
            }[];
        };
        nutrition_guide?: { title: string; body?: string; media_key?: string };
    },
): Promise<void> {
    await Api.put(`/student-challenges/${challengeId}/content`, payload);
}

export async function setChallengeGroup(
    challengeId: string,
    payload: { remove?: boolean; url?: string; note?: string },
): Promise<void> {
    await Api.put(`/student-challenges/${challengeId}/group`, payload);
}

export async function getMyChallengeContent(
    challengeId: string,
): Promise<ChallengeContent> {
    const { data } = await Api.get<ChallengeContent>(
        `/me/student-challenges/${challengeId}/content`,
    );
    return data;
}

/**
 * Valida o link do grupo do lado do cliente, para dar erro imediato no
 * formulário. **Não substitui a validação do servidor**, que é a que vale: o
 * campo é uma URL exibida a terceiros, ou seja, superfície de phishing servida
 * com a credibilidade do app.
 *
 * Comparação de host EXATA, igual à do backend — `endsWith` deixaria passar
 * `chat.whatsapp.com.algumacoisa.com`.
 */
const GROUP_HOSTS: Record<string, 'whatsapp' | 'telegram'> = {
    'chat.whatsapp.com': 'whatsapp',
    't.me': 'telegram',
    'telegram.me': 'telegram',
};

export function validateGroupUrl(
    raw: string,
): { ok: true; platform: 'whatsapp' | 'telegram' } | { ok: false } {
    try {
        const url = new URL(raw.trim());
        if (url.protocol !== 'https:') return { ok: false };
        if (url.username || url.password || url.port) return { ok: false };
        const platform = GROUP_HOSTS[url.hostname.toLowerCase()];
        if (!platform) return { ok: false };
        if (url.pathname.replace(/\//g, '') === '') return { ok: false };
        return { ok: true, platform };
    } catch {
        return { ok: false };
    }
}

/** Estado da conferência das fotos DO PRÓPRIO aluno.
 *
 * Deliberadamente sem os sinais automáticos: o motivo tabelado explica a
 * recusa, enquanto "sem EXIF" ou "relógio fora de hora" viraria, para o aluno,
 * uma acusação que ninguém fez. */
export async function getMyReviews(challengeId: string): Promise<ReviewQueue> {
    const { data } = await Api.get<ReviewQueue>(
        `/me/student-challenges/${challengeId}/my-reviews`,
    );
    return data;
}
