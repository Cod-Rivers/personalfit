import { Api } from '@/libs/api';

export type InvoiceStatus = 'open' | 'paid' | 'overdue';

export interface Invoice {
    id: string;
    description?: string;
    amount: number;
    due_date: string; // YYYY-MM-DD
    status: InvoiceStatus;
    paid_at?: string;
    created_at: string;
}

export interface InvoiceSummary {
    total_open: number;
    total_overdue: number;
    total_paid: number;
    open_count: number;
    overdue_count: number;
    has_overdue: boolean;
}

export interface InvoiceList {
    invoices: Invoice[];
    summary: InvoiceSummary;
}

export interface CreateInvoicePayload {
    description?: string;
    amount: number;
    due_date: string; // YYYY-MM-DD
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

export async function markInvoicePaid(
    studentId: string,
    invoiceId: string,
): Promise<Invoice> {
    const { data } = await Api.post<Invoice>(
        `${base(studentId)}/${invoiceId}/pay`,
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

/** Bloqueio automático de alunos com cobrança vencida. Vale para TODOS os
 * alunos do personal logado (GET/PUT /personal/overdue-block).
 *
 * Ferramenta do PRO desde 2026-09-27, com carência para quem já usava:
 * `requires_pro` diz que a carência acabou e o personal não é PRO (o
 * interruptor fica guardado, mas não bloqueia ninguém nem pode ser ligado);
 * `pro_grace_until` vem enquanto a carência vale, para a tela avisar. */
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

export async function deleteInvoice(
    studentId: string,
    invoiceId: string,
): Promise<void> {
    await Api.delete(`${base(studentId)}/${invoiceId}`);
}
