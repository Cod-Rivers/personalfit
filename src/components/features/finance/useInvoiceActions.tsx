'use client';
import { useState } from 'react';
import Modal from '@/components/system/Modal';
import {
    apiErrorCode,
    deleteInvoice,
    dismissInvoiceReport,
    markInvoicePaid,
    remindInvoice,
    reopenInvoice,
    updateInvoice,
    type Invoice,
} from '@/libs/studentInvoiceService';
import { BRL } from '@/libs/financeFormat';
import PayInvoiceModal from './PayInvoiceModal';
import InvoiceFormModal from './InvoiceFormModal';
import type { InvoiceCardActions } from './InvoiceCard';
import s from './finance.module.css';

interface Options {
    /** Aluno dono da cobrança (a tela do aluno tem um só; o painel, vários). */
    studentOf: (inv: Invoice) => string;
    studentNameOf?: (inv: Invoice) => string | undefined;
    reload: () => Promise<void> | void;
    toast: { showSuccess: (m: string) => void; showError: (m: string) => void; showWarning: (m: string) => void };
}

type Confirm = { kind: 'delete' | 'dismiss' | 'reopen'; invoice: Invoice } | null;

const CONFIRM_TEXT = {
    delete: {
        title: 'Excluir cobrança?',
        body: 'A cobrança some do histórico e dos relatórios. Se ela veio da mensalidade automática, o mês não é lançado de novo.',
        cta: 'Excluir',
    },
    dismiss: {
        title: 'Não identificou o pagamento?',
        body: 'O aluno recebe um aviso para falar com você, e a cobrança volta a contar para o bloqueio automático.',
        cta: 'Avisar o aluno',
    },
    reopen: {
        title: 'Reabrir cobrança?',
        body: 'O pagamento registrado é desfeito e a cobrança volta a ficar em aberto.',
        cta: 'Reabrir',
    },
} as const;

/** Ações e modais das cobranças (confirmar, editar, lembrar, recusar "Já
 * paguei", reabrir, excluir), com Toast e Modal no lugar de alert/confirm. */
export function useInvoiceActions({ studentOf, studentNameOf, reload, toast }: Options) {
    const [paying, setPaying] = useState<Invoice | null>(null);
    const [editing, setEditing] = useState<Invoice | null>(null);
    const [confirm, setConfirm] = useState<Confirm>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    async function run(inv: Invoice, fn: () => Promise<unknown>, ok: string) {
        setBusyId(inv.id);
        try {
            await fn();
            toast.showSuccess(ok);
            await reload();
        } catch (err) {
            const code = apiErrorCode(err);
            if (code === 'requires_pro') toast.showWarning('Esta ação faz parte do PRO.');
            else if (code === 'reminder_already_sent_today') toast.showWarning('Este aluno já foi lembrado desta cobrança hoje.');
            else toast.showError('Não foi possível concluir. Tente de novo.');
        } finally {
            setBusyId(null);
        }
    }

    const actions: InvoiceCardActions = {
        onPay: setPaying,
        onEdit: setEditing,
        onReopen: (inv) => setConfirm({ kind: 'reopen', invoice: inv }),
        onDelete: (inv) => setConfirm({ kind: 'delete', invoice: inv }),
        onDismissReport: (inv) => setConfirm({ kind: 'dismiss', invoice: inv }),
        onRemind: (inv) =>
            run(inv, () => remindInvoice(studentOf(inv), inv.id), 'Lembrete enviado ao aluno pelo app.'),
    };

    async function doConfirm() {
        if (!confirm) return;
        const { kind, invoice } = confirm;
        setConfirm(null);
        const sid = studentOf(invoice);
        if (kind === 'delete') await run(invoice, () => deleteInvoice(sid, invoice.id), 'Cobrança excluída.');
        if (kind === 'reopen') await run(invoice, () => reopenInvoice(sid, invoice.id), 'Cobrança reaberta.');
        if (kind === 'dismiss')
            await run(invoice, () => dismissInvoiceReport(sid, invoice.id), 'O aluno foi avisado de que o pagamento não foi identificado.');
    }

    const modals = (
        <>
            <PayInvoiceModal
                invoice={paying}
                studentName={paying ? studentNameOf?.(paying) : undefined}
                onClose={() => setPaying(null)}
                onConfirm={async (payload) => {
                    if (!paying) return;
                    await markInvoicePaid(studentOf(paying), paying.id, payload);
                    const amount = payload.amount ?? paying.amount;
                    setPaying(null);
                    toast.showSuccess(`Pagamento de ${BRL(amount)} registrado. O aluno foi avisado.`);
                    await reload();
                }}
            />
            <InvoiceFormModal
                open={!!editing}
                invoice={editing}
                onClose={() => setEditing(null)}
                onSubmit={async (payload) => {
                    if (!editing) return;
                    await updateInvoice(studentOf(editing), editing.id, payload);
                    setEditing(null);
                    toast.showSuccess('Cobrança atualizada.');
                    await reload();
                }}
            />
            <Modal
                open={!!confirm}
                onClose={() => setConfirm(null)}
                title={confirm ? CONFIRM_TEXT[confirm.kind].title : ''}
                footer={
                    <div className={s.modalFooter}>
                        <button type="button" className={s.btnGhost} onClick={() => setConfirm(null)}>
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className={confirm?.kind === 'delete' ? s.btnDanger : s.btnPrimary}
                            onClick={doConfirm}
                        >
                            {confirm ? CONFIRM_TEXT[confirm.kind].cta : ''}
                        </button>
                    </div>
                }
            >
                {confirm && (
                    <p className={s.sectionHint}>
                        {BRL(confirm.invoice.amount)}
                        {confirm.invoice.description ? ` · ${confirm.invoice.description}` : ''}.{' '}
                        {CONFIRM_TEXT[confirm.kind].body}
                    </p>
                )}
            </Modal>
        </>
    );

    return { actions, modals, busyId };
}
