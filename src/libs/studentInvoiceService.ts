import { Api } from '@/libs/api';

/** Financeiro do personal (PRO): mensalidades avulsas e recorrentes, painel,
 * avisos e a tela "Mensalidades" do aluno. É só controle — a Venafit não
 * processa pagamento nem mostra chave PIX/dado bancário de ninguém
 * (decisão de 2026-09-29). */

export type InvoiceStatus = 'open' | 'paid' | 'overdue';
export type ReceiptMethod = 'pix' | 'cash' | 'card' | 'transfer' | 'other';
export type BillingFrequency = 'monthly' | 'quarterly' | 'semiannual' | 'annual';

export interface Invoice {
    id: string;
    description?: string;
    amount: number;
    due_date: string; // YYYY-MM-DD
    status: InvoiceStatus;
    paid_at?: string;
    created_at: string;
    paid_amount?: number;
    receipt_method?: ReceiptMethod;
    payment_note?: string;
    from_plan: boolean;
    /** O aluno tocou em "Já paguei" e o personal ainda não confirmou. */
    reported_by_student: boolean;
    student_reported_at?: string;
    student_report_note?: string;
}

export interface InvoiceSummary {
    total_open: number;
    total_overdue: number;
    total_paid: number;
    open_count: number;
    overdue_count: number;
    has_overdue: boolean;
    awaiting_count: number;
}

export interface BillingPlan {
    description?: string;
    amount: number;
    frequency: BillingFrequency;
    due_day: number;
    first_due_date: string;
    end_date?: string;
    active: boolean;
    monthly_equivalent: number;
}

export interface InvoiceList {
    invoices: Invoice[];
    summary: InvoiceSummary;
    plan?: BillingPlan;
    /** false = só leitura (sem PRO e sem carência). */
    can_edit: boolean;
    pro_grace_until?: string;
    block_exempt: boolean;
    student_phone?: string;
    student_name?: string;
}

export interface CreateInvoicePayload {
    description?: string;
    amount: number;
    due_date: string; // YYYY-MM-DD
}

export interface PayInvoicePayload {
    paid_on?: string; // YYYY-MM-DD
    method?: ReceiptMethod;
    amount?: number; // 0/ausente = valor da cobrança
    note?: string;
}

export interface SaveBillingPlanPayload {
    description?: string;
    amount: number;
    frequency: BillingFrequency;
    first_due_date: string;
    end_date?: string;
    apply_to_open?: boolean;
}

const base = (studentId: string) => `/students/${studentId}/invoices`;

export async function listInvoices(studentId: string): Promise<InvoiceList> {
    const { data } = await Api.get<InvoiceList>(base(studentId));
    return data;
}

export async function createInvoice(
    studentId: string,
    payload: CreateInvoicePayload,
): Promise<Invoice> {
    const { data } = await Api.post<Invoice>(base(studentId), payload);
    return data;
}

export async function updateInvoice(
    studentId: string,
    invoiceId: string,
    payload: CreateInvoicePayload,
): Promise<Invoice> {
    const { data } = await Api.patch<Invoice>(`${base(studentId)}/${invoiceId}`, payload);
    return data;
}

export async function markInvoicePaid(
    studentId: string,
    invoiceId: string,
    payload?: PayInvoicePayload,
): Promise<Invoice> {
    const { data } = await Api.post<Invoice>(
        `${base(studentId)}/${invoiceId}/pay`,
        payload,
    );
    return data;
}

export async function reopenInvoice(
    studentId: string,
    invoiceId: string,
): Promise<Invoice> {
    const { data } = await Api.post<Invoice>(
        `${base(studentId)}/${invoiceId}/reopen`,
    );
    return data;
}

/** O personal não identificou o pagamento informado pelo aluno. */
export async function dismissInvoiceReport(
    studentId: string,
    invoiceId: string,
): Promise<Invoice> {
    const { data } = await Api.post<Invoice>(
        `${base(studentId)}/${invoiceId}/dismiss-report`,
    );
    return data;
}

/** "Lembrar agora": push + sino (+ e-mail) ao aluno, um por dia. 409 com
 * code `reminder_already_sent_today` quando já foi lembrado hoje. */
export async function remindInvoice(studentId: string, invoiceId: string): Promise<void> {
    await Api.post(`${base(studentId)}/${invoiceId}/remind`);
}

export async function deleteInvoice(
    studentId: string,
    invoiceId: string,
): Promise<void> {
    await Api.delete(`${base(studentId)}/${invoiceId}`);
}

// ── Plano recorrente ────────────────────────────────────────────────────────

const planBase = (studentId: string) => `/students/${studentId}/billing-plan`;

export async function saveBillingPlan(
    studentId: string,
    payload: SaveBillingPlanPayload,
): Promise<BillingPlan> {
    const { data } = await Api.put<BillingPlan>(planBase(studentId), payload);
    return data;
}

