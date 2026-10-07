import axios from 'axios';
import { Api } from '@/libs/api';

export type CommissionType = 'percentage' | 'fixed';
/** Precisa ficar em sincronia com CommissionBase em
 *  Personal-fit-Back/internal/domain/referralpartner/referral_partner.go. */
export type CommissionBase = 'net' | 'gross';

/** Regra padrão de um parceiro novo (decisão de 2026-10-06): 15% na 1ª
 *  compra e 10% em todas as renovações, sobre o valor líquido. */
export const DEFAULT_FIRST_COMMISSION = 15;
export const DEFAULT_RENEWAL_COMMISSION = 10;

export interface CommissionRule {
    commission_type?: CommissionType;
    commission_value: number;
    renewal_commission_value: number;
    renewal_months: number;
    commission_base?: CommissionBase;
}

/** "15% na 1ª compra · 10% nas renovações do mensal · sobre o líquido".
 *  Renovação de plano semestral/anual não comissiona (só a 1ª compra). */
export function describeCommission(r: CommissionRule): string {
    const fixed = r.commission_type === 'fixed';
    const fmt = (v: number) =>
        fixed
            ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            : `${v.toLocaleString('pt-BR')}%`;
    const renewal =
        r.renewal_commission_value > 0
            ? `${fmt(r.renewal_commission_value)} nas renovações do mensal${r.renewal_months > 0 ? ` por ${r.renewal_months} meses` : ''}`
            : 'sem comissão nas renovações';
    const base = fixed
        ? ''
        : ` · sobre o ${r.commission_base === 'gross' ? 'bruto' : 'líquido'}`;
    return `${fmt(r.commission_value)} na 1ª compra · ${renewal}${base}`;
}

export interface ReferralPartner {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    code: string;
    commission_type: CommissionType;
    /** Valor na 1ª compra do cliente e nas compras avulsas (% ou R$). */
    commission_value: number;
    /** Valor em cada renovação (mesma unidade); 0 = só a 1ª compra. */
    renewal_commission_value: number;
    /** Renovações comissionadas só nos N primeiros meses do cliente; 0 = sem limite. */
    renewal_months: number;
    /** Base do percentual; ausente = líquido. */
    commission_base?: CommissionBase;
    notes?: string;
    is_active: boolean;
    /** Conta do Venafit que acessa o painel do parceiro (ausente = sem acesso). */
    account_name?: string;
    account_email?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateReferralPartnerRequest {
    name: string;
    email?: string;
    phone?: string;
    /** Vazio = o servidor sorteia um código de 8 caracteres. Preenchido =
     *  código escolhido (gravado na forma canônica). Não muda depois. */
    code?: string;
    commission_type: CommissionType;
    /** Valor na 1ª compra do cliente e nas compras avulsas (% ou R$). */
    commission_value: number;
    /** Valor em cada renovação (mesma unidade); 0 = só a 1ª compra. */
    renewal_commission_value: number;
    /** Renovações comissionadas só nos N primeiros meses do cliente; 0 = sem limite. */
    renewal_months: number;
    /** Base do percentual; ausente = líquido. */
    commission_base?: CommissionBase;
    notes?: string;
    is_active: boolean;
}

/** A edição não tem código: ele não muda depois de criado (está nos links já
 *  enviados e nos clientes que o usaram). */
export type UpdateReferralPartnerRequest = Omit<CreateReferralPartnerRequest, 'code'>;

/** Admin: lista todos os parceiros de indicação */
export async function getAllReferralPartners(): Promise<ReferralPartner[]> {
    const res = await Api.get<ReferralPartner[]>('/referral-partners');
    return res.data;
}

/* ───────── Código de indicação ───────── */

/** Tamanho do código escolhido no cadastro (o sorteado tem 8). Precisa ficar
 *  em sincronia com MinCodeLength/MaxCodeLength em
 *  Personal-fit-Back/internal/domain/referralpartner/referral_code.go. */
export const REFERRAL_CODE_MIN = 4;
export const REFERRAL_CODE_MAX = 20;

/** Forma canônica do código: maiúsculas, sem espaços, hífens, sublinhados e
 *  pontos ("joao-10" é o mesmo código que "JOAO10"). Espelho de NormalizeCode
 *  no backend, que é quem decide; aqui só mostra o código como será lido. */
export function normalizeReferralCode(raw: string): string {
    return raw.toUpperCase().replace(/[\s._-]+/g, '');
}

export interface ReferralCodeConfirmation {
    code: string;
    partner_name: string;
}

/**
 * Confirma um código de indicação pela rota pública (sem login, com limite de
 * tentativas por IP): devolve o código e o nome do parceiro ATIVO, ou null se
 * o código não existe ou o parceiro foi desativado (o servidor não diferencia
 * um caso do outro). Sem rede, limite estourado e erro do servidor são
 * lançados, para a tela não dizer "código não encontrado" à toa.
 */
export async function checkReferralCode(raw: string): Promise<ReferralCodeConfirmation | null> {
    const code = normalizeReferralCode(raw);
    if (!code) return null;
    try {
        const res = await Api.get<ReferralCodeConfirmation>(
            `/referral-codes/${encodeURIComponent(code)}`,
        );
        return res.data;
    } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) return null;
        throw err;
    }
}

