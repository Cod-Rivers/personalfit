'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { isAxiosError } from 'axios';
import { FiDollarSign, FiDownload, FiPlus, FiTrash2 } from 'react-icons/fi';
import Modal from '@/components/system/Modal';
import {
    EXPENSE_CATEGORIES,
    EXPENSE_CHANNELS,
    SALE_GATEWAYS,
    SALE_PRODUCTS,
    type CreatePartnerExpenseRequest,
    type ExpenseCategory,
    type PartnershipReport,
    type PartnershipSale,
    type ReferralPartner,
    createPartnerExpense,
    deletePartnerExpense,
    getAllReferralPartners,
    getPartnershipReport,
} from '@/libs/referralPartnerService';
import s from './AdminPartnershipReport.module.css';
import {
    CYCLE_LABEL,
    KIND_LABEL,
    OriginBreakdown,
    SalesList,
    fmtDate,
    labelOf,
    money,
} from './PartnershipLists';

const PartnershipMonthlyChart = dynamic(
    () => import('./PartnershipMonthlyChart'),
    {
        ssr: false,
        loading: () => <div style={{ height: 240 }} />,
    },
);

/* ───────── datas (sempre AAAA-MM-DD no fuso do navegador) ───────── */

function ymd(d: Date): string {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
}

type Preset = 'month' | 'last-month' | '90d' | 'year' | 'custom';

const PRESETS: { value: Preset; label: string }[] = [
    { value: 'month', label: 'Este mês' },
    { value: 'last-month', label: 'Mês passado' },
    { value: '90d', label: 'Últimos 90 dias' },
    { value: 'year', label: 'Este ano' },
    { value: 'custom', label: 'Personalizado' },
];

function presetRange(p: Preset): { from: string; to: string } | null {
    const now = new Date();
    switch (p) {
        case 'month':
            return {
                from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)),
                to: ymd(now),
            };
        case 'last-month':
            return {
                from: ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
                to: ymd(new Date(now.getFullYear(), now.getMonth(), 0)),
            };
        case '90d': {
            const from = new Date(now);
            from.setDate(from.getDate() - 89);
            return { from: ymd(from), to: ymd(now) };
        }
        case 'year':
            return {
                from: ymd(new Date(now.getFullYear(), 0, 1)),
                to: ymd(now),
            };
        default:
            return null;
    }
}

/* ───────── exportação ───────── */

