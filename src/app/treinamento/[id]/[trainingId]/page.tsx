// src/app/treinamento/[id]/[trainingId]/page.tsx
'use client'; // NECESSÁRIO para interatividade e estado do cliente

import React, { useEffect, useState, use } from 'react'; // 'use' para 'use(paramsPromise)'
import Link from 'next/link';
import { getExercisesByTrainingId } from '../../../../libs/mockExercise'; // Ajuste o caminho!
import { ExerciseLog } from '../../../../components/features/types'; // Ajuste o caminho!
import ExerciseDetailCard from '../../../../components/features/ExerciseDetailCard'; // Ajuste o caminho!
import styles from './TrainingPage.module.css';
import ImageComponent from 'next/image';
import weightIcon from './../../../../../public/assets/icons/weight-icon.png';
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
                    <div className={styles.Title}>
                        <ImageComponent
                            className={styles.myImageInTitle}
                            src={weightIcon} // Aqui você usa a variável importada diretamente
                            alt="This is a weight image"
                            width={30} // Defina a largura real da sua imagem ou a largura desejada
                            height={30} // Defina a altura real da sua imagem ou a altura desejada
                        />

                        <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                            Meus treinos de{' '}
                            <span className="text-indigo-600">
                                {trainingId.toUpperCase()}
                            </span>
                        </h1>
                    </div>
                    <p className="text-lg text-gray-600 mt-1">
                        Clique em um exercício para ver os detalhes.
                    </p>
                </div>
                {exercises.length > 0 ? (
                    <ul className={`${styles.exerciseListContainer} space-y-3`}>
                        {exercises.map((exercise, index) => (
                            <li key={exercise.id}>
                                <button
                                    onClick={() =>
                                        handleExerciseClick(exercise)
                                    }
                                    className={`${styles.cardButton} ${styles.exerciseItemContainer}`}
                                >
                                    <div className="flex items-center">
                                        {exercise.video_thumb && ( // Renderiza a imagem apenas se video_thumb existir
                                            <img
                                                src={exercise.video_thumb}
                                                alt={`Thumbnail para ${exercise.name}`}
                                                className={
                                                    styles.exerciseThumbnail
                                                } // Nova classe para a thumbnail
                                            />
                                        )}

                                        <span className="text-xl font-semibold text-gray-700 flex-grow">
                                            {exercise.name}
                                        </span>
                                    </div>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className={styles.cardIcon}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        aria-hidden="true" // Ícone é decorativo
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 5l7 7-7 7" // Seta para a direita
                                        />
                                    </svg>
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
