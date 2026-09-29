'use client';
import Link from 'next/link';
import { FiBell, FiCheck, FiEdit2, FiRotateCcw, FiTrash2, FiX } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import type { Invoice } from '@/libs/studentInvoiceService';
import {
    BRL,
    RECEIPT_METHOD_LABEL,
    billingWhatsappMessage,
    dueLabel,
    fmtDate,
    whatsappLink,
} from '@/libs/financeFormat';
import s from './finance.module.css';

export interface InvoiceCardActions {
    onPay?: (inv: Invoice) => void;
    onEdit?: (inv: Invoice) => void;
    onReopen?: (inv: Invoice) => void;
    onDelete?: (inv: Invoice) => void;
    onRemind?: (inv: Invoice) => void;
    onDismissReport?: (inv: Invoice) => void;
}

interface InvoiceCardProps extends InvoiceCardActions {
    invoice: Invoice;
    canEdit: boolean;
    /** Nome do aluno: mostrado no painel geral e usado na mensagem do WhatsApp. */
    studentName?: string;
    studentPhone?: string;
    /** Nome usado só na mensagem do WhatsApp (padrão: studentName). */
    contactName?: string;
    /** Link para o financeiro do aluno (painel geral). */
    studentHref?: string;
    busy?: boolean;
}

export function InvoiceStatusBadge({ invoice }: { invoice: Invoice }) {
    if (invoice.reported_by_student) return <span className={s.badgeAwaiting}>Aguardando você confirmar</span>;
    if (invoice.status === 'paid') return <span className={s.badgePaid}>Pago</span>;
    if (invoice.status === 'overdue') return <span className={s.badgeOverdue}>Vencido</span>;
    return <span className={s.badgeOpen}>Em aberto</span>;
}

/** Uma cobrança com as ações do personal. Sem o PRO (canEdit=false), só
 * sobra excluir: o histórico fica visível, mas não se lança nem se cobra. */
export default function InvoiceCard({
    invoice: inv,
    canEdit,
    studentName,
    studentPhone,
    contactName,
    studentHref,
    busy,
    onPay,
    onEdit,
    onReopen,
    onDelete,
    onRemind,
    onDismissReport,
}: InvoiceCardProps) {
    const paid = inv.status === 'paid';
    const wa = !paid && canEdit ? whatsappLink(studentPhone, billingWhatsappMessage(contactName ?? studentName, inv)) : null;
    const rowClass = [
        s.row,
        inv.reported_by_student ? s.rowAwaiting : inv.status === 'overdue' ? s.rowOverdue : '',
        paid ? s.rowPaid : '',
    ].join(' ');

    return (
        <div className={rowClass}>
            <div className={s.rowTop}>
                <div className={s.rowInfo}>
                    {studentName && (
                        <div className={s.rowStudent}>
                            {studentHref ? <Link href={studentHref}>{studentName}</Link> : studentName}
                        </div>
                    )}
                    <div className={s.amount}>{BRL(inv.amount)}</div>
                    <div className={s.rowMeta}>
                        {paid
                            ? `Recebido${inv.paid_amount && Math.abs(inv.paid_amount - inv.amount) >= 0.005 ? ` ${BRL(inv.paid_amount)}` : ''}${inv.paid_at ? ` em ${fmtDate(inv.paid_at)}` : ''}${inv.receipt_method ? ` · ${RECEIPT_METHOD_LABEL[inv.receipt_method]}` : ''}`
                            : `${dueLabel(inv)} · ${fmtDate(inv.due_date)}`}
                        {inv.description ? ` · ${inv.description}` : ''}
                    </div>
                    {paid && inv.payment_note && <div className={s.rowMeta}>“{inv.payment_note}”</div>}
                </div>
                <div className={s.actions}>
                    <InvoiceStatusBadge invoice={inv} />
                    {inv.from_plan && <span className={s.badgePlan}>Automática</span>}
                </div>
            </div>

            {inv.reported_by_student && (
                <div className={s.reportBox}>
                    <strong>O aluno informou que pagou</strong>
                    {inv.student_reported_at ? ` em ${new Date(inv.student_reported_at).toLocaleDateString('pt-BR')}` : ''}
                    {inv.student_report_note ? `: “${inv.student_report_note}”` : '.'} Confira
                    no seu extrato e confirme, ou avise que não identificou.
                </div>
            )}

            <div className={s.actions}>
                {canEdit && !paid && onPay && (
                    <button type="button" className={s.btnPrimary} disabled={busy} onClick={() => onPay(inv)}>
                        <FiCheck aria-hidden="true" /> Confirmar pagamento
                    </button>
                )}
                {canEdit && inv.reported_by_student && onDismissReport && (
                    <button type="button" className={s.btn} disabled={busy} onClick={() => onDismissReport(inv)}>
                        <FiX aria-hidden="true" /> Não identifiquei
                    </button>
                )}
                {canEdit && !paid && !inv.reported_by_student && onRemind && (
                    <button type="button" className={s.btn} disabled={busy} onClick={() => onRemind(inv)}>
                        <FiBell aria-hidden="true" /> Lembrar pelo app
                    </button>
                )}
                {wa && (
                    <a className={s.btnWhatsapp} href={wa} target="_blank" rel="noopener noreferrer">
                        <FaWhatsapp aria-hidden="true" /> WhatsApp
                    </a>
                )}
                {canEdit && !paid && onEdit && (
                    <button type="button" className={s.btnGhost} disabled={busy} onClick={() => onEdit(inv)}>
                        <FiEdit2 aria-hidden="true" /> Editar
                    </button>
                )}
                {canEdit && paid && onReopen && (
                    <button type="button" className={s.btnGhost} disabled={busy} onClick={() => onReopen(inv)}>
                        <FiRotateCcw aria-hidden="true" /> Reabrir
                    </button>
                )}
                {onDelete && (
                    <button type="button" className={s.btnDanger} disabled={busy} onClick={() => onDelete(inv)}>
                        <FiTrash2 aria-hidden="true" /> Excluir
                    </button>
                )}
            </div>
        </div>
    );
}
