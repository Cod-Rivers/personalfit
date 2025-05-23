// src/app/treinamento/[id]/page.tsx
'use client';

import React, { useEffect, useState, use } from 'react';
import TrainingProtocolList from '../../../components/TrainingProtocolList'; // Ajuste o caminho
//import Header from '@/components/organism/Header';
import {
    TrainingCardProps,
    ProtocolListPageParams,
    ApiResponse, // Usado pela função importada e por processProtocolData
    // User, ApiTrainingProgress, ExerciseLog não são mais diretamente definidos/usados aqui
    // se ApiResponse os encapsula corretamente e getProtocolDataById retorna ApiResponse.
} from '../../../components/types'; // Ajuste o caminho

// MODIFICADO: Importar a nova função de busca de dados do protocolo
import { getProtocolDataById } from '../../../libs/mockProtocolData'; // Ajuste o caminho!

// Função de processamento de dados local (poderia estar em um utilitário)
function processProtocolData(
    protocolId: string, // Usado para o número do protocolo, pode ser o `id` da URL
    apiData: ApiResponse, // Recebe o ApiResponse completo
): { protocolNumber: number; trainings: TrainingCardProps[] } {
    // Tenta converter o protocolId para número ou usa o ID do usuário como fallback
    const protocolNumber =
        parseInt(protocolId, 10) ||
        (apiData.user && parseInt(apiData.user.id.replace('user', ''), 10)) ||
        1;

    const trainingsForCards: TrainingCardProps[] =
        apiData.trainings_progress.map((tp) => ({
            id: tp.training_id, // Este é o trainingId para a URL
            label: tp.reference,
        }));
    return { protocolNumber, trainings: trainingsForCards };
}

export default function ProtocolPage({
    params: paramsPromise,
}: {
    params: Promise<ProtocolListPageParams> | ProtocolListPageParams;
}) {
    const actualParams = use(paramsPromise);
    const { id: protocolRouteId } = actualParams; // Este é o protocolId da URL

    const [protocolData, setProtocolData] = useState<{
        protocolNumber: number;
        trainings: TrainingCardProps[];
    } | null>(null);
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted) {
            return;
        }

        if (typeof protocolRouteId !== 'string' || !protocolRouteId) {
            setError('ID do protocolo inválido ou não fornecido.');
            setLoadingInitial(false);
            return;
        }

        // MODIFICADO: Função fetchData agora usa getProtocolDataById
        async function fetchData() {
            setLoadingInitial(true);
            setError(null);
            try {
                // Busca os dados do protocolo do arquivo mockado separado
                const apiResponse = await getProtocolDataById(protocolRouteId);

                if (!apiResponse) {
                    // Trata o caso onde o protocolo não é encontrado no mock
                    setError(
                        `Protocolo com ID "${protocolRouteId}" não encontrado.`,
                    );
                    setProtocolData(null); // Garante que não há dados de protocolo
                    // Não precisa de 'return' aqui, o finally cuidará do setLoadingInitial
                } else {
                    // Processa os dados se encontrados
                    const processedData = processProtocolData(
                        protocolRouteId,
                        apiResponse,
                    );
                    setProtocolData(processedData);
                }
            } catch (e) {
                const err = e as Error;
                console.error(
                    'Falha ao buscar ou processar dados do protocolo:',
                    err,
                );
                setError(`Não foi possível carregar os dados: ${err.message}`);
            } finally {
                setLoadingInitial(false);
            }
        }

        fetchData();
    }, [protocolRouteId, isMounted]); // Dependências do useEffect

    if (!isMounted || loadingInitial) {
        return (
            <div className="p-6 text-center">
                Carregando treinos do protocolo...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center text-red-600">Erro: {error}</div>
        );
    }

    // A verificação de protocolData também cobre o caso de protocolo não encontrado
    if (!protocolData || protocolData.trainings.length === 0) {
        return (
            <div className="p-6 text-center text-gray-600">
                Nenhum treino encontrado para este protocolo ({protocolRouteId}
                ).
            </div>
        );
    }

    return (
        /* <>
            <Header />*/
        <TrainingProtocolList
            protocolId={protocolRouteId}
            protocolNumber={protocolData.protocolNumber}
            trainings={protocolData.trainings}
        />
        /* </>*/
    );
}
