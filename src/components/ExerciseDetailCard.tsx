'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ExerciseLog } from './types';
import styles from './ExerciseDetailCard.module.css';
import { FaEdit } from 'react-icons/fa';

interface ExerciseDetailCardProps {
    exercise: ExerciseLog;
    onClose?: () => void;
}

const getEmbedUrl = (url: string): string | null => {
    console.log('[getEmbedUrl] URL original recebida:', url);
    if (!url) {
        console.log('[getEmbedUrl] URL está vazia, retornando null.');
        return null;
    }
    let videoId;
    // Condição para URLs do YouTube (incluindo as que vêm via googleusercontent)
    if (
        url.includes('youtube.com/watch?v=') ||
        url.includes('youtu.be/') ||
        url.includes('youtu.be/')
    ) {
        if (url.includes('v=')) {
            // Formato padrão com v=VIDEO_ID
            videoId = url.split('v=')[1]?.split('&')[0];
        } else if (url.includes('youtu.be/')) {
            // Formato youtu.be/VIDEO_ID
            videoId = url.split('youtu.be/')[1]?.split('?')[0];
        } else if (url.includes('youtu.be/')) {
            // Formato específico googleusercontent sem v=
            videoId = url.split('youtu.be/')[1]?.split('?')[0];
        }
        // Se um videoId foi extraído, formata para a URL de embed padrão do YouTube
        const result = videoId
            ? `https://www.youtube.com/embed/${videoId}` // FORMATO PADRÃO YOUTUBE EMBED
            : url; // Retorna a URL original se não conseguir extrair o ID
        console.log(
            '[getEmbedUrl] YouTube ID:',
            videoId,
            'Resultado (YouTube Embed):',
            result,
        );
        return result;
    } else if (url.includes('vimeo.com/')) {
        videoId = url.split('vimeo.com/')[1]?.split('?')[0];
        const result = videoId
            ? `https://player.vimeo.com/video/${videoId}` // Formato padrão Vimeo embed
            : url;
        console.log(
            '[getEmbedUrl] Vimeo ID:',
            videoId,
            'Resultado (Vimeo Embed):',
            result,
        );
        return result;
    }
    console.warn(
        '[getEmbedUrl] URL de vídeo não suportada para embed direto ou ID não extraído:',
        url,
    );
    return url; // Retorna a URL original como fallback
};

