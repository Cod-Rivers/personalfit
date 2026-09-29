'use client';
import { useEffect, useState } from 'react';
import Modal from '@/components/system/Modal';
import type { CreateInvoicePayload, Invoice } from '@/libs/studentInvoiceService';
import { parseAmount, todayISO } from '@/libs/financeFormat';
import s from './finance.module.css';

interface InvoiceFormModalProps {
    open: boolean;
    /** Presente = edição; ausente = cobrança avulsa nova. */
    invoice?: Invoice | null;
    onClose: () => void;
    onSubmit: (payload: CreateInvoicePayload) => Promise<void>;
}

/** Criar ou editar uma cobrança (valor, vencimento, descrição). */
export default function InvoiceFormModal({ open, invoice, onClose, onSubmit }: InvoiceFormModalProps) {
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState(todayISO());
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setAmount(invoice ? invoice.amount.toFixed(2).replace('.', ',') : '');
        setDueDate(invoice ? invoice.due_date : todayISO());
        setDescription(invoice?.description ?? '');
        setError('');
    }, [open, invoice]);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        const value = parseAmount(amount);
        if (!(value > 0)) {
            setError('Informe um valor maior que zero.');
            return;
        }
        if (!dueDate) {
            setError('Informe o vencimento.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await onSubmit({ amount: value, due_date: dueDate, description: description.trim() || undefined });
        } catch {
            setError('Não foi possível salvar a cobrança. Tente de novo.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={invoice ? 'Editar cobrança' : 'Nova cobrança avulsa'}
            footer={
                <div className={s.modalFooter}>
                    <button type="button" className={s.btnGhost} onClick={onClose}>
                        Cancelar
                    </button>
                    <button type="submit" form="invoice-form" className={s.btnPrimary} disabled={saving}>
                        {saving ? 'Salvando…' : invoice ? 'Salvar' : 'Lançar cobrança'}
                    </button>
                </div>
            }
        >
            <form id="invoice-form" className={s.form} onSubmit={submit}>
                <div className={s.formRow}>
                    <div className={s.field}>
                        <label className={s.label} htmlFor="inv-amount">Valor (R$)</label>
                        <input
                            id="inv-amount"
                            className={s.input}
                            inputMode="decimal"
                            placeholder="150,00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>
                    <div className={s.field}>
                        <label className={s.label} htmlFor="inv-due">Vencimento</label>
                        <input
                            id="inv-due"
                            className={s.input}
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                        />
                    </div>
                </div>
                <div className={s.field}>
                    <label className={s.label} htmlFor="inv-desc">Descrição (opcional)</label>
                    <input
                        id="inv-desc"
                        className={s.input}
                        maxLength={120}
                        placeholder="Ex.: Pacote de 10 aulas, avaliação física"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>
                {!invoice && (
                    <p className={s.fieldHint}>
                        Para a mensalidade que se repete todo mês, use a
                        mensalidade automática: ela lança as cobranças sozinha.
                    </p>
                )}
                {invoice && invoice.due_date !== dueDate && (
                    <p className={s.fieldHint}>
                        Com o vencimento novo, os lembretes automáticos passam a
                        valer para a data nova.
                    </p>
                )}
                {error && <p className={s.error}>{error}</p>}
            </form>
        </Modal>
    );
}