/** Precisa ficar em sincronia com CodeAvailability em
 *  Personal-fit-Back/internal/application/referralpartner/queries/referral-code.go. */
export type CodeAvailabilityStatus = 'available' | 'taken' | 'reserved' | 'invalid';

/** Admin: diz se o código escolhido pode ser usado num parceiro novo
 *  ("taken" inclui os parceiros inativos: o código nunca volta a ficar livre). */
export async function checkCodeAvailability(
    raw: string,
): Promise<{ code: string; status: CodeAvailabilityStatus }> {
    const res = await Api.get<{ code: string; status: CodeAvailabilityStatus }>(
        '/referral-partners/code-availability',
        { params: { code: raw } },
    );
    return res.data;
}

export interface IndicationBucketCounts {
    today: number;
    week: number;
    month: number;
    year: number;
    total: number;
}

export interface IndicationStatEntry {
    key: string;
    label: string;
    counts: IndicationBucketCounts;
}

/** Admin: estatísticas de indicação (contagens aninhadas por parceiro/canal). */
export async function getIndicationStats(): Promise<IndicationStatEntry[]> {
    const res = await Api.get<{ entries: IndicationStatEntry[] }>(
        '/referral-partners/stats',
    );
    return res.data.entries ?? [];
}

/** Admin: cria parceiro de indicação */
export async function createReferralPartner(
    data: CreateReferralPartnerRequest,
): Promise<ReferralPartner> {
    const res = await Api.post<ReferralPartner>('/referral-partners', data);
    return res.data;
}

/** Admin: atualiza parceiro de indicação. Não há exclusão: parceiro que sai
 *  é desativado (is_active=false), e o código continua reservado. */
export async function updateReferralPartner(
    id: string,
    data: UpdateReferralPartnerRequest,
): Promise<ReferralPartner> {
    const res = await Api.put<ReferralPartner>(
        `/referral-partners/${id}`,
        data,
    );
    return res.data;
}

/* ───────── Relatório de parcerias (ganhos × gastos) ───────── */

/** Precisa ficar em sincronia com ExpenseCategory em
 *  Personal-fit-Back/internal/domain/referralpartner/partner_expense.go. */
export const EXPENSE_CATEGORIES = [
    { value: 'commission_payout', label: 'Repasse de comissão' },
    { value: 'fee', label: 'Cachê / valor fixo' },
    { value: 'product', label: 'Permuta / produto' },
    { value: 'ads', label: 'Impulsionamento / anúncio' },
    { value: 'other', label: 'Outros' },
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]['value'];

