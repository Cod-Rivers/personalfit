// src/app/app/treino/[id]/page.tsx
'use client';

import React, { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import ExerciseDetailCard from '@/components/features/ExerciseDetailCard';
import ExerciseThumbnail from '@/components/features/ExerciseThumbnail';
import { ApiTrainingProgress, ExerciseLog } from '@/components/features/types';

interface TreinoPageParams {
    id: string; // ID do registro em trainings_progress (não o training_id do template)
}

interface TreinoPageProps {
    params: Promise<TreinoPageParams>;
}

export default function TreinoPage({ params: paramsPromise }: TreinoPageProps) {
    const { id } = use(paramsPromise);
    const router = useRouter();

    const [training, setTraining] = useState<ApiTrainingProgress | null>(
        null,
    );
    const [selectedExercise, setSelectedExercise] =
        useState<ExerciseLog | null>(null);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        const userRaw = localStorage.getItem('user');
        if (!userRaw || !localStorage.getItem('token')) {
            router.push('/');
            return;
        }

        const parsed = JSON.parse(userRaw);
        const trainingsProgress: ApiTrainingProgress[] =
            parsed.trainings_progress ?? [];
        const found = trainingsProgress.find((t) => t.id === id);

        if (!found) {
            setNotFound(true);
            return;
        }
        setTraining(found);
    }, [id, router]);

    // Próximo exercício do mesmo bloco de bi-set/triset/superset do
    // exercício aberto no detail card — troca o timer de descanso por um
    // atalho "sem descanso, siga direto" (ver ExerciseDetailCard).
    const nextInGroup = useMemo(() => {
        if (!selectedExercise || !training) return null;
        const exercises = training.exercise_logs;
        const idx = exercises.findIndex((e) => e.id === selectedExercise.id);
        if (idx === -1) return null;
        const next = exercises[idx + 1];
        if (
            next &&
            selectedExercise.group_id &&
            next.group_id === selectedExercise.group_id
        ) {
            return next;
        }
        return null;
    }, [training, selectedExercise]);

    if (notFound) {
        return (
            <div
                className="p-6 text-center"
                style={{ color: 'var(--text-secondary)' }}
            >
                <p>Treino não encontrado.</p>
                <button
                    className="btn btn-link"
                    onClick={() => router.push('/app')}
                >
                    ← Voltar para meus treinos
                </button>
            </div>
        );
    }

    if (!training) {
        return (
            <div
                className="p-6 text-center"
                style={{ color: 'var(--text-primary)' }}
            >
                Carregando treino...
            </div>
        );
    }

    return (
        <div className="container py-5">
            <button
                className="btn btn-outline-secondary btn-sm mb-3"
                onClick={() => router.push('/app')}
            >
                ← Voltar para Meus Treinos
            </button>
            <div className="d-flex align-items-center gap-3 mb-4">
                <Image
                    src="/assets/icons/weight-icon.png"
                    alt="logo"
                    width={40}
                    height={40}
                />
                <h1 className="mb-0">Treino {training.reference}</h1>
            </div>

            {training.exercise_logs.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>
                    Nenhum exercício cadastrado neste treino.
                </p>
            ) : (
                <ul className="list-unstyled d-flex flex-column gap-2">
                    {training.exercise_logs.map((exercise) => (
                        <li key={exercise.id}>
                            <button
                                onClick={() => setSelectedExercise(exercise)}
                                className="w-100 text-start rounded p-3 d-flex align-items-center"
                                style={{
                                    background: 'var(--surface-1)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-mid)',
                                }}
                            >
                                <ExerciseThumbnail
                                    name={exercise.name}
                                    videoThumb={exercise.video_thumb}
                                    videoUrl={exercise.video_url}
                                    style={{ marginRight: 16 }}
                                />
                                <span>
                                    <strong>{exercise.name}</strong>
                                    {exercise.series?.length > 0 && (
                                        <span
                                            className="ms-2"
                                            style={{
                                                color: 'var(--text-muted)',
                                            }}
                                        >
                                            {exercise.series.join(' - ')}
                                        </span>
                                    )}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {selectedExercise && (
                <ExerciseDetailCard
                    exercise={selectedExercise}
                    onClose={() => setSelectedExercise(null)}
                    nextInGroup={nextInGroup}
                    onSelectExercise={setSelectedExercise}
                />
            )}
        </div>
    );
}
