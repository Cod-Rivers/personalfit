'use client';

import React, { useEffect, useState } from 'react';

interface ProtectedVideoProps {
    videoId: string;
    className?: string;
    title?: string;
}

const ProtectedVideo: React.FC<ProtectedVideoProps> = ({
    videoId,
    className = '',
    title = 'Exercise Video',
}) => {
    const [videoSrc, setVideoSrc] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [contentType, setContentType] = useState<string>('');
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8888';

    useEffect(() => {
        const loadVideo = async () => {
            try {
                setLoading(true);
                setError('');

                console.log(
                    '[ProtectedVideo] Iniciando carregamento para videoId:',
                    videoId,
                );

                if (!videoId) {
                    console.warn('[ProtectedVideo] videoId está vazio');
                    setError('ID do vídeo não fornecido');
                    setLoading(false);
                    return;
                }

                // Construir URL completa da GIF
                // Se videoId já contém o caminho completo (ex: "static/gifs/nome.gif"), usa direto
                // Senão, assume que é apenas o nome do arquivo
                let gifUrl: string;
                if (videoId.startsWith('static/')) {
                    gifUrl = `${API_BASE}/${videoId}`;
                } else if (videoId.startsWith('gifs/')) {
                    gifUrl = `${API_BASE}/static/${videoId}`;
                } else {
                    // Assume que é apenas o nome do arquivo
                    gifUrl = `${API_BASE}/static/gifs/${videoId}`;
                }

                console.log('[ProtectedVideo] URL da GIF construída:', gifUrl);

                // Detectar tipo de conteúdo pela extensão
                const isGif = videoId.toLowerCase().includes('.gif');
                setContentType(isGif ? 'image/gif' : 'video/mp4');
                setVideoSrc(gifUrl);

                console.log('[ProtectedVideo] GIF/Vídeo carregado com sucesso');
            } catch (err) {
                console.error('[ProtectedVideo] Erro ao carregar vídeo:', err);
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Erro ao carregar vídeo',
                );
            } finally {
                setLoading(false);
            }
        };

        loadVideo();

        return () => {
            // Não precisa revogar URL pois não estamos usando createObjectURL
        };
    }, [videoId, API_BASE]);

    if (loading) {
        return (
            <div
                className={`d-flex justify-content-center align-items-center ${className}`}
                style={{ minHeight: '200px' }}
            >
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Carregando vídeo...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div
                className={`d-flex justify-content-center align-items-center ${className}`}
                style={{ minHeight: '200px' }}
            >
                <div className="text-center text-danger">
                    <p>❌ {error}</p>
                    <small className="d-block mb-2">VideoId: {videoId}</small>
                    <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => window.location.reload()}
                    >
                        Tentar Novamente
                    </button>
                </div>
            </div>
        );
    }

    // Check if it's a GIF based on videoId, content type, or file extension
    const isGif =
        videoId.toLowerCase().includes('.gif') ||
        videoId.toLowerCase().endsWith('gif') ||
        contentType === 'image/gif';

    // Render GIFs as images for better performance and proper looping
    if (isGif) {
        return (
            <img
                src={videoSrc}
                alt={title}
                className={`${className}`}
                style={{
                    width: '100%',
                    maxHeight: '60vh',
                    minHeight: '300px',
                    aspectRatio: '9/16', // Vertical aspect ratio
                    objectFit: 'contain',
                    borderRadius: '8px',
                }}
                onLoad={() => {
                    console.log('[ProtectedVideo] ✅ GIF carregada:', videoSrc);
                }}
                onError={(e) => {
                    // Suprimir erro do console e mostrar mensagem amigável
                    e.preventDefault();
                    console.warn(
                        '[ProtectedVideo] ⚠️ GIF não disponível:',
                        videoSrc,
                    );
                    // Esconder a imagem quebrada
                    (e.target as HTMLImageElement).style.display = 'none';
                    // Criar placeholder amigável
                    const parent = (e.target as HTMLElement).parentElement;
                    if (
                        parent &&
                        !parent.querySelector('.gif-error-placeholder')
                    ) {
                        const placeholder = document.createElement('div');
                        placeholder.className =
                            'gif-error-placeholder d-flex justify-content-center align-items-center flex-column';
                        placeholder.style.minHeight = '300px';
                        placeholder.style.color = '#6c757d';
                        placeholder.innerHTML = `
                            <i class="fa-solid fa-image fa-3x mb-3" style="opacity: 0.3;"></i>
                            <p style="opacity: 0.7;">Demonstração em vídeo não disponível</p>
                        `;
                        parent.appendChild(placeholder);
                    }
                }}
            />
        );
    }

    // Render videos with controls
    return (
        <video
            src={videoSrc}
            controls
            playsInline
            className={`${className}`}
            title={title}
            style={{
                width: '100%',
                maxHeight: '60vh',
                minHeight: '300px',
                aspectRatio: '9/16', // Vertical aspect ratio
                objectFit: 'contain',
            }}
            onLoadedData={() => {
                console.log('[ProtectedVideo] ✅ Vídeo carregado:', videoSrc);
            }}
            onError={(e) => {
                // Suprimir erro do console e mostrar mensagem amigável
                e.preventDefault();
                console.warn(
                    '[ProtectedVideo] ⚠️ Vídeo não disponível:',
                    videoSrc,
                );
                // Esconder o vídeo quebrado
                (e.target as HTMLVideoElement).style.display = 'none';
                // Criar placeholder amigável
                const parent = (e.target as HTMLElement).parentElement;
                if (
                    parent &&
                    !parent.querySelector('.video-error-placeholder')
                ) {
                    const placeholder = document.createElement('div');
                    placeholder.className =
                        'video-error-placeholder d-flex justify-content-center align-items-center flex-column';
                    placeholder.style.minHeight = '300px';
                    placeholder.style.color = '#6c757d';
                    placeholder.innerHTML = `
                        <i class="fa-solid fa-video fa-3x mb-3" style="opacity: 0.3;"></i>
                        <p style="opacity: 0.7;">Demonstração em vídeo não disponível</p>
                    `;
                    parent.appendChild(placeholder);
                }
            }}
        >
            Seu navegador não suporta vídeos.
        </video>
    );
};

export default ProtectedVideo;
