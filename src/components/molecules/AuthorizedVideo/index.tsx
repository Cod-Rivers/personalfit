'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './AuthorizedVideo.module.css';

interface AuthorizedVideoProps {
  videoId: string;
  title?: string;
  className?: string;
  onError?: (error: string) => void;
}

const AuthorizedVideo: React.FC<AuthorizedVideoProps> = ({
  videoId,
  title = 'Vídeo do exercício',
  className = '',
  onError
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadVideo = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Token de autorização não encontrado');
        }

        // Use our proxy endpoint
        const proxyUrl = `/api/video/${videoId}`;

        // Test if the video is accessible
        const response = await fetch(proxyUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Erro ao carregar vídeo: ${response.status}`);
        }

        // Create a blob URL for the video
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        onError?.(errorMessage);
        console.error('Erro ao carregar vídeo:', err);
      } finally {
        setLoading(false);
      }
    };

    if (videoId) {
      loadVideo();
    }

    // Cleanup blob URL on unmount
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoId, onError]);

  if (loading) {
    return (
      <div className={`${styles.videoContainer} ${className}`}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Carregando vídeo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.videoContainer} ${className}`}>
        <div className={styles.error}>
          <p>❌ {error}</p>
          <button
            onClick={() => window.location.reload()}
            className={styles.retryButton}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.videoContainer} ${className}`}>
      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          title={title}
          controls
          className={styles.video}
          preload="metadata"
        >
          Seu navegador não suporta o elemento de vídeo.
        </video>
      )}
    </div>
  );
};

export default AuthorizedVideo;
