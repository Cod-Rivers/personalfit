'use client';

import React, { useEffect, useState } from 'react';
import { FiAlertCircle, FiCheckCircle, FiShare2 } from 'react-icons/fi';
import {
    ReferralPartner,
    CreateReferralPartnerRequest,
    UpdateReferralPartnerRequest,
    IndicationStatEntry,
    CodeAvailabilityStatus,
    getAllReferralPartners,
    createReferralPartner,
    updateReferralPartner,
    getIndicationStats,
    checkCodeAvailability,
    normalizeReferralCode,
    partnerSiteLink,
    describeCommission,
    DEFAULT_FIRST_COMMISSION,
    DEFAULT_RENEWAL_COMMISSION,
    REFERRAL_CODE_MIN,
    REFERRAL_CODE_MAX,
    type CommissionBase,
} from '@/libs/referralPartnerService';
import { playStoreUrl } from '@/libs/androidApp';
import Modal from '@/components/system/Modal';
import PartnerAccessModal from './PartnerAccessModal';
import AuthorBlockModal from './AuthorBlockModal';
import styles from './AdminReferralPartners.module.css';

/** Código do parceiro novo: sorteado pelo servidor ou escolhido pelo admin. */
type CodeMode = 'random' | 'custom';

const emptyForm: CreateReferralPartnerRequest = {
    name: '',
    email: '',
    phone: '',
    code: '',
    commission_type: 'percentage',
    commission_value: DEFAULT_FIRST_COMMISSION,
    renewal_commission_value: DEFAULT_RENEWAL_COMMISSION,
    renewal_months: 0,
    commission_base: 'net',
    notes: '',
    is_active: true,
};

const CODE_STATUS_TEXT: Record<CodeAvailabilityStatus, string> = {
    available: 'Disponível.',
    taken: 'Já é de outro parceiro (o de um parceiro inativo também não volta a ficar livre).',
    reserved: 'Reservado pelo sistema. Escolha outro.',
    invalid: `Use de ${REFERRAL_CODE_MIN} a ${REFERRAL_CODE_MAX} letras sem acento ou números.`,
};

/** Corpo da edição: tudo menos o código, que não muda depois de criado. */
function toUpdateRequest(
    p: CreateReferralPartnerRequest | ReferralPartner,
): UpdateReferralPartnerRequest {
    return {
        name: p.name,
        email: p.email ?? '',
        phone: p.phone ?? '',
        commission_type: p.commission_type,
        commission_value: p.commission_value,
        renewal_commission_value: p.renewal_commission_value ?? 0,
        renewal_months: p.renewal_months ?? 0,
        commission_base: p.commission_base ?? 'net',
        notes: p.notes ?? '',
        is_active: p.is_active,
    };
}

function saveErrorMessage(err: unknown): string {
    const data = (err as { response?: { data?: { error?: string; code?: string } } })
        ?.response?.data;
    switch (data?.code) {
        case 'referral_code_taken':
            return 'Este código já é de outro parceiro. Escolha outro ou use o código gerado.';
        case 'referral_code_reserved':
            return 'Este código é reservado pelo sistema. Escolha outro.';
        case 'referral_code_invalid':
            return CODE_STATUS_TEXT.invalid;
    }
    return data?.error ?? 'Erro ao salvar parceiro.';
}

