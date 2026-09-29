'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
    FiArrowLeft,
    FiDollarSign,
    FiInfo,
    FiPause,
    FiPlay,
    FiPlus,
    FiRepeat,
    FiShield,
    FiBarChart2,
} from 'react-icons/fi';
import {
    apiErrorCode,
    createInvoice,
    deleteBillingPlan,
    listInvoices,
    saveBillingPlan,
    setBillingPlanActive,
    setBlockExemption,
    type InvoiceList,
} from '@/libs/studentInvoiceService';
import { BRL, FREQUENCY_LABEL, fmtDate } from '@/libs/financeFormat';
import { useToast } from '@/components/system/Toast';
import Modal from '@/components/system/Modal';
import HelpTooltip from '@/components/atoms/HelpTooltip';
import InvoiceCard from '@/components/features/finance/InvoiceCard';
import InvoiceFormModal from '@/components/features/finance/InvoiceFormModal';
import BillingPlanModal from '@/components/features/finance/BillingPlanModal';
import ProGateNotice from '@/components/features/finance/ProGateNotice';
import FinanceSwitch from '@/components/features/finance/FinanceSwitch';
import { useInvoiceActions } from '@/components/features/finance/useInvoiceActions';
import s from '@/components/features/finance/finance.module.css';

type Filter = 'pending' | 'paid' | 'all';

