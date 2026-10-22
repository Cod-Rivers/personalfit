/**
 * Mural de resultados (Todo/PLANO_MURAL_DE_RESULTADOS.md): o antes e depois
 * que o aluno publica a partir das fotos da Evolução. As fotos da Evolução
 * continuam privadas; a publicação passa pela revisão da equipe e só então
 * o servidor gera as cópias públicas (recortadas, sem metadados).
 */
import { Api } from '@/libs/api';

/** Versão do termo de autorização — igual a results.TermsVersion no backend
 *  e ao texto de ResultTerms.tsx. Mudar o texto exige mudar as três. */
export const RESULT_TERMS_VERSION = '2026-10-15';

export type ResultScope = 'mural' | 'program' | 'author';
export type ResultStatus =
    | 'pending'
    | 'published'
    | 'rejected'
    | 'hidden'
    | 'removed';

/** Recorte em frações (0..1) da foto como aparece na tela. */
export interface ResultCrop {
    x: number;
    y: number;
    w: number;
    h: number;
}

export const FULL_CROP: ResultCrop = { x: 0, y: 0, w: 1, h: 1 };

/** Proporção do recorte (retrato 4:5) — a mesma das cópias públicas. */
export const RESULT_ASPECT = 4 / 5;

export interface ResultStats {
    weight_delta_kg?: number;
    body_fat_delta?: number;
    measurements?: Record<string, number>;
}

export interface ResultShow {
    weight: boolean;
    body_fat: boolean;
    measurements: boolean;
    name: boolean;
}

export interface ResultCard {
    id: string;
    display_name: string;
    caption?: string;
    goal?: string;
    weeks_between: number;
    before_url?: string;
    after_url?: string;
    before_date: string;
    after_date: string;
    stats: ResultStats;
    verified: boolean;
    workouts_logged: number;
    adherence_pct?: number;
    program?: { id: string; title: string };
    personal_name?: string;
    cheers_count: number;
    published_at?: string;
}

export interface ResultSourcePhoto {
    url?: string;
    crop: ResultCrop;
    /** Área do recorte que sai coberta na cópia pública. */
    hide?: ResultCrop | null;
}

export interface MyResult extends ResultCard {
    status: ResultStatus;
    rejection_reason?: string;
    scopes: ResultScope[];
    show: ResultShow;
    personal_tag_status?: 'pending' | 'accepted' | 'declined';
    linked_program: boolean;
    before_source: ResultSourcePhoto;
    after_source: ResultSourcePhoto;
    created_at: string;
}

export interface AdminResult extends MyResult {
    student_name: string;
    student_email: string;
    program_title?: string;
    reports_count: number;
    reports: { reason: string; created_at: string }[];
    terms_version: string;
    consent_at: string;
    before_uploaded_at: string;
    after_uploaded_at: string;
    moderation_reason?: string;
}

export interface EligiblePhoto {
    entry_id: string;
    photo_index: number;
    url: string;
    date: string;
    uploaded_at: string;
}

export interface ResultEligibility {
    photos: EligiblePhoto[];
    first_name: string;
    has_birth_date: boolean;
    is_adult: boolean;
    terms_version: string;
    has_personal: boolean;
}

export interface ResultPhotoRef {
    entry_id: string;
    photo_index: number;
    crop: ResultCrop;
    /** Área do recorte a pixelizar (frações do recorte). */
    hide?: ResultCrop | null;
}

export interface CreateResultPayload {
    before: ResultPhotoRef;
    after: ResultPhotoRef;
    caption: string;
    goal: string;
    show: ResultShow;
    tag_personal: boolean;
    terms_version: string;
    scopes: ResultScope[];
    birth_date?: string;
}

export interface ResultPage {
    items: ResultCard[];
    next_before?: string;
}

export interface ResultFilter {
    program?: string;
    goal?: string;
    min_weeks?: number;
    verified?: boolean;
    before?: string;
    limit?: number;
}

/** Objetivos (os mesmos da loja). */
export const RESULT_GOALS: { value: string; label: string }[] = [
    { value: 'emagrecimento', label: 'Emagrecimento' },
    { value: 'hipertrofia', label: 'Hipertrofia' },
    { value: 'definicao', label: 'Definição' },
    { value: 'forca', label: 'Força' },
    { value: 'gluteos', label: 'Glúteos' },
    { value: 'condicionamento', label: 'Condicionamento' },
    { value: 'saude', label: 'Saúde' },
];

export function goalLabel(goal?: string): string {
    return RESULT_GOALS.find((g) => g.value === goal)?.label ?? '';
}

/** Rótulos das medidas da Evolução. */
const MEASUREMENT_LABELS: Record<string, string> = {
    cintura: 'Cintura',
    quadril: 'Quadril',
    peito: 'Peito',
    abdomen: 'Abdômen',
    braco_direito: 'Braço dir.',
    braco_esquerdo: 'Braço esq.',
    coxa_direita: 'Coxa dir.',
    coxa_esquerda: 'Coxa esq.',
    panturrilha: 'Panturrilha',
};

