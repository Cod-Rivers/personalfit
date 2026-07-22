'use client';

import React, { useEffect, useState } from 'react';
import {
    ReferralPartner,
    CreateReferralPartnerRequest,
    getAllReferralPartners,
    createReferralPartner,
    updateReferralPartner,
    deleteReferralPartner,
} from '@/libs/referralPartnerService';
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
                <button onClick={openCreate} className={styles.btnAdd}>
                    + Novo Parceiro
                </button>
            </div>

            <p className={styles.hint}>
                Cadastre parceiros externos que indicam novos usuários para a
                plataforma, com código único de indicação e comissão por
                indicação.
            </p>

            {loading ? (
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

            {showForm && (
                <div
                    className={styles.overlay}
                    onClick={() => setShowForm(false)}
                >
                    <div
                        className={styles.modal}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles.modalHeader}>
                            <h3>
                                {editTarget
                                    ? 'Editar Parceiro'
                                    : 'Novo Parceiro de Indicação'}
                            </h3>
                            <button
                                onClick={() => setShowForm(false)}
                                className={styles.btnClose}
                            >
                                ×
                            </button>
                        </div>

                        {error && (
                            <div className={styles.errorMsg}>{error}</div>
                        )}

                        <form onSubmit={handleSubmit} className={styles.form}>
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

                            <div className={styles.modalFooter}>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className={styles.btnCancel}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className={styles.btnSave}
                                    disabled={submitting}
                                >
                                    {submitting
                                        ? 'Salvando...'
                                        : editTarget
                                          ? 'Atualizar'
                                          : 'Criar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
