import { Api } from '@/libs/api';
import type {
    CardSubscriptionForm,
    PurchaseLibraryPlanResponse,
} from '@/libs/paymentService';
import type {
    MacrocycleResponse,
    StorePlanPreview,
} from '@/libs/planningService';
import type { StoreProgramStatus } from '@/libs/referralPartnerService';

/**
 * Loja de programas de treino (Todo/PLANO_LOJA_DE_TREINOS.md). Vitrine,
 * página do programa e do autor, compra e a página "Loja" do admin.
 *
 * As listas fechadas abaixo precisam ficar em sincronia com
 * Personal-fit-Back/internal/domain/store/program.go.
 */

export const STORE_LEVELS = [
    { value: 'iniciante', label: 'Iniciante' },
    { value: 'intermediario', label: 'Intermediário' },
    { value: 'avancado', label: 'Avançado' },
] as const;

export const STORE_GOALS = [
    { value: 'hipertrofia', label: 'Hipertrofia' },
    { value: 'emagrecimento', label: 'Emagrecimento' },
    { value: 'forca', label: 'Força' },
    { value: 'gluteos', label: 'Glúteos' },
    { value: 'condicionamento', label: 'Condicionamento' },
    { value: 'definicao', label: 'Definição' },
    { value: 'saude', label: 'Saúde' },
] as const;

export const STORE_EQUIPMENT = [
    { value: 'academia', label: 'Academia' },
    { value: 'halteres_em_casa', label: 'Halteres em casa' },
    { value: 'peso_do_corpo', label: 'Peso do corpo' },
] as const;

export const STORE_SORTS = [
    { value: 'featured', label: 'Destaques' },
    { value: 'best_selling', label: 'Mais vendidos' },
    { value: 'top_rated', label: 'Mais bem avaliados' },
    { value: 'newest', label: 'Mais novos' },
] as const;

export type StoreSort = (typeof STORE_SORTS)[number]['value'];

/** Situação do programa na loja, como o autor e o admin a leem. */
export const STORE_STATUS_LABEL: Record<StoreProgramStatus, string> = {
    draft: 'Rascunho',
    pending: 'Em revisão',
    published: 'À venda',
    rejected: 'Recusado',
    paused: 'Pausado',
    retired: 'Encerrado',
};

function labelOf(
    list: readonly { value: string; label: string }[],
    value?: string,
): string {
    return list.find((i) => i.value === value)?.label ?? '';
}

export const levelLabel = (v?: string) => labelOf(STORE_LEVELS, v);
export const goalLabel = (v?: string) => labelOf(STORE_GOALS, v);
export const equipmentLabel = (v?: string) => labelOf(STORE_EQUIPMENT, v);

export interface StoreAuthorCard {
    code: string;
    name: string;
    photo_url?: string;
    /** "CREF 012345-G/SP" */
    cref: string;
}

export interface StoreProgramCard {
    id: string;
    title: string;
    summary?: string;
    level?: string;
    goals: string[];
    equipment?: string;
    days_per_week: number;
    duration_weeks: number;
    session_minutes?: number;
    cover_url?: string;
    cover_video_thumb?: string;
    cover_video_url?: string;
    price: number;
    price_tier: string;
    /** Produto do Google Play da faixa: o app abre a compra com ele. */
    play_product_id: string;
    featured?: boolean;
    sales_count: number;
    rating_avg: number;
    rating_count: number;
    venafit_collection: boolean;
    author?: StoreAuthorCard;
    published_at?: string;
}

export interface StoreProgramDetail extends StoreProgramCard {
    description?: string;
    audience?: string;
    prerequisites?: string;
    author_bio?: string;
    author_specialties?: string[];
    /** Só a prévia: estrutura, grupos musculares e os nomes do 1º treino. */
    preview: StorePlanPreview;
    /** Comentários aprovados de quem comprou (fase 3). */
    reviews?: StoreReview[];
}

/** Comentário público na página do programa: o primeiro nome que o aluno
 *  autorizou mostrar, depois da moderação da equipe. */
