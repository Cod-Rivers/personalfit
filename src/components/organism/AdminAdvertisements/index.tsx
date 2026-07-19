'use client';

import React, { useEffect, useState } from 'react';
import {
    Advertisement,
    CreateAdvertisementRequest,
    getAllAdvertisements,
    createAdvertisement,
    updateAdvertisement,
    deleteAdvertisement,
} from '@/libs/advertisementService';
import styles from './AdminAdvertisements.module.css';

const emptyForm: CreateAdvertisementRequest = {
    type: 'image',
    url: '',
    title: '',
    description: '',
    link: '',
    placement: 'top',
    is_active: true,
};

export default function AdminAdvertisements() {
    const [ads, setAds] = useState<Advertisement[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editTarget, setEditTarget] = useState<Advertisement | null>(null);
    const [form, setForm] = useState<CreateAdvertisementRequest>(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const fetchAds = async () => {
        setLoading(true);
        try {
            const data = await getAllAdvertisements();
            setAds(data ?? []);
        } catch {
            setAds([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAds();
    }, []);

    const openCreate = () => {
        setEditTarget(null);
        setForm(emptyForm);
        setError('');
        setShowForm(true);
    };

    const openEdit = (ad: Advertisement) => {
        setEditTarget(ad);
        setForm({
            type: ad.type,
            url: ad.url,
            title: ad.title,
            description: ad.description ?? '',
            link: ad.link ?? '',
            placement: ad.placement,
            is_active: ad.is_active,
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
                await updateAdvertisement(editTarget.id, form);
            } else {
                await createAdvertisement(form);
            }
            setShowForm(false);
            await fetchAds();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string } } };
            setError(e?.response?.data?.error ?? 'Erro ao salvar anúncio.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir este anúncio?')) return;
        try {
            await deleteAdvertisement(id);
            await fetchAds();
        } catch {
            alert('Erro ao excluir anúncio.');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>📢 Anúncios Globais</h2>
                <button onClick={openCreate} className={styles.btnAdd}>
                    + Novo Anúncio
                </button>
            </div>

            <p className={styles.hint}>
                Anúncios globais são exibidos para todos os usuários que não têm
                personal PRO. Personal PRO pode criar anúncios próprios que
                substituem os globais para seus alunos.
            </p>

            {loading ? (
                <p className={styles.loading}>Carregando...</p>
            ) : ads.length === 0 ? (
                <p className={styles.empty}>Nenhum anúncio cadastrado.</p>
            ) : (
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Título</th>
                            <th>Tipo</th>
                            <th>Posição</th>
                            <th>Status</th>
                            <th>Dono</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ads.map((ad) => (
                            <tr key={ad.id}>
                                <td>{ad.title}</td>
                                <td>
                                    {ad.type === 'image'
                                        ? '🖼 Imagem'
                                        : '🎬 Vídeo'}
                                </td>
                                <td>
                                    {ad.placement === 'top'
                                        ? '⬆ Topo'
                                        : '⬇ Rodapé'}
                                </td>
                                <td>
                                    {ad.is_active ? (
                                        <span className={styles.active}>
                                            Ativo
                                        </span>
                                    ) : (
                                        <span className={styles.inactive}>
                                            Inativo
                                        </span>
                                    )}
                                </td>
                                <td className={styles.owner}>
                                    {ad.personal_id
                                        ? `Personal`
                                        : 'Admin (global)'}
                                </td>
                                <td>
                                    <div className={styles.actions}>
                                        <button
                                            onClick={() => openEdit(ad)}
                                            className={styles.btnEdit}
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(ad.id)}
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
                                    ? 'Editar Anúncio'
                                    : 'Novo Anúncio Global'}
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
                                <label className={styles.label}>Tipo</label>
                                <select
                                    className={styles.input}
                                    value={form.type}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            type: e.target.value as
                                                | 'image'
                                                | 'video',
                                        })
                                    }
                                >
                                    <option value="image">Imagem</option>
                                    <option value="video">Vídeo</option>
                                </select>
                            </div>

                            <div className={styles.row}>
                                <label className={styles.label}>Posição</label>
                                <select
                                    className={styles.input}
                                    value={form.placement}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            placement: e.target.value as
                                                | 'top'
                                                | 'bottom',
                                        })
                                    }
                                >
                                    <option value="top">Topo (80px)</option>
                                    <option value="bottom">
                                        Rodapé sticky (80px)
                                    </option>
                                </select>
                            </div>

                            <div className={styles.row}>
                                <label className={styles.label}>
                                    URL da mídia *
                                </label>
                                <input
                                    type="url"
                                    className={styles.input}
                                    placeholder="https://..."
                                    value={form.url}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            url: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>

                            <div className={styles.row}>
                                <label className={styles.label}>Título *</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="Nome do anúncio"
                                    value={form.title}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            title: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>

                            <div className={styles.row}>
                                <label className={styles.label}>
                                    Descrição
                                </label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="Opcional"
                                    value={form.description}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            description: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className={styles.row}>
                                <label className={styles.label}>
                                    Link de destino
                                </label>
                                <input
                                    type="url"
                                    className={styles.input}
                                    placeholder="https://... (opcional)"
                                    value={form.link}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            link: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className={styles.checkRow}>
                                <input
                                    type="checkbox"
                                    id="adm_is_active"
                                    checked={form.is_active}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            is_active: e.target.checked,
                                        })
                                    }
                                />
                                <label htmlFor="adm_is_active">
                                    Anúncio ativo
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
