'use client';

import {
    SALE_GATEWAYS,
    SALE_PRODUCTS,
    describeCommission,
    type PartnershipRow,
    type PartnershipSale,
    type SaleKind,
} from '@/libs/referralPartnerService';
import s from './AdminPartnershipReport.module.css';

/**
 * As duas listas do relatório em duas formas: tabela quando o cartão tem
 * largura para ela e cartões empilhados quando não tem (celular, ou a coluna
 * estreita do admin). Quem escolhe é a container query do CSS — as duas
 * marcações existem e uma fica oculta, sem JS medindo tela.
 */

const brl = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});
export const money = (v: number) => brl.format(v);

export function fmtDate(isoOrYmd: string): string {
    const [y, m, d] = isoOrYmd.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
}

export const KIND_LABEL: Record<SaleKind, string> = {
    trial: 'Teste grátis',
    new: '1ª compra',
    renewal: 'Renovação',
    one_time: 'Avulsa',
};

export const CYCLE_LABEL: Record<string, string> = {
    MONTHLY: 'mensal',
    SEMIANNUALLY: 'semestral',
    YEARLY: 'anual',
};

export const labelOf = (
    list: readonly { value: string; label: string }[],
    v: string,
) => list.find((i) => i.value === v)?.label ?? v;

function activitySummary(r: PartnershipRow): string {
    const parts = [];
    if (r.renewals) parts.push(`${r.renewals} renov.`);
    if (r.trials)
        parts.push(`${r.trials} ${r.trials === 1 ? 'teste' : 'testes'}`);
    if (r.refunds)
        parts.push(`${r.refunds} ${r.refunds === 1 ? 'estorno' : 'estornos'}`);
    return parts.join(' · ');
}

function OriginName({ row }: { row: PartnershipRow }) {
    return (
        <>
            <div className={s.originName}>
                {row.label}
                {row.kind === 'partner' && !row.is_active && (
                    <span className={s.inactiveTag}>inativo</span>
                )}
            </div>
            {row.kind === 'partner' && (
                <div className={s.originMeta}>
                    <code>{row.code}</code> · {describeCommission(row)}
                </div>
            )}
        </>
    );
}

/** Saldo a repassar; negativo = estorno de comissão já repassada, que
 *  sai do próximo repasse. */
function DueValue({ due }: { due: number }) {
    if (due >= 0) return <span className={s.strong}>{money(due)}</span>;
    return (
        <>
            <span className={s.negative}>{money(due)}</span>
            <div className={s.originMeta}>desconta no próximo repasse</div>
        </>
    );
}

/* ───────── Por origem ───────── */