/** Canais que aceitam gasto sem parceiro cadastrado. */
export const EXPENSE_CHANNELS = [
    { value: 'instagram', label: 'Instagram' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'youtube', label: 'YouTube' },
] as const;

export const SALE_PRODUCTS = [
    { value: 'pro', label: 'PRO' },
    { value: 'personal_plus', label: 'Personal Plus' },
    { value: 'ai_substitution', label: 'Aluno Plus' },
    { value: 'library_plan', label: 'Plano da biblioteca' },
] as const;

export const SALE_GATEWAYS = [
    { value: 'GOOGLE_PLAY', label: 'Google Play' },
    { value: 'ASAAS_PIX', label: 'PIX' },
    { value: 'ASAAS_CARD', label: 'Cartão' },
] as const;

export type OriginKind = 'partner' | 'channel' | 'none' | 'unknown' | 'other';
export type SaleKind = 'trial' | 'new' | 'renewal' | 'one_time';
export type CommissionStatus = 'none' | 'holding' | 'available' | 'refunded';

export interface PartnershipRow {
    key: string;
    kind: OriginKind;
    label: string;
    partner_id?: string;
    code?: string;
    is_active: boolean;
    commission_type?: CommissionType;
    /** Valor na 1ª compra do cliente e nas compras avulsas (% ou R$). */
    commission_value: number;
    /** Valor em cada renovação (mesma unidade); 0 = só a 1ª compra. */
    renewal_commission_value: number;
    /** Renovações comissionadas só nos N primeiros meses do cliente; 0 = sem limite. */
    renewal_months: number;
    /** Base do percentual; ausente = líquido. */
    commission_base?: CommissionBase;
    signups: number;
    trials: number;
    new_sales: number;
    renewals: number;
    one_time: number;
    refunds: number;
    gross: number;
    net: number;
    commission: number;
    commission_paid: number;
    other_expenses: number;
    result: number;
    /** Saldo de todas as datas (não depende do período filtrado). */
    holding: number;
    available: number;
    paid_total: number;
    due: number;
}

export interface PartnershipSale {
    id: string;
    occurred_at: string;
    origin_key: string;
    origin_label: string;
    attribution_source?: 'checkout' | 'link';
    user_id: string;
    user_name: string;
    user_email: string;
    product: string;
    cycle?: string;
    gateway: string;
    kind: SaleKind;
    /** Parcela de um pagamento parcelado (1, 2, …); ausente fora dele. */
    installment_number?: number;
    status: 'confirmed' | 'refunded';
    gross: number;
    net: number;
    net_estimated: boolean;
    commission: number;
    commission_status: CommissionStatus;
}

export interface PartnerExpense {
    id: string;
    origin_key: string;
    label: string;
    category: ExpenseCategory;
    amount: number;
    date: string;
    description?: string;
    created_at: string;
}

export interface PartnershipMonth {
    month: string;
    gross: number;
    net: number;
    commission: number;
    other_expenses: number;
}

export interface PartnershipReport {
    from: string;
    to: string;
    commission_hold_days: number;
    summary: PartnershipRow;
    rows: PartnershipRow[];
    sales: PartnershipSale[];
    expenses: PartnerExpense[];
    months: PartnershipMonth[];
}

export interface PartnershipReportFilters {
    from?: string;
    to?: string;
    /** '' = todas; 'partners'; ou a chave de uma linha (partner:<id>, channel:instagram, none, unknown). */
    origin?: string;
    product?: string;
    gateway?: string;
}

/** Admin: relatório de ganhos e gastos das parcerias no período. */
export async function getPartnershipReport(
    filters: PartnershipReportFilters,
): Promise<PartnershipReport> {
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries(filters)) {
        if (v) params[k] = v;
    }
    const res = await Api.get<PartnershipReport>('/referral-partners/report', {
        params,
    });
    return res.data;
}

export interface CreatePartnerExpenseRequest {
    partner_id?: string;
    channel?: string;
    category: ExpenseCategory;
    amount: number;
    /** AAAA-MM-DD */
    date: string;
    description?: string;
}