export interface StoreReview {
    first_name: string;
    stars: number;
    comment: string;
    created_at: string;
    /** O plano avaliado foi comprado na loja. */
    verified: boolean;
}

/** Coleção temática da vitrine (fase 3). */
export interface StoreCollection {
    slug: string;
    title: string;
    description?: string;
    programs: StoreProgramCard[];
}

export interface StoreAuthorPage {
    author: StoreAuthorCard & { bio?: string; specialties: string[] };
    programs: StoreProgramCard[];
}

export interface StoreFilters {
    goal?: string;
    level?: string;
    equipment?: string;
    /** 5 = "5 ou mais". */
    days?: number;
    sort?: StoreSort;
}

/** GET /store/programs — vitrine com filtros e ordem. */
export async function listStorePrograms(
    filters: StoreFilters = {},
): Promise<StoreProgramCard[]> {
    const params: Record<string, string> = {};
    if (filters.goal) params.goal = filters.goal;
    if (filters.level) params.level = filters.level;
    if (filters.equipment) params.equipment = filters.equipment;
    if (filters.days) params.days = String(filters.days);
    if (filters.sort) params.sort = filters.sort;
    const { data } = await Api.get<StoreProgramCard[]>('/store/programs', {
        params,
    });
    return data ?? [];
}

/** GET /store/programs/:id — página do programa (404 fora de venda). */
export async function getStoreProgram(id: string): Promise<StoreProgramDetail> {
    const { data } = await Api.get<StoreProgramDetail>(`/store/programs/${id}`);
    return data;
}

/** GET /store/authors/:code — página do autor. */
export async function getStoreAuthor(code: string): Promise<StoreAuthorPage> {
    const { data } = await Api.get<StoreAuthorPage>(
        `/store/authors/${encodeURIComponent(code)}`,
    );
    return data;
}

function saleRefBody(ref?: string | null) {
    return ref ? { ref } : {};
}

function playChoice(externalTransactionToken?: string) {
    return externalTransactionToken
        ? { external_transaction_token: externalTransactionToken }
        : {};
}

/** Compra o programa no PIX. O plano é aplicado na confirmação do pagamento. */
export async function purchaseStoreProgramPix(
    programId: string,
    ref?: string | null,
    externalTransactionToken?: string,
): Promise<PurchaseLibraryPlanResponse> {
    const { data } = await Api.post<PurchaseLibraryPlanResponse>(
        `/store/programs/${programId}/purchase`,
        {
            payment_method: 'PIX',
            ...saleRefBody(ref),
            ...playChoice(externalTransactionToken),
        },
    );
    return data;
}

/** Compra o programa no cartão (síncrono). Aprovado = applied. */
export async function purchaseStoreProgramCard(
    programId: string,
    card: CardSubscriptionForm,
    ref?: string | null,
    externalTransactionToken?: string,
): Promise<PurchaseLibraryPlanResponse> {
    const { data } = await Api.post<PurchaseLibraryPlanResponse>(
        `/store/programs/${programId}/purchase`,
        {
            payment_method: 'CREDIT_CARD',
            ...card,
            ...saleRefBody(ref),
            ...playChoice(externalTransactionToken),
        },
    );
    return data;
}

/* ── Admin: página "Loja" ── */

export interface StoreListing {
    title: string;
    summary: string;
    description: string;
    audience: string;
    prerequisites: string;
    level: string;
    goals: string[];
    equipment: string;
    session_minutes: number;
}

export const EMPTY_LISTING: StoreListing = {
    title: '',
    summary: '',
    description: '',
    audience: '',
    prerequisites: '',
    level: '',
    goals: [],
    equipment: '',
    session_minutes: 0,
};

/** Limites dos textos da ficha (sincronia com store.Max*Length). */
export const STORE_LIMITS = {
    title: 80,
    summary: 140,
    description: 3000,
    audience: 500,
    prerequisites: 500,
} as const;

export interface PriceTier {
    id: string;
    value: number;
    play_product_id: string;
}

