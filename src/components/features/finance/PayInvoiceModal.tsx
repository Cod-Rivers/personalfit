'use client';
import { useEffect, useState } from 'react';
import Modal from '@/components/system/Modal';
import type { Invoice, PayInvoicePayload, ReceiptMethod } from '@/libs/studentInvoiceService';
import { BRL, RECEIPT_METHOD_LABEL, fmtDate, parseAmount, todayISO } from '@/libs/financeFormat';
import s from './finance.module.css';

interface PayInvoiceModalProps {
    invoice: Invoice | null;
    studentName?: string;
    onClose: () => void;
    onConfirm: (payload: PayInvoicePayload) => Promise<void>;
}

const METHODS: ReceiptMethod[] = ['pix', 'cash', 'card', 'transfer', 'other'];

/** Registrar o recebimento: data real, forma, valor recebido e observação.
 * Confirmar avisa o aluno (e responde ao "Já paguei", se houver). */
export default function PayInvoiceModal({ invoice, studentName, onClose, onConfirm }: PayInvoiceModalProps) {
    const [paidOn, setPaidOn] = useState(todayISO());
    const [method, setMethod] = useState<ReceiptMethod>('pix');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!invoice) return;
        setPaidOn(todayISO());
        setMethod('pix');
        setAmount(invoice.amount.toFixed(2).replace('.', ','));
        setNote('');
        setError('');
    }, [invoice]);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!invoice) return;
        const value = parseAmount(amount);
        if (!(value > 0)) {
            setError('Informe o valor recebido.');
            return;
        }
        if (paidOn > todayISO()) {
            setError('A data do pagamento não pode estar no futuro.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await onConfirm({
                paid_on: paidOn,
                method,
                amount: Math.abs(value - invoice.amount) < 0.005 ? undefined : value,
                note: note.trim() || undefined,
            });
        } catch {
            setError('Não foi possível registrar o pagamento. Tente de novo.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal
            open={!!invoice}
            onClose={onClose}
            title="Registrar pagamento"
            footer={
                <div className={s.modalFooter}>
                    <button type="button" className={s.btnGhost} onClick={onClose}>
                        Cancelar
                    </button>
                    <button type="submit" form="pay-invoice-form" className={s.btnPrimary} disabled={saving}>
                        {saving ? 'Salvando…' : 'Confirmar recebimento'}
                    </button>
                </div>
            }
        >
            {invoice && (
                <form id="pay-invoice-form" className={s.form} onSubmit={submit}>
                    <p className={s.sectionHint}>
                        {studentName ? <strong>{studentName}</strong> : null}
                        {studentName ? ' · ' : ''}
                        {BRL(invoice.amount)}
                        {invoice.description ? ` · ${invoice.description}` : ''} · vence{' '}
                        {fmtDate(invoice.due_date)}
                    </p>
                    {invoice.reported_by_student && (
                        <div className={s.reportBox}>
                            O aluno informou o pagamento
                            {invoice.student_reported_at
                                ? ` em ${new Date(invoice.student_reported_at).toLocaleDateString('pt-BR')}`
                                : ''}
                            {invoice.student_report_note ? `: “${invoice.student_report_note}”` : '.'}
                        </div>
                    )}
                    <div className={s.formRow}>
                        <div className={s.field}>
                            <label className={s.label} htmlFor="pay-date">Data do pagamento</label>
                            <input
                                id="pay-date"
                                className={s.input}
                                type="date"
                                max={todayISO()}
                                value={paidOn}
                                onChange={(e) => setPaidOn(e.target.value)}
                            />
                        </div>
                        <div className={s.field}>
                            <label className={s.label} htmlFor="pay-amount">Valor recebido (R$)</label>
                            <input
                                id="pay-amount"
                                className={s.input}
                                inputMode="decimal"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className={s.field}>
                        <span className={s.label}>Forma</span>
                        <div className={s.actions} role="radiogroup" aria-label="Forma de pagamento">
                            {METHODS.map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    role="radio"
                                    aria-checked={method === m}
                                    className={method === m ? s.btnPrimary : s.btn}
                                    onClick={() => setMethod(m)}
                                >
                                    {RECEIPT_METHOD_LABEL[m]}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className={s.field}>
                        <label className={s.label} htmlFor="pay-note">Observação (opcional)</label>
                        <input
                            id="pay-note"
                            className={s.input}
                            maxLength={280}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Ex.: desconto de pontualidade"
                        />
                        <span className={s.fieldHint}>Só você vê a observação.</span>
                    </div>
                    <p className={s.fieldHint}>
                        O aluno recebe a confirmação do pagamento no app.
                    </p>
                    {error && <p className={s.error}>{error}</p>}
                </form>
            )}
        </Modal>
    );
}