/** Admin: lança um gasto (cachê, permuta, anúncio ou repasse de comissão). */
export async function createPartnerExpense(
    data: CreatePartnerExpenseRequest,
): Promise<PartnerExpense> {
    const res = await Api.post<PartnerExpense>(
        '/referral-partners/expenses',
        data,
    );
    return res.data;
}

/** Admin: exclui um gasto lançado. */
export async function deletePartnerExpense(id: string): Promise<void> {
    await Api.delete(`/referral-partners/expenses/${id}`);
}

/* ───────── Links de rastreio do parceiro ───────── */

/** Link do site: abre o app se ele estiver instalado (App Link) e guarda o
 *  código como primeiro toque (libs/acquisition.ts). */
export function partnerSiteLink(origin: string, code: string): string {
    return `${origin.replace(/\/$/, '')}/cadastro?ref=${encodeURIComponent(code)}`;
}

/* ───────── Programa de parceiros: regras de repasse e painel ───────── */

export interface ProgramSettings {
    min_payout: number;
    /** Dia do mês (1–28) até o qual o repasse é pago. */
    payout_day: number;
    /** AAAA-MM-DD */
    next_payout: string;
    hold_days: number;
}

/** Admin: regras de repasse do programa. */
export async function getProgramSettings(): Promise<ProgramSettings> {
    const res = await Api.get<ProgramSettings>('/referral-partners/settings');
    return res.data;
}

/** Admin: salva valor mínimo e dia do repasse. */
export async function saveProgramSettings(
    minPayout: number,
    payoutDay: number,
): Promise<ProgramSettings> {
    const res = await Api.put<ProgramSettings>('/referral-partners/settings', {
        min_payout: minPayout,
        payout_day: payoutDay,
    });
    return res.data;
}

/** Admin: libera o painel à conta do Venafit com esse e-mail de login. */
export async function linkPartnerAccount(
    partnerId: string,
    email: string,
): Promise<{ account_name: string; account_email: string }> {
    const res = await Api.put<{ account_name: string; account_email: string }>(
        `/referral-partners/${partnerId}/account`,
        { email },
    );
    return res.data;
}

/** Admin: tira o acesso ao painel. */
export async function unlinkPartnerAccount(partnerId: string): Promise<void> {
    await Api.delete(`/referral-partners/${partnerId}/account`);
}

export interface PartnerPanelSale {
    ref: string;
    occurred_at: string;
    product: string;
    cycle?: string;
    gateway: string;
    kind: SaleKind;
    installment_number?: number;
    status: 'confirmed' | 'refunded';
    gross: number;
    net: number;
    net_estimated: boolean;
    commission_type?: CommissionType;
    commission_value: number;
    commission_base?: CommissionBase;
    commission: number;
    commission_status: CommissionStatus;
    /** AAAA-MM-DD */
    release_at: string;
}

export interface PartnerPanel {
    partner: CommissionRule & {
        name: string;
        code: string;
        is_active: boolean;
    };
    settings: ProgramSettings;
    from: string;
    to: string;
    period: {
        signups: number;
        trials: number;
        purchases: number;
        renewals: number;
        refunds: number;
        commission: number;
    };
    /** Todas as datas. due < 0 = estorno já repassado, a descontar. */
    balance: { holding: number; available: number; paid: number; due: number };
    sales: PartnerPanelSale[];
    statements: {
        month: string;
        generated: number;
        voided: number;
        paid: number;
        balance: number;
    }[];
    years: {
        year: number;
        total: number;
        payments: { date: string; amount: number; description?: string }[];
    }[];
}

/** O painel do parceiro vinculado à conta logada (404 se não há). */
export async function getMyPartnerPanel(
    from?: string,
    to?: string,
): Promise<PartnerPanel> {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const res = await Api.get<PartnerPanel>('/me/partner', { params });
    return res.data;
}