export interface AdminStoreMeta {
    price_tiers: PriceTier[];
    levels: string[];
    goals: string[];
    equipment: string[];
}

export interface AdminStoreProgram {
    id: string;
    status: StoreProgramStatus;
    rejection_reason?: string;
    author_partner_id?: string;
    author_name?: string;
    author_can_publish: boolean;
    venafit_collection: boolean;
    template_id: string;
    source_template_id?: string;
    listing: StoreListing;
    days_per_week: number;
    duration_weeks: number;
    cover_key?: string;
    cover_url?: string;
    cover_video_thumb?: string;
    cover_video_url?: string;
    price_tier: string;
    price: number;
    price_changed_at?: string;
    featured: boolean;
    sales_count: number;
    version: number;
    published_at?: string;
    created_at: string;
    updated_at: string;
    /** Fila de revisão (fase 2). */
    submitted_at?: string;
    /** Quem pausou: o autor devolve à vitrine só o que ele pausou. */
    paused_by?: 'author' | 'team';
    /** Na fila da equipe: primeiro envio ou alteração de um aprovado. */
    in_review: boolean;
    /** Alteração enviada de um programa já aprovado, ainda em revisão. */
    revision?: StoreRevision;
    revision_rejection_reason?: string;
}

/** A alteração em revisão: a ficha proposta inteira. */
export interface StoreRevision {
    has_content: boolean;
    listing: StoreListing;
    price_tier: string;
    price: number;
    cover_key?: string;
    cover_url?: string;
    note?: string;
    submitted_at: string;
}

export type ContentIssueCode =
    | 'too_few_trainings'
    | 'empty_training'
    | 'missing_video'
    | 'external_link'
    | 'slow_start_video';

export interface ContentIssue {
    code: ContentIssueCode;
    severity: 'block' | 'warn';
    message: string;
    training?: string;
    exercise?: string;
}

export interface OwnVideo {
    training: string;
    exercise: string;
    url: string;
    in_store: boolean;
    /** null = não deu para conferir. */
    fast_start: boolean | null;
}

export interface AdminStoreReview {
    program: AdminStoreProgram;
    /** O plano INTEIRO (só o admin vê). */
    template: MacrocycleResponse;
    /** template é o conteúdo novo da alteração em revisão (senão, o
     *  publicado). */
    revision_content: boolean;
    issues: ContentIssue[];
    own_videos: OwnVideo[];
}

export interface AdminStoreSourceTemplate {
    id: string;
    name: string;
    trainings: number;
    created_by_admin: boolean;
    is_public: boolean;
    approval_status?: string;
    in_library: boolean;
}

export interface CreateStoreProgramRequest {
    source_template_id: string;
    /** Vazio = Coleção Venafit. */
    author_partner_id?: string;
    listing: StoreListing;
    price_tier: string;
    remove_source_from_library?: boolean;
}

const ADMIN = '/admin/store';

export async function getAdminStoreMeta(): Promise<AdminStoreMeta> {
    const { data } = await Api.get<AdminStoreMeta>(`${ADMIN}/meta`);
    return data;
}

export async function listAdminStorePrograms(): Promise<AdminStoreProgram[]> {
    const { data } = await Api.get<AdminStoreProgram[]>(`${ADMIN}/programs`);
    return data ?? [];
}

export async function listStoreSourceTemplates(
    authorPartnerId?: string,
): Promise<AdminStoreSourceTemplate[]> {
    const { data } = await Api.get<AdminStoreSourceTemplate[]>(
        `${ADMIN}/source-templates`,
        {
            params: authorPartnerId
                ? { author_partner_id: authorPartnerId }
                : {},
        },
    );
    return data ?? [];
}

export async function createStoreProgram(
    req: CreateStoreProgramRequest,
): Promise<AdminStoreProgram> {
    const { data } = await Api.post<AdminStoreProgram>(
        `${ADMIN}/programs`,
        req,
    );
    return data;
}

export async function getAdminStoreReview(
    id: string,
): Promise<AdminStoreReview> {
    const { data } = await Api.get<AdminStoreReview>(`${ADMIN}/programs/${id}`);
    return data;
}

