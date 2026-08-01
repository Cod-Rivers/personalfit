'use client';

import { useEffect, useRef, useState } from 'react';
import { getOrCaptureThumbnail } from '@/libs/videoThumbnailCache';

/**
 * Thumbnail de vídeo capturada só quando o elemento entra na viewport, com o
 * resultado cacheado no dispositivo (ver videoThumbnailCache). Feito para
 * listas longas (seletor de exercícios, cards de biblioteca) onde montar um
 * <video> por item de uma vez — mesmo só pra extrair 1 frame — pode travar o
 * scroll num celular fraco.
 *
 * @param videoUrl undefined/vazio desliga o hook (sem vídeo pra capturar).
 * @returns `ref` — anexar ao elemento cuja visibilidade dispara a captura —
 * e `objectUrl`, pronto pra usar em `<img src>` assim que a captura terminar
 * (null enquanto fora de vista, carregando, ou se a captura falhou).
 */
export function useLazyVideoThumbnail(videoUrl: string | undefined): {
    ref: React.RefObject<HTMLDivElement | null>;
    objectUrl: string | null;
} {
    const ref = useRef<HTMLDivElement | null>(null);
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => {
        setObjectUrl(null);
        if (!videoUrl || typeof IntersectionObserver === 'undefined') return;

        const el = ref.current;
        if (!el) return;

        let cancelled = false;
        let createdUrl: string | null = null;

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some((e) => e.isIntersecting)) return;
                observer.disconnect();

                getOrCaptureThumbnail(videoUrl).then((blob) => {
                    if (cancelled || !blob) return;
                    createdUrl = URL.createObjectURL(blob);
                    setObjectUrl(createdUrl);
                });
            },
            // rootMargin pequeno: começa a capturar um pouco antes do item
            // ficar 100% visível, sem disparar pra tudo que existe na lista.
            { rootMargin: '200px' },
        );
        observer.observe(el);

        return () => {
            cancelled = true;
            observer.disconnect();
            if (createdUrl) URL.revokeObjectURL(createdUrl);
        };
    }, [videoUrl]);

    return { ref, objectUrl };
}