export async function setBillingPlanActive(
    studentId: string,
    active: boolean,
): Promise<BillingPlan> {
    const { data } = await Api.post<BillingPlan>(
        `${planBase(studentId)}/${active ? 'resume' : 'pause'}`,
    );
    return data;
}

export async function deleteBillingPlan(studentId: string): Promise<void> {
    await Api.delete(planBase(studentId));
}

export async function setBlockExemption(studentId: string, exempt: boolean): Promise<void> {
    await Api.put(`/students/${studentId}/billing-exemption`, { exempt });
}

// ── Painel do personal ──────────────────────────────────────────────────────

export interface FinanceMonthPoint {
    key: string;
    label: string;
    expected: number;
    received: number;
}

export interface FinanceCollectItem {
    invoice: Invoice;
    student_id: string;
    student_name: string;
    student_phone?: string;
    days_until_due: number; // <0 = atraso
}

export type FinanceStudentState =
    | 'none'
    | 'ok'
    | 'due_soon'
    | 'due_today'
    | 'overdue'
    | 'awaiting';

export interface FinanceStudentStatus {
    student_id: string;
    state: FinanceStudentState;
    overdue_amount?: number;
    overdue_days?: number;
    next_due_date?: string;
    next_amount?: number;
    has_plan: boolean;
    plan_active: boolean;
}

export interface FinanceOverview {
    month_key: string;
    month_label: string;
    received_month: number;
    expected_month: number;
    open_month: number;
    overdue_total: number;
    overdue_count: number;
    overdue_students: number;
    awaiting_confirm: number;
    forecast_30: number;
    mrr: number;
    active_plans: number;
    billed_students: number;
    delinquency_rate: number;
    series: FinanceMonthPoint[];
    to_collect: FinanceCollectItem[];
    students: FinanceStudentStatus[];
    can_edit: boolean;
    pro_grace_until?: string;
}

export async function getFinanceOverview(): Promise<FinanceOverview> {
    const { data } = await Api.get<FinanceOverview>('/personal/finance/overview');
    return data;
}

export async function getFinanceStudentsStatus(): Promise<{
    students: FinanceStudentStatus[];
    can_edit: boolean;
}> {
    const { data } = await Api.get('/personal/finance/students-status');
    return data;
}

/** Recebido no período [from, to] (YYYY-MM-DD, inclusivo). */
export async function getReceived(from: string, to: string): Promise<FinanceCollectItem[]> {
    const { data } = await Api.get<{ items: FinanceCollectItem[] }>(
        '/personal/finance/received',
        { params: { from, to } },
    );
    return data.items;
}

// ── Preferências de aviso ───────────────────────────────────────────────────

export interface BillingSettings {
    reminders_enabled: boolean;
    remind_days_before: number;
    remind_on_due_date: boolean;
    remind_days_after: number;
    email_student: boolean;
    notify_new_invoice: boolean;
    notify_payment_confirmed: boolean;
    daily_digest: boolean;
    block_grace_days: number;
    block_enabled: boolean;
}

export interface BillingSettingsResponse extends BillingSettings {
    can_edit: boolean;
    pro_grace_until?: string;
}

export async function getBillingSettings(): Promise<BillingSettingsResponse> {
    const { data } = await Api.get<BillingSettingsResponse>('/personal/finance/settings');
    return data;
}

export async function saveBillingSettings(
    settings: BillingSettings,
): Promise<BillingSettingsResponse> {
    const { data } = await Api.put<BillingSettingsResponse>('/personal/finance/settings', settings);
    return data;
}

/** Bloqueio automático de alunos com cobrança vencida (rota antiga, mantida
 * por compatibilidade — a tela nova usa getBillingSettings/saveBillingSettings,
 * que também gravam o interruptor). */
export interface OverdueBlockSettings {
    enabled: boolean;
    requires_pro: boolean;
    pro_grace_until?: string;
}

export async function getOverdueBlock(): Promise<OverdueBlockSettings> {
    const { data } = await Api.get<OverdueBlockSettings>('/personal/overdue-block');
    return data;
}

export async function setOverdueBlock(enabled: boolean): Promise<OverdueBlockSettings> {
    const { data } = await Api.put<OverdueBlockSettings>('/personal/overdue-block', {
        enabled,
    });
    return data;
}

// ── Aluno ───────────────────────────────────────────────────────────────────

export interface MyInvoices {
    /** false = o personal não usa o financeiro no app. */
    enabled: boolean;
    personal_name?: string;
    invoices: Invoice[];
    summary: InvoiceSummary;
    blocked: boolean;
}

export async function getMyInvoices(): Promise<MyInvoices> {
    const { data } = await Api.get<MyInvoices>('/me/invoices');
    return data;
}

export async function reportInvoicePaid(invoiceId: string, note?: string): Promise<Invoice> {
    const { data } = await Api.post<Invoice>(`/me/invoices/${invoiceId}/report-paid`, {
        note: note?.trim() || undefined,
    });
    return data;
}

/** Código de erro da API (ex.: `requires_pro`), para mensagens específicas. */
export function apiErrorCode(err: unknown): string | undefined {
    return (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
}
