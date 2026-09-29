'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    FiArrowLeft,
    FiBell,
    FiDownload,
    FiInfo,
    FiShield,
    FiTrendingUp,
    FiUser,
    FiZap,
} from 'react-icons/fi';
import {
    apiErrorCode,
    getBillingSettings,
    getFinanceOverview,
    getReceived,
    saveBillingSettings,
    type BillingSettings,
    type BillingSettingsResponse,
    type FinanceOverview,
    type Invoice,
} from '@/libs/studentInvoiceService';
import { BRL, receivedCsv, todayISO } from '@/libs/financeFormat';
import { canShareTextNatively, nativeShareText } from '@/libs/nativeBridge';
import { useToast } from '@/components/system/Toast';
import HelpTooltip from '@/components/atoms/HelpTooltip';
import InvoiceCard from '@/components/features/finance/InvoiceCard';
import ProGateNotice from '@/components/features/finance/ProGateNotice';
import FinanceSwitch from '@/components/features/finance/FinanceSwitch';
import { useInvoiceActions } from '@/components/features/finance/useInvoiceActions';
import s from '@/components/features/finance/finance.module.css';

const DAY_OPTIONS = [1, 2, 3, 5, 7, 10];
const AFTER_OPTIONS = [1, 2, 3, 5, 7, 10, 15];
const GRACE_OPTIONS = [0, 1, 2, 3, 5, 7, 10, 15];

function monthRange(offset: number): [string, string] {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    return [todayISO(first), todayISO(last)];
}

