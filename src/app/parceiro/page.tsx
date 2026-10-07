'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { FiCopy, FiPrinter, FiShare2 } from 'react-icons/fi';
import FollowUpPage from '@/components/templates/FollowUpPage';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import {
    SALE_GATEWAYS,
    SALE_PRODUCTS,
    describeCommission,
    getMyPartnerPanel,
    partnerSiteLink,
    type PartnerPanel,
    type PartnerPanelSale,
} from '@/libs/referralPartnerService';
import {
    CYCLE_LABEL,
    KIND_LABEL,
    fmtDate,
    labelOf,
    money,
} from '@/components/organism/AdminPartnershipReport/PartnershipLists';
import { PRESETS, presetRange, type Preset } from '@/libs/periodPresets';
import { playStoreUrl } from '@/libs/androidApp';
import s from './parceiro.module.css';

const MONTHS = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
];
const monthName = (key: string) =>
    `${MONTHS[Number(key.slice(5, 7)) - 1] ?? key.slice(5, 7)} de ${key.slice(0, 4)}`;

/** "15% sobre R$ 33,91 (líquido)" — a conta de cada comissão, para o
 *  parceiro refazer sozinho. */
function commissionMath(x: PartnerPanelSale): string {
    if (x.commission <= 0) return '';
    if (x.commission_type === 'fixed') return 'valor fixo por venda';
    const base = x.commission_base === 'gross' ? x.gross : x.net;
    const word =
        x.commission_base === 'gross' ? 'pago pelo cliente' : 'líquido';
    return `${x.commission_value.toLocaleString('pt-BR')}% sobre ${money(base)} (${word})`;
}

function StatusChip({ sale }: { sale: PartnerPanelSale }) {
    switch (sale.commission_status) {
        case 'holding':
            return (
                <span className={`${s.chip} ${s.chipWait}`}>
                    Em carência até {fmtDate(sale.release_at)}
                </span>
            );
        case 'available':
            return <span className={`${s.chip} ${s.chipGood}`}>Liberada</span>;
        case 'refunded':
            return <span className={`${s.chip} ${s.chipBad}`}>Estornada</span>;
        default:
            return null;
    }
}

