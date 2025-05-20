// src/app/treinamento/[id]/[trainingId]/page.tsx
'use client'; // NECESSÁRIO para interatividade e estado do cliente

import React, { useEffect, useState, use } from 'react'; // 'use' para 'use(paramsPromise)'
import Link from 'next/link';
import { getExercisesByTrainingId } from '../../../../libs/mockExercise'; // Ajuste o caminho!
import { ExerciseLog } from '../../../../components/types'; // Ajuste o caminho!
import ExerciseDetailCard from '../../../../components/ExerciseDetailCard'; // Ajuste o caminho!
import styles from './TrainingPage.module.css';
import weight from './../../../../../public/assets/icons/weight-icon.png';
import Header from '@/components/organism/Header';
// Parâmetros da rota (ex: { id: string; trainingId: string; })
interface TrainingPageParams {
    id: string; // Representa o protocolId
    trainingId: string;
}

// Props da página, incluindo params que podem ser uma Promise
interface TrainingExercisesPageProps {
    params: Promise<TrainingPageParams> | TrainingPageParams;
}

export default function TrainingExercisesPage({
    params: paramsPromise,
}: TrainingExercisesPageProps) {
    // Resolve os parâmetros da rota (pode suspender se paramsPromise for uma Promise)
    const routeParams = use(paramsPromise);
    const { id: protocolId, trainingId } = routeParams;

    const [exercises, setExercises] = useState<ExerciseLog[]>([]);
    const [selectedExercise, setSelectedExercise] =
        useState<ExerciseLog | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // A busca de dados agora acontece no cliente após a montagem
        // ou quando trainingId mudar (se routeParams pudesse mudar dinamicamente, o que não é comum aqui).
        if (trainingId) {
            setIsLoading(true);
            setError(null);
            getExercisesByTrainingId(trainingId)
                .then((data) => {
                    setExercises(data);
                })
                .catch((err) => {
                    console.error('Erro ao buscar exercícios:', err);
                    setError('Não foi possível carregar os exercícios.');
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [trainingId]); // Dependência: re-fetch se trainingId mudar

    const handleExerciseClick = (exercise: ExerciseLog) => {
        setSelectedExercise(exercise);
    };

    const handleCloseDetailCard = () => {
        setSelectedExercise(null);
    };

    if (isLoading) {
        return <div className="p-6 text-center">Carregando exercícios...</div>;
    }

    if (error) {
        return (
            <div className="p-6 text-center text-red-600">Erro: {error}</div>
        );
    }

    return (
        <>
            <Header />
            <div className="container mx-auto p-4 sm:p-6 bg-gray-50 min-h-screen relative">
                {' '}
                {/* Adicionado relative para o modal */}
                <div className="mb-8">
                    <Link
                        href={`/treinamento/${protocolId}`}
                        className="text-blue-600 hover:text-blue-800 transition-colors duration-150 ease-in-out inline-flex items-center group"
                    >
                        <svg
                            className={styles.cardIcon}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M10 19l-7-7m0 0l7-7m-7 7h18"
                            ></path>
                        </svg>
                        Voltar para Treinos do Protocolo {protocolId}
                    </Link>
                    <div>
                        <img src="" alt="This is a wheght image" />
                    </div>
                    <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                        Meu treino de{' '}
                        <span className="text-indigo-600">
                            {trainingId.toUpperCase()}
                        </span>
                    </h1>
                    <p className="text-lg text-gray-600 mt-1">
                        Clique em um exercício para ver os detalhes.
                    </p>
                </div>
                {exercises.length > 0 ? (
                    <ul className="space-y-3">
                        {exercises.map((exercise, index) => (
                            <li key={exercise.id}>
                                <button
                                    onClick={() =>
                                        handleExerciseClick(exercise)
                                    }
                                    className={`${styles.cardButton} ${styles.exerciseItemContainer}`}
                                >
                                    {exercise.video_thumb && ( // Renderiza a imagem apenas se video_thumb existir
                                        <img
                                            src={exercise.video_thumb}
                                            alt={`Thumbnail para ${exercise.name}`}
                                            className={styles.exerciseThumbnail} // Nova classe para a thumbnail
                                        />
                                    )}
                                    <span className="text-xl font-semibold text-gray-700">
                                        {index + 1}. {exercise.name}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-12">
                        {/* ... SVG e mensagem de nenhum exercício ... (como antes) */}
                        <h3 className="mt-2 text-xl font-semibold text-gray-800">
                            Nenhum exercício encontrado
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Não há exercícios cadastrados para este treino (
                            {trainingId}).
                        </p>
                    </div>
                )}
                {/* Modal/Card de Detalhes do Exercício */}
                {selectedExercise && (
                    <ExerciseDetailCard
                        exercise={selectedExercise}
                        onClose={handleCloseDetailCard}
                    />
                )}
            </div>
        </>
    );
}
