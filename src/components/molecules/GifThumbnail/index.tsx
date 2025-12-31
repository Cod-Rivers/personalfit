'use client';

import React from 'react';

interface GifThumbnailProps {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    freezeAtSeconds?: number; // Mantém para compatibilidade, mas não é usado
    style?: React.CSSProperties;
    onError?: () => void;
}

/**
 * Componente que exibe um GIF animado como thumbnail
 */
export default function GifThumbnail({
    src,
    alt,
    width = 80,
    height = 80,
    style,
    onError,
}: GifThumbnailProps) {
    return (
        <img
            src={src}
            alt={alt}
            style={{
                width: `${width}px`,
                height: `${height}px`,
                objectFit: 'cover',
                ...style,
            }}
            loading="lazy"
            onError={() => {
                if (onError) onError();
            }}
        />
    );
}