export default function AdminReferralPartners() {
    const [tab, setTab] = useState<'list' | 'stats'>('list');
    const [partners, setPartners] = useState<ReferralPartner[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editTarget, setEditTarget] = useState<ReferralPartner | null>(null);
    const [form, setForm] = useState<CreateReferralPartnerRequest>(emptyForm);
    const [codeMode, setCodeMode] = useState<CodeMode>('random');
    const [availability, setAvailability] = useState<{
        code: string;
        status: CodeAvailabilityStatus;
    } | null>(null);
    // Parceiro recém-criado: o modal passa a mostrar o código e os links.
    const [created, setCreated] = useState<ReferralPartner | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [showInactive, setShowInactive] = useState(false);

    const fetchPartners = async () => {
        setLoading(true);
        try {
            const data = await getAllReferralPartners();
            setPartners(data ?? []);
        } catch {
            setPartners([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPartners();
    }, []);

    // Disponibilidade do código escolhido, conferida enquanto o admin digita.
    // O servidor confere de novo ao criar (409 se outro cadastro o levar).
    const chosenCode = form.code ?? '';
    const checkingCode = showForm && !editTarget && !created && codeMode === 'custom';
    useEffect(() => {
        if (!checkingCode || chosenCode.length < REFERRAL_CODE_MIN) {
            setAvailability(null);
            return;
        }
        let cancelled = false;
        const timer = setTimeout(() => {
            checkCodeAvailability(chosenCode)
                .then((r) => {
                    if (!cancelled) setAvailability(r);
                })
                .catch(() => {
                    if (!cancelled) setAvailability(null);
                });
        }, 400);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [checkingCode, chosenCode]);
    const codeStatus =
        availability && availability.code === chosenCode ? availability.status : null;
    const customCodeBlocked =
        codeMode === 'custom' &&
        (chosenCode.length < REFERRAL_CODE_MIN ||
            (codeStatus !== null && codeStatus !== 'available'));

    const openCreate = () => {
        setEditTarget(null);
        setCreated(null);
        setForm(emptyForm);
        setCodeMode('random');
        setAvailability(null);
        setError('');
        setShowForm(true);
    };

    const openEdit = (partner: ReferralPartner) => {
        setEditTarget(partner);
        setCreated(null);
        setForm({ ...toUpdateRequest(partner), code: partner.code });
        setError('');
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setCreated(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editTarget && customCodeBlocked) return;
        setSubmitting(true);
        setError('');
        try {
            if (editTarget) {
                await updateReferralPartner(editTarget.id, toUpdateRequest(form));
                setShowForm(false);
            } else {
                // Código vazio = o servidor sorteia.
                const partner = await createReferralPartner({
                    ...form,
                    code: codeMode === 'custom' ? chosenCode : '',
                });
                setCreated(partner);
            }
            await fetchPartners();
        } catch (err: unknown) {
            setError(saveErrorMessage(err));
        } finally {
            setSubmitting(false);
        }
    };

    // Não há exclusão: o código está nos links já enviados e nos clientes que
    // o usaram. Desativar para de aceitar o código em compras novas.
    const toggleActive = async (partner: ReferralPartner) => {
        if (
            partner.is_active &&
            !confirm(
                `Desativar ${partner.name}? O código ${partner.code} deixa de ser aceito em compras novas e não gera comissão nova. As vendas antigas continuam no relatório, e o código continua reservado.`,
            )
        ) {
            return;
        }
        try {
            await updateReferralPartner(partner.id, {
                ...toUpdateRequest(partner),
                is_active: !partner.is_active,
            });
            await fetchPartners();
        } catch {
            alert('Não foi possível alterar o parceiro.');
        }
    };

    // Código e links de rastreio para mandar ao parceiro: o do site abre o app
    // se ele estiver instalado; o da Play Store leva o código pela instalação.
    const [copied, setCopied] = useState('');
    // Parceiro com o modal de acesso ao painel aberto.
    const [accessTarget, setAccessTarget] = useState<ReferralPartner | null>(null);
    const [authorTarget, setAuthorTarget] = useState<ReferralPartner | null>(null);
    const copyText = async (key: string, text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(key);
            setTimeout(() => setCopied((c) => (c === key ? '' : c)), 2000);
        } catch {
            window.prompt('Copie:', text);
        }
    };
    const shareButtons = (partner: ReferralPartner) => (
        <div className={styles.linkBtns}>
            <button
                type="button"
                className={styles.btnLink}
                onClick={() => copyText(`code-${partner.id}`, partner.code)}
            >
                {copied === `code-${partner.id}` ? 'Copiado!' : 'Copiar código'}
            </button>
            <button
                type="button"
                className={styles.btnLink}
                onClick={() =>
                    copyText(
                        `site-${partner.id}`,
                        partnerSiteLink(window.location.origin, partner.code),
                    )
                }
            >
                {copied === `site-${partner.id}` ? 'Copiado!' : 'Link do site'}
            </button>
            <button
                type="button"
                className={styles.btnLink}
                onClick={() => copyText(`play-${partner.id}`, playStoreUrl(partner.code))}
            >
                {copied === `play-${partner.id}` ? 'Copiado!' : 'Link da Play Store'}
            </button>
        </div>
    );

    const term = search.trim().toLowerCase();
    const termCode = normalizeReferralCode(search);
    const inactiveCount = partners.filter((p) => !p.is_active).length;
    const visible = partners.filter(
        (p) =>
            (showInactive || p.is_active) &&
            (!term ||
                p.name.toLowerCase().includes(term) ||
                (termCode !== '' && normalizeReferralCode(p.code).includes(termCode))),
    );

    const formFooter = created ? (
        <button type="button" onClick={closeForm} className={styles.btnSave}>
            Concluir
        </button>
    ) : (
        <>
            <button type="button" onClick={closeForm} className={styles.btnCancel}>
                Cancelar
            </button>
            <button
                type="submit"
                form="referralPartnerForm"
                className={styles.btnSave}
                disabled={submitting || (!editTarget && customCodeBlocked)}
            >
                {submitting ? 'Salvando...' : editTarget ? 'Atualizar' : 'Criar'}
            </button>
        </>
    );

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}><FiShare2 /> Parceiros de Indicação</h2>
                {tab === 'list' && (
                    <button onClick={openCreate} className={styles.btnAdd}>
                        + Novo Parceiro
                    </button>
                )}
            </div>

            <p className={styles.hint}>
                Cada parceiro tem um código de indicação exclusivo, sorteado pelo
                sistema ou escolhido por você. É com ele que o cliente confirma a
                indicação no pagamento, e o código não muda depois de criado.
                Mande ao parceiro o código e os links: o do site abre o app se já
                estiver instalado, e o da Play Store leva o código pela
                instalação. Os ganhos, gastos e o saldo a repassar ficam em{' '}
                <strong>Parcerias: resultados</strong>.
            </p>

            <div className={styles.tabs}>
                <button
                    onClick={() => setTab('list')}
                    className={tab === 'list' ? styles.tabActive : styles.tab}
                >
                    Parceiros
                </button>
                <button
                    onClick={() => setTab('stats')}
                    className={tab === 'stats' ? styles.tabActive : styles.tab}
                >
                    Estatísticas de Indicação
                </button>
            </div>

            {tab === 'stats' ? (
                <IndicationStatsPanel />
            ) : loading ? (
                <p className={styles.loading}>Carregando...</p>
            ) : partners.length === 0 ? (
                <p className={styles.empty}>
                    Nenhum parceiro de indicação cadastrado.
                </p>
            ) : (
                <>
                    <div className={styles.filters}>
                        <input
                            type="search"
                            className={styles.input}
                            placeholder="Buscar por nome ou código"
                            aria-label="Buscar parceiro por nome ou código"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <label className={styles.checkRow}>
                            <input
                                type="checkbox"
                                checked={showInactive}
                                onChange={(e) => setShowInactive(e.target.checked)}
                            />
                            Mostrar inativos ({inactiveCount})
                        </label>
                    </div>
                    {visible.length === 0 ? (
                        <p className={styles.empty}>
                            Nenhum parceiro para esse filtro.
                        </p>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Contato</th>
                                        <th>Código</th>
                                        <th>Comissão</th>
                                        <th>Status</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visible.map((partner) => (
                                        <tr key={partner.id}>
                                            <td>{partner.name}</td>
                                            <td className={styles.contact}>
                                                {partner.email || '—'}
                                                {partner.phone ? ` · ${partner.phone}` : ''}
                                                {partner.account_email && (
                                                    <div>Painel: {partner.account_email}</div>
                                                )}
                                                {partner.author && (
                                                    <div>
                                                        Autor: {partner.author.cref_label}
                                                        {partner.author.can_publish
                                                            ? ' · pode publicar'
                                                            : partner.author.enabled
                                                              ? ' · falta CREF conferido ou termo'
                                                              : ' · loja desligada'}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <code className={styles.code}>
                                                    {partner.code}
                                                </code>
                                                {shareButtons(partner)}
                                            </td>
                                            <td className={styles.contact}>
                                                {describeCommission(partner)}
                                            </td>
                                            <td>
                                                {partner.is_active ? (
                                                    <span className={styles.active}>
                                                        Ativo
                                                    </span>
                                                ) : (
                                                    <span className={styles.inactive}>
                                                        Inativo
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <div className={styles.actions}>
                                                    <button
                                                        onClick={() => openEdit(partner)}
                                                        className={styles.btnEdit}
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => setAccessTarget(partner)}
                                                        className={styles.btnEdit}
                                                    >
                                                        Painel
                                                    </button>
                                                    <button
                                                        onClick={() => setAuthorTarget(partner)}
                                                        className={styles.btnEdit}
                                                    >
                                                        Autor
                                                    </button>
                                                    <button
                                                        onClick={() => toggleActive(partner)}
                                                        className={
                                                            partner.is_active
                                                                ? styles.btnDeactivate
                                                                : styles.btnEdit
                                                        }
                                                    >
                                                        {partner.is_active
                                                            ? 'Desativar'
                                                            : 'Reativar'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            <PartnerAccessModal
                partner={accessTarget}
                onClose={() => setAccessTarget(null)}
                onChanged={() => void fetchPartners()}
            />

            <AuthorBlockModal
                partner={authorTarget}
                onClose={() => setAuthorTarget(null)}
                onSaved={() => void fetchPartners()}
            />

            <Modal
                open={showForm}
                onClose={closeForm}
                title={
                    created
                        ? 'Parceiro criado'
                        : editTarget
                          ? 'Editar Parceiro'
                          : 'Novo Parceiro de Indicação'
                }
                footer={formFooter}
            >
                {created ? (
                    <div className={styles.createdBox}>
                        <FiCheckCircle className={styles.createdIcon} aria-hidden="true" />
                        <p className={styles.createdText}>
                            <strong>{created.name}</strong> foi cadastrado. Este é o
                            código de indicação dele:
                        </p>
                        <code className={styles.createdCode}>{created.code}</code>
                        {shareButtons(created)}
                        <small className={styles.smallHint}>
                            Quem usar o código no pagamento, ou chegar pelos links,
                            fica ligado a este parceiro. O código não muda depois de
                            criado.
                        </small>
                    </div>
                ) : (
                    <>
                        {error && <div className={styles.errorMsg}>{error}</div>}

                        <form
                            id="referralPartnerForm"
                            onSubmit={handleSubmit}
                            className={styles.form}
                        >
                            <div className={styles.row}>
                                <label className={styles.label} htmlFor="rp_name">
                                    Nome *
                                </label>
                                <input
                                    id="rp_name"
                                    type="text"
                                    className={styles.input}
                                    placeholder="Nome do parceiro"
                                    value={form.name}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            name: e.target.value,
                                        })
                                    }
                                    required
                                />
                                <small className={styles.smallHint}>
                                    Aparece para o cliente que digitar o código
                                    (“Indicação de …”): use o nome público do
                                    parceiro, não o nome civil completo.
                                </small>
                            </div>

                            <div className={styles.row}>
                                <label className={styles.label} htmlFor="rp_email">
                                    Email
                                </label>
                                <input
                                    id="rp_email"
                                    type="email"
                                    className={styles.input}
                                    placeholder="email@exemplo.com"
                                    value={form.email}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            email: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className={styles.row}>
                                <label className={styles.label} htmlFor="rp_phone">
                                    Telefone
                                </label>
                                <input
                                    id="rp_phone"
                                    type="text"
                                    className={styles.input}
                                    placeholder="(00) 00000-0000"
                                    value={form.phone}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            phone: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            {editTarget ? (
                                <div className={styles.row}>
                                    <span className={styles.label}>
                                        Código de indicação
                                    </span>
                                    <div className={styles.codeReadonly}>
                                        <code className={styles.code}>
                                            {editTarget.code}
                                        </code>
                                        <button
                                            type="button"
                                            className={styles.btnLink}
                                            onClick={() =>
                                                copyText(
                                                    `code-${editTarget.id}`,
                                                    editTarget.code,
                                                )
                                            }
                                        >
                                            {copied === `code-${editTarget.id}`
                                                ? 'Copiado!'
                                                : 'Copiar'}
                                        </button>
                                    </div>
                                    <small className={styles.smallHint}>
                                        O código não muda depois de criado: ele
                                        está nos links já enviados e nos clientes
                                        que o usaram.
                                    </small>
                                </div>
                            ) : (
                                <fieldset className={styles.row}>
                                    <legend className={styles.label}>
                                        Código de indicação
                                    </legend>
                                    <div className={styles.codeModes}>
                                        <label
                                            className={
                                                codeMode === 'random'
                                                    ? styles.codeModeActive
                                                    : styles.codeMode
                                            }
                                        >
                                            <input
                                                type="radio"
                                                name="rp_code_mode"
                                                value="random"
                                                checked={codeMode === 'random'}
                                                onChange={() => setCodeMode('random')}
                                            />
                                            Gerar automaticamente
                                        </label>
                                        <label
                                            className={
                                                codeMode === 'custom'
                                                    ? styles.codeModeActive
                                                    : styles.codeMode
                                            }
                                        >
                                            <input
                                                type="radio"
                                                name="rp_code_mode"
                                                value="custom"
                                                checked={codeMode === 'custom'}
                                                onChange={() => setCodeMode('custom')}
                                            />
                                            Escolher o código
                                        </label>
                                    </div>
                                    {codeMode === 'random' ? (
                                        <small className={styles.smallHint}>
                                            O sistema sorteia 8 letras e números
                                            (ex.: K7M2QX9P), sem vogais e sem
                                            caracteres que se confundem. Não dá
                                            para adivinhar, e ele aparece logo
                                            depois de criar.
                                        </small>
                                    ) : (
                                        <>
                                            <input
                                                id="rp_code"
                                                type="text"
                                                className={`${styles.input} ${styles.codeInput}`}
                                                placeholder="Ex.: JOAO10"
                                                aria-label="Código escolhido"
                                                aria-describedby="rp_code_status"
                                                autoCapitalize="characters"
                                                autoComplete="off"
                                                spellCheck={false}
                                                maxLength={REFERRAL_CODE_MAX}
                                                value={chosenCode}
                                                onChange={(e) =>
                                                    setForm({
                                                        ...form,
                                                        code: normalizeReferralCode(
                                                            e.target.value,
                                                        ),
                                                    })
                                                }
                                            />
                                            <small
                                                id="rp_code_status"
                                                aria-live="polite"
                                                className={
                                                    codeStatus === 'available'
                                                        ? styles.codeOk
                                                        : codeStatus
                                                          ? styles.codeBad
                                                          : styles.smallHint
                                                }
                                            >
                                                {codeStatus === 'available' && (
                                                    <FiCheckCircle aria-hidden="true" />
                                                )}
                                                {codeStatus && codeStatus !== 'available' && (
                                                    <FiAlertCircle aria-hidden="true" />
                                                )}
                                                {codeStatus
                                                    ? CODE_STATUS_TEXT[codeStatus]
                                                    : `De ${REFERRAL_CODE_MIN} a ${REFERRAL_CODE_MAX} letras ou números. Maiúsculas, espaços e hífens não contam.`}
                                            </small>
                                        </>
                                    )}
                                    <small className={styles.smallHint}>
                                        O código não muda depois de criado.
                                    </small>
                                </fieldset>
                            )}

                            <div className={styles.row}>
                                <label className={styles.label} htmlFor="rp_type">
                                    Tipo de comissão
                                </label>
                                <select
                                    id="rp_type"
                                    className={styles.input}
                                    value={form.commission_type}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            commission_type: e.target
                                                .value as
                                                | 'percentage'
                                                | 'fixed',
                                        })
                                    }
                                >
                                    <option value="percentage">
                                        Percentual (%)
                                    </option>
                                    <option value="fixed">
                                        Valor fixo (R$)
                                    </option>
                                </select>
                            </div>

                            <div className={styles.row}>
                                <label className={styles.label} htmlFor="rp_first">
                                    Comissão na 1ª compra (
                                    {form.commission_type === 'percentage' ? '%' : 'R$'})
                                </label>
                                <input
                                    id="rp_first"
                                    type="number"
                                    min={0}
                                    max={
                                        form.commission_type === 'percentage'
                                            ? 100
                                            : undefined
                                    }
                                    step="0.01"
                                    className={styles.input}
                                    value={form.commission_value}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            commission_value:
                                                Number(e.target.value) || 0,
                                        })
                                    }
                                />
                                <small className={styles.smallHint}>
                                    Vale para os planos do personal e para o
                                    plano da biblioteca. O Aluno Plus não gera
                                    comissão.
                                </small>
                            </div>

                            <div className={styles.row}>
                                <label className={styles.label} htmlFor="rp_renewal">
                                    Comissão em cada renovação do mensal (
                                    {form.commission_type === 'percentage' ? '%' : 'R$'})
                                </label>
                                <input
                                    id="rp_renewal"
                                    type="number"
                                    min={0}
                                    max={
                                        form.commission_type === 'percentage'
                                            ? 100
                                            : undefined
                                    }
                                    step="0.01"
                                    className={styles.input}
                                    value={form.renewal_commission_value}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            renewal_commission_value:
                                                Number(e.target.value) || 0,
                                        })
                                    }
                                />
                                <small className={styles.smallHint}>
                                    Só no plano mensal: semestral e anual recebem apenas a
                                    comissão da 1ª compra (sobre o pacote inteiro). 0 = só a
                                    primeira compra de cada cliente gera comissão.
                                </small>
                            </div>

                            <div className={styles.row}>
                                <label className={styles.label} htmlFor="rp_months">
                                    Pagar renovações por
                                </label>
                                <select
                                    id="rp_months"
                                    className={styles.input}
                                    value={form.renewal_months}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            renewal_months: Number(e.target.value),
                                        })
                                    }
                                >
                                    {Array.from(
                                        new Set([0, 6, 12, 24, form.renewal_months]),
                                    ).map((m) => (
                                        <option key={m} value={m}>
                                            {m === 0
                                                ? 'Sem limite (enquanto o cliente pagar)'
                                                : `${m} meses de cliente`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {form.commission_type === 'percentage' && (
                                <div className={styles.row}>
                                    <label className={styles.label} htmlFor="rp_base">
                                        Calcular o percentual sobre
                                    </label>
                                    <select
                                        id="rp_base"
                                        className={styles.input}
                                        value={form.commission_base ?? 'net'}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                commission_base: e.target
                                                    .value as CommissionBase,
                                            })
                                        }
                                    >
                                        <option value="net">
                                            Valor líquido (depois da taxa do Google
                                            Play ou do Asaas)
                                        </option>
                                        <option value="gross">
                                            Valor pago pelo cliente (bruto)
                                        </option>
                                    </select>
                                </div>
                            )}
                            <small className={styles.smallHint}>
                                Cada venda guarda a regra do dia em que aconteceu:
                                mudar aqui só vale para as vendas seguintes.
                            </small>

                            <div className={styles.row}>
                                <label className={styles.label} htmlFor="rp_notes">
                                    Observações
                                </label>
                                <textarea
                                    id="rp_notes"
                                    className={styles.input}
                                    placeholder="Opcional"
                                    value={form.notes}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            notes: e.target.value,
                                        })
                                    }
                                    rows={3}
                                />
                            </div>

                            <div className={styles.checkRow}>
                                <input
                                    type="checkbox"
                                    id="rp_is_active"
                                    checked={form.is_active}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            is_active: e.target.checked,
                                        })
                                    }
                                />
                                <label htmlFor="rp_is_active">
                                    Parceiro ativo (o código é aceito no pagamento)
                                </label>
                            </div>
                            <small className={styles.smallHint}>
                                Inativo: o código deixa de valer e o parceiro
                                não recebe mais nenhuma comissão, nem das
                                renovações dos clientes que já trouxe.
                            </small>
                        </form>
                    </>
                )}
            </Modal>
        </div>
    );
}

