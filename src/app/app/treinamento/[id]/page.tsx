'use client';
// Debug: logar exercícios de dor

import React, { useEffect, useState, use } from 'react';
import { getExercisesByTrainingId } from '../../../../libs/mockExercise';
import {
    ExerciseLog,
    ExerciciosDor,
    ExercicioIndividual,
    User,
} from '../../../../components/features/types';
import ExerciseDetailCard from '../../../../components/features/ExerciseDetailCard';
import styles from './TrainingPage.module.css';
import ImageComponent from 'next/image';
import weightIcon from './../../../../../public/assets/icons/weight-icon.png';
import Header from '@/components/organism/Header';
import BackButton from '@/components/molecules/BackButton';
import Image from 'next/image';
import { getGifUrl } from '@/libs/gifUtils';
import { normalizeExerciseGif } from '@/libs/exerciseGifMapping';
import GifThumbnail from '@/components/molecules/GifThumbnail';

interface TrainingPageParams {
    id: string;
}

interface TrainingExercisesPageProps {
    params: Promise<TrainingPageParams>;
}

function formatRestTime(seconds: number) {
    if (seconds < 60) {
        return `${seconds}s`;
    }
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return sec === 0 ? `${min} min` : `${min} min e ${sec}s`;
}

export default function TrainingExercisesPage({
    params: paramsPromise,
}: TrainingExercisesPageProps) {
    const routeParams = use(paramsPromise);
    const { id: protocolId } = routeParams;

    const [protocol, setProtocol] = useState<any>(null);
    const [exercises, setExercises] = useState<ExerciseLog[]>([]);
    const [selectedExercise, setSelectedExercise] =
        useState<ExerciseLog | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [exerciciosDor, setExerciciosDor] = useState<ExerciciosDor[]>([]);

    useEffect(() => {
        if (protocolId) {
            setIsLoading(true);
            setError(null);
            getExercisesByTrainingId(protocolId)
                .then((data) => {
                    setExercises(data?.exercise_logs as any);
                    setProtocol(data);
                })
                .catch((err) => {
                    console.error('Erro ao buscar exercícios:', err);
                    setError('Não foi possível carregar os exercícios.');
                })
                .finally(() => {
                    setIsLoading(false);
                });

            // Buscar exercícios de dor do usuário logado (localStorage)
            if (typeof window !== 'undefined') {
                const userString = localStorage.getItem('user');
                if (userString) {
                    try {
                        const user: any = JSON.parse(userString);
                        // Aceita snake_case e camelCase
                        const exDor =
                            user.exercicios_dor_selecionados ||
                            user.exerciciosDorSelecionados ||
                            [];
                        setExerciciosDor(exDor);
                    } catch {}
                }
            }
        }
    }, [protocolId]);

    const handleExerciseClick = (
        exercise: ExerciseLog | ExercicioIndividual,
    ) => {
        setSelectedExercise(exercise as ExerciseLog);
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
                <div className="mb-4">
                    <BackButton link="/app" label="Voltar" />
                </div>
                {/* Exercícios de dor recomendados */}
                {exerciciosDor && exerciciosDor.length > 0 && (
                    <div className="mb-6">
                        <div className={styles.Title}>
                            <ImageComponent
                                className={styles.myImageInTitle}
                                src={weightIcon}
                                alt="This is a weight image"
                                width={30}
                                height={30}
                            />
                            <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                                Exercícios recomendados para suas dores:
                            </h1>
                        </div>
                        {exerciciosDor.map((dorObj, dorIdx) => (
                            <ul
                                key={dorIdx}
                                className={`${styles.exerciseListContainer}`}
                            >
                                <h5 className="text-capitalize mb-3 text-lg font-semibold text-indigo-600">
                                    Dor: {dorObj.dor}
                                </h5>{' '}
                                {dorObj.exercicios?.map(
                                    (
                                        ex: ExercicioIndividual,
                                        exIdx: number,
                                    ) => {
                                        // Normalizar o exercício para garantir que o GIF correto seja usado
                                        const exerciseNormalized =
                                            normalizeExerciseGif(ex);
                                        return (
                                            <li
                                                key={`dor-${dorIdx}-ex-${exIdx}`}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleExerciseClick(
                                                            exerciseNormalized,
                                                        )
                                                    }
                                                    className={`${styles.cardButton} ${styles.exerciseItemContainer}`}
                                                >
                                                    <div
                                                        className={
                                                            styles.exerciseImg
                                                        }
                                                    >
                                                        {/* Thumbnail do GIF */}
                                                        {exerciseNormalized.video_url && (
                                                            <div
                                                                className="mr-3"
                                                                style={{
                                                                    flexShrink: 0,
                                                                }}
                                                            >
                                                                <GifThumbnail
                                                                    src={getGifUrl(
                                                                        exerciseNormalized.video_url,
                                                                    )}
                                                                    alt={
                                                                        exerciseNormalized.nome
                                                                    }
                                                                    width={80}
                                                                    height={80}
                                                                    freezeAtSeconds={
                                                                        1.5
                                                                    }
                                                                    style={{
                                                                        borderRadius:
                                                                            '8px',
                                                                    }}
                                                                    onError={() => {
                                                                        console.error(
                                                                            'Erro ao carregar GIF:',
                                                                            exerciseNormalized.video_url,
                                                                        );
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                        {/* Container de Informações */}
                                                        <div
                                                            className={
                                                                styles.exerciseInfoCol
                                                            }
                                                        >
                                                            <span className="h3 font-bold text-black text-start">
                                                                {
                                                                    exerciseNormalized.nome
                                                                }
                                                            </span>
                                                            <span className="h6 font-semibold text-black text-start">
                                                                {exerciseNormalized.descricao ||
                                                                    'Mobilidade e alongamento'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Ícone de Seta (conforme teu padrão) */}
                                                    <svg width="24" height="34" viewBox="0 0 24 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M9 9L18 17L9 25" stroke="#3eb489" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                </button>
                                            </li>
                                        );
                                    },
                                )}
                            </ul>
                        ))}
                    </div>
                )}
                <div className="mb-8">
                    <div className={styles.Title}>
                        <ImageComponent
                            className={styles.myImageInTitle}
                            src={weightIcon}
                            alt="This is a weight image"
                            width={30}
                            height={30}
                        />
                        <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                            Execicios do treino{' '}
                            <span className="text-indigo-600">
                                {protocol?.reference}
                            </span>
                        </h1>
                    </div>
                    <p className="text-lg text-gray-600 mt-1">
                        Clique em um exercício para ver os detalhes.
                    </p>
                </div>
                {exercises.length > 0 ? (
                    <ul className={`${styles.exerciseListContainer}`}>
                        {exercises.map((exercise, index) => (
                            <li key={exercise.id}>
                                <button
                                    onClick={() =>
                                        handleExerciseClick(exercise)
                                    }
                                    className={`${styles.cardButton} ${styles.exerciseItemContainer}`}
                                >
                                    <div className={styles.exerciseImg}>
                                        {/* Thumbnail do GIF */}
                                        {exercise.video_url && (
                                            <div
                                                className="mr-3"
                                                style={{ flexShrink: 0 }}
                                            >
                                                <GifThumbnail
                                                    src={getGifUrl(
                                                        exercise.video_url,
                                                    )}
                                                    alt={exercise.name}
                                                    width={80}
                                                    height={80}
                                                    freezeAtSeconds={1.5}
                                                    style={{
                                                        borderRadius: '8px',
                                                    }}
                                                    onError={() => {
                                                        console.error(
                                                            'Erro ao carregar GIF:',
                                                            exercise.video_url,
                                                        );
                                                    }}
                                                />
                                            </div>
                                        )}
                                        <div className={styles.exerciseInfoCol}>
                                            <span className="h3 font-bold text-black">
                                                {exercise.name}
                                            </span>
                                            <span className="h6 font-semibold text-black">
                                                {Array.isArray(exercise.series)
                                                    ? exercise.series.join(
                                                          ' / ',
                                                      ) + ' séries'
                                                    : exercise.series +
                                                      ' série'}
                                            </span>
                                            {exercise.timed && (
                                                <div className="d-flex gap-2">
                                                    <span className="text-sm text-black">
                                                        {formatRestTime(
                                                            exercise.restTime,
                                                        )}{' '}
                                                    </span>
                                                    <span className="text-sm font-semibold text-gray-700">
                                                        (de descanso)
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <svg width="24" height="34" viewBox="0 0 24 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9 9L18 17L9 25" stroke="#3eb489" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-12">
                        <h3 className="mt-2 text-xl font-semibold text-gray-800">
                            Nenhum exercício encontrado
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Não há exercícios cadastrados para este treino (
                            {protocolId}).
                        </p>
                    </div>
                )}
                {selectedExercise && (
                    <ExerciseDetailCard
                        exercise={selectedExercise}
                        trainingId={protocolId}
                        onClose={handleCloseDetailCard}
                    />
                )}
            </div>
        </>
    );
}
