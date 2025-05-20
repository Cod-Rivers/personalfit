// src/app/treinamento/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/organism/Header';
import TrainingCard from '../../components/TrainingCard';
import { ApiResponse, User } from '../../components/types';

// Importe a nova função
import { getProtocolsByUserId } from '../../libs/mockProtocolData2';

interface ProtocolListItem {
    id: string; // Este deve ser o ID real do protocolo (ex: "1", "outroProtocolo")
    label: string;
}

export default function UserProtocolsPage() {
    const [protocolsList, setProtocolsList] = useState<ProtocolListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted) {
            return;
        }

        async function fetchUserProtocols() {
            setLoading(true);
            setError(null);
            try {
                const userString = localStorage.getItem('user');
                const userToken = localStorage.getItem('token');

                if (!userString || !userToken) {
                    console.warn(
                        'Usuário não logado ou token ausente. Redirecionando...',
                    );
                    setError(
                        'Você precisa estar logado para ver seus protocolos.',
                    );
                    setLoading(false);
                    return;
                }

                const currentUser: User = JSON.parse(userString);
                console.log('Usuário logado:', currentUser);

                // *** Use a getProtocolsByUserId modificada ***
                const fetchedProtocolEntries = await getProtocolsByUserId(
                    currentUser.id,
                );
                console.log(
                    'Dados brutos dos protocolos recebidos:',
                    fetchedProtocolEntries,
                );

                const processedProtocols: ProtocolListItem[] =
                    fetchedProtocolEntries.map(({ protocolId, data }) => ({
                        id: protocolId, // Agora você tem o protocolId correto
                        label: `Protocolo de ${data.user.name}`,
                    }));

                setProtocolsList(processedProtocols);
                console.log(
                    'Lista de protocolos carregada:',
                    processedProtocols,
                );
            } catch (e) {
                const err = e as Error;
                console.error('Falha ao buscar protocolos do usuário:', err);
                setError(
                    `Não foi possível carregar seus protocolos: ${err.message}`,
                );
            } finally {
                setLoading(false);
            }
        }

        fetchUserProtocols();
    }, [isMounted]);

    if (loading) {
        return (
            <div className="p-6 text-center">Carregando seus protocolos...</div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center text-red-600">Erro: {error}</div>
        );
    }

    if (protocolsList.length === 0) {
        return (
            <div className="p-6 text-center text-gray-600">
                Nenhum protocolo disponível para você no momento.
            </div>
        );
    }

    return (
        <>
            <Header />
            <div className="container py-5 mx-auto">
                <h1 className="text-3xl font-bold mb-6 text-white">
                    Seus Protocolos de Treino:
                </h1>
                <div className="row g-4">
                    {protocolsList.map((protocol) => (
                        <div className="col-12 col-md-6" key={protocol.id}>
                            <Link href={`/treinamento/${protocol.id}`} passHref>
                                <TrainingCard
                                    id={protocol.id}
                                    label={protocol.label}
                                />
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