export async function updateStoreProgram(
    id: string,
    patch: { listing?: StoreListing; price_tier?: string; featured?: boolean },
): Promise<AdminStoreProgram> {
    const { data } = await Api.put<AdminStoreProgram>(
        `${ADMIN}/programs/${id}`,
        patch,
    );
    return data;
}

export type StoreProgramAction =
    | 'refresh'
    | 'publish'
    | 'pause'
    | 'resume'
    | 'retire';

export async function runStoreProgramAction(
    id: string,
    action: StoreProgramAction,
): Promise<AdminStoreProgram> {
    const { data } = await Api.post<AdminStoreProgram>(
        `${ADMIN}/programs/${id}/${action}`,
    );
    return data;
}

export async function rejectStoreProgram(
    id: string,
    reason: string,
): Promise<AdminStoreProgram> {
    const { data } = await Api.post<AdminStoreProgram>(
        `${ADMIN}/programs/${id}/reject`,
        { reason },
    );
    return data;
}

/** Aprova a alteração enviada pelo autor de um programa já aprovado. */
export async function approveStoreRevision(
    id: string,
): Promise<AdminStoreProgram> {
    const { data } = await Api.post<AdminStoreProgram>(
        `${ADMIN}/programs/${id}/revision/approve`,
    );
    return data;
}

/** Recusa a alteração; a vitrine segue com a versão aprovada. */
export async function rejectStoreRevision(
    id: string,
    reason: string,
): Promise<AdminStoreProgram> {
    const { data } = await Api.post<AdminStoreProgram>(
        `${ADMIN}/programs/${id}/revision/reject`,
        { reason },
    );
    return data;
}

export async function getStoreCoverUploadUrl(
    id: string,
    contentType: string,
): Promise<{ key: string; upload_url: string; public_url: string }> {
    const { data } = await Api.post(
        `${ADMIN}/programs/${id}/cover-upload-url`,
        {
            content_type: contentType,
        },
    );
    return data;
}

export async function setStoreCover(
    id: string,
    key: string,
): Promise<AdminStoreProgram> {
    const { data } = await Api.put<AdminStoreProgram>(
        `${ADMIN}/programs/${id}/cover`,
        { key },
    );
    return data;
}

/** Envia um arquivo para a URL assinada do R2 (PUT direto, sem o backend). */
export async function uploadToSignedUrl(
    url: string,
    file: File,
): Promise<void> {
    const res = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
    });
    if (!res.ok) {
        throw new Error(`Falha no envio (${res.status})`);
    }
}

/* ── Autor: candidatura e publicação (fase 2) ── */

export const BR_STATES = [
    'AC',
    'AL',
    'AP',
    'AM',
    'BA',
    'CE',
    'DF',
    'ES',
    'GO',
    'MA',
    'MT',
    'MS',
    'MG',
    'PA',
    'PB',
    'PR',
    'PE',
    'PI',
    'RJ',
    'RN',
    'RS',
    'RO',
    'RR',
    'SC',
    'SP',
    'SE',
    'TO',
] as const;

/** Limites da candidatura (sincronia com referralpartner.MaxApplication*). */
export const APPLICATION_LIMITS = {
    publicName: 60,
    bio: 600,
    pitchMin: 20,
    pitch: 1000,
    links: 300,
    specialties: 6,
    specialty: 40,
} as const;

/** Sincronia com referralpartner.ApplicationStatus. */
export type AuthorApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface AuthorApplication {
    id: string;
    status: AuthorApplicationStatus;
    rejection_reason?: string;
    public_name: string;
    cref: string;
    cref_state: string;
    bio?: string;
    specialties: string[];
    pitch: string;
    links?: string;
    desired_code?: string;
    created_at: string;
    reviewed_at?: string;
    /** Só na lista do admin. */
    name?: string;
    email?: string;
    phone?: string;
    partner_id?: string;
}

export interface MyAuthorApplication {
    application: AuthorApplication | null;
    is_author: boolean;
    /** A conta já é de um parceiro: o código dele vale para a loja. */
    is_partner: boolean;
}

