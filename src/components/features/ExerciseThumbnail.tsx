'use client';

import React, { useState } from 'react';
import { isSupportedExternalVideoUrl } from '@/libs/exerciseVideoService';

interface ExerciseThumbnailProps {
    name: string;
    videoThumb?: string;
    videoUrl?: string;
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
    /** Captura um frame do vídeo (t=1s) quando não há video_thumb salvo. Desative
     * em listas longas (ex.: picker da biblioteca inteira) para evitar montar
     * um <video> por item. */
    captureFrame?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

const PLACEHOLDER_BG = '#1a1a2e';

/** Thumbnail padrão de exercício: sempre reserva o mesmo espaço, com a mesma
 * cadeia de fallback (imagem salva → frame do vídeo → ícone), usado em toda
 * lista/card de exercício do app (aluno e personal). */
export default function ExerciseThumbnail({
    name,
    videoThumb,
    videoUrl,
    width = 60,
    height = 60,
    borderRadius = 8,
    captureFrame = true,
    className,
    style,
}: ExerciseThumbnailProps) {
    const [imgFailed, setImgFailed] = useState(false);

    const box: React.CSSProperties = {
        width,
        height,
        borderRadius,
        flexShrink: 0,
        ...style,
    };

    const hasHttpThumb =
        !!videoThumb && videoThumb.startsWith('http') && !imgFailed;

    if (hasHttpThumb) {
        return (
            <img
                src={videoThumb}
                alt={`Thumbnail para ${name}`}
                className={className}
                style={{ ...box, objectFit: 'cover', background: '#e2e8f0' }}
                onError={() => setImgFailed(true)}
            />
        );
    }

    // Frame do vídeo só é viável para arquivo hospedado direto (R2/CDN); links
    // do YouTube/Vimeo/TikTok/Instagram não tocam via <video src>.
    const canGrabFrame =
        captureFrame && !!videoUrl && !isSupportedExternalVideoUrl(videoUrl);

    if (canGrabFrame) {
        return (
            <video
                src={videoUrl}
                muted
                playsInline
                preload="metadata"
                onLoadedMetadata={(e) => {
                    e.currentTarget.currentTime = 1;
                }}
                className={className}
                style={{ ...box, objectFit: 'cover', background: '#000' }}
            />
        );
    }

    return (
        <div
            className={className}
            style={{
                ...box,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: PLACEHOLDER_BG,
                fontSize:
                    typeof width === 'number' && typeof height === 'number'
                        ? Math.round(Math.min(width, height) * 0.4)
                        : 32,
            }}
            aria-hidden="true"
        >
            {videoUrl ? '🎬' : '🏋️'}
        </div>
    );
}