export function measurementLabel(key: string): string {
    return (
        MEASUREMENT_LABELS[key] ??
        key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
    );
}

/** "−6,5 kg", "+1,2 cm" — sinal tipográfico e vírgula decimal. */
export function formatDelta(value: number, unit: string): string {
    const sign = value > 0 ? '+' : value < 0 ? '−' : '';
    const abs = Math.abs(value).toLocaleString('pt-BR', {
        maximumFractionDigits: 1,
    });
    return `${sign}${abs}${unit === '%' ? '' : ' '}${unit}`;
}

export const REPORT_REASONS: { value: string; label: string }[] = [
    { value: 'nudez', label: 'Nudez ou conteúdo sexual' },
    { value: 'menor', label: 'Parece ser menor de idade' },
    { value: 'falso', label: 'Foto falsa ou de outra pessoa' },
    { value: 'meu', label: 'Sou eu na foto e não autorizei' },
    { value: 'ofensivo', label: 'Ofensivo' },
    { value: 'spam', label: 'Propaganda ou spam' },
    { value: 'outro', label: 'Outro motivo' },
];

/* ── Público ── */

export async function listResults(f: ResultFilter = {}): Promise<ResultPage> {
    const params: Record<string, string> = {};
    if (f.program) params.program = f.program;
    if (f.goal) params.goal = f.goal;
    if (f.min_weeks) params.min_weeks = String(f.min_weeks);
    if (f.verified) params.verified = '1';
    if (f.before) params.before = f.before;
    if (f.limit) params.limit = String(f.limit);
    const { data } = await Api.get<ResultPage>('/results', { params });
    return { items: data.items ?? [], next_before: data.next_before };
}

export async function reportResult(id: string, reason: string): Promise<void> {
    await Api.post(`/results/${id}/report`, { reason });
}

export async function toggleCheer(
    id: string,
): Promise<{ cheered: boolean; cheers_count: number }> {
    const { data } = await Api.post<{ cheered: boolean; cheers_count: number }>(
        `/results/${id}/cheer`,
    );
    return data;
}

export async function myCheers(ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const { data } = await Api.get<{ cheered: string[] }>('/results-cheers', {
        params: { ids: ids.join(',') },
    });
    return new Set(data.cheered ?? []);
}

/* ── Aluno ── */

export async function getResultEligibility(): Promise<ResultEligibility> {
    const { data } = await Api.get<ResultEligibility>('/my-results/eligible');
    return { ...data, photos: data.photos ?? [] };
}

export async function listMyResults(): Promise<MyResult[]> {
    const { data } = await Api.get<MyResult[]>('/my-results');
    return data ?? [];
}

export async function createResult(p: CreateResultPayload): Promise<MyResult> {
    const { data } = await Api.post<MyResult>('/my-results', p);
    return data;
}

export async function updateResult(
    id: string,
    p: { caption: string; goal: string; show: ResultShow; scopes: ResultScope[] },
): Promise<MyResult> {
    const { data } = await Api.patch<MyResult>(`/my-results/${id}`, p);
    return data;
}

export async function deleteResult(id: string): Promise<void> {
    await Api.delete(`/my-results/${id}`);
}

/* ── Personal e autor ── */

export interface ResultTag extends ResultCard {
    tag_status: 'pending' | 'accepted' | 'declined';
}

export async function listResultTags(): Promise<ResultTag[]> {
    const { data } = await Api.get<ResultTag[]>('/me/result-tags');
    return data ?? [];
}

export async function respondResultTag(
    id: string,
    accept: boolean,
): Promise<void> {
    await Api.post(`/me/result-tags/${id}/${accept ? 'accept' : 'decline'}`);
}

export async function listAuthorResults(): Promise<ResultCard[]> {
    const { data } = await Api.get<ResultCard[]>('/me/store/results');
    return data ?? [];
}

/* ── Admin ── */

export async function adminListResults(
    status: 'pending' | 'hidden' | 'published' | 'rejected',
): Promise<AdminResult[]> {
    const { data } = await Api.get<AdminResult[]>('/admin/results', {
        params: { status },
    });
    return data ?? [];
}

export async function adminApproveResult(id: string): Promise<void> {
    await Api.post(`/admin/results/${id}/approve`);
}

export async function adminRejectResult(
    id: string,
    reason: string,
): Promise<void> {
    await Api.post(`/admin/results/${id}/reject`, { reason });
}

export async function adminRemoveResult(id: string): Promise<void> {
    await Api.delete(`/admin/results/${id}`);
}

export async function adminResultMetrics(): Promise<{
    mural_sales: number;
    mural_gross: number;
}> {
    const { data } = await Api.get<{ mural_sales: number; mural_gross: number }>(
        '/admin/results/metrics',
    );
    return data;
}

/** Mensagem de erro da API (o backend devolve { error }). */
export function resultErrorMessage(err: unknown, fallback: string): string {
    const e = err as { response?: { data?: { error?: string } } };
    return e?.response?.data?.error || fallback;
}