export interface AuthorApplicationForm {
    public_name: string;
    cref: string;
    cref_state: string;
    phone: string;
    bio: string;
    specialties: string[];
    pitch: string;
    links: string;
    desired_code: string;
}

/** GET /me/store/application — a candidatura da conta logada (personal). */
export async function getMyAuthorApplication(): Promise<MyAuthorApplication> {
    const { data } = await Api.get<MyAuthorApplication>(
        '/me/store/application',
    );
    return data;
}

/** POST /me/store/application — envia a candidatura a autor. */
export async function submitAuthorApplication(
    form: AuthorApplicationForm,
): Promise<AuthorApplication> {
    const { data } = await Api.post<AuthorApplication>(
        '/me/store/application',
        form,
    );
    return data;
}

/** Admin: a fila de candidaturas (sem status = todas). */
export async function listAuthorApplications(
    status?: AuthorApplicationStatus,
): Promise<AuthorApplication[]> {
    const { data } = await Api.get<AuthorApplication[]>(
        `${ADMIN}/applications`,
        { params: status ? { status } : {} },
    );
    return data ?? [];
}

/** Admin: aprova (exige ter conferido o CREF no CONFEF). */
export async function approveAuthorApplication(
    id: string,
    body: {
        cref_verified: boolean;
        store_share?: number;
        direct_share?: number;
        code?: string;
    },
): Promise<AuthorApplication> {
    const { data } = await Api.post<AuthorApplication>(
        `${ADMIN}/applications/${id}/approve`,
        body,
    );
    return data;
}

export async function rejectAuthorApplication(
    id: string,
    reason: string,
): Promise<AuthorApplication> {
    const { data } = await Api.post<AuthorApplication>(
        `${ADMIN}/applications/${id}/reject`,
        { reason },
    );
    return data;
}

export interface AuthorStoreMeta extends AdminStoreMeta {
    code: string;
    can_publish: boolean;
    cref_verified: boolean;
    terms_accepted: boolean;
}

export interface StoreSourceCheck {
    issues: ContentIssue[];
    /** Algum problema impede o envio. */
    blocked: boolean;
    /** O modelo está na biblioteca pública: o envio pede a retirada. */
    in_library: boolean;
}

const ME = '/me/store';

/** GET /me/store/meta — faixas, listas da ficha e se já pode publicar (403
 *  para quem não é autor). */
export async function getAuthorStoreMeta(): Promise<AuthorStoreMeta> {
    const { data } = await Api.get<AuthorStoreMeta>(`${ME}/meta`);
    return data;
}

export async function listMyStorePrograms(): Promise<AdminStoreProgram[]> {
    const { data } = await Api.get<AdminStoreProgram[]>(`${ME}/programs`);
    return data ?? [];
}

/** As checagens de um modelo antes de enviar (as mesmas do envio). */
export async function checkStoreSource(
    templateId: string,
): Promise<StoreSourceCheck> {
    const { data } = await Api.post<StoreSourceCheck>(`${ME}/check`, {
        source_template_id: templateId,
    });
    return data;
}

/** Envia um modelo de "Minha biblioteca" para a loja: nasce em revisão. */
export async function createMyStoreProgram(req: {
    source_template_id: string;
    listing: StoreListing;
    price_tier: string;
    remove_source_from_library?: boolean;
}): Promise<AdminStoreProgram> {
    const { data } = await Api.post<AdminStoreProgram>(`${ME}/programs`, req);
    return data;
}

/** Manda o programa (de novo) para a revisão: reenvio de rascunho ou
 *  recusado, ou alteração de um aprovado. */
export async function submitMyStoreProgram(
    id: string,
    body: {
        listing: StoreListing;
        price_tier: string;
        cover_key: string;
        include_content: boolean;
        note?: string;
    },
): Promise<AdminStoreProgram> {
    const { data } = await Api.post<AdminStoreProgram>(
        `${ME}/programs/${id}/submit`,
        body,
    );
    return data;
}

