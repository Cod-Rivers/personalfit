'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/organism/Header';
import BackButton from '@/components/molecules/BackButton';
import TrainingCard from '@/components/features/TrainingCard';
import { useRouter } from 'next/navigation';
import {
    ApiResponse,
    User,
    ProtocolListItem,
} from '@/components/features/types';
import { Api } from '@/app/utils/api';

// Importe a nova função
import { getProtocolsByUserId } from '@/libs/mockProtocolData2';

/**
 * Converte quebras de linha (\n) em elementos <br /> para renderização HTML
 * @param text - Texto com quebras de linha
 * @returns Array de elementos React alternando texto e <br />
 */
function formatTextWithLineBreaks(text: string) {
    return text.split('\n').map((line, index, array) => (
        <React.Fragment key={index}>
            {line}
            {index < array.length - 1 && <br />}
        </React.Fragment>
    ));
}

export default function UserProtocolsPage() {
    const [protocolsList, setProtocolsList] = useState<ProtocolListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const router = useRouter();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted) {
            return;
        }

        async function fetchUserProtocols() {
            if (typeof window === 'undefined') return;

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
                    router.push('/app');
                    return;
                }

                // Buscar dados atualizados do backend (incluindo protocol_notes)
                try {
                    Api.defaults.headers.common['Authorization'] =
                        `Bearer ${userToken}`;
                    const { data: backendUser } = await Api.get<User>('/me');
                    console.log('✅ Dados do usuário do backend:', backendUser);
                    console.log(
                        '📝 Protocol Notes:',
                        backendUser.protocol_notes,
                    );
                    console.log(
                        '🔍 Protocol Notes existe?',
                        !!backendUser.protocol_notes,
                    );
                    console.log(
                        '📏 Protocol Notes length:',
                        backendUser.protocol_notes?.length,
                    );
                    setCurrentUser(backendUser);

                    // Atualizar localStorage com dados mais recentes
                    localStorage.setItem('user', JSON.stringify(backendUser));
                } catch (apiError) {
                    console.warn(
                        '❌ Erro ao buscar dados do backend, usando localStorage:',
                        apiError,
                    );
                    // Fallback para localStorage se a API falhar
                    const localUser: User = JSON.parse(userString);
                    console.log('💾 Usando dados do localStorage:', localUser);
                    setCurrentUser(localUser);
                }

                const currentUserData: User = JSON.parse(userString);
                const fetchedProtocolEntries = await getProtocolsByUserId(
                    currentUserData.id,
                );
                const processedProtocols: ProtocolListItem[] =
                    fetchedProtocolEntries.map(({ protocolId, data }) => ({
                        id: protocolId,
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
            <div className="container ml-auto mr-auto py-5 mx-auto ">
                <div className="mb-4">
                    <BackButton link="/app" label="Voltar" />
                </div>
                <h1 className="text-3xl font-bold mb-6 text-white">
                    Meus Protocolos de Treino:
                </h1>

                {/* DEBUG: Mostrar sempre para testar */}
                <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded text-sm text-black">
                    <strong>🔍 DEBUG:</strong> currentUser existe?{' '}
                    {currentUser ? 'SIM' : 'NÃO'} | protocol_notes existe?{' '}
                    {currentUser?.protocol_notes ? 'SIM' : 'NÃO'} | Valor:{' '}
                    {currentUser?.protocol_notes || '(vazio)'}
                </div>

                {/* Renderização condicional das observações do protocolo */}
                {currentUser?.protocol_notes && (
                    <div className="mt-6 mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-600 rounded-lg shadow-md">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                                {/* Ícone de informação */}
                                <svg
                                    className="w-6 h-6 text-indigo-600"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-base font-semibold text-indigo-900 mb-2">
                                    📋 Observações do Protocolo
                                </h3>
                                <p className="text-sm font-medium text-gray-800 leading-relaxed">
                                    {formatTextWithLineBreaks(
                                        currentUser.protocol_notes,
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-4">
                    {protocolsList.map((protocol) => (
                        <div className="mb-3" key={protocol.id}>
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