export default function PersonalFinancePage() {
    const router = useRouter();
    const toast = useToast();
    const [overview, setOverview] = useState<FinanceOverview | null>(null);
    const [settings, setSettings] = useState<BillingSettingsResponse | null>(null);
    const [draft, setDraft] = useState<BillingSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [exportRange, setExportRange] = useState<[string, string]>(() => monthRange(0));
    const [exporting, setExporting] = useState(false);

    const load = useCallback(async () => {
        try {
            const [ov, st] = await Promise.all([getFinanceOverview(), getBillingSettings()]);
            setOverview(ov);
            setSettings(st);
            setDraft((prev) => prev ?? st);
            setLoadError(false);
        } catch {
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const studentByInvoice = useMemo(() => {
        const m = new Map<string, { id: string; name: string }>();
        overview?.to_collect.forEach((it) => m.set(it.invoice.id, { id: it.student_id, name: it.student_name }));
        return m;
    }, [overview]);

    const { actions, modals, busyId } = useInvoiceActions({
        studentOf: (inv: Invoice) => studentByInvoice.get(inv.id)?.id ?? '',
        studentNameOf: (inv: Invoice) => studentByInvoice.get(inv.id)?.name,
        reload: load,
        toast,
    });

    const canEdit = overview?.can_edit ?? false;
    const dirty = !!draft && !!settings && (Object.keys(draft) as (keyof BillingSettings)[]).some((k) => draft[k] !== settings[k]);
    const set = <K extends keyof BillingSettings>(k: K, v: BillingSettings[K]) =>
        setDraft((d) => (d ? { ...d, [k]: v } : d));

    async function saveSettings() {
        if (!draft) return;
        setSavingSettings(true);
        try {
            const saved = await saveBillingSettings(draft);
            setSettings(saved);
            setDraft(saved);
            toast.showSuccess('Preferências de aviso salvas.');
        } catch (err) {
            toast.showError(apiErrorCode(err) === 'requires_pro' ? 'Os avisos automáticos fazem parte do PRO.' : 'Não foi possível salvar. Tente de novo.');
        } finally {
            setSavingSettings(false);
        }
    }

    async function exportCsv() {
        const [from, to] = exportRange;
        if (!from || !to || to < from) {
            toast.showWarning('Escolha um período válido.');
            return;
        }
        setExporting(true);
        try {
            const items = await getReceived(from, to);
            if (items.length === 0) {
                toast.showWarning('Nenhum pagamento registrado nesse período.');
                return;
            }
            const csv = receivedCsv(items);
            if (canShareTextNatively()) {
                // No app Android não há download de blob: o CSV vai pelo
                // seletor de compartilhamento (e-mail, Drive, WhatsApp).
                const opened = await nativeShareText(csv);
                if (!opened) toast.showError('Não foi possível abrir o compartilhamento.');
                return;
            }
            const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `recebimentos-${from}-a-${to}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.showSuccess(`${items.length} pagamento(s) exportado(s).`);
        } catch {
            toast.showError('Não foi possível exportar. Tente de novo.');
        } finally {
            setExporting(false);
        }
    }

    const maxBar = useMemo(
        () => Math.max(1, ...(overview?.series ?? []).flatMap((p) => [p.expected, p.received])),
        [overview],
    );

    return (
        <div className={s.page}>
            <div className={s.containerWide}>
                <div className={s.header}>
                    <div>
                        <h1 className={s.headerTitle}>
                            <FiTrendingUp aria-hidden="true" /> Financeiro
                        </h1>
                        <p className={s.headerSub}>Quem pagou, quem falta, o que entra e os avisos automáticos</p>
                    </div>
                    <div className={s.headerActions}>
                        <button type="button" className={s.btnGhost} onClick={() => router.push('/personal')}>
                            <FiArrowLeft aria-hidden="true" /> Voltar
                        </button>
                    </div>
                </div>

                {overview && <ProGateNotice canEdit={overview.can_edit} proGraceUntil={overview.pro_grace_until} />}

                {loading ? (
                    <div className={s.empty}>Carregando…</div>
                ) : loadError || !overview || !draft ? (
                    <div className={s.alertDanger} role="alert">
                        Não foi possível carregar o financeiro.{' '}
                        <button type="button" className={s.btnGhost} onClick={() => { setLoading(true); void load(); }}>
                            Tentar de novo
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Indicadores */}
                        <div className={s.tiles}>
                            <div className={s.tile}>
                                <span className={`${s.tileValue} ${s.valuePaid}`}>{BRL(overview.received_month)}</span>
                                <span className={s.tileLabel}>Recebido em {overview.month_label}</span>
                            </div>
                            <div className={s.tile}>
                                <span className={s.tileValue}>{BRL(overview.open_month)}</span>
                                <span className={s.tileLabel}>A receber em {overview.month_label}</span>
                            </div>
                            <div className={s.tile}>
                                <span className={`${s.tileValue} ${overview.overdue_total > 0 ? s.valueOverdue : ''}`}>
                                    {BRL(overview.overdue_total)}
                                </span>
                                <span className={s.tileLabel}>
                                    Em atraso · {overview.overdue_students} aluno{overview.overdue_students === 1 ? '' : 's'}
                                </span>
                            </div>
                            <div className={s.tile}>
                                <span className={s.tileValue}>{BRL(overview.mrr)}</span>
                                <span className={s.tileLabel}>
                                    Receita recorrente/mês · {overview.active_plans} mensalidade{overview.active_plans === 1 ? '' : 's'}
                                </span>
                            </div>
                            <div className={s.tile}>
                                <span className={s.tileValue}>{BRL(overview.forecast_30)}</span>
                                <span className={s.tileLabel}>Previsto nos próximos 30 dias</span>
                            </div>
                            <div className={s.tile}>
                                <span className={`${s.tileValue} ${overview.delinquency_rate > 0.15 ? s.valueWarn : ''}`}>
                                    {Math.round(overview.delinquency_rate * 100)}%
                                </span>
                                <span className={s.tileLabel}>Inadimplência (90 dias)</span>
                            </div>
                        </div>

                        {/* Cobrar agora */}
                        <section className={s.section}>
                            <div className={s.sectionHead}>
                                <h2 className={s.sectionTitle}>
                                    <FiZap aria-hidden="true" /> Cobrar agora
                                    <HelpTooltip
                                        text="Pagamentos informados pelos alunos para você confirmar, cobranças em atraso e as que vencem nos próximos 3 dias."
                                        href="/ajuda#financeiro-personal"
                                        label="Ajuda sobre Cobrar agora"
                                    />
                                </h2>
                                {overview.awaiting_confirm > 0 && (
                                    <span className={s.badgeAwaiting}>
                                        {overview.awaiting_confirm} para confirmar
                                    </span>
                                )}
                            </div>
                            {overview.to_collect.length === 0 ? (
                                <div className={s.empty}>Tudo em dia. Nenhuma cobrança pedindo atenção agora. 🎉</div>
                            ) : (
                                <div className={s.list}>
                                    {overview.to_collect.map((it) => (
                                        <InvoiceCard
                                            key={it.invoice.id}
                                            invoice={it.invoice}
                                            canEdit={canEdit}
                                            studentName={it.student_name || 'Aluno'}
                                            studentPhone={it.student_phone}
                                            studentHref={`/personal/aluno/${it.student_id}/financeiro`}
                                            busy={busyId === it.invoice.id}
                                            {...actions}
                                            onDelete={undefined}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Gráfico */}
                        <section className={s.section}>
                            <h2 className={s.sectionTitle}>Últimos 12 meses</h2>
                            <div className={s.chart} role="img" aria-label="Previsto e recebido nos últimos 12 meses">
                                {overview.series.map((p) => (
                                    <div key={p.key} className={s.chartCol} title={`${p.label}: previsto ${BRL(p.expected)}, recebido ${BRL(p.received)}`}>
                                        <div className={s.chartBars}>
                                            <div className={s.barExpected} style={{ height: `${(p.expected / maxBar) * 100}%` }} />
                                            <div className={s.barReceived} style={{ height: `${(p.received / maxBar) * 100}%` }} />
                                        </div>
                                        <span className={s.chartLabel}>{p.label.split('/')[0]}</span>
                                    </div>
                                ))}
                            </div>
                            <div className={s.legend}>
                                <span>
                                    <span className={s.legendDot} style={{ background: 'var(--surface-3)', border: '1px solid var(--border-mid)' }} />
                                    Previsto (vencimentos do mês)
                                </span>
                                <span>
                                    <span className={s.legendDot} style={{ background: 'var(--mint-dim)' }} />
                                    Recebido (pagamentos do mês)
                                </span>
                            </div>
                        </section>

                        {/* Avisos */}
                        <section className={s.section} id="avisos">
                            <div className={s.sectionHead}>
                                <h2 className={s.sectionTitle}>
                                    <FiBell aria-hidden="true" /> Avisos automáticos
                                    <HelpTooltip
                                        text="Quem recebe o quê e quando. Os avisos saem entre 8h e 21h (horário de Brasília), pelo app (notificação e sino) e, se você permitir, por e-mail."
                                        href="/ajuda#financeiro-avisos"
                                        label="Ajuda sobre os avisos automáticos"
                                    />
                                </h2>
                                {canEdit && (
                                    <button type="button" className={s.btnPrimary} disabled={!dirty || savingSettings} onClick={saveSettings}>
                                        {savingSettings ? 'Salvando…' : dirty ? 'Salvar preferências' : 'Salvo'}
                                    </button>
                                )}
                            </div>

                            <p className={s.sectionHint}>
                                <FiUser aria-hidden="true" /> <strong>Para o aluno</strong>
                            </p>
                            <FinanceSwitch
                                title="Lembretes de vencimento"
                                description="Antes, no dia e depois do vencimento. Param sozinhos quando o aluno toca em “Já paguei” ou você confirma o pagamento."
                                checked={draft.reminders_enabled}
                                disabled={!canEdit}
                                onChange={(v) => set('reminders_enabled', v)}
                            />
                            {draft.reminders_enabled && (
                                <>
                                    <FinanceSwitch
                                        title="Antes do vencimento"
                                        checked={draft.remind_days_before > 0}
                                        disabled={!canEdit}
                                        onChange={(v) => set('remind_days_before', v ? 3 : 0)}
                                        extra={
                                            draft.remind_days_before > 0 && (
                                                <label className={s.toggleDesc}>
                                                    <select
                                                        className={s.inlineSelect}
                                                        value={draft.remind_days_before}
                                                        disabled={!canEdit}
                                                        onChange={(e) => set('remind_days_before', Number(e.target.value))}
                                                    >
                                                        {DAY_OPTIONS.map((d) => (
                                                            <option key={d} value={d}>{d} dia{d === 1 ? '' : 's'} antes</option>
                                                        ))}
                                                    </select>
                                                </label>
                                            )
                                        }
                                    />
                                    <FinanceSwitch
                                        title="No dia do vencimento"
                                        checked={draft.remind_on_due_date}
                                        disabled={!canEdit}
                                        onChange={(v) => set('remind_on_due_date', v)}
                                    />
                                    <FinanceSwitch
                                        title="Depois do vencimento, se não pagou"
                                        checked={draft.remind_days_after > 0}
                                        disabled={!canEdit}
                                        onChange={(v) => set('remind_days_after', v ? 3 : 0)}
                                        extra={
                                            draft.remind_days_after > 0 && (
                                                <label className={s.toggleDesc}>
                                                    <select
                                                        className={s.inlineSelect}
                                                        value={draft.remind_days_after}
                                                        disabled={!canEdit}
                                                        onChange={(e) => set('remind_days_after', Number(e.target.value))}
                                                    >
                                                        {AFTER_OPTIONS.map((d) => (
                                                            <option key={d} value={d}>{d} dia{d === 1 ? '' : 's'} de atraso</option>
                                                        ))}
                                                    </select>
                                                </label>
                                            )
                                        }
                                    />
                                    <FinanceSwitch
                                        title="Também por e-mail"
                                        description="Além da notificação no app, o lembrete chega no e-mail do aluno — útil para quem desativou as notificações."
                                        checked={draft.email_student}
                                        disabled={!canEdit}
                                        onChange={(v) => set('email_student', v)}
                                    />
                                </>
                            )}
                            <FinanceSwitch
                                title="Cobrança nova"
                                description="Avisa o aluno quando uma cobrança é lançada (avulsa ou da mensalidade automática)."
                                checked={draft.notify_new_invoice}
                                disabled={!canEdit}
                                onChange={(v) => set('notify_new_invoice', v)}
                            />
                            <FinanceSwitch
                                title="Pagamento confirmado"
                                description="Recibo no app quando você registra o pagamento. Quem tocou em “Já paguei” sempre recebe a resposta."
                                checked={draft.notify_payment_confirmed}
                                disabled={!canEdit}
                                onChange={(v) => set('notify_payment_confirmed', v)}
                            />

                            <div className={s.reportBox}>
                                <strong>Exemplo do lembrete:</strong> “Sua mensalidade vence em{' '}
                                {draft.remind_days_before || 3} dias — R$ 150,00 com você, vence em 05/10.
                                Já pagou? Toque em ‘Já paguei’.” O aviso nunca traz chave PIX nem
                                dado bancário: isso você combina direto com o aluno.
                            </div>

                            <p className={s.sectionHint}>
                                <FiBell aria-hidden="true" /> <strong>Para você</strong>
                            </p>
                            <FinanceSwitch
                                title="Resumo do dia"
                                description="Uma notificação por dia quando há o que fazer: pagamentos para confirmar, cobranças vencendo hoje ou que venceram ontem."
                                checked={draft.daily_digest}
                                disabled={!canEdit}
                                onChange={(v) => set('daily_digest', v)}
                            />
                            <p className={s.fieldHint}>
                                Quando um aluno toca em “Já paguei”, você é avisado na hora, sempre.
                            </p>

                            <p className={s.sectionHint}>
                                <FiShield aria-hidden="true" /> <strong>Bloqueio por atraso</strong>
                            </p>
                            <FinanceSwitch
                                title="Pausar o acesso de quem atrasar"
                                description="O aluno perde o acesso ao plano de treino, ao plano alimentar e à evolução até o pagamento ser confirmado. Login, notificações e treinos já baixados continuam. Ele é avisado quando o acesso é pausado e quando volta."
                                checked={draft.block_enabled}
                                disabled={!canEdit && !draft.block_enabled}
                                onChange={(v) => set('block_enabled', v)}
                                extra={
                                    draft.block_enabled && (
                                        <label className={s.toggleDesc}>
                                            Tolerância:{' '}
                                            <select
                                                className={s.inlineSelect}
                                                value={draft.block_grace_days}
                                                disabled={!canEdit}
                                                onChange={(e) => set('block_grace_days', Number(e.target.value))}
                                            >
                                                {GRACE_OPTIONS.map((d) => (
                                                    <option key={d} value={d}>
                                                        {d === 0 ? 'bloqueia no dia seguinte ao vencimento' : `${d} dia${d === 1 ? '' : 's'} depois do vencimento`}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    )
                                }
                            />
                            <p className={s.fieldHint}>
                                Enquanto um “Já paguei” espera a sua confirmação, o aluno não é
                                bloqueado. Para isentar um aluno específico, abra o financeiro dele.
                            </p>
                            {!canEdit && dirty && (
                                <div className={s.actions}>
                                    <button type="button" className={s.btn} disabled={savingSettings} onClick={saveSettings}>
                                        Salvar
                                    </button>
                                </div>
                            )}
                        </section>

                        {/* Exportação */}
                        <section className={s.section}>
                            <div className={s.sectionHead}>
                                <h2 className={s.sectionTitle}>
                                    <FiDownload aria-hidden="true" /> Exportar recebimentos
                                </h2>
                            </div>
                            <p className={s.sectionHint}>
                                Planilha (CSV) com data, aluno, valor e forma de cada pagamento
                                registrado. Serve de base para o Carnê-Leão ou para o seu contador.
                            </p>
                            <div className={s.actions}>
                                <button type="button" className={s.btnGhost} onClick={() => setExportRange(monthRange(0))}>Este mês</button>
                                <button type="button" className={s.btnGhost} onClick={() => setExportRange(monthRange(-1))}>Mês passado</button>
                                <button
                                    type="button"
                                    className={s.btnGhost}
                                    onClick={() => setExportRange([`${new Date().getFullYear()}-01-01`, todayISO()])}
                                >
                                    Este ano
                                </button>
                            </div>
                            <div className={s.formRow}>
                                <div className={s.field}>
                                    <label className={s.label} htmlFor="exp-from">De</label>
                                    <input id="exp-from" className={s.input} type="date" value={exportRange[0]} onChange={(e) => setExportRange([e.target.value, exportRange[1]])} />
                                </div>
                                <div className={s.field}>
                                    <label className={s.label} htmlFor="exp-to">Até</label>
                                    <input id="exp-to" className={s.input} type="date" value={exportRange[1]} onChange={(e) => setExportRange([exportRange[0], e.target.value])} />
                                </div>
                            </div>
                            <div className={s.actions}>
                                <button type="button" className={s.btnPrimary} disabled={exporting} onClick={exportCsv}>
                                    <FiDownload aria-hidden="true" /> {exporting ? 'Gerando…' : 'Exportar CSV'}
                                </button>
                            </div>
                        </section>

                        <div className={s.note}>
                            <FiInfo aria-hidden="true" />
                            <span>
                                Este é um controle seu. A Venafit não recebe, não processa e não
                                mostra dados de pagamento. Para a mensalidade de cada aluno, abra{' '}
                                <Link href="/personal">Meus Alunos</Link> → Financeiro.
                            </span>
                        </div>
                    </>
                )}
            </div>
            {modals}
            {toast.ToastSlot}
        </div>
    );
}
