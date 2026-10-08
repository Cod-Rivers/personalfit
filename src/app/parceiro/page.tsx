'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { isAxiosError } from 'axios';
import {
    FiCopy,
    FiEdit3,
    FiPause,
    FiPlay,
    FiPrinter,
    FiShare2,
} from 'react-icons/fi';
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
import {
    authorProgramActions,
    authorShareLink,
    listMyStorePrograms,
    programShareLink,
    runMyStoreProgramAction,
    STORE_STATUS_LABEL,
    type AdminStoreProgram,
    type MyStoreProgramAction,
} from '@/libs/storeService';
import { acceptAuthorTerms } from '@/libs/referralPartnerService';
import Modal from '@/components/system/Modal';
import PublishProgramModal from '@/components/organism/PublishProgramModal';
import {
    AUTHOR_TERMS_VERSION,
    AuthorTermsText,
} from '@/app/loja/_components/AuthorTerms';
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
 *  parceiro refazer sozinho. Na venda de programa dele, a conta é a da
 *  parte do autor. */
function commissionMath(x: PartnerPanelSale): string {
    if (x.role !== 'referral' && x.author_share_value) {
        return `sua parte: ${x.author_share_value.toLocaleString('pt-BR')}% sobre ${money(x.net)} (líquido)`;
    }
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

const ROLE_LABEL: Record<PartnerPanelSale['role'], string> = {
    referral: 'Indicação',
    author: 'Venda de programa',
    direct: 'Venda direta do seu programa',
};

function PartnerPanelPage() {
    const { checking, user } = useAuthGuard();
    const [preset, setPreset] = useState<Preset>('month');
    const [range, setRange] = useState(() => presetRange('month')!);
    const [panel, setPanel] = useState<PartnerPanel | null>(null);
    const [notPartner, setNotPartner] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<
        'sales' | 'statement' | 'payments' | 'programs'
    >('sales');
    const [copied, setCopied] = useState('');
    // Loja (fase 2): os programas do autor com a situação completa (envio,
    // alteração em revisão, quem pausou), o formulário de envio e o aceite
    // do Termo do Autor.
    const [myPrograms, setMyPrograms] = useState<AdminStoreProgram[] | null>(
        null,
    );
    const [editing, setEditing] = useState<AdminStoreProgram | null>(null);
    const [actionBusy, setActionBusy] = useState(false);
    const [actionMsg, setActionMsg] = useState('');
    const [termsOpen, setTermsOpen] = useState(false);
    const [termsChecked, setTermsChecked] = useState(false);
    const [termsBusy, setTermsBusy] = useState(false);
    const [termsError, setTermsError] = useState('');
    const isAuthor = !!panel?.partner.author;

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

    // 403 (autor com a loja desligada, ou conta que não é de personal): a
    // aba mostra só as vendas, sem as ações.
    const loadMyPrograms = useCallback(async () => {
        try {
            setMyPrograms(await listMyStorePrograms());
        } catch {
            setMyPrograms(null);
        }
    }, []);

    useEffect(() => {
        if (isAuthor) void loadMyPrograms();
    }, [isAuthor, loadMyPrograms]);

    const runAction = async (
        p: AdminStoreProgram,
        action: MyStoreProgramAction,
    ) => {
        setActionBusy(true);
        setActionMsg('');
        try {
            await runMyStoreProgramAction(p.id, action);
            setActionMsg(
                {
                    'cancel-review': 'Envio cancelado.',
                    pause: 'Programa pausado: saiu da vitrine.',
                    resume: 'Programa de volta à vitrine.',
                }[action],
            );
            await Promise.all([loadMyPrograms(), load()]);
        } catch (err) {
            setActionMsg(
                (isAxiosError(err) &&
                    (err.response?.data as { error?: string })?.error) ||
                    'Não deu certo. Tente de novo.',
            );
        } finally {
            setActionBusy(false);
        }
    };

    // Manda a versão que a pessoa LEU: se o termo mudou no servidor desde
    // então (app antigo em cache), o aceite é recusado.
    const acceptTerms = async () => {
        setTermsBusy(true);
        setTermsError('');
        try {
            await acceptAuthorTerms(AUTHOR_TERMS_VERSION);
            setTermsOpen(false);
            await Promise.all([load(), loadMyPrograms()]);
        } catch (err) {
            setTermsError(
                (isAxiosError(err) &&
                    (err.response?.data as { error?: string })?.error) ||
                    'Não foi possível registrar o aceite. Tente de novo.',
            );
        } finally {
            setTermsBusy(false);
        }
    };

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
                {user?.role === 'personal' && (
                    <p className={s.empty}>
                        Profissional com CREF? Venda seus treinos na loja do
                        Venafit: <Link href="/loja/vender">veja como</Link>.
                    </p>
                )}
            </FollowUpPage>
        );
    }

    const bal = panel?.balance;
    const settings = panel?.settings;
    const due = bal?.due ?? 0;
    const author = panel?.partner.author;
    const programRows = (panel?.programs ?? []).map((pr) => ({
        pr,
        mine: myPrograms?.find((m) => m.id === pr.id),
    }));

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
                    {author && !author.terms_accepted && (
                        <div className={s.notice} role="status">
                            <strong>Para vender na loja,</strong> leia e aceite
                            o Termo do Autor.
                            {!author.cref_verified &&
                                ' A equipe ainda vai conferir o seu CREF.'}
                            {author.terms_version !== AUTHOR_TERMS_VERSION &&
                                ' O termo foi atualizado: recarregue a página antes de ler.'}
                            <div className={s.itemFoot}>
                                <button
                                    type="button"
                                    className={s.btnGhost}
                                    onClick={() => {
                                        setTermsChecked(false);
                                        setTermsError('');
                                        setTermsOpen(true);
                                    }}
                                >
                                    Ler e aceitar o termo
                                </button>
                            </div>
                        </div>
                    )}
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
                        {author && (
                            <p className={s.rule}>
                                <strong>Como autor ({author.cref}):</strong>{' '}
                                {author.store_share.toLocaleString('pt-BR')}% do
                                líquido em cada venda dos seus programas pela
                                vitrine da loja, e{' '}
                                {author.direct_share.toLocaleString('pt-BR')}%
                                quando você traz o comprador (link ou código).
                                Na venda direta não há comissão de indicação
                                além disso. Mesma carência e mesmo repasse.
                            </p>
                        )}
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
                            {author && (
                                <>
                                    <div>
                                        <dt>Vendas dos seus programas</dt>
                                        <dd>{panel.period.program_sales}</dd>
                                    </div>
                                    <div>
                                        <dt>Sua parte nos programas</dt>
                                        <dd>
                                            {money(
                                                panel.period.author_earnings,
                                            )}
                                        </dd>
                                    </div>
                                </>
                            )}
                        </dl>
                    </section>

                    <div className={s.tabs} role="tablist">
                        {(
                            [
                                ['sales', `Vendas (${panel.sales.length})`],
                                ...(author
                                    ? ([
                                          [
                                              'programs',
                                              `Meus programas (${panel.programs.length})`,
                                          ],
                                      ] as const)
                                    : []),
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
                                                    {x.program_title
                                                        ? `Programa ${x.program_title}`
                                                        : labelOf(
                                                              SALE_PRODUCTS,
                                                              x.product,
                                                          )}
                                                    {x.cycle &&
                                                    CYCLE_LABEL[x.cycle]
                                                        ? ` ${CYCLE_LABEL[x.cycle]}`
                                                        : ''}
                                                </p>
                                                {author && (
                                                    <p className={s.muted}>
                                                        {ROLE_LABEL[x.role]}
                                                    </p>
                                                )}
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
                                                    {x.amount > 0
                                                        ? money(x.amount)
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
                                                {author && (
                                                    <>
                                                        <div>
                                                            <dt>Indicação</dt>
                                                            <dd>
                                                                {money(
                                                                    m.generated_referral,
                                                                )}
                                                            </dd>
                                                        </div>
                                                        <div>
                                                            <dt>
                                                                Venda de
                                                                programa
                                                            </dt>
                                                            <dd>
                                                                {money(
                                                                    m.generated_programs,
                                                                )}
                                                            </dd>
                                                        </div>
                                                    </>
                                                )}
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

                    {tab === 'programs' &&
                        (programRows.length === 0 ? (
                            <p className={s.empty}>
                                Você ainda não tem programas na loja. Em Minha
                                biblioteca, use &ldquo;Vender na loja&rdquo; no
                                treino que você quer vender.
                            </p>
                        ) : (
                            <>
                                {actionMsg && (
                                    <div className={s.notice} role="status">
                                        {actionMsg}
                                    </div>
                                )}
                                <ul className={s.list}>
                                    {programRows.map(({ pr, mine }) => {
                                        const acts = mine
                                            ? authorProgramActions(mine)
                                            : null;
                                        return (
                                            <li key={pr.id} className={s.item}>
                                                <div className={s.itemHead}>
                                                    <div>
                                                        <p
                                                            className={
                                                                s.itemTitle
                                                            }
                                                        >
                                                            {pr.title}
                                                        </p>
                                                        <p className={s.muted}>
                                                            {acts?.label ??
                                                                STORE_STATUS_LABEL[
                                                                    pr.status
                                                                ]}{' '}
                                                            · {money(pr.price)}
                                                            {pr.rating_count > 0
                                                                ? ` · ★ ${pr.rating_avg.toLocaleString('pt-BR')} (${pr.rating_count})`
                                                                : ''}
                                                        </p>
                                                    </div>
                                                    <div
                                                        className={s.itemValue}
                                                    >
                                                        <p
                                                            className={
                                                                s.itemCommission
                                                            }
                                                        >
                                                            {money(pr.revenue)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <p className={s.muted}>
                                                    {pr.sales}{' '}
                                                    {pr.sales === 1
                                                        ? 'venda'
                                                        : 'vendas'}{' '}
                                                    sem estorno, desde o início.
                                                </p>
                                                {acts?.rejection && (
                                                    <p className={s.muted}>
                                                        <strong>
                                                            {pr.status ===
                                                            'rejected'
                                                                ? 'Motivo da recusa: '
                                                                : 'Última alteração recusada: '}
                                                        </strong>
                                                        {acts.rejection}
                                                    </p>
                                                )}
                                                {mine?.revision && (
                                                    <p className={s.muted}>
                                                        Alteração enviada em{' '}
                                                        {fmtDate(
                                                            mine.revision
                                                                .submitted_at,
                                                        )}
                                                        : a vitrine segue com a
                                                        versão aprovada até a
                                                        revisão.
                                                    </p>
                                                )}
                                                <div className={s.itemFoot}>
                                                    {pr.status ===
                                                        'published' && (
                                                        <button
                                                            type="button"
                                                            className={
                                                                s.btnGhost
                                                            }
                                                            onClick={() =>
                                                                copy(
                                                                    `program-${pr.id}`,
                                                                    programShareLink(
                                                                        window
                                                                            .location
                                                                            .origin,
                                                                        pr.id,
                                                                        panel
                                                                            .partner
                                                                            .code,
                                                                    ),
                                                                )
                                                            }
                                                        >
                                                            <FiCopy
                                                                aria-hidden
                                                            />{' '}
                                                            {copied ===
                                                            `program-${pr.id}`
                                                                ? 'Copiado!'
                                                                : 'Copiar link do programa'}
                                                        </button>
                                                    )}
                                                    {mine &&
                                                        acts?.submitMode && (
                                                            <button
                                                                type="button"
                                                                className={
                                                                    s.btnGhost
                                                                }
                                                                disabled={
                                                                    actionBusy
                                                                }
                                                                onClick={() =>
                                                                    setEditing(
                                                                        mine,
                                                                    )
                                                                }
                                                            >
                                                                <FiEdit3
                                                                    aria-hidden
                                                                />{' '}
                                                                {acts.submitMode ===
                                                                'revision'
                                                                    ? 'Alterar'
                                                                    : 'Enviar para revisão'}
                                                            </button>
                                                        )}
                                                    {mine &&
                                                        acts?.canCancelReview && (
                                                            <button
                                                                type="button"
                                                                className={
                                                                    s.btnGhost
                                                                }
                                                                disabled={
                                                                    actionBusy
                                                                }
                                                                onClick={() =>
                                                                    void runAction(
                                                                        mine,
                                                                        'cancel-review',
                                                                    )
                                                                }
                                                            >
                                                                Cancelar envio
                                                            </button>
                                                        )}
                                                    {mine && acts?.canPause && (
                                                        <button
                                                            type="button"
                                                            className={
                                                                s.btnGhost
                                                            }
                                                            disabled={
                                                                actionBusy
                                                            }
                                                            onClick={() =>
                                                                void runAction(
                                                                    mine,
                                                                    'pause',
                                                                )
                                                            }
                                                        >
                                                            <FiPause
                                                                aria-hidden
                                                            />{' '}
                                                            Pausar
                                                        </button>
                                                    )}
                                                    {mine &&
                                                        acts?.canResume && (
                                                            <button
                                                                type="button"
                                                                className={
                                                                    s.btnGhost
                                                                }
                                                                disabled={
                                                                    actionBusy
                                                                }
                                                                onClick={() =>
                                                                    void runAction(
                                                                        mine,
                                                                        'resume',
                                                                    )
                                                                }
                                                            >
                                                                <FiPlay
                                                                    aria-hidden
                                                                />{' '}
                                                                Voltar à vitrine
                                                            </button>
                                                        )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                                <p className={s.muted}>
                                    Receita: a sua parte nas vendas sem estorno.
                                    Quem compra pelo seu link conta como venda
                                    direta. Nenhum dado de quem comprou aparece
                                    aqui. Pausar tira o programa da vitrine;
                                    quem comprou continua com o plano.
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

                    <section
                        className={`${s.section} ${s.linksSection}`}
                        aria-labelledby="links"
                    >
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
                            {author && (
                                <button
                                    type="button"
                                    className={s.btnGhost}
                                    onClick={() =>
                                        copy(
                                            'author',
                                            authorShareLink(
                                                window.location.origin,
                                                panel.partner.code,
                                            ),
                                        )
                                    }
                                >
                                    <FiCopy aria-hidden />{' '}
                                    {copied === 'author'
                                        ? 'Copiado!'
                                        : 'Copiar link da sua vitrine na loja'}
                                </button>
                            )}
                        </div>
                    </section>
                </div>
            )}

            <Modal
                open={termsOpen}
                onClose={() => setTermsOpen(false)}
                title="Termo do Autor"
                footer={
                    <>
                        <button
                            type="button"
                            className={s.btnGhost}
                            onClick={() => setTermsOpen(false)}
                        >
                            Agora não
                        </button>
                        <button
                            type="button"
                            className={s.btnPrimary}
                            disabled={!termsChecked || termsBusy}
                            onClick={() => void acceptTerms()}
                        >
                            {termsBusy ? 'Registrando…' : 'Aceitar'}
                        </button>
                    </>
                }
            >
                <div className={s.terms}>
                    <AuthorTermsText />
                </div>
                {termsError && (
                    <div className={s.error} role="alert">
                        {termsError}
                    </div>
                )}
                <label className={s.termsCheck}>
                    <input
                        type="checkbox"
                        checked={termsChecked}
                        onChange={(e) => setTermsChecked(e.target.checked)}
                    />
                    <span>
                        Li e aceito o Termo do Autor (versão{' '}
                        {AUTHOR_TERMS_VERSION}).
                    </span>
                </label>
            </Modal>

            <PublishProgramModal
                open={!!editing}
                program={editing ?? undefined}
                onClose={() => setEditing(null)}
                onDone={() => {
                    void loadMyPrograms();
                    void load();
                }}
            />
        </FollowUpPage>
    );
}

export default function Page() {
    return <PartnerPanelPage />;
}