export default function StudentFinanceiroPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const studentId = params.id;
    const toast = useToast();

    const [data, setData] = useState<InvoiceList | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [filter, setFilter] = useState<Filter>('pending');
    const [creating, setCreating] = useState(false);
    const [planOpen, setPlanOpen] = useState(false);
    const [endPlanOpen, setEndPlanOpen] = useState(false);
    const [planBusy, setPlanBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            setData(await listInvoices(studentId));
            setLoadError(false);
        } catch {
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    useEffect(() => {
        void load();
    }, [load]);

    const { actions, modals, busyId } = useInvoiceActions({
        studentOf: () => studentId,
        studentNameOf: () => data?.student_name,
        reload: load,
        toast,
    });

    const canEdit = data?.can_edit ?? false;
    const plan = data?.plan;
    const invoices = data?.invoices ?? [];
    const pending = invoices
        .filter((i) => i.status !== 'paid')
        .sort((a, b) => Number(b.reported_by_student) - Number(a.reported_by_student) || a.due_date.localeCompare(b.due_date));
    const paid = invoices.filter((i) => i.status === 'paid');
    const shown = filter === 'pending' ? pending : filter === 'paid' ? paid : invoices;

    function proError(err: unknown, fallback: string) {
        toast.showError(apiErrorCode(err) === 'requires_pro' ? 'Esta ação faz parte do PRO.' : fallback);
    }

    async function togglePlan(active: boolean) {
        setPlanBusy(true);
        try {
            await setBillingPlanActive(studentId, active);
            toast.showSuccess(active ? 'Mensalidade automática retomada.' : 'Mensalidade automática pausada.');
            await load();
        } catch (err) {
            proError(err, 'Não foi possível alterar a mensalidade.');
        } finally {
            setPlanBusy(false);
        }
    }

    async function endPlan() {
        setEndPlanOpen(false);
        setPlanBusy(true);
        try {
            await deleteBillingPlan(studentId);
            toast.showSuccess('Mensalidade automática encerrada. O histórico continua aqui.');
            await load();
        } catch {
            toast.showError('Não foi possível encerrar a mensalidade.');
        } finally {
            setPlanBusy(false);
        }
    }

    async function toggleExempt(exempt: boolean) {
        try {
            await setBlockExemption(studentId, exempt);
            toast.showSuccess(exempt ? 'Este aluno não será bloqueado por atraso.' : 'Este aluno volta a seguir o bloqueio automático.');
            await load();
        } catch (err) {
            proError(err, 'Não foi possível salvar.');
        }
    }

    return (
        <div className={s.page}>
            <div className={s.container}>
                <div className={s.header}>
                    <div>
                        <h1 className={s.headerTitle}>
                            <FiDollarSign aria-hidden="true" /> Financeiro
                            {data?.student_name ? ` de ${data.student_name.split(' ')[0]}` : ' do aluno'}
                        </h1>
                        <p className={s.headerSub}>Mensalidades, pagamentos e lembretes deste aluno</p>
                    </div>
                    <div className={s.headerActions}>
                        <Link className={s.btn} href="/personal/financeiro">
                            <FiBarChart2 aria-hidden="true" /> Painel financeiro
                        </Link>
                        <button type="button" className={s.btnGhost} onClick={() => router.back()}>
                            <FiArrowLeft aria-hidden="true" /> Voltar
                        </button>
                    </div>
                </div>

                {data && <ProGateNotice canEdit={data.can_edit} proGraceUntil={data.pro_grace_until} />}

                {loading ? (
                    <div className={s.empty}>Carregando…</div>
                ) : loadError || !data ? (
                    <div className={s.alertDanger} role="alert">
                        Não foi possível carregar o financeiro deste aluno.{' '}
                        <button type="button" className={s.btnGhost} onClick={() => { setLoading(true); void load(); }}>
                            Tentar de novo
                        </button>
                    </div>
                ) : (
                    <>
                        <div className={s.tiles}>
                            <div className={s.tile}>
                                <span className={s.tileValue}>{BRL(data.summary.total_open)}</span>
                                <span className={s.tileLabel}>Em aberto ({data.summary.open_count})</span>
                            </div>
                            <div className={s.tile}>
                                <span className={`${s.tileValue} ${data.summary.total_overdue > 0 ? s.valueOverdue : ''}`}>
                                    {BRL(data.summary.total_overdue)}
                                </span>
                                <span className={s.tileLabel}>Vencido ({data.summary.overdue_count})</span>
                            </div>
                            <div className={s.tile}>
                                <span className={`${s.tileValue} ${s.valuePaid}`}>{BRL(data.summary.total_paid)}</span>
                                <span className={s.tileLabel}>Recebido</span>
                            </div>
                        </div>

                        {data.summary.awaiting_count > 0 && (
                            <div className={s.proBanner} role="status">
                                <FiInfo aria-hidden="true" />
                                <span>
                                    O aluno informou {data.summary.awaiting_count === 1 ? 'um pagamento' : `${data.summary.awaiting_count} pagamentos`}.
                                    Confira no seu extrato e confirme abaixo.
                                </span>
                            </div>
                        )}

                        {/* Mensalidade automática */}
                        <section className={s.section}>
                            <div className={s.sectionHead}>
                                <h2 className={s.sectionTitle}>
                                    <FiRepeat aria-hidden="true" /> Mensalidade automática
                                    <HelpTooltip
                                        text="Você combina valor, periodicidade e dia do vencimento uma vez. O app lança cada cobrança sozinho, cerca de um mês antes, e lembra o aluno."
                                        href="/ajuda#financeiro-personal"
                                        label="Ajuda sobre a mensalidade automática"
                                    />
                                </h2>
                                {plan && plan.active && <span className={s.badgePaid}>Ativa</span>}
                                {plan && !plan.active && <span className={s.badgeOpen}>Pausada</span>}
                            </div>
                            {plan ? (
                                <>
                                    <div className={s.planSummary}>
                                        <span className={s.planAmount}>{BRL(plan.amount)}</span>
                                        <span className={s.muted}>
                                            {FREQUENCY_LABEL[plan.frequency].toLowerCase()} · todo dia {plan.due_day}
                                            {plan.end_date ? ` · até ${fmtDate(plan.end_date)}` : ''}
                                            {plan.description ? ` · ${plan.description}` : ''}
                                        </span>
                                    </div>
                                    <div className={s.actions}>
                                        {canEdit && (
                                            <button type="button" className={s.btn} onClick={() => setPlanOpen(true)} disabled={planBusy}>
                                                Alterar
                                            </button>
                                        )}
                                        {plan.active ? (
                                            <button type="button" className={s.btnGhost} onClick={() => togglePlan(false)} disabled={planBusy}>
                                                <FiPause aria-hidden="true" /> Pausar
                                            </button>
                                        ) : (
                                            canEdit && (
                                                <button type="button" className={s.btnPrimary} onClick={() => togglePlan(true)} disabled={planBusy}>
                                                    <FiPlay aria-hidden="true" /> Retomar
                                                </button>
                                            )
                                        )}
                                        <button type="button" className={s.btnDanger} onClick={() => setEndPlanOpen(true)} disabled={planBusy}>
                                            Encerrar
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className={s.sectionHint}>
                                        Pare de lançar a mensalidade todo mês. Defina uma vez
                                        e o app cuida das cobranças e dos lembretes.
                                    </p>
                                    {canEdit && (
                                        <div className={s.actions}>
                                            <button type="button" className={s.btnPrimary} onClick={() => setPlanOpen(true)}>
                                                <FiRepeat aria-hidden="true" /> Ativar mensalidade automática
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </section>

                        {/* Cobranças */}
                        <section className={s.section}>
                            <div className={s.sectionHead}>
                                <h2 className={s.sectionTitle}>Cobranças</h2>
                                {canEdit && (
                                    <button type="button" className={s.btn} onClick={() => setCreating(true)}>
                                        <FiPlus aria-hidden="true" /> Cobrança avulsa
                                    </button>
                                )}
                            </div>
                            <div className={s.actions} role="tablist" aria-label="Filtrar cobranças">
                                {([
                                    ['pending', `A receber (${pending.length})`],
                                    ['paid', `Pagas (${paid.length})`],
                                    ['all', 'Todas'],
                                ] as const).map(([key, label]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        role="tab"
                                        aria-selected={filter === key}
                                        className={filter === key ? s.btnPrimary : s.btnGhost}
                                        onClick={() => setFilter(key)}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            {shown.length === 0 ? (
                                <div className={s.empty}>
                                    {filter === 'pending'
                                        ? 'Nada a receber deste aluno agora.'
                                        : filter === 'paid'
                                          ? 'Nenhum pagamento registrado ainda.'
                                          : 'Nenhuma cobrança registrada.'}
                                </div>
                            ) : (
                                <div className={s.list}>
                                    {shown.map((inv) => (
                                        <InvoiceCard
                                            key={inv.id}
                                            invoice={inv}
                                            canEdit={canEdit}
                                            studentPhone={data.student_phone}
                                            busy={busyId === inv.id}
                                            contactName={data.student_name}
                                            {...actions}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Bloqueio: exceção deste aluno */}
                        <section className={s.section}>
                            <h2 className={s.sectionTitle}>
                                <FiShield aria-hidden="true" /> Bloqueio por atraso
                            </h2>
                            <FinanceSwitch
                                title="Não bloquear este aluno"
                                description="Mesmo com o bloqueio automático ligado, este aluno continua com acesso ao treino quando atrasar. Os lembretes continuam."
                                checked={data.block_exempt}
                                disabled={!canEdit && !data.block_exempt}
                                onChange={toggleExempt}
                            />
                            <p className={s.fieldHint}>
                                O bloqueio automático, a tolerância e os lembretes valem para
                                todos os alunos e ficam no{' '}
                                <Link href="/personal/financeiro#avisos">painel financeiro</Link>.
                            </p>
                        </section>

                        <div className={s.note}>
                            <FiInfo aria-hidden="true" />
                            <span>
                                Este é um controle seu. A Venafit não recebe, não processa
                                e não mostra dados de pagamento: combine a forma de
                                pagamento direto com o aluno.
                            </span>
                        </div>
                    </>
                )}
            </div>

            {modals}
            <InvoiceFormModal
                open={creating}
                onClose={() => setCreating(false)}
                onSubmit={async (payload) => {
                    await createInvoice(studentId, payload);
                    setCreating(false);
                    toast.showSuccess('Cobrança lançada. O aluno foi avisado no app.');
                    await load();
                }}
            />
            <BillingPlanModal
                open={planOpen}
                plan={plan}
                onClose={() => setPlanOpen(false)}
                onSubmit={async (payload) => {
                    await saveBillingPlan(studentId, payload);
                    setPlanOpen(false);
                    toast.showSuccess(plan ? 'Mensalidade atualizada.' : 'Mensalidade automática ativada.');
                    await load();
                }}
            />
            <Modal
                open={endPlanOpen}
                onClose={() => setEndPlanOpen(false)}
                title="Encerrar a mensalidade automática?"
                footer={
                    <div className={s.modalFooter}>
                        <button type="button" className={s.btnGhost} onClick={() => setEndPlanOpen(false)}>
                            Cancelar
                        </button>
                        <button type="button" className={s.btnDanger} onClick={endPlan}>
                            Encerrar
                        </button>
                    </div>
                }
            >
                <p className={s.sectionHint}>
                    Nenhuma cobrança nova é lançada. As cobranças futuras em aberto são
                    apagadas; as pagas e as vencidas continuam no histórico.
                </p>
            </Modal>
            {toast.ToastSlot}
        </div>
    );
}
