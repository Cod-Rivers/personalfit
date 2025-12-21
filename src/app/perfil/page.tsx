'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/organism/Header';
import BackButton from '@/components/molecules/BackButton';
import Image from 'next/image';
import { Api } from '@/app/utils/api';
import './styles.css';

interface UserProfile {
    id: string;
    name: string;
    email: string;
    phone: string;
    cpf: string;
    active: boolean;
}

const ProfilePage: React.FC = () => {
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');

    useEffect(() => {
        // Carregar dados do usuário do localStorage
        setMounted(true);
        if (typeof window === 'undefined') return;

        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        } else {
            router.push('/');
        }
    }, [router]);

    const handleCancelSubscription = async () => {
        try {
            setLoading(true);
            setError('');
            setSuccess('');

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Token de autenticação não encontrado');
            }

            console.log('[ProfilePage] Cancelando assinatura...');

            // Endpoint correto: POST /user/cancel-subscribe
            const response = await Api.post(
                '/user/cancel-subscribe',
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            console.log('[ProfilePage] Assinatura cancelada:', response.data);

            // Atualizar status do usuário localmente
            if (user) {
                const updatedUser = { ...user, active: false };
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
            }

            setSuccess('Assinatura cancelada com sucesso!');
            setShowCancelModal(false);
            router.push('/');
        } catch (error: any) {
            console.error('[ProfilePage] Erro ao cancelar assinatura:', error);

            let errorMessage = 'Erro ao cancelar assinatura. Tente novamente.';

            // Exibe mensagem detalhada do backend, se disponível
            if (error.response?.data) {
                if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                } else if (error.response.data.error) {
                    errorMessage = error.response.data.error;
                } else if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                } else {
                    errorMessage = JSON.stringify(error.response.data);
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <div className="spinner-border text-gold" role="status">
                    <span className="visually-hidden">Carregando...</span>
                </div>
            </div>
        );
    }

    return (
        <>
            <Header />
            <div className="profile-container">
                <div className="container py-5">
                    <div className="mb-4">
                        <BackButton link="/app" label="Voltar" />
                    </div>
                    <div className="row justify-content-center">
                        <div className="col-md-8 col-lg-6">
                            {/* Mensagem de Erro */}
                            {error && (
                                <div
                                    className="alert alert-danger alert-dismissible fade show mb-4"
                                    role="alert"
                                >
                                    <i className="fa-solid fa-exclamation-triangle me-2"></i>
                                    {error}
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => setError('')}
                                        aria-label="Close"
                                    ></button>
                                </div>
                            )}

                            {/* Mensagem de Sucesso */}
                            {success && (
                                <div
                                    className="alert alert-success alert-dismissible fade show mb-4"
                                    role="alert"
                                >
                                    <i className="fa-solid fa-check-circle me-2"></i>
                                    {success}
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => setSuccess('')}
                                        aria-label="Close"
                                    ></button>
                                </div>
                            )}

                            <div className="card profile-card">
                                <div className="card-header text-center bg-gold text-white">
                                    <div className="profile-avatar mb-3">
                                        <i className="fa-solid fa-user-circle fa-5x"></i>
                                    </div>
                                    <h2 className="h4 mb-0">Meu Perfil</h2>
                                </div>
                                <div className="card-body">
                                    <div className="profile-info">
                                        <div className="info-item">
                                            <label className="info-label">
                                                <i className="fa-solid fa-user me-2"></i>
                                                Nome:
                                            </label>
                                            <span className="info-value">
                                                {user.name}
                                            </span>
                                        </div>

                                        <div className="info-item">
                                            <label className="info-label">
                                                <i className="fa-solid fa-envelope me-2"></i>
                                                E-mail:
                                            </label>
                                            <span className="info-value">
                                                {user.email}
                                            </span>
                                        </div>

                                        <div className="info-item">
                                            <label className="info-label">
                                                <i className="fa-solid fa-phone me-2"></i>
                                                Telefone:
                                            </label>
                                            <span className="info-value">
                                                {user.phone}
                                            </span>
                                        </div>

                                        <div className="info-item">
                                            <label className="info-label">
                                                <i className="fa-solid fa-id-card me-2"></i>
                                                CPF:
                                            </label>
                                            <span className="info-value">
                                                {user.cpf}
                                            </span>
                                        </div>

                                        <div className="info-item">
                                            <label className="info-label">
                                                <i className="fa-solid fa-circle-check me-2"></i>
                                                Status:
                                            </label>
                                            <span
                                                className={`info-value badge ${user.active ? 'bg-success' : 'bg-warning'}`}
                                            >
                                                {user.active
                                                    ? 'Ativo'
                                                    : 'Inativo'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="profile-actions mt-4">
                                        <button
                                            className="btn btn-outline-danger w-100"
                                            onClick={() =>
                                                setShowCancelModal(true)
                                            }
                                            disabled={!user.active}
                                        >
                                            <i className="fa-solid fa-times-circle me-2"></i>
                                            Cancelar Assinatura
                                        </button>

                                        {!user.active && (
                                            <small className="text-muted d-block mt-2 text-center">
                                                Sua assinatura já está inativa
                                            </small>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Confirmação */}
            {showCancelModal && (
                <div className="modal fade show d-block" tabIndex={-1}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    Cancelar Assinatura
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowCancelModal(false)}
                                    disabled={loading}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="text-center">
                                    <i className="fa-solid fa-exclamation-triangle text-warning fa-3x mb-3"></i>
                                    <p className="mb-3">
                                        Tem certeza de que deseja cancelar sua
                                        assinatura?
                                    </p>
                                    <p className="text-muted small">
                                        Esta ação não pode ser desfeita e você
                                        perderá o acesso aos treinos.
                                    </p>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowCancelModal(false)}
                                    disabled={loading}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={handleCancelSubscription}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span
                                                className="spinner-border spinner-border-sm me-2"
                                                role="status"
                                            ></span>
                                            Processando...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-check me-2"></i>
                                            Confirmar Cancelamento
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal backdrop */}
            {showCancelModal && (
                <div className="modal-backdrop fade show"></div>
            )}
        </>
    );
};

export default ProfilePage;