/**
 * Painel de estatísticas de indicação (item 4 da tarefa): contagens
 * aninhadas hoje ⊆ semana ⊆ mês ⊆ ano ⊆ total, por parceiro/canal fixo/nenhum,
 * com filtro por nome para localizar rapidamente um parceiro específico.
 */
function IndicationStatsPanel() {
    const [entries, setEntries] = useState<IndicationStatEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [nameFilter, setNameFilter] = useState('');

    useEffect(() => {
        getIndicationStats()
            .then(setEntries)
            .catch(() => setError('Não foi possível carregar as estatísticas.'))
            .finally(() => setLoading(false));
    }, []);

    const filtered = entries
        .filter((e) =>
            e.label.toLowerCase().includes(nameFilter.trim().toLowerCase()),
        )
        .sort((a, b) => b.counts.total - a.counts.total);

    if (loading) return <p className={styles.loading}>Carregando...</p>;
    if (error) return <p className={styles.errorMsg}>{error}</p>;

    return (
        <div>
            <input
                type="text"
                className={styles.input}
                placeholder="Filtrar por nome do parceiro/canal..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                style={{ maxWidth: 320, marginBottom: 16 }}
            />

            {filtered.length === 0 ? (
                <p className={styles.empty}>
                    Nenhuma indicação encontrada para esse filtro.
                </p>
            ) : (
                <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Origem</th>
                            <th>Hoje</th>
                            <th>Semana</th>
                            <th>Mês</th>
                            <th>Ano</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((e) => (
                            <tr key={e.key}>
                                <td>{e.label}</td>
                                <td>{e.counts.today}</td>
                                <td>{e.counts.week}</td>
                                <td>{e.counts.month}</td>
                                <td>{e.counts.year}</td>
                                <td>
                                    <strong>{e.counts.total}</strong>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            )}
        </div>
    );
}
