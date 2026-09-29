'use client';
import { useCallback, useEffect, useState } from 'react';
import { FiCheckCircle, FiCreditCard, FiInfo, FiLock } from 'react-icons/fi';
import axios from 'axios';
import {
    getMyInvoices,
    reportInvoicePaid,
    type Invoice,
    type MyInvoices,
} from '@/libs/studentInvoiceService';
import { BRL, dueLabel, fmtDate } from '@/libs/financeFormat';
import { useToast } from '@/components/system/Toast';
import Modal from '@/components/system/Modal';
import { InvoiceStatusBadge } from '@/components/features/finance/InvoiceCard';
import s from '@/components/features/finance/finance.module.css';

/** "Mensalidades" do aluno: o que o personal lançou, o prazo de cada uma e o
 * botão "Já paguei", que avisa o personal na hora. A Venafit não mostra para
 * onde pagar — o aluno combina isso com o personal. */
export default function MensalidadesPage() {
    const toast = useToast();
    const [data, setData] = useState<MyInvoices | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<'offline' | 'server' | null>(null);
    const [reporting, setReporting] = useState<Invoice | null>(null);
    const [note, setNote] = useState('');
    const [sending, setSending] = useState(false);

    const load = useCallback(async () => {
        try {
            setData(await getMyInvoices());
            setError(null);
        } catch (err) {
            setError(axios.isAxiosError(err) && !err.response ? 'offline' : 'server');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    async function confirmReport() {
        if (!reporting) return;
        setSending(true);
        try {
            await reportInvoicePaid(reporting.id, note);
            setReporting(null);
            setNote('');
            toast.showSuccess('Pronto! Seu personal foi avisado e vai confirmar o recebimento.');
            await load();
        } catch (err) {
            toast.showError(
                axios.isAxiosError(err) && !err.response
                    ? 'Sem conexão. Tente de novo quando estiver online.'
                    : 'Não foi possível avisar seu personal. Tente de novo.',
            );
        } finally {
            setSending(false);
        }
    }

    const pending = (data?.invoices ?? [])
        .filter((i) => i.status !== 'paid')
        .sort((a, b) => a.due_date.localeCompare(b.due_date));
    const paid = (data?.invoices ?? []).filter((i) => i.status === 'paid');
    const personalFirst = data?.personal_name?.split(' ')[0] ?? 'seu personal';

    return (
        <div className={s.page}>
            <div className={s.container}>
                <div className={s.header}>
                    <div>
                        <h1 className={s.headerTitle}>
                            <FiCreditCard aria-hidden="true" /> Mensalidades
                        </h1>
                        <p className={s.headerSub}>
                            {data?.enabled ? `Com ${data.personal_name}` : 'Suas mensalidades com o personal'}
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className={s.empty}>Carregando…</div>
                ) : error ? (
                    <div className={s.alertDanger} role="alert">
                        {error === 'offline'
                            ? 'Sem conexão. As mensalidades aparecem quando você estiver online.'
                            : 'Não foi possível carregar suas mensalidades.'}{' '}
                        <button type="button" className={s.btnGhost} onClick={() => { setLoading(true); void load(); }}>
                            Tentar de novo
                        </button>
                    </div>
                ) : !data?.enabled ? (
                    <div className={s.note}>
                        <FiInfo aria-hidden="true" />
                        <span>
                            Seu personal não registra mensalidades pelo app. Combine os
                            pagamentos diretamente com ele.
                        </span>
                    </div>
                ) : (
                    <>
                        {data.blocked && (
                            <div className={s.alertDanger} role="alert">
                                <FiLock aria-hidden="true" />
                                <span>
                                    <strong>Acesso ao treino pausado.</strong> Há uma mensalidade
                                    vencida. Assim que {personalFirst} confirmar o pagamento, o
                                    acesso volta sozinho. Já pagou? Toque em “Já paguei” abaixo.
                                </span>
                            </div>
                        )}

                        <div className={s.tiles}>
                            <div className={s.tile}>
                                <span className={`${s.tileValue} ${data.summary.total_overdue > 0 ? s.valueOverdue : ''}`}>
                                    {BRL(data.summary.total_open)}
                                </span>
                                <span className={s.tileLabel}>
                                    Em aberto{data.summary.overdue_count > 0 ? ` · ${data.summary.overdue_count} vencida(s)` : ''}
                                </span>
                            </div>
                            <div className={s.tile}>
                                <span className={`${s.tileValue} ${s.valuePaid}`}>{BRL(data.summary.total_paid)}</span>
                                <span className={s.tileLabel}>Pago</span>
                            </div>
                        </div>

                        <section className={s.section}>
                            <h2 className={s.sectionTitle}>A pagar</h2>
                            {pending.length === 0 ? (
                                <div className={s.empty}>
                                    <FiCheckCircle aria-hidden="true" /> Tudo em dia!
                                </div>
                            ) : (
                                <div className={s.list}>
                                    {pending.map((inv) => (
                                        <div
                                            key={inv.id}
                                            className={`${s.row} ${inv.reported_by_student ? s.rowAwaiting : inv.status === 'overdue' ? s.rowOverdue : ''}`}
                                        >
                                            <div className={s.rowTop}>
                                                <div className={s.rowInfo}>
                                                    <div className={s.amount}>{BRL(inv.amount)}</div>
                                                    <div className={s.rowMeta}>
                                                        {dueLabel(inv)} · {fmtDate(inv.due_date)}
                                                        {inv.description ? ` · ${inv.description}` : ''}
                                                    </div>
                                                </div>
                                                {inv.reported_by_student ? (
                                                    <span className={s.badgeAwaiting}>Aguardando confirmação</span>
                                                ) : (
                                                    <InvoiceStatusBadge invoice={inv} />
                                                )}
                                            </div>
                                            {inv.reported_by_student ? (
                                                <p className={s.fieldHint}>
                                                    Você avisou que pagou
                                                    {inv.student_reported_at ? ` em ${new Date(inv.student_reported_at).toLocaleDateString('pt-BR')}` : ''}.
                                                    {' '}{personalFirst} vai confirmar o recebimento.
                                                </p>
                                            ) : (
                                                <div className={s.actions}>
                                                    <button
                                                        type="button"
                                                        className={s.btnPrimary}
                                                        onClick={() => { setNote(''); setReporting(inv); }}
                                                    >
                                                        <FiCheckCircle aria-hidden="true" /> Já paguei
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {paid.length > 0 && (
                            <section className={s.section}>
                                <h2 className={s.sectionTitle}>Pagas</h2>
                                <div className={s.list}>
                                    {paid.map((inv) => (
                                        <div key={inv.id} className={`${s.row} ${s.rowPaid}`}>
                                            <div className={s.rowTop}>
                                                <div className={s.rowInfo}>
                                                    <div className={s.amount}>{BRL(inv.paid_amount ?? inv.amount)}</div>
                                                    <div className={s.rowMeta}>
                                                        Paga{inv.paid_at ? ` em ${fmtDate(inv.paid_at)}` : ''}
                                                        {inv.description ? ` · ${inv.description}` : ''}
                                                    </div>
                                                </div>
                                                <span className={s.badgePaid}>Pago</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        <div className={s.note}>
                            <FiInfo aria-hidden="true" />
                            <span>
                                A Venafit não recebe pagamentos. Combine a forma de pagamento
                                diretamente com {personalFirst} e desconfie de qualquer mensagem
                                que peça pagamento em nome da Venafit.
                            </span>
                        </div>
                    </>
                )}
            </div>

            <Modal
                open={!!reporting}
                onClose={() => setReporting(null)}
                title="Avisar que você pagou"
                footer={
                    <div className={s.modalFooter}>
                        <button type="button" className={s.btnGhost} onClick={() => setReporting(null)}>
                            Cancelar
                        </button>
                        <button type="button" className={s.btnPrimary} disabled={sending} onClick={confirmReport}>
                            {sending ? 'Enviando…' : 'Avisar meu personal'}
                        </button>
                    </div>
                }
            >
                {reporting && (
                    <div className={s.form}>
                        <p className={s.sectionHint}>
                            {BRL(reporting.amount)}
                            {reporting.description ? ` · ${reporting.description}` : ''} · vence{' '}
                            {fmtDate(reporting.due_date)}. {personalFirst} recebe um aviso na hora
                            para conferir e confirmar.
                        </p>
                        <div className={s.field}>
                            <label className={s.label} htmlFor="report-note">Recado (opcional)</label>
                            <input
                                id="report-note"
                                className={s.input}
                                maxLength={280}
                                placeholder="Ex.: paguei hoje de manhã"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
                        </div>
                        {data?.blocked && (
                            <p className={s.fieldHint}>
                                Enquanto seu personal confere, esta mensalidade deixa de
                                pausar o seu acesso ao treino.
                            </p>
                        )}
                    </div>
                )}
            </Modal>
            {toast.ToastSlot}
        </div>
    );
}
