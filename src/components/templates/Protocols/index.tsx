'use client';
import React, { useEffect, useState } from 'react';

import './styles.css';
import Image from 'next/image';
import { IProtocol } from './types';
import { useRouter } from 'next/navigation';
import { Api } from '@/libs/api';
import { useBranding } from '@/context/BrandingContext';

const TProtocols: React.FC = () => {
    const router = useRouter();
    const { personalName } = useBranding();
    const [trainings, setTrainings] = useState<IProtocol[]>([]);
    const [unlinking, setUnlinking] = useState(false);
    const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);

    const getTrainings = () => {
        const user = localStorage.getItem('user');
        if (!user) return;

        const parsed = JSON.parse(user);

        // Se aluno tem personal vinculado, redireciona para /meus-treinos
        if (parsed.has_personal) {
            router.replace('/meus-treinos');
            return;
        }

        const { trainings_progress } = parsed;
        setTrainings(trainings_progress ?? []);
    };

    const handleUnlink = async () => {
        setUnlinking(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            await Api.delete('/students/unlink', {
                headers: { Authorization: token },
            });
            setShowUnlinkConfirm(false);
            alert('Desvinculado com sucesso!');
        } catch {
            alert('Erro ao desvincular. Tente novamente.');
        } finally {
            setUnlinking(false);
        }
    };

    useEffect(getTrainings, [router]);
    return (
        <>
            <div className="container py-5">
                <div className="d-flex align-aitems-center gap-3">
                    <Image
                        src="/assets/icons/weight-icon.png"
                        alt="logo"
                        width={60}
                        height={24}
                        style={{
                            marginTop: '12px',
                            marginBottom: '20px',
                        }}
                    />
                    <h1>Meus treinos:</h1>
                </div>
                <div className="row g-4">
                    {trainings.map((protocol) => (
                        <div
                            className="col-12 col-md-6"
                            key={protocol.id}
                            style={{ minHeight: '50px' }}
                            onClick={() =>
                                router.push(`/app/treino/${protocol.id}`)
                            }
                        >
                            <div
                                className="protocol_card py-4 px-3 rounded"
                                style={{
                                    background: 'var(--surface-1)',
                                    color: 'var(--text-primary)',
                                }}
                            >
                                <div className="card-body w-25 me-4">
                                    <h3 className="card-title">
                                        {protocol.reference}
                                    </h3>
                                    <p className="card-text h5 fw-normal text-muted text-truncate w-100">
                                        {protocol.exercise_logs
                                            .map((exercise) => exercise.name)
                                            .join(', ')}
                                    </p>
                                </div>
                                <div className="card-footer">
                                    <Image
                                        src="/assets/icons/chevron-right.png"
                                        alt="logo"
                                        width={24}
                                        height={34}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Unlink section — só aparece quando o aluno realmente tem um
                personal vinculado (checagem fresca via /branding, não o
                has_personal em cache no localStorage). */}
            {personalName && (
                <div className="container py-4">
                    <div
                        className="p-3 rounded"
                        style={{
                            background: '#f8f9fa',
                            border: '1px solid #dee2e6',
                        }}
                    >
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <strong>Vínculo com Personal</strong>
                                <p
                                    className="mb-0 text-muted"
                                    style={{ fontSize: '0.9rem' }}
                                >
                                    Vinculado a: <strong>{personalName}</strong>
                                    . Você pode se desvincular a qualquer
                                    momento.
                                </p>
                            </div>
                            {showUnlinkConfirm ? (
                                <div className="d-flex gap-2">
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={() =>
                                            setShowUnlinkConfirm(false)
                                        }
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        className="btn btn-sm btn-danger"
                                        onClick={handleUnlink}
                                        disabled={unlinking}
                                    >
                                        {unlinking
                                            ? 'Desvinculando...'
                                            : 'Confirmar'}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => setShowUnlinkConfirm(true)}
                                >
                                    Desvincular
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default TProtocols;
