'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FiDollarSign, FiArrowLeft, FiCheck } from 'react-icons/fi';
import {
    listInvoices,
    createInvoice,
    markInvoicePaid,
    reopenInvoice,
    deleteInvoice,
    getOverdueBlock,
    setOverdueBlock,
    type InvoiceList,
} from '@/libs/studentInvoiceService';
import s from './financeiro.module.css';

const BRL = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function fmt(d: string) {
    const dt = new Date(d + 'T00:00:00');
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('pt-BR');
}

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

export default function StudentFinanceiroPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const studentId = params.id;

    const [data, setData] = useState<InvoiceList | null>(null);
    const [loading, setLoading] = useState(true);

    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState(todayISO());
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);
    // null = ainda não carregado (ou falhou): o interruptor não aparece em vez
    // de mostrar um estado que talvez não seja o salvo.
    const [blockEnabled, setBlockEnabled] = useState<boolean | null>(null);
    const [blockSaving, setBlockSaving] = useState(false);

    useEffect(() => {
        getOverdueBlock()
            .then(setBlockEnabled)
            .catch(() => setBlockEnabled(null));
    }, []);

    async function toggleBlock(next: boolean) {
        setBlockSaving(true);
        try {
            setBlockEnabled(await setOverdueBlock(next));
        } catch {
            alert('Não foi possível salvar o bloqueio. Tente de novo.');
        } finally {
            setBlockSaving(false);
        }
    }

    async function load() {
        try {
            setData(await listInvoices(studentId));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentId]);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        const value = Number(amount.replace(',', '.'));
        if (!value || value <= 0) {
            alert('Informe um valor válido.');
            return;
        }
        setSaving(true);
        try {
            await createInvoice(studentId, {
                amount: value,
                due_date: dueDate,
                description: description.trim() || undefined,
            });
            setAmount('');
            setDescription('');
            await load();
        } finally {
            setSaving(false);
        }
    }

    async function pay(id: string) {
        await markInvoicePaid(studentId, id);
        await load();
    }
    async function reopen(id: string) {
        await reopenInvoice(studentId, id);
        await load();
    }
    async function remove(id: string) {
        if (!confirm('Excluir esta cobrança?')) return;
        await deleteInvoice(studentId, id);
        await load();
    }

    return (
        <div className={s.page}>
            <div className={s.container}>
                <div className={s.header}>
                    <div>
                        <h1 className={s.headerTitle}><FiDollarSign /> Financeiro do aluno</h1>
                        <p className={s.headerSub}>
                            Controle de mensalidades, vencimentos e pagamentos
                        </p>
                    </div>
                    <button className={s.btnBack} onClick={() => router.back()}>
                        <FiArrowLeft /> Voltar
                    </button>
                </div>

                <div className={s.note}>
                    ℹ️ Este é um controle interno seu. A Venafit não processa nem
                    recebe esses valores — você marca manualmente o que já foi
                    pago.
                </div>

                {blockEnabled !== null && (
                    <div className={s.blockSetting}>
                        <label className={s.blockToggle}>
                            <input
                                type="checkbox"
                                checked={blockEnabled}
                                disabled={blockSaving}
                                onChange={(e) => toggleBlock(e.target.checked)}
                            />
                            Bloquear alunos com mensalidade vencida
                        </label>
                        <p className={s.blockHint}>
                            Vale para todos os seus alunos. Passado o dia do
                            vencimento sem o pagamento marcado, o aluno perde o
                            acesso ao plano de treino, ao plano alimentar e à
                            evolução até você marcar a cobrança como paga.
                            Login, notificações e treinos já baixados continuam
                            funcionando.
                        </p>
                        {blockEnabled && data?.summary.has_overdue && (
                            <p className={s.blockActive}>
                                Este aluno está sem acesso agora.
                            </p>
                        )}
                    </div>
                )}

                {data && (
                    <div className={s.tiles}>
                        <div className={s.tile}>
                            <div className={s.tileValue}>
                                {BRL(data.summary.total_open)}
                            </div>
                            <div className={s.tileLabel}>
                                Em aberto ({data.summary.open_count})
                            </div>
                        </div>
                        <div className={s.tile}>
                            <div className={`${s.tileValue} ${s.overdue}`}>
                                {BRL(data.summary.total_overdue)}
                            </div>
                            <div className={s.tileLabel}>
                                Vencido ({data.summary.overdue_count})
                            </div>
                        </div>
                        <div className={s.tile}>
                            <div className={`${s.tileValue} ${s.paid}`}>
                                {BRL(data.summary.total_paid)}
                            </div>
                            <div className={s.tileLabel}>Recebido</div>
                        </div>
                    </div>
                )}

                <form className={s.form} onSubmit={handleCreate}>
                    <div className={s.field} style={{ flex: '0 0 130px' }}>
                        <label className={s.label}>Valor (R$)</label>
                        <input
                            className={s.input}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            inputMode="decimal"
                            placeholder="150,00"
                        />
                    </div>
                    <div className={s.field} style={{ flex: '0 0 150px' }}>
                        <label className={s.label}>Vencimento</label>
                        <input
                            className={s.input}
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                        />
                    </div>
                    <div className={s.field}>
                        <label className={s.label}>Descrição (opcional)</label>
                        <input
                            className={s.input}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Mensalidade de julho"
                        />
                    </div>
                    <button
                        className={s.btnAdd}
                        type="submit"
                        disabled={saving}
                    >
                        {saving ? '…' : '+ Cobrança'}
                    </button>
                </form>

                {loading ? (
                    <div className={s.loading}>Carregando…</div>
                ) : !data || data.invoices.length === 0 ? (
                    <div className={s.empty}>
                        Nenhuma cobrança registrada. Adicione a primeira acima.
                    </div>
                ) : (
                    <div className={s.list}>
                        {data.invoices.map((inv) => (
                            <div
                                key={inv.id}
                                className={`${s.row} ${
                                    inv.status === 'overdue'
                                        ? s.rowOverdue
                                        : ''
                                }`}
                            >
                                <div className={s.rowInfo}>
                                    <div className={s.amount}>
                                        {BRL(inv.amount)}
                                    </div>
                                    <div className={s.due}>
                                        Vence {fmt(inv.due_date)}
                                        {inv.description
                                            ? ` · ${inv.description}`
                                            : ''}
                                    </div>
                                </div>
                                <div className={s.actions}>
                                    <span
                                        className={`${s.badge} ${
                                            inv.status === 'paid'
                                                ? s.badgePaid
                                                : inv.status === 'overdue'
                                                  ? s.badgeOverdue
                                                  : s.badgeOpen
                                        }`}
                                    >
                                        {inv.status === 'paid'
                                            ? 'Pago'
                                            : inv.status === 'overdue'
                                              ? 'Vencido'
                                              : 'Em aberto'}
                                    </span>
                                    {inv.status === 'paid' ? (
                                        <button
                                            className={s.btn}
                                            onClick={() => reopen(inv.id)}
                                        >
                                            Reabrir
                                        </button>
                                    ) : (
                                        <button
                                            className={s.btn}
                                            onClick={() => pay(inv.id)}
                                        >
                                            <FiCheck /> Marcar pago
                                        </button>
                                    )}
                                    <button
                                        className={`${s.btn} ${s.btnDanger}`}
                                        onClick={() => remove(inv.id)}
                                    >
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
