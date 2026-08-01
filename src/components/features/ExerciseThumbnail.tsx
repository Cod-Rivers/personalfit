'use client';

import React, { useState } from 'react';
import {
    isSupportedExternalVideoUrl,
    isVideoExtension,
} from '@/libs/exerciseVideoService';
import { useLazyVideoThumbnail } from '@/hooks/useLazyVideoThumbnail';

interface ExerciseThumbnailProps {
    name: string;
    videoThumb?: string;
    videoUrl?: string;
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
    /** Captura um frame do vídeo (t=1s) imediatamente ao montar, quando não há
     * video_thumb salvo. Desative em listas longas (ex.: picker da biblioteca
     * inteira) para evitar montar um <video> por item de uma vez — use
     * `lazyCapture` nesse caso. */
    captureFrame?: boolean;
    /** Alternativa a captureFrame para listas longas: só captura o frame
     * quando o item entra na viewport, e guarda o resultado em cache local
     * (IndexedDB) pra não recapturar toda vez que a lista reabre. Ignorado se
     * captureFrame estiver ligado (o modo eager já resolve sem precisar dele). */
    lazyCapture?: boolean;
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
    lazyCapture = false,
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

    // video_thumb às vezes é literalmente o arquivo de vídeo (dado legado da
    // migração GIF→MP4, que nunca gerou uma imagem estática separada) — um
    // <img src="....mp4"> nunca carrega. Tratar como "sem thumbnail salva" em
    // vez de deixar isso falhar via onError evita um request condenado ao
    // fracasso antes de cair no fallback certo.
    const hasHttpThumb =
        !!videoThumb &&
        videoThumb.startsWith('http') &&
        !isVideoExtension(videoThumb) &&
        !imgFailed;

    // Frame do vídeo só é viável para arquivo hospedado direto (R2/CDN); links
    // do YouTube/Vimeo/TikTok/Instagram não tocam via <video src>.
    const canUseVideoUrl =
        !!videoUrl && !isSupportedExternalVideoUrl(videoUrl);

    // Hook precisa rodar sempre, antes de qualquer return — mas só ativa a
    // captura de fato quando ainda falta thumbnail (nem imagem salva nem
    // eager ligado); passar undefined desliga o efeito sem violar as regras
    // de hooks.
    const wantsLazyCapture =
        lazyCapture && !hasHttpThumb && !captureFrame && canUseVideoUrl;
    const { ref: lazyRef, objectUrl: lazyThumbUrl } = useLazyVideoThumbnail(
        wantsLazyCapture ? videoUrl : undefined,
    );

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

    if (lazyThumbUrl) {
        return (
            <img
                src={lazyThumbUrl}
                alt={`Thumbnail para ${name}`}
                className={className}
                style={{ ...box, objectFit: 'cover', background: '#000' }}
            />
        );
    }

    if (captureFrame && canUseVideoUrl) {
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
            // Alvo observado pelo IntersectionObserver do lazyCapture: enquanto
            // nada mais pode ser mostrado, este placeholder é o que existe na
            // tela pra disparar a captura assim que entrar em vista.
            ref={wantsLazyCapture ? lazyRef : undefined}
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