export type MyStoreProgramAction = 'cancel-review' | 'pause' | 'resume';

export async function runMyStoreProgramAction(
    id: string,
    action: MyStoreProgramAction,
): Promise<AdminStoreProgram> {
    const { data } = await Api.post<AdminStoreProgram>(
        `${ME}/programs/${id}/${action}`,
    );
    return data;
}

export async function getMyStoreCoverUploadUrl(
    id: string,
    contentType: string,
): Promise<{ key: string; upload_url: string; public_url: string }> {
    const { data } = await Api.post(`${ME}/programs/${id}/cover-upload-url`, {
        content_type: contentType,
    });
    return data;
}

/** Capa de um programa ainda não aprovado (num aprovado, a capa vai junto
 *  com a alteração). */
export async function setMyStoreCover(
    id: string,
    key: string,
): Promise<AdminStoreProgram> {
    const { data } = await Api.put<AdminStoreProgram>(
        `${ME}/programs/${id}/cover`,
        { key },
    );
    return data;
}

export type AuthorSubmitMode = 'resubmit' | 'revision';

/** O que o autor pode fazer com um programa dele, e como a situação aparece
 *  para ele. Espelha as regras de domain/store/program.go. */
export interface AuthorProgramActions {
    label: string;
    /** O formulário de envio: reenvio (rascunho ou recusado) ou alteração
     *  (aprovado e sem alteração pendente). null = nada a enviar agora. */
    submitMode: AuthorSubmitMode | null;
    canCancelReview: boolean;
    canPause: boolean;
    canResume: boolean;
    /** Motivo da última recusa (do programa ou da alteração). */
    rejection?: string;
}

export function authorProgramActions(
    p: AdminStoreProgram,
): AuthorProgramActions {
    const approved = p.status === 'published' || p.status === 'paused';
    let label: string = STORE_STATUS_LABEL[p.status];
    if (p.status === 'paused' && p.paused_by !== 'author') {
        label = 'Pausado pela equipe';
    }
    if (p.revision) label += ' · alteração em revisão';
    return {
        label,
        submitMode:
            p.status === 'draft' || p.status === 'rejected'
                ? 'resubmit'
                : approved && !p.revision
                  ? 'revision'
                  : null,
        canCancelReview: p.status === 'pending' || !!p.revision,
        canPause: p.status === 'published',
        canResume: p.status === 'paused' && p.paused_by === 'author',
        rejection:
            p.status === 'rejected'
                ? p.rejection_reason
                : p.revision_rejection_reason || undefined,
    };
}

/* ── Links de divulgação ── */

/** /loja/programa/ID?ref=CODIGO — o link que o autor (ou parceiro) divulga. */
export function programShareLink(
    origin: string,
    programId: string,
    code?: string,
): string {
    const base = `${origin}/loja/programa/${programId}`;
    return code ? `${base}?ref=${encodeURIComponent(code)}` : base;
}

/** /loja/autor/CODIGO — a vitrine do autor. */
export function authorShareLink(origin: string, code: string): string {
    return `${origin}/loja/autor/${encodeURIComponent(code)}`;
}

/** O programa (não encerrado) que saiu de um treino de "Minha biblioteca". */
export function programFromSource(
    programs: AdminStoreProgram[],
    templateId: string,
): AdminStoreProgram | undefined {
    return programs.find(
        (p) => p.source_template_id === templateId && p.status !== 'retired',
    );
}

/** GET /store/collections — as coleções temáticas publicadas (público). */
export async function listStoreCollections(): Promise<StoreCollection[]> {
    const { data } = await Api.get<StoreCollection[]>('/store/collections');
    return data ?? [];
}

/** GET /store/collections/:slug — uma coleção (404 fora da vitrine). */
export async function getStoreCollection(
    slug: string,
): Promise<StoreCollection> {
    const { data } = await Api.get<StoreCollection>(
        `/store/collections/${encodeURIComponent(slug)}`,
    );
    return data;
}

/** POST /my-planning/:id/store-update — passa o plano comprado para a
 *  versão nova do programa, sem cobrança. */
