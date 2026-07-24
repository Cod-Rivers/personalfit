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

export async function deleteInvoice(
    studentId: string,
    invoiceId: string,
): Promise<void> {
    await Api.delete(`${base(studentId)}/${invoiceId}`);
}
