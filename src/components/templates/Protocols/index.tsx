'use client';
import Header from '@/components/organism/Header';
import ClientOnly from '@/components/molecules/ClientOnly';
import React, { useEffect, useState } from 'react';
import { Api } from '@/app/utils/api';

import './styles.css';
import Image from 'next/image';
import { IProtocol } from './interface';
import { useRouter } from 'next/navigation';

const TProtocols: React.FC = () => {
    const router = useRouter();
    const [trainings, setTrainings] = useState<IProtocol[]>([]);
    const [protocolNotes, setProtocolNotes] = useState<string>('');

    const getTrainings = async () => {
        if (typeof window === 'undefined') return;

        const user = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (!user) return;

        const { trainings_progress } = JSON.parse(user);
        setTrainings(trainings_progress);

        // Buscar protocol_notes do backend
        if (token) {
            try {
                Api.defaults.headers.common['Authorization'] =
                    `Bearer ${token}`;
                const { data } = await Api.get<any>('/me');
                if (data.protocol_notes) {
                    setProtocolNotes(data.protocol_notes);
                }
            } catch (error) {
                console.error(
                    'Erro ao buscar observações do protocolo:',
                    error,
                );
            }
        }
    };

    useEffect(() => {
        getTrainings();
    }, []);
    return (
        <>
            <Header />
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

                {protocolNotes && (
                    <div
                        className=" mb-4"
                        style={{
                            backgroundColor: '#ffff',
                            padding: '1rem',
                            borderRadius: '0.5rem',
                            color: '#1e293b',
                        }}
                    >
                        <div className="d-flex gap-2">
                            <div style={{ flexShrink: 0 }}>
                                <svg
                                    width="24"
                                    height="24"
                                    fill="#d18d26ff"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </div>
                            <div style={{ flex: 1 }}>
                                <h5
                                    className="fw-bold mb-2"
                                    style={{ color: '#312e81' }}
                                >
                                    📋 Observações do Protocolo
                                </h5>
                                <p
                                    className="mb-0"
                                    style={{
                                        whiteSpace: 'pre-wrap',
                                        lineHeight: '1.6',
                                    }}
                                >
                                    {protocolNotes}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <ClientOnly
                    fallback={
                        <div className="text-center py-4">
                            <div
                                className="spinner-border text-light"
                                role="status"
                            ></div>
                        </div>
                    }
                >
                    <div className="row g-4">
                        {trainings.map((protocol) => (
                            <div
                                className="col-12 col-md-6"
                                key={protocol.id}
                                style={{ minHeight: '50px' }}
                                onClick={() =>
                                    router.push(
                                        '/app/treinamento/' + protocol.id,
                                    )
                                }
                            >
                                <div className="protocol_card py-4 px-3 bg-white text-black rounded">
                                    <div className="card-body w-25 me-4">
                                        <h3 className="card-title">
                                            {protocol.reference}
                                        </h3>
                                        <p className="card-text h5 fw-normal text-muted text-truncate w-100">
                                            {protocol.exercise_logs
                                                .map(
                                                    (exercise) => exercise.name,
                                                )
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
                </ClientOnly>
            </div>
        </>
    );
};

export default TProtocols;