export function OriginBreakdown({
    rows,
    onPayout,
    minPayout = 0,
}: {
    rows: PartnershipRow[];
    onPayout: (row: PartnershipRow) => void;
    /** Valor mínimo de repasse do programa: abaixo dele o saldo acumula. */
    minPayout?: number;
}) {
    const hasPartners = rows.some((r) => r.kind === 'partner');
    const payoutButton = (r: PartnershipRow) =>
        r.kind === 'partner' && r.partner_id && r.due > 0 ? (
            <span className={s.payoutAction}>
                <button
                    type="button"
                    className={s.btnSmall}
                    onClick={() => onPayout(r)}
                >
                    Registrar repasse
                </button>
                {r.due < minPayout && (
                    <span className={s.originMeta}>
                        abaixo do mínimo de {money(minPayout)}
                    </span>
                )}
            </span>
        ) : null;

    return (
        <div className={s.responsive}>
            <div className={`${s.tableWrap} ${s.wideOnly}`}>
                <table className={s.table}>
                    <thead>
                        <tr>
                            <th>Origem</th>
                            {hasPartners && (
                                <th className={s.num}>Cadastros</th>
                            )}
                            <th className={s.num}>Compras</th>
                            <th className={s.num}>Líquido</th>
                            <th className={s.num}>Comissão</th>
                            <th className={s.num}>Outros gastos</th>
                            <th className={s.num}>Resultado</th>
                            {hasPartners && (
                                <th className={s.num}>A repassar</th>
                            )}
                            <th aria-label="Ações" />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.key}>
                                <td className={s.colOrigin}>
                                    <OriginName row={r} />
                                </td>
                                {hasPartners && (
                                    <td className={s.num}>
                                        {r.kind === 'partner' ? r.signups : '—'}
                                    </td>
                                )}
                                <td className={s.num}>
                                    {r.new_sales + r.one_time}
                                    {activitySummary(r) && (
                                        <div className={s.originMeta}>
                                            {activitySummary(r)}
                                        </div>
                                    )}
                                </td>
                                <td className={s.num}>{money(r.net)}</td>
                                <td className={s.num}>
                                    {money(r.commission)}
                                    {r.author_share > 0 && (
                                        <div className={s.originMeta}>
                                            + autores {money(r.author_share)}
                                        </div>
                                    )}
                                </td>
                                <td className={s.num}>
                                    {money(r.other_expenses)}
                                </td>
                                <td
                                    className={`${s.num} ${r.result < 0 ? s.negative : s.strong}`}
                                >
                                    {money(r.result)}
                                </td>
                                {hasPartners && (
                                    <td className={s.num}>
                                        {r.kind === 'partner' ? (
                                            <>
                                                <DueValue due={r.due} />
                                                {r.holding > 0 && (
                                                    <div
                                                        className={s.originMeta}
                                                    >
                                                        + {money(r.holding)} em
                                                        carência
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            '—'
                                        )}
                                    </td>
                                )}
                                <td>{payoutButton(r)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ul className={`${s.cardList} ${s.narrowOnly}`}>
                {rows.map((r) => (
                    <li key={r.key} className={s.itemCard}>
                        <div className={s.itemHead}>
                            <div className={s.itemTitle}>
                                <OriginName row={r} />
                            </div>
                            <div className={s.itemAside}>
                                <span className={s.itemAsideLabel}>
                                    Resultado
                                </span>
                                <span
                                    className={
                                        r.result < 0 ? s.negative : s.strong
                                    }
                                >
                                    {money(r.result)}
                                </span>
                            </div>
                        </div>
                        <dl className={s.metrics}>
                            {r.kind === 'partner' && (
                                <div>
                                    <dt>Cadastros</dt>
                                    <dd>{r.signups}</dd>
                                </div>
                            )}
                            <div>
                                <dt>Compras</dt>
                                <dd>{r.new_sales + r.one_time}</dd>
                            </div>
                            <div>
                                <dt>Líquido</dt>
                                <dd>{money(r.net)}</dd>
                            </div>
                            <div>
                                <dt>Comissão</dt>
                                <dd>{money(r.commission)}</dd>
                            </div>
                            {r.author_share > 0 && (
                                <div>
                                    <dt>Parte dos autores</dt>
                                    <dd>{money(r.author_share)}</dd>
                                </div>
                            )}
                            <div>
                                <dt>Outros gastos</dt>
                                <dd>{money(r.other_expenses)}</dd>
                            </div>
                            {r.kind === 'partner' && (
                                <div>
                                    <dt>A repassar</dt>
                                    <dd>
                                        <DueValue due={r.due} />
                                    </dd>
                                </div>
                            )}
                        </dl>
                        {(activitySummary(r) || r.holding > 0) && (
                            <p className={s.originMeta}>
                                {[
                                    activitySummary(r),
                                    r.holding > 0
                                        ? `${money(r.holding)} em carência`
                                        : '',
                                ]
                                    .filter(Boolean)
                                    .join(' · ')}
                            </p>
                        )}
                        {payoutButton(r)}
                    </li>
                ))}
            </ul>
        </div>
    );
}

/* ───────── Vendas ───────── */

function CommissionCell({
    sale,
    holdDays,
}: {
    sale: PartnershipSale;
    holdDays: number;
}) {
    if (sale.commission <= 0 && sale.commission_status !== 'refunded') {
        return <span className={s.muted}>—</span>;
    }
    let chip = null;
    if (sale.commission_status === 'refunded') {
        chip = <span className={`${s.chip} ${s.chipBad}`}>Estornada</span>;
    } else if (sale.commission_status === 'available') {
        chip = <span className={`${s.chip} ${s.chipGood}`}>Liberada</span>;
    } else if (sale.commission_status === 'holding') {
        const release = new Date(sale.occurred_at);
        release.setDate(release.getDate() + holdDays);
        const dd = String(release.getDate()).padStart(2, '0');
        const mm = String(release.getMonth() + 1).padStart(2, '0');
        chip = (
            <span
                className={`${s.chip} ${s.chipWait}`}
                title={`Liberada para repasse em ${dd}/${mm}/${release.getFullYear()}`}
            >
                Carência até {dd}/{mm}
            </span>
        );
    }
    return (
        <>
            <div>{sale.commission > 0 ? money(sale.commission) : '—'}</div>
            {chip}
        </>
    );
}

function productLine(x: PartnershipSale): string {
    if (x.program_title) {
        const author = x.author_name
            ? ` · ${x.author_name} ${money(x.author_amount ?? 0)}${x.direct_sale ? ' (direta)' : ''}`
            : ' · Coleção Venafit';
        return `Programa ${x.program_title}${author}`;
    }
    const cycle =
        x.cycle && CYCLE_LABEL[x.cycle] ? ` ${CYCLE_LABEL[x.cycle]}` : '';
    return `${labelOf(SALE_PRODUCTS, x.product)}${cycle}`;
}

function saleMeta(x: PartnershipSale): string {
    const parcela = x.installment_number
        ? ` · parcela ${x.installment_number}`
        : '';
    return `${KIND_LABEL[x.kind]}${parcela} · ${labelOf(SALE_GATEWAYS, x.gateway)}${x.status === 'refunded' ? ' · estornada' : ''}`;
}

function NetValue({ sale }: { sale: PartnershipSale }) {
    return (
        <>
            {sale.net_estimated && sale.net > 0 && (
                <abbr
                    title="Estimado: taxa de 15% do Google Play"
                    className={s.estimate}
                >
                    ≈
                </abbr>
            )}
            {money(sale.net)}
        </>
    );
}

export function SalesList({
    sales,
    holdDays,
}: {
    sales: PartnershipSale[];
    holdDays: number;
}) {
    return (
        <div className={s.responsive}>
            <div className={`${s.tableWrap} ${s.wideOnly}`}>
                <table className={s.table}>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Cliente</th>
                            <th>Produto</th>
                            <th>Origem</th>
                            <th className={s.num}>Líquido</th>
                            <th className={s.num}>Comissão</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales.map((x) => (
                            <tr
                                key={x.id}
                                className={
                                    x.status === 'refunded'
                                        ? s.rowRefunded
                                        : undefined
                                }
                            >
                                <td className={s.nowrap}>
                                    {fmtDate(x.occurred_at)}
                                </td>
                                <td className={s.colText}>
                                    <div>{x.user_name || '—'}</div>
                                    <div className={s.originMeta}>
                                        {x.user_email}
                                    </div>
                                </td>
                                <td className={s.colText}>
                                    <div>{productLine(x)}</div>
                                    <div className={s.originMeta}>
                                        {saleMeta(x)}
                                    </div>
                                </td>
                                <td className={s.colText}>
                                    <div>{x.origin_label}</div>
                                    {x.attribution_source && (
                                        <div className={s.originMeta}>
                                            {x.attribution_source === 'link'
                                                ? 'pelo link'
                                                : 'no checkout'}
                                        </div>
                                    )}
                                </td>
                                <td className={s.num}>
                                    <NetValue sale={x} />
                                    <div className={s.originMeta}>
                                        bruto {money(x.gross)}
                                    </div>
                                </td>
                                <td className={s.num}>
                                    <CommissionCell
                                        sale={x}
                                        holdDays={holdDays}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ul className={`${s.cardList} ${s.narrowOnly}`}>
                {sales.map((x) => (
                    <li
                        key={x.id}
                        className={`${s.itemCard} ${x.status === 'refunded' ? s.rowRefunded : ''}`}
                    >
                        <div className={s.itemHead}>
                            <div className={s.itemTitle}>
                                <div className={s.originName}>
                                    {x.user_name || '—'}
                                </div>
                                <div className={s.originMeta}>
                                    {productLine(x)} · {saleMeta(x)}
                                </div>
                            </div>
                            <div className={s.itemAside}>
                                <span className={s.itemAsideLabel}>
                                    {fmtDate(x.occurred_at)}
                                </span>
                                <span className={s.strong}>
                                    <NetValue sale={x} />
                                </span>
                            </div>
                        </div>
                        <div className={s.itemFoot}>
                            <span className={s.originMeta}>
                                {x.origin_label}
                                {x.attribution_source === 'link' &&
                                    ' · pelo link'}
                                {x.attribution_source === 'checkout' &&
                                    ' · no checkout'}
                            </span>
                            <span className={s.itemCommission}>
                                <CommissionCell sale={x} holdDays={holdDays} />
                            </span>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
