'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Api } from '@/libs/api';
import { useRouter } from 'next/navigation';

interface UserData {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    cpf?: string;
    role?: string;
}

export default function MinhaContaPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserData>({});
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState('');
    const [exportError, setExportError] = useState('');
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState('');
    const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });

    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (!stored) {
            router.push('/');
            return;
        }
        setUser(JSON.parse(stored));
    }, [router]);

    const handleDeleteAccount = async () => {
        setLoading(true);
        setError('');
        try {
            await Api.delete('/me');
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            router.push('/');
        } catch {
            setError('Erro ao excluir conta. Tente novamente.');
            setLoading(false);
        }
    };

    const handleStartEdit = () => {
        setEditForm({
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
        });
        setEditError('');
        setEditing(true);
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        setEditError('');
        try {
            const res = await Api.patch('/me', {
                name: editForm.name,
                email: editForm.email,
                phone: editForm.phone,
            });
            const updatedUser = { ...user, ...res.data };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setEditing(false);
        } catch (err: unknown) {
            const status = (
                err as { response?: { status?: number } } | undefined
            )?.response?.status;
            if (status === 409) {
                setEditError('Este e-mail já está em uso por outra conta.');
            } else if (status === 400) {
                setEditError('Dados inválidos. Verifique os campos e tente novamente.');
            } else {
                setEditError('Erro ao salvar suas informações. Tente novamente.');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleExportData = async () => {
        setExporting(true);
        setExportError('');
        try {
            const res = await Api.get('/me/export', { responseType: 'blob' });
            const blob = new Blob([res.data], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'meus-dados-venafit.json';
            link.click();
            URL.revokeObjectURL(link.href);
        } catch {
            setExportError('Erro ao baixar seus dados. Tente novamente.');
        } finally {
            setExporting(false);
        }
    };

    const homeRoute = user.role === 'personal' ? '/personal' : '/meus-treinos';

    return (
        <>
            <div className="container py-5" style={{ maxWidth: 600 }}>
                <button
                    className="btn btn-outline-secondary btn-sm mb-4"
                    onClick={() => router.push(homeRoute)}
                >
                    ← Voltar
                </button>
                <h1 className="mb-1 fw-bold">Minha Conta</h1>
                <p className="text-secondary mb-4">
                    Gerencie os dados da sua conta. Veja também nossa{' '}
                    <Link href="/politica-privacidade">
                        Política de Privacidade
                    </Link>
                    .
                </p>

                {/* Dados do perfil — retificação (Art. 18, III LGPD) */}
                <div className="card mb-4">
                    <div className="card-header fw-semibold d-flex justify-content-between align-items-center">
                        Informações pessoais
                        {!editing && (
                            <button
                                className="btn btn-outline-secondary btn-sm"
                                onClick={handleStartEdit}
                            >
                                Editar
                            </button>
                        )}
                    </div>
                    {!editing ? (
                        <ul className="list-group list-group-flush">
                            <li className="list-group-item d-flex justify-content-between">
                                <span className="text-secondary">Nome</span>
                                <span>{user.name || '—'}</span>
                            </li>
                            <li className="list-group-item d-flex justify-content-between">
                                <span className="text-secondary">E-mail</span>
                                <span>{user.email || '—'}</span>
                            </li>
                            <li className="list-group-item d-flex justify-content-between">
                                <span className="text-secondary">Telefone</span>
                                <span>{user.phone || '—'}</span>
                            </li>
                            <li className="list-group-item d-flex justify-content-between">
                                <span className="text-secondary">CPF</span>
                                <span>{user.cpf || '—'}</span>
                            </li>
                        </ul>
                    ) : (
                        <div className="card-body">
                            {editError && (
                                <div className="alert alert-danger py-2">
                                    {editError}
                                </div>
                            )}
                            <div className="mb-3">
                                <label
                                    htmlFor="edit-name"
                                    className="form-label text-secondary"
                                >
                                    Nome
                                </label>
                                <input
                                    id="edit-name"
                                    className="form-control"
                                    value={editForm.name}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            name: e.target.value,
                                        })
                                    }
                                    disabled={saving}
                                />
                            </div>
                            <div className="mb-3">
                                <label
                                    htmlFor="edit-email"
                                    className="form-label text-secondary"
                                >
                                    E-mail
                                </label>
                                <input
                                    id="edit-email"
                                    type="email"
                                    className="form-control"
                                    value={editForm.email}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            email: e.target.value,
                                        })
                                    }
                                    disabled={saving}
                                />
                            </div>
                            <div className="mb-3">
                                <label
                                    htmlFor="edit-phone"
                                    className="form-label text-secondary"
                                >
                                    Telefone
                                </label>
                                <input
                                    id="edit-phone"
                                    className="form-control"
                                    value={editForm.phone}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            phone: e.target.value,
                                        })
                                    }
                                    disabled={saving}
                                />
                            </div>
                            <p
                                className="text-secondary mb-3"
                                style={{ fontSize: '0.8rem' }}
                            >
                                O CPF não pode ser alterado por aqui.
                            </p>
                            <div className="d-flex gap-2">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setEditing(false)}
                                    disabled={saving}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSaveProfile}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" />
                                            Salvando...
                                        </>
                                    ) : (
                                        'Salvar'
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Portabilidade de dados (Art. 18, V LGPD) */}
                <div className="card mb-4">
                    <div className="card-header fw-semibold">Meus dados</div>
                    <div className="card-body">
                        <p
                            className="text-secondary mb-3"
                            style={{ fontSize: '0.9rem' }}
                        >
                            Baixe uma cópia de todos os seus dados pessoais
                            (perfil, anamnese, histórico de treinos e
                            assinatura), conforme a LGPD.
                        </p>
                        {exportError && (
                            <div className="alert alert-danger py-2">
                                {exportError}
                            </div>
                        )}
                        <button
                            className="btn btn-outline-primary"
                            onClick={handleExportData}
                            disabled={exporting}
                        >
                            {exporting ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" />
                                    Baixando...
                                </>
                            ) : (
                                'Baixar meus dados'
                            )}
                        </button>
                    </div>
                </div>

                {/* Zona de perigo */}
                <div className="card border-danger">
                    <div className="card-header text-danger fw-semibold">
                        Zona de perigo
                    </div>
                    <div className="card-body">
                        <p
                            className="text-secondary mb-3"
                            style={{ fontSize: '0.9rem' }}
                        >
                            Ao excluir sua conta, todos os seus dados pessoais
                            serão anonimizados permanentemente conforme a LGPD.
                            Esta ação não pode ser desfeita.
                        </p>
                        <button
                            className="btn btn-outline-danger"
                            onClick={() => setShowConfirm(true)}
                        >
                            Excluir minha conta
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal de confirmação */}
            {showConfirm && (
                <div
                    className="modal d-block"
                    tabIndex={-1}
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header border-danger">
                                <h5 className="modal-title text-danger">
                                    Confirmar exclusão
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowConfirm(false)}
                                    disabled={loading}
                                />
                            </div>
                            <div className="modal-body">
                                <p>
                                    Tem certeza que deseja excluir sua conta?{' '}
                                    <strong>Esta ação é irreversível.</strong>
                                </p>
                                <p
                                    className="text-secondary"
                                    style={{ fontSize: '0.875rem' }}
                                >
                                    Seus dados pessoais serão anonimizados
                                    conforme a LGPD.
                                </p>
                                {error && (
                                    <div className="alert alert-danger py-2">
                                        {error}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowConfirm(false)}
                                    disabled={loading}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="btn btn-danger"
                                    onClick={handleDeleteAccount}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" />
                                            Excluindo...
                                        </>
                                    ) : (
                                        'Sim, excluir minha conta'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
