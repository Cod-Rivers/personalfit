'use client';

import React, { useEffect, useState } from 'react';
import {
    ReferralPartner,
    CreateReferralPartnerRequest,
    IndicationStatEntry,
    getAllReferralPartners,
    createReferralPartner,
    updateReferralPartner,
    deleteReferralPartner,
    getIndicationStats,
} from '@/libs/referralPartnerService';
import Modal from '@/components/system/Modal';
import styles from './AdminReferralPartners.module.css';

const emptyForm: CreateReferralPartnerRequest = {
    name: '',
    email: '',
    phone: '',
    code: '',
    commission_type: 'percentage',
    commission_value: 0,
    notes: '',
    is_active: true,
};

export default function AdminReferralPartners() {
    const [tab, setTab] = useState<'list' | 'stats'>('list');
    const [partners, setPartners] = useState<ReferralPartner[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editTarget, setEditTarget] = useState<ReferralPartner | null>(null);
    const [form, setForm] = useState<CreateReferralPartnerRequest>(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

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

    const openCreate = () => {
        setEditTarget(null);
        setForm(emptyForm);
        setError('');
        setShowForm(true);
    };

    const openEdit = (partner: ReferralPartner) => {
        setEditTarget(partner);
        setForm({
            name: partner.name,
            email: partner.email ?? '',
            phone: partner.phone ?? '',
            code: partner.code,
            commission_type: partner.commission_type,
            commission_value: partner.commission_value,
            notes: partner.notes ?? '',
            is_active: partner.is_active,
        });
        setError('');
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            if (editTarget) {
                await updateReferralPartner(editTarget.id, form);
            } else {
                await createReferralPartner(form);
            }
            setShowForm(false);
            await fetchPartners();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string } } };
            setError(e?.response?.data?.error ?? 'Erro ao salvar parceiro.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir este parceiro de indicação?')) return;
        try {
            await deleteReferralPartner(id);
            await fetchPartners();
        } catch {
            alert('Erro ao excluir parceiro.');
        }
    };

    const formatCommission = (partner: ReferralPartner) =>
        partner.commission_type === 'percentage'
            ? `${partner.commission_value}%`
            : `R$ ${partner.commission_value.toFixed(2)}`;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>🤝 Parceiros de Indicação</h2>
                {tab === 'list' && (
                    <button onClick={openCreate} className={styles.btnAdd}>
                        + Novo Parceiro
                    </button>
                )}
            </div>

            <p className={styles.hint}>
                Cadastre parceiros externos que indicam novos usuários para a
                plataforma, com código único de indicação e comissão por
                indicação.
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
                        {partners.map((partner) => (
                            <tr key={partner.id}>
                                <td>{partner.name}</td>
                                <td className={styles.contact}>
                                    {partner.email || '—'}
                                    {partner.phone ? ` · ${partner.phone}` : ''}
                                </td>
                                <td>
                                    <code className={styles.code}>
                                        {partner.code}
                                    </code>
                                </td>
                                <td>{formatCommission(partner)}</td>
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
                                            onClick={() =>
                                                handleDelete(partner.id)
                                            }
                                            className={styles.btnDelete}
                                        >
                                            Excluir
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <Modal
                open={showForm}
                onClose={() => setShowForm(false)}
                title={
                    editTarget
                        ? 'Editar Parceiro'
                        : 'Novo Parceiro de Indicação'
                }
                footer={
                    <>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className={styles.btnCancel}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="referralPartnerForm"
                            className={styles.btnSave}
                            disabled={submitting}
                        >
                            {submitting
                                ? 'Salvando...'
                                : editTarget
                                  ? 'Atualizar'
                                  : 'Criar'}
                        </button>
                    </>
                }
            >
                {error && <div className={styles.errorMsg}>{error}</div>}

                <form
                    id="referralPartnerForm"
                    onSubmit={handleSubmit}
                    className={styles.form}
                >
                    <div className={styles.row}>
                        <label className={styles.label}>Nome *</label>
                        <input
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
                    </div>

                    <div className={styles.row}>
                        <label className={styles.label}>Email</label>
                        <input
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
                        <label className={styles.label}>
                            Telefone
                        </label>
                        <input
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

                    <div className={styles.row}>
                        <label className={styles.label}>
                            Código de indicação *
                        </label>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="Ex: JOAO10"
                            value={form.code}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    code: e.target.value,
                                })
                            }
                            required
                        />
                        <small className={styles.smallHint}>
                            Apenas letras, números, hífen ou underline.
                            Deve ser único.
                        </small>
                    </div>

                    <div className={styles.row}>
                        <label className={styles.label}>
                            Tipo de comissão
                        </label>
                        <select
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
                        <label className={styles.label}>
                            Valor da comissão
                        </label>
                        <input
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
                    </div>

                    <div className={styles.row}>
                        <label className={styles.label}>
                            Observações
                        </label>
                        <textarea
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
                            Parceiro ativo
                        </label>
                    </div>
                </form>
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
            )}
        </div>
    );
}
