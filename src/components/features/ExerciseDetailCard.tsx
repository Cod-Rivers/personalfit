'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ExerciseLog, ExercicioIndividual } from './types';
import styles from './ExerciseDetailCard.module.css';
import { FaEdit } from 'react-icons/fa';
import ProtectedVideo from '@/components/molecules/ProtectedVideo';
import { saveExerciseNotes, saveExerciseWeight } from '@/app/utils/api';

interface ExerciseDetailCardProps {
    exercise: ExerciseLog | ExercicioIndividual;
    trainingId: string;
    onClose?: () => void;
}

const isExerciseLog = (
    exercise: ExerciseLog | ExercicioIndividual,
): exercise is ExerciseLog => {
    return (
        'series' in exercise && Array.isArray((exercise as ExerciseLog).series)
    );
};

const getVideoId = (url: string): string | null => {
    console.log('[getVideoId] URL original recebida:', url);
    if (!url) {
        console.log('[getVideoId] URL está vazia, retornando null.');
        return null;
    }

    // If it's already just a video ID or filename, return it directly
    if (!url.includes('/') && !url.includes('http')) {
        console.log('[getVideoId] Parece ser um ID direto:', url);
        return url;
    }

    // Extract filename from path
    const filename = url.split('/').pop();
    if (filename) {
        console.log('[getVideoId] ID extraído do caminho:', filename);
        return filename;
    }

    console.log('[getVideoId] Usando URL original como ID:', url);
    return url;
};

