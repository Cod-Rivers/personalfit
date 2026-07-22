'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ExerciseLog } from './types';
import styles from './ExerciseDetailCard.module.css';
import Modal from '@/components/system/Modal';
import {
    isVideoExtension,
    isInstagramUrl,
    isTikTokUrl,
} from '@/libs/exerciseVideoService';

interface ExerciseDetailCardProps {
    exercise: ExerciseLog;
    onClose?: () => void;
}

const getEmbedUrl = (url: string): string | null => {
    if (!url) return null;

    let videoId: string | undefined;
    if (
        url.includes('youtube.com/watch') ||
        url.includes('youtu.be/') ||
        url.includes('youtube.com/shorts/')
    ) {
        if (url.includes('youtube.com/shorts/')) {
            videoId = url.split('/shorts/')[1]?.split('?')[0];
        } else if (url.includes('v=')) {
            videoId = url.split('v=')[1]?.split('&')[0];
        } else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1]?.split('?')[0];
        }
        return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }
    if (url.includes('vimeo.com/')) {
        videoId = url.split('vimeo.com/')[1]?.split('?')[0];
        return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
    }
    if (url.includes('tiktok.com/') && url.includes('/video/')) {
        videoId = url.split('/video/')[1]?.split(/[?/]/)[0];
        return videoId
            ? `https://www.tiktok.com/embed/v2/${videoId}`
            : null;
    }
    return null;
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
    const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(
        null,
    );
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
        if (exercise.video_url) {
            setIsVideoPlayerOpen(true);
        }
    };

    const handleCloseVideoPlayer = () => {
        setIsVideoPlayerOpen(false);
        setVideoAspectRatio(null);
    };

    const handleAnnotationsChange = (
        e: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
        // Função para atualizar as anotações
        setUserAnnotations(e.target.value);
    };

    const renderVideoModalContent = () => {
        if (!isVideoPlayerOpen) return null;

        // video_url já vem resolvido pela API como URL final pronta para tocar
        // (R2/CDN, ou link do YouTube/Vimeo/TikTok). embedUrl tem prioridade
        // quando aplicável; Instagram (e TikTok com link curto) só redireciona.
        const playUrl =
            embedUrl || isExternalRedirectOnly
                ? ''
                : exercise.video_url || '';

        if (isExternalRedirectOnly) {
            const platform = isInstagramUrl(exercise.video_url || '')
                ? 'Instagram'
                : 'TikTok';
            return (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: '#ccc', marginBottom: '1rem' }}>
                        Este vídeo está hospedado no {platform}.
                    </p>
                    <a
                        href={exercise.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                    >
                        Ver no {platform} ↗
                    </a>
                </div>
            );
        }

        if (playUrl) {
            return (
                <div
                    className={styles.videoPlayerContainer}
                    style={
                        videoAspectRatio != null
                            ? {
                                  paddingBottom: 0,
                                  height: 'auto',
                              }
                            : undefined
                    }
                >
                    {isVideoExtension(playUrl) ? (
                        <video
                            src={playUrl}
                            controls
                            autoPlay
                            muted
                            loop
                            playsInline
                            className={styles.videoIframe}
                            onLoadedMetadata={(e) => {
                                const { videoWidth, videoHeight } =
                                    e.currentTarget;
                                if (videoWidth && videoHeight) {
                                    setVideoAspectRatio(
                                        videoWidth / videoHeight,
                                    );
                                }
                            }}
                            style={
                                videoAspectRatio != null
                                    ? {
                                          position: 'static',
                                          width: '100%',
                                          height: 'auto',
                                          maxHeight: '72vh',
                                          objectFit: 'contain',
                                          display: 'block',
                                      }
                                    : undefined
                            }
                        />
                    ) : (
                        <img
                            src={playUrl}
                            alt={exercise.name}
                            className={styles.videoIframe}
                            style={{ objectFit: 'contain' }}
                        />
                    )}
                </div>
            );
        }
        // Caso 2: YouTube / Vimeo
        if (embedUrl) {
            return (
                <div className={styles.videoPlayerContainer}>
                    <iframe
                        src={embedUrl}
                        title={`Vídeo para ${exercise.name}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className={styles.videoIframe}
                    ></iframe>
                </div>
            );
        }
        return null;
    };

    const handleSaveAnnotations = () => {
        // TODO: persistir 'userAnnotations' no backend.
        alert('Anotações salvas!');
    };

    // --- Lógica de Renderização ---
    if (!exercise) return null;

    const embedUrl = getEmbedUrl(exercise.video_url || '');
    // Instagram nunca é embutido; TikTok cai aqui quando o link é curto
    // (vm.tiktok.com) e não dá pra extrair o ID do vídeo para o embed.
    const isExternalRedirectOnly =
        !embedUrl &&
        !!exercise.video_url &&
        (isInstagramUrl(exercise.video_url) ||
            isTikTokUrl(exercise.video_url));
    //função de alteração da carga
    const handleWeightEditStart = () => {
        setIsWeightEditing(true);
    };

    const handleWeightEditEnd = () => {
        setIsWeightEditing(false);
        // TODO: persistir o novo valor do peso no backend.
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
            {/* Modal Principal do Exercício */}
            <Modal
                open={!!exercise}
                onClose={onClose ?? (() => {})}
                title={exercise.name}
            >
                <div>
                    <div className={styles.thumbnailImage}>
                        {exercise.video_thumb ? (
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
                                        onError={(e) => {
                                            (
                                                e.target as HTMLImageElement
                                            ).style.display = 'none';
                                        }}
                                    />
                                </div>
                            </div>
                        ) : exercise.video_url && isExternalRedirectOnly ? (
                            <div className={styles.thumbnailSection}>
                                <div
                                    onClick={handleOpenVideoPlayer}
                                    className={styles.thumbnailLink}
                                    style={{
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: '#1a1a2e',
                                        borderRadius: 8,
                                        fontSize: 28,
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ')
                                            handleOpenVideoPlayer();
                                    }}
                                >
                                    {isInstagramUrl(exercise.video_url)
                                        ? '📷'
                                        : '🎵'}
                                </div>
                            </div>
                        ) : exercise.video_url && !embedUrl ? (
                            <div className={styles.thumbnailSection}>
                                <div
                                    onClick={handleOpenVideoPlayer}
                                    className={styles.thumbnailLink}
                                    style={{
                                        cursor: 'pointer',
                                        position: 'relative',
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ')
                                            handleOpenVideoPlayer();
                                    }}
                                >
                                    <video
                                        src={exercise.video_url}
                                        autoPlay
                                        muted
                                        loop
                                        playsInline
                                        className={styles.thumbnailImage}
                                        style={{
                                            display: 'block',
                                            borderRadius: 8,
                                            objectFit: 'cover',
                                        }}
                                    />
                                    <div
                                        style={{
                                            position: 'absolute',
                                            bottom: 6,
                                            right: 8,
                                            background: 'rgba(0,0,0,0.55)',
                                            borderRadius: 4,
                                            padding: '2px 6px',
                                            fontSize: 11,
                                            color: '#fff',
                                            pointerEvents: 'none',
                                        }}
                                    >
                                        ▶ ver completo
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                    <div className={styles.modalCard}>
                        <div className={styles.contentLayout}>
                            <div className={styles.detailsSection}>
                                <div className={styles.detailRow}>
                                    <div className={styles.repet}>
                                        <strong>Repetições:</strong>{' '}
                                        <div className={styles.valueBox}>
                                            <span>
                                                {exercise.series_label
                                                    ? exercise.series_label
                                                    : exercise.timed
                                                      ? exercise.series
                                                            .map((s) => `${s}s`)
                                                            .join(' - ')
                                                      : exercise.series.join(
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
                                {exercise.video_url &&
                                    !exercise.video_thumb && (
                                        <p>
                                            <strong>Vídeo:</strong>{' '}
                                            <a
                                                href="#" // Poderia também abrir o player interno
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleOpenVideoPlayer();
                                                }}
                                                className={
                                                    styles.watchVideoLink
                                                }
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
                                {/* Instruções do personal trainer (campo comments) */}
                                {exercise.comments && (
                                    <div className={styles.notesSection}>
                                        <p>
                                            <strong>
                                                Instruções do Personal:
                                            </strong>
                                        </p>
                                        <p>{exercise.comments}</p>
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
                                        Salvar
                                    </button>
                                </div>
                                {/* Tempo de Descanso e Cronômetro */}
                                {(exercise.restTime ?? 0) > 0 && (
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
            </Modal>

            {/* Modal do Player de Vídeo */}
            <Modal open={isVideoPlayerOpen} onClose={handleCloseVideoPlayer}>
                {renderVideoModalContent()}
            </Modal>
        </>
    );
};

export default ExerciseDetailCard;