const ExerciseDetailCard: React.FC<ExerciseDetailCardProps> = ({
    exercise,
    onClose,
}) => {
    // --- Estados ---
    const [timerValue, setTimerValue] = useState<number>(
        exercise.restTime || 60,
    );
    const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
    const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false);
    const [userAnnotations, setUserAnnotations] = useState<string>(''); // Novo estado para as anotações do usuário
    const [isWeightEditing, setIsWeightEditing] = useState<boolean>(false); // Novo estado para controlar a edição do peso
    const [weightValue, setWeightValue] = useState<number | string>(
        exercise.weight > 0 ? exercise.weight : '',
    ); // Novo estado para o valor do peso
    // --- Efeitos ---
    Racional: useEffect(() => {
        // Lógica do cronômetro
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
        // Resetar o cronômetro ao mudar de exercício
        setTimerValue(exercise.restTime || 60);
        setIsTimerRunning(false);
    }, [exercise.restTime, exercise.id]);

    // --- Funções de Callback e Auxiliares ---
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
        setTimerValue(exercise.restTime || 60);
    }, [exercise.restTime]);

    const formatTime = (timeInSeconds: number): string => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = timeInSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // --- Handlers de Eventos ---
    const handleOpenVideoPlayer = () => {
        console.log(
            '[handleOpenVideoPlayer] Clicou para abrir. video_url:',
            exercise.video_url,
        );
        if (exercise.video_url) {
            setIsVideoPlayerOpen(true);
            console.log(
                '[handleOpenVideoPlayer] isVideoPlayerOpen definido para true',
            );
        } else {
            console.log(
                '[handleOpenVideoPlayer] Nenhuma video_url encontrada.',
            );
        }
    };

    const handleCloseVideoPlayer = () => {
        console.log('[handleCloseVideoPlayer] Fechando player.');
        setIsVideoPlayerOpen(false);
    };

    const handleAnnotationsChange = (
        e: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
        // Função para atualizar as anotações
        setUserAnnotations(e.target.value);
    };

    const renderVideoModal = () => {
        if (isVideoPlayerOpen && embedUrl) {
            return (
                <div
                    className={styles.videoModalOverlay}
                    onClick={handleCloseVideoPlayer}
                >
                    <div
                        className={styles.videoModalCard}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={handleCloseVideoPlayer}
                            className={`${styles.closeButton || ''} ${styles.videoModalCloseButton || ''}`}
                            aria-label="Fechar player de vídeo"
                        >
                            ×
                        </button>
                        <div className={styles.videoPlayerContainer}>
                            <iframe
                                src={embedUrl} // embedUrl já estará no formato correto
                                title={`Vídeo para ${exercise.name}`}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className={styles.videoIframe}
                            ></iframe>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    const handleSaveAnnotations = () => {
        console.log('Anotações a serem salvas:', userAnnotations);
        // Aqui você adicionará a lógica para salvar 'userAnnotations' no banco de dados MongoDB
        // No momento, apenas estamos exibindo um log.
        alert('Anotações salvas!');
    };

    // --- Lógica de Renderização ---
    if (!exercise) return null;

    const embedUrl = getEmbedUrl(exercise.video_url || ''); // Agora usa a lógica atualizada
    console.log(
        '[ExerciseDetailCard] Renderizando para o exercício:',
        exercise?.name,
    );
    console.log(
        '[ExerciseDetailCard] video_url do exercício:',
        exercise?.video_url,
    );
    console.log('[ExerciseDetailCard] embedUrl calculada:', embedUrl);
    console.log(
        '[ExerciseDetailCard] isVideoPlayerOpen ATUAL:',
        isVideoPlayerOpen,
    );
    //fução de alteração da carga
    const handleWeightEditStart = () => {
        setIsWeightEditing(true);
    };

    const handleWeightEditEnd = () => {
        setIsWeightEditing(false);
        // Aqui você pode adicionar a lógica para salvar o novo valor do peso
        console.log('Peso atualizado para:', weightValue);
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
            {/* Overlay e Card Principal do Exercício */}
            <div className={styles.modalOverlay}>
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
                    <h2 className={styles.exerciseTitle}>{exercise.name}</h2>
                    <div className={styles.contentLayout}>
                        {exercise.video_thumb && (
                            <div className={styles.thumbnailSection}>
                                <div
                                    onClick={handleOpenVideoPlayer}
                                    className={styles.thumbnailLink}
                                    style={{
                                        cursor: exercise.video_url
                                            ? 'pointer'
                                            : 'default',
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ')
                                            handleOpenVideoPlayer();
                                    }}
                                >
                                    <img
                                        src={exercise.video_thumb}
                                        alt={`Ver vídeo para ${exercise.name}`}
                                        className={styles.thumbnailImage}
                                    />
                                </div>
                            </div>
                        )}
                        <div className={styles.detailsSection}>
                            <div className={styles.detailRow}>
                                <div className={styles.repet}>
                                    <strong>Repetições:</strong>{' '}
                                    <div className={styles.valueBox}>
                                        <span>
                                            {exercise.series.join(' - ')}
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
                                                setWeightValue(e.target.value)
                                            }
                                            onBlur={handleWeightEditEnd} // Salvar ao perder o foco
                                            onKeyDown={handleWeightKeyDown} // Salvar ao pressionar Enter
                                        />
                                    ) : (
                                        <span
                                            className={styles.valueBox}
                                            onClick={handleWeightEditStart}
                                        >
                                            {weightValue !== ''
                                                ? `${weightValue} kg`
                                                : 'Peso'}
                                            {/* Renderizar o ícone de edição aqui */}
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                width="1em"
                                                height="1em"
                                                fill="currentColor"
                                                className={styles.editIcon}
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
                            <div className={styles.detailRow}>
                                <p>
                                    <strong>Variações:</strong>{' '}
                                    {exercise.variations || 'N/A'}
                                </p>
                            </div>
                            {exercise.timed && (
                                <p className={styles.timedInfo}>
                                    Controlado por tempo
                                </p>
                            )}
                            {exercise.video_url && !exercise.video_thumb && (
                                <p>
                                    <strong>Vídeo:</strong>{' '}
                                    <a
                                        href="#" // Poderia também abrir o player interno
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleOpenVideoPlayer();
                                        }}
                                        className={styles.watchVideoLink}
                                    >
                                        Assistir exemplo
                                    </a>
                                </p>
                            )}
                            {/* Observações do Exercício (renomeado de Anotações) */}
                            {exercise.notes && (
                                <div className={styles.notesSection}>
                                    <p>
                                        <strong>Observações:</strong>
                                    </p>
                                    <p>{exercise.notes}</p>
                                </div>
                            )}
                            {/* Campo de Anotações do Usuário */}
                            <div className={styles.userAnnotationsSection}>
                                <p>
                                    <strong>Minhas Anotações:</strong>
                                </p>
                                <textarea
                                    value={userAnnotations}
                                    onChange={handleAnnotationsChange}
                                    className={styles.userAnnotationsInput}
                                    placeholder="Adicione suas anotações aqui..."
                                />
                                <button
                                    onClick={handleSaveAnnotations}
                                    className={styles.saveAnnotationsButton}
                                >
                                    Salvar Anotações
                                </button>
                            </div>
                            {/* Tempo de Descanso e Cronômetro */}
                            {exercise.restTime > 0 && (
                                <div className={styles.restTimerSection}>
                                    <p>
                                        <strong>Tempo de Descanso:</strong>{' '}
                                        {formatTime(exercise.restTime)}
                                    </p>
                                    <div className={styles.timerDisplay}>
                                        {formatTime(timerValue)}
                                    </div>
                                    <div className={styles.timerControls}>
                                        {!isTimerRunning && timerValue > 0 && (
                                            <button
                                                onClick={handleStartTimer}
                                                className={styles.timerButton}
                                            >
                                                Iniciar
                                            </button>
                                        )}
                                        {isTimerRunning && (
                                            <button
                                                onClick={handlePauseTimer}
                                                className={styles.timerButton}
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
                    {onClose && (
                        <div className="mt-6 text-right">
                            <button
                                onClick={onClose}
                                className={styles.closeButtonBottom}
                            >
                                Fechar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal do Player de Vídeo */}
            {renderVideoModal()}
        </>
    );
};

export default ExerciseDetailCard;