function PartnerPanelPage() {
    const { checking } = useAuthGuard();
    const [preset, setPreset] = useState<Preset>('month');
    const [range, setRange] = useState(() => presetRange('month')!);
    const [panel, setPanel] = useState<PartnerPanel | null>(null);
    const [notPartner, setNotPartner] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'sales' | 'statement' | 'payments'>('sales');
    const [copied, setCopied] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            setPanel(await getMyPartnerPanel(range.from, range.to));
        } catch (err) {
            if (isAxiosError(err) && err.response?.status === 404) {
                setNotPartner(true);
            } else {
                setError(
                    'Não foi possível carregar o painel. Tente de novo em instantes.',
                );
            }
        } finally {
            setLoading(false);
        }
    }, [range]);

    useEffect(() => {
        if (!checking) void load();
    }, [checking, load]);

    const choosePreset = (p: Preset) => {
        setPreset(p);
        const r = presetRange(p);
        if (r) setRange(r);
    };

    const copy = async (key: string, text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(key);
            setTimeout(() => setCopied((c) => (c === key ? '' : c)), 2000);
        } catch {
            window.prompt('Copie o link:', text);
        }
    };

    if (checking) return null;

    if (notPartner) {
        return (
            <FollowUpPage
                title="Painel do parceiro"
                icon={<FiShare2 aria-hidden />}
            >
                <p className={s.empty}>
                    Esta conta não está vinculada a um parceiro do Venafit. Se
                    você é parceiro, peça à equipe do Venafit para liberar o
                    painel para o e-mail com que você entra no app.
                </p>
            </FollowUpPage>
        );
    }

    const bal = panel?.balance;
    const settings = panel?.settings;
    const due = bal?.due ?? 0;

    return (
        <FollowUpPage
            title="Painel do parceiro"
            icon={<FiShare2 aria-hidden />}
            subtitle={
                panel ? (
                    <>
                        Vendas feitas com o seu código{' '}
                        <strong className={s.code}>{panel.partner.code}</strong>
                        , atualizadas na hora.
                    </>
                ) : undefined
            }
        >
            {error && (
                <div className={s.error} role="alert">
                    {error}
                </div>
            )}
            {!panel && loading && <p className={s.empty}>Carregando…</p>}

            {panel && bal && settings && (
                <div className={loading ? s.refreshing : undefined}>
                    {!panel.partner.is_active && (
                        <div className={s.notice} role="status">
                            Esta parceria está encerrada: o código não é mais
                            aceito e vendas novas não geram comissão. O
                            histórico abaixo continua disponível.
                        </div>
                    )}

                    <section className={s.section} aria-labelledby="saldo">
                        <h2 id="saldo" className={s.h2}>
                            Seu saldo
                        </h2>
                        <div className={s.cards}>
                            <div className={`${s.card} ${s.cardMain}`}>
                                <p className={s.cardLabel}>
                                    Liberado para repasse
                                </p>
                                <p
                                    className={`${s.cardValue} ${due < 0 ? s.negative : ''}`}
                                >
                                    {money(due)}
                                </p>
                                <p className={s.cardSub}>
                                    {due < 0
                                        ? 'Estorno de comissão já repassada: será descontado do próximo repasse.'
                                        : due >= settings.min_payout
                                          ? `Pago até ${fmtDate(settings.next_payout)}.`
                                          : `Pago quando chegar a ${money(settings.min_payout)}; até lá, acumula.`}
                                </p>
                            </div>
                            <div className={s.card}>
                                <p className={s.cardLabel}>Em carência</p>
                                <p className={s.cardValue}>
                                    {money(bal.holding)}
                                </p>
                                <p className={s.cardSub}>
                                    Libera {settings.hold_days} dias após cada
                                    venda, se não houver estorno.
                                </p>
                            </div>
                            <div className={s.card}>
                                <p className={s.cardLabel}>Já recebido</p>
                                <p className={s.cardValue}>{money(bal.paid)}</p>
                                <p className={s.cardSub}>Total de repasses.</p>
                            </div>
                        </div>
                        <p className={s.rule}>
                            <strong>Sua regra:</strong>{' '}
                            {describeCommission(panel.partner)}. Renovação de
                            plano semestral ou anual não gera comissão; o Aluno
                            Plus não gera comissão. Repasse mensal até o dia{' '}
                            {settings.payout_day}, a partir de{' '}
                            {money(settings.min_payout)} liberados.
                        </p>
                    </section>

                    <section className={s.section} aria-labelledby="periodo">
                        <div className={s.sectionHead}>
                            <h2 id="periodo" className={s.h2}>
                                No período
                            </h2>
                            <select
                                className={s.select}
                                value={preset === 'custom' ? 'month' : preset}
                                onChange={(e) =>
                                    choosePreset(e.target.value as Preset)
                                }
                                aria-label="Período"
                            >
                                {PRESETS.filter(
                                    (p) => p.value !== 'custom',
                                ).map((p) => (
                                    <option key={p.value} value={p.value}>
                                        {p.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <p className={s.muted}>
                            {fmtDate(panel.from)} – {fmtDate(panel.to)}
                        </p>
                        <dl className={s.stats}>
                            <div>
                                <dt>Cadastros pelo seu link</dt>
                                <dd>{panel.period.signups}</dd>
                            </div>
                            <div>
                                <dt>Compras</dt>
                                <dd>{panel.period.purchases}</dd>
                            </div>
                            <div>
                                <dt>Renovações</dt>
                                <dd>{panel.period.renewals}</dd>
                            </div>
                            <div>
                                <dt>Testes grátis</dt>
                                <dd>{panel.period.trials}</dd>
                            </div>
                            <div>
                                <dt>Estornos</dt>
                                <dd>{panel.period.refunds}</dd>
                            </div>
                            <div>
                                <dt>Comissão gerada</dt>
                                <dd>{money(panel.period.commission)}</dd>
                            </div>
                        </dl>
                    </section>

                    <div className={s.tabs} role="tablist">
                        {(
                            [
                                ['sales', `Vendas (${panel.sales.length})`],
                                ['statement', 'Extrato mensal'],
                                ['payments', 'Pagamentos recebidos'],
                            ] as const
                        ).map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                role="tab"
                                aria-selected={tab === key}
                                className={tab === key ? s.tabActive : s.tab}
                                onClick={() => setTab(key)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {tab === 'sales' &&
                        (panel.sales.length === 0 ? (
                            <p className={s.empty}>Nenhuma venda no período.</p>
                        ) : (
                            <ul className={s.list}>
                                {panel.sales.map((x) => (
                                    <li
                                        key={x.ref + x.occurred_at}
                                        className={`${s.item} ${x.status === 'refunded' ? s.itemRefunded : ''}`}
                                    >
                                        <div className={s.itemHead}>
                                            <div>
                                                <p className={s.itemTitle}>
                                                    {labelOf(
                                                        SALE_PRODUCTS,
                                                        x.product,
                                                    )}
                                                    {x.cycle &&
                                                    CYCLE_LABEL[x.cycle]
                                                        ? ` ${CYCLE_LABEL[x.cycle]}`
                                                        : ''}
                                                </p>
                                                <p className={s.muted}>
                                                    {fmtDate(x.occurred_at)} ·{' '}
                                                    {KIND_LABEL[x.kind]}
                                                    {x.installment_number
                                                        ? ` · parcela ${x.installment_number}`
                                                        : ''}{' '}
                                                    ·{' '}
                                                    {labelOf(
                                                        SALE_GATEWAYS,
                                                        x.gateway,
                                                    )}{' '}
                                                    · #{x.ref}
                                                </p>
                                            </div>
                                            <div className={s.itemValue}>
                                                <p className={s.itemCommission}>
                                                    {x.commission > 0
                                                        ? money(x.commission)
                                                        : '—'}
                                                </p>
                                            </div>
                                        </div>
                                        <p className={s.muted}>
                                            Pago pelo cliente {money(x.gross)} ·
                                            líquido{' '}
                                            {x.net_estimated ? '≈ ' : ''}
                                            {money(x.net)}
                                            {commissionMath(x) &&
                                                ` · ${commissionMath(x)}`}
                                        </p>
                                        <div className={s.itemFoot}>
                                            <StatusChip sale={x} />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ))}

                    {tab === 'statement' &&
                        (panel.statements.length === 0 ? (
                            <p className={s.empty}>Ainda não há movimento.</p>
                        ) : (
                            <>
                                <ul className={s.list}>
                                    {panel.statements.map((m) => (
                                        <li key={m.month} className={s.item}>
                                            <p className={s.itemTitle}>
                                                {monthName(m.month)}
                                            </p>
                                            <dl className={s.statementGrid}>
                                                <div>
                                                    <dt>Gerada</dt>
                                                    <dd>
                                                        {money(m.generated)}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt>Anulada</dt>
                                                    <dd>
                                                        {m.voided > 0
                                                            ? `−${money(m.voided)}`
                                                            : money(0)}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt>Recebida</dt>
                                                    <dd>
                                                        {m.paid > 0
                                                            ? `−${money(m.paid)}`
                                                            : money(0)}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt>Saldo no fim do mês</dt>
                                                    <dd className={s.strong}>
                                                        {money(m.balance)}
                                                    </dd>
                                                </div>
                                            </dl>
                                        </li>
                                    ))}
                                </ul>
                                <p className={s.muted}>
                                    Gerada: comissão das vendas do mês. Anulada:
                                    estornos registrados no mês. Saldo: o que
                                    ainda não foi repassado no fim do mês,
                                    incluindo o que está em carência.
                                </p>
                            </>
                        ))}

                    {tab === 'payments' &&
                        (panel.years.length === 0 ? (
                            <p className={s.empty}>
                                Nenhum repasse recebido ainda.
                            </p>
                        ) : (
                            <>
                                <div className={s.printRow}>
                                    <button
                                        type="button"
                                        className={s.btnGhost}
                                        onClick={() => window.print()}
                                    >
                                        <FiPrinter aria-hidden /> Imprimir ou
                                        salvar em PDF
                                    </button>
                                </div>
                                {panel.years.map((y) => (
                                    <section
                                        key={y.year}
                                        className={s.year}
                                        aria-label={`Repasses de ${y.year}`}
                                    >
                                        <div className={s.yearHead}>
                                            <h3 className={s.h3}>{y.year}</h3>
                                            <p className={s.strong}>
                                                Total recebido: {money(y.total)}
                                            </p>
                                        </div>
                                        <ul className={s.payments}>
                                            {y.payments.map((pay, i) => (
                                                <li key={pay.date + i}>
                                                    <span>
                                                        {fmtDate(pay.date)}
                                                    </span>
                                                    <span className={s.muted}>
                                                        {pay.description ||
                                                            'Repasse de comissão'}
                                                    </span>
                                                    <span className={s.strong}>
                                                        {money(pay.amount)}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                ))}
                            </>
                        ))}

                    <section className={`${s.section} ${s.linksSection}`} aria-labelledby="links">
                        <h2 id="links" className={s.h2}>
                            Seus links
                        </h2>
                        <p className={s.muted}>
                            O do site abre o app se ele já estiver instalado; o
                            da Play Store leva o seu código pela instalação.
                        </p>
                        <div className={s.linkRow}>
                            <button
                                type="button"
                                className={s.btnGhost}
                                onClick={() =>
                                    copy(
                                        'site',
                                        partnerSiteLink(
                                            window.location.origin,
                                            panel.partner.code,
                                        ),
                                    )
                                }
                            >
                                <FiCopy aria-hidden />{' '}
                                {copied === 'site'
                                    ? 'Copiado!'
                                    : 'Copiar link do site'}
                            </button>
                            <button
                                type="button"
                                className={s.btnGhost}
                                onClick={() =>
                                    copy(
                                        'play',
                                        playStoreUrl(panel.partner.code),
                                    )
                                }
                            >
                                <FiCopy aria-hidden />{' '}
                                {copied === 'play'
                                    ? 'Copiado!'
                                    : 'Copiar link da Play Store'}
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </FollowUpPage>
    );
}

export default function Page() {
    return <PartnerPanelPage />;
}
