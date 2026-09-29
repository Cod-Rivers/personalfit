'use client';
import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/system/Modal';
import type { BillingFrequency, BillingPlan, SaveBillingPlanPayload } from '@/libs/studentInvoiceService';
import { BRL, FREQUENCY_LABEL, fmtDate, parseAmount, todayISO } from '@/libs/financeFormat';
import s from './finance.module.css';

interface BillingPlanModalProps {
    open: boolean;
    plan?: BillingPlan;
    onClose: () => void;
    onSubmit: (payload: SaveBillingPlanPayload) => Promise<void>;
}

const FREQUENCIES: BillingFrequency[] = ['monthly', 'quarterly', 'semiannual', 'annual'];
const STEP: Record<BillingFrequency, number> = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 };

/** Próximos vencimentos a partir do primeiro (prévia no formulário). Mesmo
 * cálculo do backend: dia 31 cai no último dia do mês curto. */
export function previewDueDates(first: string, freq: BillingFrequency, count = 3): string[] {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(first)) return [];
    const y = +first.slice(0, 4);
    const m = +first.slice(5, 7) - 1;
    const d = +first.slice(8, 10);
    const out: string[] = [];
    for (let k = 0; k < count; k++) {
        const monthIdx = m + k * STEP[freq];
        const last = new Date(Date.UTC(y, monthIdx + 1, 0)).getUTCDate();
        const dt = new Date(Date.UTC(y, monthIdx, Math.min(d, last)));
        out.push(dt.toISOString().slice(0, 10));
    }
    return out;
}

/** Criar ou alterar a mensalidade automática do aluno. */
export default function BillingPlanModal({ open, plan, onClose, onSubmit }: BillingPlanModalProps) {
    const [amount, setAmount] = useState('');
    const [frequency, setFrequency] = useState<BillingFrequency>('monthly');
    const [firstDue, setFirstDue] = useState(todayISO());
    const [endDate, setEndDate] = useState('');
    const [description, setDescription] = useState('');
    const [applyToOpen, setApplyToOpen] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setAmount(plan ? plan.amount.toFixed(2).replace('.', ',') : '');
        setFrequency(plan?.frequency ?? 'monthly');
        setFirstDue(plan?.first_due_date ?? todayISO());
        setEndDate(plan?.end_date ?? '');
        setDescription(plan?.description ?? '');
        setApplyToOpen(true);
        setError('');
    }, [open, plan]);

    const preview = useMemo(() => previewDueDates(firstDue, frequency), [firstDue, frequency]);
    const value = parseAmount(amount);
    const amountChanged = !!plan && value > 0 && Math.abs(value - plan.amount) >= 0.005;

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!(value > 0)) {
            setError('Informe um valor maior que zero.');
            return;
        }
        if (!firstDue) {
            setError('Informe o primeiro vencimento.');
            return;
        }
        if (endDate && endDate < firstDue) {
            setError('O término não pode ser antes do primeiro vencimento.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await onSubmit({
                amount: value,
                frequency,
                first_due_date: firstDue,
                end_date: endDate || undefined,
                description: description.trim() || undefined,
                apply_to_open: applyToOpen,
            });
        } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            setError(
                status === 400
                    ? 'Confira os dados: o primeiro vencimento pode ser de até 12 meses atrás.'
                    : 'Não foi possível salvar a mensalidade. Tente de novo.',
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={plan ? 'Alterar mensalidade automática' : 'Mensalidade automática'}
            footer={
                <div className={s.modalFooter}>
                    <button type="button" className={s.btnGhost} onClick={onClose}>
                        Cancelar
                    </button>
                    <button type="submit" form="plan-form" className={s.btnPrimary} disabled={saving}>
                        {saving ? 'Salvando…' : plan ? 'Salvar alterações' : 'Ativar mensalidade'}
                    </button>
                </div>
            }
        >
            <form id="plan-form" className={s.form} onSubmit={submit}>
                <p className={s.sectionHint}>
                    A cobrança de cada período é lançada sozinha, cerca de um mês
                    antes do vencimento, e o aluno recebe os lembretes que você
                    configurar no painel financeiro.
                </p>
                <div className={s.formRow}>
                    <div className={s.field}>
                        <label className={s.label} htmlFor="plan-amount">Valor (R$)</label>
                        <input
                            id="plan-amount"
                            className={s.input}
                            inputMode="decimal"
                            placeholder="150,00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>
                    <div className={s.field}>
                        <label className={s.label} htmlFor="plan-freq">Periodicidade</label>
                        <select
                            id="plan-freq"
                            className={s.input}
                            value={frequency}
                            onChange={(e) => setFrequency(e.target.value as BillingFrequency)}
                        >
                            {FREQUENCIES.map((f) => (
                                <option key={f} value={f}>
                                    {FREQUENCY_LABEL[f]}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className={s.formRow}>
                    <div className={s.field}>
                        <label className={s.label} htmlFor="plan-first">Primeiro vencimento</label>
                        <input
                            id="plan-first"
                            className={s.input}
                            type="date"
                            value={firstDue}
                            onChange={(e) => setFirstDue(e.target.value)}
                        />
                        <span className={s.fieldHint}>O dia desta data vira o dia do vencimento.</span>
                    </div>
                    <div className={s.field}>
                        <label className={s.label} htmlFor="plan-end">Término (opcional)</label>
                        <input
                            id="plan-end"
                            className={s.input}
                            type="date"
                            value={endDate}
                            min={firstDue}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                        <span className={s.fieldHint}>Vazio = até você encerrar.</span>
                    </div>
                </div>
                <div className={s.field}>
                    <label className={s.label} htmlFor="plan-desc">Descrição (opcional)</label>
                    <input
                        id="plan-desc"
                        className={s.input}
                        maxLength={120}
                        placeholder="Mensalidade"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>
                {preview.length > 0 && value > 0 && (
                    <p className={s.fieldHint}>
                        Próximos vencimentos: {preview.map(fmtDate).join(', ')} ·{' '}
                        {BRL(value)} {FREQUENCY_LABEL[frequency].toLowerCase()}
                    </p>
                )}
                {amountChanged && (
                    <label className={s.toggleDesc}>
                        <input
                            type="checkbox"
                            checked={applyToOpen}
                            onChange={(e) => setApplyToOpen(e.target.checked)}
                        />{' '}
                        Aplicar o valor novo também às cobranças já lançadas e ainda em aberto
                    </label>
                )}
                {plan && (
                    <p className={s.fieldHint}>
                        Mudar as datas apaga as cobranças futuras ainda em aberto
                        e lança de novo pelo calendário novo. As pagas e as
                        vencidas ficam como estão.
                    </p>
                )}
                {error && <p className={s.error}>{error}</p>}
            </form>
        </Modal>
    );
}