const ExerciseDetailCard: React.FC<ExerciseDetailCardProps> = ({
    exercise,
    trainingId,
    onClose,
}) => {
    const exerciseLog = isExerciseLog(exercise) ? exercise : null;
    const exerciseIndividual = !isExerciseLog(exercise)
        ? (exercise as ExercicioIndividual)
        : null;

    const [timerValue, setTimerValue] = useState<number>(
        exerciseLog?.restTime || 60,
    );
    const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
    const [userAnnotations, setUserAnnotations] = useState<string>(
        exerciseLog?.notes || '',
    );
    const [isWeightEditing, setIsWeightEditing] = useState<boolean>(false);
    const [weightValue, setWeightValue] = useState<number | string>(
        (exerciseLog?.weight || 0) > 0 ? exerciseLog?.weight || 0 : '',
    );
    const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);
    const [isSavingWeight, setIsSavingWeight] = useState<boolean>(false);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isTimerRunning && timerValue > 0) {
            interval = setInterval(() => {
                setTimerValue((prevTime) => prevTime - 1);
            }, 1000);
        } else if (timerValue === 0 && isTimerRunning) {
            setIsTimerRunning(false);
            alert('Tempo de descanso finalizado!');
        }
        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [isTimerRunning, timerValue]);

    useEffect(() => {
        setTimerValue(exerciseLog?.restTime || 60);
        setIsTimerRunning(false);
    }, [exerciseLog?.restTime, exercise]);

    const handleStartTimer = useCallback(() => {
        if (timerValue > 0) {
            setIsTimerRunning(true);
        }
    }, [timerValue]);

    const handlePauseTimer = useCallback(() => {
        setIsTimerRunning(false);
    }, []);

    const handleResetTimer = useCallback(() => {
        setIsTimerRunning(false);
        setTimerValue(exerciseLog?.restTime || 60);
    }, [exerciseLog?.restTime]);

    const formatTime = (timeInSeconds: number): string => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = timeInSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleAnnotationsChange = (
        e: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
        setUserAnnotations(e.target.value);
    };

    const handleSaveAnnotations = async () => {
        if (!exerciseLog?.id) {
            alert('Exercícios de dor não suportam anotações no momento.');
            return;
        }

        console.log('[handleSaveAnnotations] Iniciando salvamento:', {
            trainingId,
            exerciseId: exerciseLog.id,
            notesLength: userAnnotations.length,
            exerciseLogCompleto: exerciseLog,
        });

        setIsSavingNotes(true);

        const result = await saveExerciseNotes(
            trainingId,
            exerciseLog.id,
            userAnnotations,
        );

        setIsSavingNotes(false);

        console.log('[handleSaveAnnotations] Resultado:', result);

        if (result.success) {
            alert(result.message || 'Anotações salvas com sucesso!');
            // Atualizar os dados locais
            exerciseLog.notes = userAnnotations;
        } else {
            alert(
                'Erro ao salvar anotações: ' +
                    (result.error || 'Erro desconhecido'),
            );
        }
    };

    if (!exercise) return null;

    const exerciseName =
        exerciseLog?.name || exerciseIndividual?.nome || 'Unknown';
    const videoUrl =
        exerciseLog?.video_url || exerciseIndividual?.video_url || '';
    const embedUrl = getVideoId(videoUrl);

    console.log(
        '[ExerciseDetailCard] Renderizando para o exercício:',
        exerciseName,
    );
    console.log('[ExerciseDetailCard] video_url do exercício:', videoUrl);
    console.log('[ExerciseDetailCard] videoId calculado:', embedUrl);
    console.log(
        '[ExerciseDetailCard] Exercício completo:',
        JSON.stringify(exercise, null, 2),
    );

    const handleWeightEditStart = () => {
        setIsWeightEditing(true);
    };

    const handleWeightEditEnd = async () => {
        setIsWeightEditing(false);

        if (!exerciseLog?.id) {
            console.log('Exercício sem ID - não é possível salvar peso');
            return;
        }

        const numericWeight = Number(weightValue);

        // Validar peso
        if (isNaN(numericWeight) || numericWeight < 0) {
            alert('Por favor, insira um peso válido (maior ou igual a 0)');
            setWeightValue(exerciseLog?.weight || 0);
            return;
        }

        console.log('[handleWeightEditEnd] Iniciando salvamento:', {
            trainingId,
            exerciseId: exerciseLog.id,
            weight: numericWeight,
            exerciseLogCompleto: exerciseLog,
        });

        // Salvar peso no backend
        setIsSavingWeight(true);

        const result = await saveExerciseWeight(
            trainingId,
            exerciseLog.id,
            numericWeight,
        );

        setIsSavingWeight(false);

        console.log('[handleWeightEditEnd] Resultado:', result);

        if (result.success) {
            console.log('Peso salvo com sucesso:', numericWeight);
            // Atualizar dados locais
            if (exerciseLog) {
                exerciseLog.weight = numericWeight;
            }
        } else {
            alert(
                'Erro ao salvar peso: ' + (result.error || 'Erro desconhecido'),
            );
            // Reverter para valor anterior em caso de erro
            setWeightValue(exerciseLog?.weight || 0);
        }
    };

    const handleWeightKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>,
    ) => {
        if (event.key === 'Enter') {
            handleWeightEditEnd();
        }
    };

    return (
        <>
            <div className={styles.modalOverlay}>
                <div>
                    {/* Video Section - Show when video exists */}
                    {embedUrl && (
                        <div className={styles.videoSection}>
                            <ProtectedVideo
                                videoId={embedUrl}
                                title={`Vídeo demonstrativo - ${exerciseName}`}
                                className={styles.verticalVideo}
                            />
                        </div>
                    )}

                    {/* Placeholder when no video */}
                    {!embedUrl && (
                        <div
                            className={styles.videoSection}
                            style={{ minHeight: '200px' }}
                        >
                            <div className="text-center text-light">
                                <i
                                    className="fa-solid fa-video fa-3x mb-3"
                                    style={{ opacity: 0.3 }}
                                ></i>
                                <p style={{ opacity: 0.7 }}>
                                    Vídeo não disponível
                                </p>
                            </div>
                        </div>
                    )}

                    <div className={styles.modalCard}>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className={`${styles.closeButton || styles.closeButtonBottom} ${styles.closeButtonTopRight}`}
                                aria-label="Fechar detalhes do exercício"
                            >
                                ×
                            </button>
                        )}
                        <h2 className={styles.exerciseTitle}>
                            {exerciseLog?.name || exerciseIndividual?.nome}
                        </h2>
                        {exerciseIndividual && exerciseIndividual.descricao && (
                            <p className="text-center text-gray-600 mb-3">
                                {exerciseIndividual.descricao}
                            </p>
                        )}
                        <div className={styles.contentLayout}>
                            <div className={styles.detailsSection}>
                                {exerciseLog && (
                                    <div className={styles.detailRow}>
                                        <div className={styles.repet}>
                                            <strong>Repetições:</strong>{' '}
                                            <div className={styles.valueBox}>
                                                <span>
                                                    {exerciseLog.series.join(
                                                        ' - ',
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <strong>Peso (KG):</strong>{' '}
                                            {isWeightEditing ? (
                                                <input
                                                    type="number"
                                                    className={styles.valueBox}
                                                    value={weightValue}
                                                    onChange={(e) =>
                                                        setWeightValue(
                                                            e.target.value,
                                                        )
                                                    }
                                                    onBlur={handleWeightEditEnd}
                                                    onKeyDown={
                                                        handleWeightKeyDown
                                                    }
                                                />
                                            ) : (
                                                <span
                                                    className={styles.valueBox}
                                                    onClick={
                                                        handleWeightEditStart
                                                    }
                                                >
                                                    {weightValue !== ''
                                                        ? `${weightValue} kg`
                                                        : 'Peso'}
                                                    {}
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 24 24"
                                                        width="1em"
                                                        height="1em"
                                                        fill="currentColor"
                                                        className={
                                                            styles.editIcon
                                                        }
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            clipRule="evenodd"
                                                            d="M15.023 6.27l1.707 1.707-8.486 8.485-1.707-1.707 8.486-8.485zM13.5 4a1.5 1.5 0 011.06.44l6 6a1.5 1.5 0 010 2.12l-6 6a1.5 1.5 0 01-2.12 0l-6-6a1.5 1.5 0 010-2.12l6-6A1.5 1.5 0 0113.5 4zm-1.06 2.44l-6 6a.5.5 0 00.707.707L13.5 7.14a.5.5 0 00-.707-.707z"
                                                        />
                                                    </svg>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {exerciseLog && (
                                    <div className={styles.detailRow}>
                                        <p>
                                            <strong>Variações:</strong>{' '}
                                            {exerciseLog.variations || 'N/A'}
                                        </p>
                                    </div>
                                )}
                                {exerciseLog?.timed && (
                                    <p className={styles.timedInfo}>
                                        Controlado por tempo
                                    </p>
                                )}
                                {/* Video is now shown directly in the modal above */}
                                {}
                                {exerciseLog?.notes && (
                                    <div className={styles.notesSection}>
                                        <p>
                                            <strong>Observações:</strong>
                                        </p>
                                        <p>{exerciseLog.notes}</p>
                                    </div>
                                )}
                                {}
                                {exerciseLog && (
                                    <div
                                        className={
                                            styles.userAnnotationsSection
                                        }
                                    >
                                        <p>
                                            <strong>Minhas Anotações:</strong>
                                        </p>
                                        <textarea
                                            value={userAnnotations}
                                            onChange={handleAnnotationsChange}
                                            className={
                                                styles.userAnnotationsInput
                                            }
                                            placeholder="Adicione suas anotações aqui..."
                                            disabled={isSavingNotes}
                                        />
                                        <button
                                            onClick={handleSaveAnnotations}
                                            className={
                                                styles.saveAnnotationsButton
                                            }
                                            disabled={isSavingNotes}
                                        >
                                            {isSavingNotes
                                                ? 'Salvando...'
                                                : 'Salvar Anotação'}
                                        </button>
                                    </div>
                                )}
                                {}
                                {exerciseLog && exerciseLog.restTime > 0 && (
                                    <div className={styles.restTimerSection}>
                                        <div className={styles.timerDisplay}>
                                            {formatTime(timerValue)}
                                            <p>
                                                <strong>
                                                    (descanso entre exercicios)
                                                </strong>{' '}
                                            </p>
                                        </div>
                                        <div className={styles.timerControls}>
                                            {!isTimerRunning &&
                                                timerValue > 0 && (
                                                    <button
                                                        onClick={
                                                            handleStartTimer
                                                        }
                                                        className={
                                                            styles.timerButton
                                                        }
                                                    >
                                                        Iniciar
                                                    </button>
                                                )}
                                            {isTimerRunning && (
                                                <button
                                                    onClick={handlePauseTimer}
                                                    className={
                                                        styles.timerButton
                                                    }
                                                >
                                                    Pausar
                                                </button>
                                            )}
                                            <button
                                                onClick={handleResetTimer}
                                                className={styles.timerButton}
                                            >
                                                Resetar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ExerciseDetailCard;