function downloadSalesCsv(sales: PartnershipSale[], from: string, to: string) {
    const header = [
        'Data',
        'Cliente',
        'E-mail',
        'Produto',
        'Ciclo',
        'Meio',
        'Tipo',
        'Situação',
        'Origem',
        'Atribuição',
        'Bruto',
        'Líquido',
        'Líquido estimado',
        'Comissão',
        'Comissão (situação)',
    ];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const num = (v: number) => v.toFixed(2).replace('.', ',');
    const lines = sales.map((x) =>
        [
            fmtDate(x.occurred_at),
            x.user_name,
            x.user_email,
            labelOf(SALE_PRODUCTS, x.product),
            CYCLE_LABEL[x.cycle ?? ''] ?? '',
            labelOf(SALE_GATEWAYS, x.gateway),
            KIND_LABEL[x.kind],
            x.status === 'refunded' ? 'Estornada' : 'Confirmada',
            x.origin_label,
            x.attribution_source === 'link'
                ? 'Link'
                : x.attribution_source === 'checkout'
                  ? 'Checkout'
                  : '',
            num(x.gross),
            num(x.net),
            x.net_estimated ? 'sim' : 'não',
            num(x.commission),
            x.commission_status,
        ]
            .map((v) => esc(String(v)))
            .join(';'),
    );
    const blob = new Blob(
        ['﻿' + [header.map(esc).join(';'), ...lines].join('\n')],
        {
            type: 'text/csv;charset=utf-8',
        },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendas-parcerias_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

/* ───────── componente ───────── */

interface ExpenseForm {
    origin: string; // partner:<id> | channel:<canal>
    category: ExpenseCategory;
    amount: string;
    date: string;
    description: string;
}

export default function AdminPartnershipReport() {
    const [preset, setPreset] = useState<Preset>('month');
    const [range, setRange] = useState(() => presetRange('month')!);
    const [origin, setOrigin] = useState('partners');
    const [product, setProduct] = useState('');
    const [gateway, setGateway] = useState('');

    const [partners, setPartners] = useState<ReferralPartner[]>([]);
    const [report, setReport] = useState<PartnershipReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [salesView, setSalesView] = useState<'sales' | 'expenses'>('sales');
    const [showMonthsTable, setShowMonthsTable] = useState(false);

    const [expenseOpen, setExpenseOpen] = useState(false);
    const [expenseForm, setExpenseForm] = useState<ExpenseForm>({
        origin: '',
        category: 'fee',
        amount: '',
        date: ymd(new Date()),
        description: '',
    });
    const [expenseError, setExpenseError] = useState('');
    const [savingExpense, setSavingExpense] = useState(false);

    useEffect(() => {
        getAllReferralPartners()
            .then((list) =>
                setPartners(
                    (list ?? []).sort((a, b) => a.name.localeCompare(b.name)),
                ),
            )
            .catch(() => setPartners([]));
    }, []);

    const load = useCallback(async () => {
        if (!range.from || !range.to) return;
        setLoading(true);
        setError('');
        try {
            setReport(
                await getPartnershipReport({
                    from: range.from,
                    to: range.to,
                    origin,
                    product,
                    gateway,
                }),
            );
        } catch (err) {
            setError(
                (isAxiosError(err) &&
                    (err.response?.data as { error?: string })?.error) ||
                    'Não foi possível carregar o relatório.',
            );
        } finally {
            setLoading(false);
        }
    }, [range, origin, product, gateway]);

    useEffect(() => {
        void load();
    }, [load]);

    const choosePreset = (p: Preset) => {
        setPreset(p);
        const r = presetRange(p);
        if (r) setRange(r);
    };

    const openExpense = (prefill?: Partial<ExpenseForm>) => {
        const firstOrigin = partners[0]
            ? `partner:${partners[0].id}`
            : 'channel:instagram';
        setExpenseForm({
            origin:
                origin.startsWith('partner:') || origin.startsWith('channel:')
                    ? origin
                    : firstOrigin,
            category: 'fee',
            amount: '',
            date: ymd(new Date()),
            description: '',
            ...prefill,
        });
        setExpenseError('');
        setExpenseOpen(true);
    };

    const saveExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = Number(expenseForm.amount.replace(',', '.'));
        if (!(amount > 0)) {
            setExpenseError('Informe um valor maior que zero.');
            return;
        }
        const [kind, id] = expenseForm.origin.split(':');
        const body: CreatePartnerExpenseRequest = {
            category: expenseForm.category,
            amount,
            date: expenseForm.date,
            description: expenseForm.description.trim() || undefined,
            ...(kind === 'partner' ? { partner_id: id } : { channel: id }),
        };
        setSavingExpense(true);
        setExpenseError('');
        try {
            await createPartnerExpense(body);
            setExpenseOpen(false);
            await load();
        } catch (err) {
            setExpenseError(
                (isAxiosError(err) &&
                    (err.response?.data as { error?: string })?.error) ||
                    'Não foi possível lançar o gasto.',
            );
        } finally {
            setSavingExpense(false);
        }
    };

    const removeExpense = async (id: string) => {
        if (!confirm('Excluir este gasto lançado?')) return;
        try {
            await deletePartnerExpense(id);
            await load();
        } catch {
            alert('Não foi possível excluir o gasto.');
        }
    };

    const originOptions = useMemo(
        () => [
            { value: 'partners', label: 'Só parceiros' },
            { value: '', label: 'Todas as origens' },
            ...partners.map((p) => ({
                value: `partner:${p.id}`,
                label: `${p.name}${p.is_active ? '' : ' (inativo)'}`,
            })),
            ...EXPENSE_CHANNELS.map((c) => ({
                value: `channel:${c.value}`,
                label: c.label,
            })),
            { value: 'none', label: 'Ninguém indicou' },
            { value: 'unknown', label: 'Não informado' },
        ],
        [partners],
    );

    const sum = report?.summary;
    const holdDays = report?.commission_hold_days ?? 30;
    const costs = sum ? sum.commission + sum.other_expenses : 0;

    return (
        <div className={s.container}>
            <div className={s.header}>
                <h2 className={s.title}>
                    <FiDollarSign aria-hidden="true" /> Parcerias: resultados
                </h2>
                <button
                    type="button"
                    className={s.btnPrimary}
                    onClick={() => openExpense()}
                >
                    <FiPlus aria-hidden="true" /> Lançar gasto
                </button>
            </div>
            <p className={s.hint}>
                Cada venda confirmada (Google Play, PIX e cartão) entra aqui com
                a origem e a comissão do dia da venda. A comissão fica{' '}
                {holdDays} dias em carência (prazo de estorno) e depois é
                liberada para repasse. Lance o repasse feito ao parceiro como
                “Repasse de comissão”.
            </p>

            {/* Filtros: uma linha acima de tudo, valem para a página inteira. */}
            <div className={s.filters}>
                <label className={s.field}>
                    <span className={s.fieldLabel}>Período</span>
                    <select
                        className={s.input}
                        value={preset}
                        onChange={(e) => choosePreset(e.target.value as Preset)}
                    >
                        {PRESETS.map((p) => (
                            <option key={p.value} value={p.value}>
                                {p.label}
                            </option>
                        ))}
                    </select>
                </label>
                {preset === 'custom' && (
                    <>
                        <label className={s.field}>
                            <span className={s.fieldLabel}>De</span>
                            <input
                                type="date"
                                className={s.input}
                                value={range.from}
                                max={range.to}
                                onChange={(e) =>
                                    setRange((r) => ({
                                        ...r,
                                        from: e.target.value,
                                    }))
                                }
                            />
                        </label>
                        <label className={s.field}>
                            <span className={s.fieldLabel}>Até</span>
                            <input
                                type="date"
                                className={s.input}
                                value={range.to}
                                min={range.from}
                                onChange={(e) =>
                                    setRange((r) => ({
                                        ...r,
                                        to: e.target.value,
                                    }))
                                }
                            />
                        </label>
                    </>
                )}
                <label className={s.field}>
                    <span className={s.fieldLabel}>Origem</span>
                    <select
                        className={s.input}
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                    >
                        {originOptions.map((o) => (
                            <option key={o.value || 'all'} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </label>
                <label className={s.field}>
                    <span className={s.fieldLabel}>Produto</span>
                    <select
                        className={s.input}
                        value={product}
                        onChange={(e) => setProduct(e.target.value)}
                    >
                        <option value="">Todos</option>
                        {SALE_PRODUCTS.map((p) => (
                            <option key={p.value} value={p.value}>
                                {p.label}
                            </option>
                        ))}
                    </select>
                </label>
                <label className={s.field}>
                    <span className={s.fieldLabel}>Meio</span>
                    <select
                        className={s.input}
                        value={gateway}
                        onChange={(e) => setGateway(e.target.value)}
                    >
                        <option value="">Todos</option>
                        {SALE_GATEWAYS.map((g) => (
                            <option key={g.value} value={g.value}>
                                {g.label}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
            {report && (
                <p className={s.rangeNote}>
                    {fmtDate(report.from)} – {fmtDate(report.to)}
                    {(product || gateway) &&
                        ' · gastos não têm produto nem meio: o filtro vale só para as vendas'}
                </p>
            )}

            {error && (
                <div className={s.errorMsg} role="alert">
                    {error}
                </div>
            )}

            {loading && !report ? (
                <p className={s.loading}>Carregando…</p>
            ) : sum && report ? (
                <div className={loading ? s.refreshing : undefined}>
                    <div className={s.kpis}>
                        <div className={s.kpi}>
                            <p className={s.kpiLabel}>Ganhos (líquido)</p>
                            <p className={s.kpiValue}>{money(sum.net)}</p>
                            <p className={s.kpiSub}>bruto {money(sum.gross)}</p>
                        </div>
                        <div className={s.kpi}>
                            <p className={s.kpiLabel}>Gastos</p>
                            <p className={s.kpiValue}>{money(costs)}</p>
                            <p className={s.kpiSub}>
                                comissões {money(sum.commission)} · outros{' '}
                                {money(sum.other_expenses)}
                            </p>
                        </div>
                        <div className={s.kpi}>
                            <p className={s.kpiLabel}>Resultado</p>
                            <p
                                className={`${s.kpiValue} ${sum.result < 0 ? s.negative : ''}`}
                            >
                                {money(sum.result)}
                            </p>
                            <p className={s.kpiSub}>
                                {costs > 0
                                    ? `retorno de ${(sum.net / costs).toFixed(1).replace('.', ',')}× o gasto`
                                    : 'sem gastos no período'}
                            </p>
                        </div>
                        <div className={s.kpi}>
                            <p className={s.kpiLabel}>A repassar</p>
                            <p className={s.kpiValue}>
                                {money(Math.max(sum.due, 0))}
                            </p>
                            <p className={s.kpiSub}>
                                em carência {money(sum.holding)} · todas as
                                datas
                            </p>
                        </div>
                        <div className={s.kpi}>
                            <p className={s.kpiLabel}>Conversões</p>
                            <p className={s.kpiValue}>
                                {sum.new_sales + sum.one_time}
                            </p>
                            <p className={s.kpiSub}>
                                {sum.signups} cadastros pelo link · {sum.trials}{' '}
                                testes · {sum.renewals} renovações
                            </p>
                        </div>
                    </div>

                    {report.months.length > 0 && (
                        <section className={s.card}>
                            <div className={s.cardHeader}>
                                <h3 className={s.cardTitle}>
                                    Receita líquida × custos por mês
                                </h3>
                                <button
                                    type="button"
                                    className={s.btnGhost}
                                    onClick={() =>
                                        setShowMonthsTable((v) => !v)
                                    }
                                >
                                    {showMonthsTable
                                        ? 'Ver gráfico'
                                        : 'Ver em tabela'}
                                </button>
                            </div>
                            {showMonthsTable ? (
                                <div className={s.tableWrap}>
                                    <table className={s.table}>
                                        <thead>
                                            <tr>
                                                <th>Mês</th>
                                                <th className={s.num}>Bruto</th>
                                                <th className={s.num}>
                                                    Líquido
                                                </th>
                                                <th className={s.num}>
                                                    Comissões
                                                </th>
                                                <th className={s.num}>
                                                    Outros gastos
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {report.months.map((m) => (
                                                <tr key={m.month}>
                                                    <td>
                                                        {m.month.slice(5)}/
                                                        {m.month.slice(0, 4)}
                                                    </td>
                                                    <td className={s.num}>
                                                        {money(m.gross)}
                                                    </td>
                                                    <td className={s.num}>
                                                        {money(m.net)}
                                                    </td>
                                                    <td className={s.num}>
                                                        {money(m.commission)}
                                                    </td>
                                                    <td className={s.num}>
                                                        {money(
                                                            m.other_expenses,
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <PartnershipMonthlyChart
                                    months={report.months}
                                />
                            )}
                        </section>
                    )}

                    <section className={s.card}>
                        <h3 className={s.cardTitle}>Por origem</h3>
                        {report.rows.length === 0 ? (
                            <p className={s.empty}>
                                Nenhuma venda ou gasto para esse filtro.
                            </p>
                        ) : (
                            <OriginBreakdown
                                rows={report.rows}
                                onPayout={(r) =>
                                    openExpense({
                                        origin: `partner:${r.partner_id}`,
                                        category: 'commission_payout',
                                        amount: r.due
                                            .toFixed(2)
                                            .replace('.', ','),
                                        description: `Repasse até ${fmtDate(ymd(new Date()))}`,
                                    })
                                }
                            />
                        )}
                    </section>

                    <section className={s.card}>
                        <div className={s.cardHeader}>
                            <div className={s.tabs} role="tablist">
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={salesView === 'sales'}
                                    className={
                                        salesView === 'sales'
                                            ? s.tabActive
                                            : s.tab
                                    }
                                    onClick={() => setSalesView('sales')}
                                >
                                    Vendas ({report.sales.length})
                                </button>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={salesView === 'expenses'}
                                    className={
                                        salesView === 'expenses'
                                            ? s.tabActive
                                            : s.tab
                                    }
                                    onClick={() => setSalesView('expenses')}
                                >
                                    Gastos lançados ({report.expenses.length})
                                </button>
                            </div>
                            {salesView === 'sales' &&
                                report.sales.length > 0 && (
                                    <button
                                        type="button"
                                        className={s.btnGhost}
                                        onClick={() =>
                                            downloadSalesCsv(
                                                report.sales,
                                                report.from,
                                                report.to,
                                            )
                                        }
                                    >
                                        <FiDownload aria-hidden="true" />{' '}
                                        Exportar CSV
                                    </button>
                                )}
                        </div>

                        {salesView === 'sales' ? (
                            report.sales.length === 0 ? (
                                <p className={s.empty}>
                                    Nenhuma venda no período.
                                </p>
                            ) : (
                                <SalesList
                                    sales={report.sales}
                                    holdDays={holdDays}
                                />
                            )
                        ) : report.expenses.length === 0 ? (
                            <p className={s.empty}>
                                Nenhum gasto lançado no período.
                            </p>
                        ) : (
                            <div className={s.tableWrap}>
                                <table className={s.table}>
                                    <thead>
                                        <tr>
                                            <th>Data</th>
                                            <th>Origem</th>
                                            <th>Categoria</th>
                                            <th>Descrição</th>
                                            <th className={s.num}>Valor</th>
                                            <th aria-label="Ações" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.expenses.map((x) => (
                                            <tr key={x.id}>
                                                <td>{fmtDate(x.date)}</td>
                                                <td>{x.label}</td>
                                                <td>
                                                    {labelOf(
                                                        EXPENSE_CATEGORIES,
                                                        x.category,
                                                    )}
                                                </td>
                                                <td className={s.originMeta}>
                                                    {x.description || '—'}
                                                </td>
                                                <td className={s.num}>
                                                    {money(x.amount)}
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className={s.btnIcon}
                                                        onClick={() =>
                                                            removeExpense(x.id)
                                                        }
                                                        aria-label={`Excluir gasto de ${money(x.amount)}`}
                                                    >
                                                        <FiTrash2 aria-hidden="true" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            ) : null}

            <Modal
                open={expenseOpen}
                onClose={() => setExpenseOpen(false)}
                title="Lançar gasto da parceria"
                footer={
                    <>
                        <button
                            type="button"
                            className={s.btnGhost}
                            onClick={() => setExpenseOpen(false)}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="partnerExpenseForm"
                            className={s.btnPrimary}
                            disabled={savingExpense}
                        >
                            {savingExpense ? 'Salvando…' : 'Lançar'}
                        </button>
                    </>
                }
            >
                {expenseError && (
                    <div className={s.errorMsg} role="alert">
                        {expenseError}
                    </div>
                )}
                <form
                    id="partnerExpenseForm"
                    className={s.form}
                    onSubmit={saveExpense}
                >
                    <label className={s.field}>
                        <span className={s.fieldLabel}>Parceiro ou canal</span>
                        <select
                            className={s.input}
                            value={expenseForm.origin}
                            onChange={(e) =>
                                setExpenseForm({
                                    ...expenseForm,
                                    origin: e.target.value,
                                })
                            }
                            required
                        >
                            {partners.map((p) => (
                                <option key={p.id} value={`partner:${p.id}`}>
                                    {p.name}
                                </option>
                            ))}
                            {EXPENSE_CHANNELS.map((c) => (
                                <option
                                    key={c.value}
                                    value={`channel:${c.value}`}
                                >
                                    {c.label} (canal)
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className={s.field}>
                        <span className={s.fieldLabel}>Categoria</span>
                        <select
                            className={s.input}
                            value={expenseForm.category}
                            onChange={(e) =>
                                setExpenseForm({
                                    ...expenseForm,
                                    category: e.target.value as ExpenseCategory,
                                })
                            }
                        >
                            {EXPENSE_CATEGORIES.map((c) => (
                                <option key={c.value} value={c.value}>
                                    {c.label}
                                </option>
                            ))}
                        </select>
                        {expenseForm.category === 'commission_payout' && (
                            <small className={s.fieldHint}>
                                Quita a comissão já gerada pelas vendas: não
                                conta como gasto novo no resultado.
                            </small>
                        )}
                    </label>
                    <div className={s.formRow}>
                        <label className={s.field}>
                            <span className={s.fieldLabel}>Valor (R$)</span>
                            <input
                                className={s.input}
                                inputMode="decimal"
                                placeholder="0,00"
                                value={expenseForm.amount}
                                onChange={(e) =>
                                    setExpenseForm({
                                        ...expenseForm,
                                        amount: e.target.value,
                                    })
                                }
                                required
                            />
                        </label>
                        <label className={s.field}>
                            <span className={s.fieldLabel}>Data</span>
                            <input
                                type="date"
                                className={s.input}
                                value={expenseForm.date}
                                onChange={(e) =>
                                    setExpenseForm({
                                        ...expenseForm,
                                        date: e.target.value,
                                    })
                                }
                                required
                            />
                        </label>
                    </div>
                    <label className={s.field}>
                        <span className={s.fieldLabel}>Descrição</span>
                        <input
                            className={s.input}
                            maxLength={300}
                            placeholder="Opcional — ex.: post patrocinado de 10/10"
                            value={expenseForm.description}
                            onChange={(e) =>
                                setExpenseForm({
                                    ...expenseForm,
                                    description: e.target.value,
                                })
                            }
                        />
                    </label>
                </form>
            </Modal>
        </div>
    );
}