export async function upgradeStorePlan(
    planId: string,
): Promise<MacrocycleResponse> {
    const { data } = await Api.post<MacrocycleResponse>(
        `/my-planning/${planId}/store-update`,
    );
    return data;
}

/* ── Admin: coleções, comentários e vídeos de autores (fase 3) ── */

export interface AdminStoreCollection {
    id: string;
    slug: string;
    title: string;
    description?: string;
    program_ids: string[];
    published: boolean;
    position: number;
    updated_at: string;
}

export interface AdminStoreCollectionInput {
    slug: string;
    title: string;
    description: string;
    program_ids: string[];
    published: boolean;
    position: number;
}

export async function listAdminCollections(): Promise<AdminStoreCollection[]> {
    const { data } = await Api.get<AdminStoreCollection[]>(
        `${ADMIN}/collections`,
    );
    return data ?? [];
}

export async function saveAdminCollection(
    id: string | null,
    body: AdminStoreCollectionInput,
): Promise<AdminStoreCollection> {
    const { data } = id
        ? await Api.put<AdminStoreCollection>(
              `${ADMIN}/collections/${id}`,
              body,
          )
        : await Api.post<AdminStoreCollection>(`${ADMIN}/collections`, body);
    return data;
}

export async function deleteAdminCollection(id: string): Promise<void> {
    await Api.delete(`${ADMIN}/collections/${id}`);
}

export type ReviewModeration = 'pending' | 'approved' | 'rejected';

export interface AdminStoreReviewItem {
    id: string;
    program_id?: string;
    program_title?: string;
    first_name: string;
    stars: number;
    comment: string;
    moderation: ReviewModeration;
    created_at: string;
}

export async function listAdminReviews(
    status: ReviewModeration = 'pending',
): Promise<AdminStoreReviewItem[]> {
    const { data } = await Api.get<AdminStoreReviewItem[]>(`${ADMIN}/reviews`, {
        params: { status },
    });
    return data ?? [];
}

export async function moderateAdminReview(
    id: string,
    approve: boolean,
): Promise<AdminStoreReviewItem> {
    const { data } = await Api.post<AdminStoreReviewItem>(
        `${ADMIN}/reviews/${id}/${approve ? 'approve' : 'reject'}`,
    );
    return data;
}

export interface AdminAuthorVideo {
    exercise_id: string;
    name: string;
    muscle_group?: string;
    video_url: string;
    video_thumb?: string;
    author_name?: string;
    author_code?: string;
    credit?: string;
    accepted_at: string;
    promoted_library_id?: string;
}

export async function listAdminAuthorVideos(): Promise<AdminAuthorVideo[]> {
    const { data } = await Api.get<AdminAuthorVideo[]>(
        `${ADMIN}/author-videos`,
    );
    return data ?? [];
}

/** Leva o vídeo autorizado para a biblioteca geral (vazio = exercício novo). */
export async function promoteAdminAuthorVideo(
    exerciseId: string,
    targetLibraryId?: string,
): Promise<void> {
    await Api.post(
        `${ADMIN}/author-videos/${exerciseId}/promote`,
        targetLibraryId ? { target_library_id: targetLibraryId } : {},
    );
}

/** Texto da autorização do vídeo para a biblioteca geral. Sincronia com
 *  training.LibraryConsentVersion (Personal-fit-Back). */
export const LIBRARY_CONSENT_VERSION = 'v1';
export const LIBRARY_CONSENT_TEXT =
    'Autorizo o Venafit a copiar este vídeo para a biblioteca geral de exercícios do app, com o crédito "Vídeo: meu nome público · meu CREF". A cópia fica na biblioteca mesmo se eu apagar ou trocar o vídeo aqui.';

/** PUT /my-exercises/:id/library-consent — o autor autoriza (ou não) o vídeo. */
export async function setLibraryConsent(
    exerciseId: string,
    consent: boolean,
): Promise<void> {
    await Api.put(`/my-exercises/${exerciseId}/library-consent`, { consent });
}
