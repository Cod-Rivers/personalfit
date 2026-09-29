import type {
    BillingFrequency,
    FinanceCollectItem,
    Invoice,
    ReceiptMethod,
} from '@/libs/studentInvoiceService';

/** Formatação e utilidades puras do financeiro (testadas em
 * financeFormat.test.ts). */

export const BRL = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** "YYYY-MM-DD" → "05/10/2026" (sem cair um dia por causa do fuso). */
export function fmtDate(d: string | undefined): string {
    if (!d) return '';
    const dt = new Date(d.slice(0, 10) + 'T12:00:00');
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('pt-BR');
}

/** Data local de hoje em "YYYY-MM-DD" (toISOString daria o dia UTC, que à
 * noite no Brasil já é amanhã). */
export function todayISO(now: Date = new Date()): string {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** Valor digitado ("1.234,50", "150", "99.9") → número, ou NaN. */
export function parseAmount(raw: string): number {
    const s = raw.trim().replace(/\s|R\$/g, '');
    if (!s) return NaN;
    // Com vírgula, ela é o decimal e os pontos são milhar.
    const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
    const n = Number(normalized);
    return isFinite(n) ? n : NaN;
}

export const RECEIPT_METHOD_LABEL: Record<ReceiptMethod, string> = {
    pix: 'PIX',
    cash: 'Dinheiro',
    card: 'Cartão',
    transfer: 'Transferência',
    other: 'Outro',
};

export const FREQUENCY_LABEL: Record<BillingFrequency, string> = {
    monthly: 'Mensal',
    quarterly: 'Trimestral',
    semiannual: 'Semestral',
    annual: 'Anual',
};

/** Dias até o vencimento (negativo = atraso), pelo calendário local. */
export function daysUntil(due: string, today: string = todayISO()): number {
    const a = Date.UTC(+due.slice(0, 4), +due.slice(5, 7) - 1, +due.slice(8, 10));
    const b = Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10));
    return Math.round((a - b) / 86_400_000);
}

/** Frase curta do prazo: "vence hoje", "vence em 3 dias", "atrasada há 5 dias". */
export function dueLabel(inv: Pick<Invoice, 'due_date' | 'status'>, today?: string): string {
    if (inv.status === 'paid') return 'Paga';
    const d = daysUntil(inv.due_date, today);
    if (d === 0) return 'Vence hoje';
    if (d === 1) return 'Vence amanhã';
    if (d > 1) return `Vence em ${d} dias`;
    if (d === -1) return 'Atrasada há 1 dia';
    return `Atrasada há ${-d} dias`;
}

/** Só dígitos, com DDI 55 quando o número é brasileiro sem DDI. "" quando
 * não dá para montar um número de WhatsApp. */
export function whatsappNumber(phone: string | undefined): string {
    const digits = (phone ?? '').replace(/\D/g, '');
    if (digits.length === 10 || digits.length === 11) return '55' + digits;
    if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) return digits;
    return '';
}

function firstName(full: string | undefined): string {
    return (full ?? '').trim().split(/\s+/)[0] ?? '';
}

/** Mensagem de cobrança pronta para o WhatsApp do PRÓPRIO personal. Não
 * inclui chave PIX nem dado bancário: o personal completa na conversa. */
export function billingWhatsappMessage(
    studentName: string | undefined,
    inv: Pick<Invoice, 'amount' | 'description' | 'due_date' | 'status'>,
    today?: string,
): string {
    const name = firstName(studentName);
    const hello = name ? `Olá, ${name}!` : 'Olá!';
    const what = `${BRL(inv.amount)}${inv.description ? ` (${inv.description})` : ''}`;
    const d = daysUntil(inv.due_date, today);
    let when: string;
    if (d > 0) when = `vence em ${fmtDate(inv.due_date)}`;
    else if (d === 0) when = 'vence hoje';
    else when = `venceu em ${fmtDate(inv.due_date)}`;
    return `${hello} Passando para lembrar da mensalidade de ${what}, que ${when}. Se já pagou, é só tocar em “Já paguei” no app. Qualquer dúvida, me chama.`;
}

export function whatsappLink(phone: string | undefined, message: string): string | null {
    const number = whatsappNumber(phone);
    if (!number) return null;
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function csvCell(v: string | number): string {
    const s = typeof v === 'number' ? v.toFixed(2).replace('.', ',') : v;
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV do recebido, no formato do Excel brasileiro (";" e vírgula decimal,
 * com BOM para os acentos). Serve de base para o Carnê-Leão e o contador. */
export function receivedCsv(items: FinanceCollectItem[]): string {
    const header = [
        'Data do recebimento',
        'Aluno',
        'Descrição',
        'Vencimento',
        'Valor da cobrança',
        'Valor recebido',
        'Forma',
        'Observação',
    ];
    const rows = items.map(({ invoice: inv, student_name }) => [
        fmtDate(inv.paid_at),
        student_name || 'Aluno removido',
        inv.description ?? '',
        fmtDate(inv.due_date),
        inv.amount,
        inv.paid_amount ?? inv.amount,
        inv.receipt_method ? RECEIPT_METHOD_LABEL[inv.receipt_method] : '',
        inv.payment_note ?? '',
    ]);
    const total = items.reduce((acc, it) => acc + (it.invoice.paid_amount ?? it.invoice.amount), 0);
    rows.push(['Total', '', '', '', '', total, '', '']);
    return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n');
}
