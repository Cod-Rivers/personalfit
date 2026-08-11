'use client';

/**
 * Recorte de imagem reutilizável: o usuário arrasta e dá zoom até enquadrar a
 * foto no quadro de visualização, e o que ele enquadra é exatamente o que a
 * tela final mostra.
 *
 * O quadro tem a MESMA proporção do lugar onde a imagem vai aparecer (capa,
 * avatar redondo, foto de resultado…), porque essas telas exibem tudo com
 * `object-fit: cover` — sem um recorte explícito, o navegador decide sozinho o
 * que cortar e a foto quase sempre fica com o enquadramento errado.
 *
 * O zoom tem três entradas para funcionar em qualquer aparelho: roda do mouse
 * (desktop), pinça de dois dedos (touch) e a barra deslizante (ambos, e é a
 * única descoberta por quem não conhece os gestos).
 *
 * A saída é um <canvas> já no tamanho final — o chamador decide se quer um
 * Blob (upload direto) ou uma data URI.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiMinus, FiPlus } from 'react-icons/fi';
import styles from './ImageCropper.module.css';

/** Caixa em que o quadro é inscrito, preservando a proporção pedida (px). */
const VIEW_MAX_W = 280;
const VIEW_MAX_H = 300;

/** Ampliação máxima sobre o mínimo que ainda cobre o quadro. */
const MAX_ZOOM = 5;

interface Props {
    /** Data URI da imagem escolhida (nunca uma URL remota: o canvas seria contaminado). */
    src: string;
    /** Proporção largura/altura do quadro. 1 = quadrado. */
    aspect?: number;
    /** Máscara circular no quadro — só um guia visual; a saída continua retangular. */
    round?: boolean;
    /** Largura do canvas de saída, em px. A altura sai da proporção. */
    outputWidth?: number;
    title?: string;
    /** Trava os botões enquanto o chamador processa a confirmação (upload). */
    busy?: boolean;
    onCancel: () => void;
    onConfirm: (canvas: HTMLCanvasElement) => void;
}

/** Impede que as bordas da imagem entrem no quadro ao arrastar. */
function clampOffset(
    x: number,
    y: number,
    scale: number,
    natural: { w: number; h: number },
    view: { w: number; h: number },
) {
    const maxX = Math.max(0, (natural.w * scale - view.w) / 2);
    const maxY = Math.max(0, (natural.h * scale - view.h) / 2);
    return {
        x: Math.max(-maxX, Math.min(maxX, x)),
        y: Math.max(-maxY, Math.min(maxY, y)),
    };
}

/** Distância entre dois toques — a base do gesto de pinça. */
function touchDistance(touches: React.TouchList) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
}

export default function ImageCropper({
    src,
    aspect = 1,
    round = false,
    outputWidth = 600,
    title = 'Posicionar imagem',
    busy = false,
    onCancel,
    onConfirm,
}: Props) {
    const [mounted, setMounted] = useState(false);
    const [natural, setNatural] = useState<{ w: number; h: number } | null>(
        null,
    );
    const [minScale, setMinScale] = useState(1);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    const imgRef = useRef<HTMLImageElement | null>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const dragging = useRef(false);
    const lastPoint = useRef({ x: 0, y: 0 });
    const pinch = useRef<{ distance: number; scale: number } | null>(null);

    // O quadro é inscrito na caixa máxima mantendo a proporção pedida: retratos
    // ficam limitados pela altura, paisagens pela largura.
    let viewW = VIEW_MAX_W;
    let viewH = VIEW_MAX_W / aspect;
    if (viewH > VIEW_MAX_H) {
        viewH = VIEW_MAX_H;
        viewW = VIEW_MAX_H * aspect;
    }
    const view = { w: Math.round(viewW), h: Math.round(viewH) };

    useEffect(() => setMounted(true), []);

    // Carrega a imagem aqui dentro para que o chamador só precise entregar a
    // data URI — o zoom mínimo depende das dimensões reais dela.
    useEffect(() => {
        const img = new Image();
        img.onload = () => {
            imgRef.current = img;
            const cover = Math.max(
                view.w / img.naturalWidth,
                view.h / img.naturalHeight,
            );
            setNatural({ w: img.naturalWidth, h: img.naturalHeight });
            setMinScale(cover);
            setScale(cover);
            setOffset({ x: 0, y: 0 });
        };
        img.src = src;
        // Recarregar a cada troca de imagem; as dimensões do quadro não mudam
        // durante a vida do componente.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);

    /** Aplica um novo zoom mantendo o enquadramento dentro dos limites. */
    const applyScale = useCallback(
        (next: number) => {
            if (!natural) return;
            const clamped = Math.max(
                minScale,
                Math.min(next, minScale * MAX_ZOOM),
            );
            setScale(clamped);
            setOffset((prev) =>
                clampOffset(prev.x, prev.y, clamped, natural, view),
            );
        },
        // view é recalculado a cada render mas é estável na prática (depende só
        // de `aspect`), e natural/minScale cobrem o resto.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [natural, minScale, view.w, view.h],
    );

    // Wheel precisa ser não-passivo para poder cancelar o scroll da página.
    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            applyScale(scale * (e.deltaY > 0 ? 0.93 : 1.07));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [applyScale, scale]);

    // Fechar com Esc é o reflexo de qualquer camada sobreposta.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !busy) onCancel();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [busy, onCancel]);

    const moveBy = (dx: number, dy: number) => {
        if (!natural) return;
        setOffset((prev) =>
            clampOffset(prev.x + dx, prev.y + dy, scale, natural, view),
        );
    };

    const onMouseDown = (e: React.MouseEvent) => {
        dragging.current = true;
        lastPoint.current = { x: e.clientX, y: e.clientY };
        e.preventDefault();
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!dragging.current) return;
        moveBy(e.clientX - lastPoint.current.x, e.clientY - lastPoint.current.y);
        lastPoint.current = { x: e.clientX, y: e.clientY };
    };

    const endDrag = () => {
        dragging.current = false;
        pinch.current = null;
    };

    const onTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            pinch.current = { distance: touchDistance(e.touches), scale };
            dragging.current = false;
            return;
        }
        dragging.current = true;
        lastPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && pinch.current) {
            const distance = touchDistance(e.touches);
            if (pinch.current.distance > 0) {
                applyScale(
                    (pinch.current.scale * distance) / pinch.current.distance,
                );
            }
            return;
        }
        if (!dragging.current) return;
        moveBy(
            e.touches[0].clientX - lastPoint.current.x,
            e.touches[0].clientY - lastPoint.current.y,
        );
        lastPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    /** Recorta a região visível do quadro no tamanho final e devolve o canvas. */
    const handleConfirm = () => {
        const img = imgRef.current;
        if (!img || !natural) return;

        // Região visível convertida para coordenadas naturais da imagem.
        const srcW = view.w / scale;
        const srcH = view.h / scale;
        const srcX = natural.w / 2 - offset.x / scale - srcW / 2;
        const srcY = natural.h / 2 - offset.y / scale - srcH / 2;

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(outputWidth);
        canvas.height = Math.round(outputWidth / aspect);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Fundo branco: a saída é JPEG, que não tem transparência — sem isto,
        // qualquer pixel não pintado (PNG com alfa) sairia preto.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
            img,
            srcX,
            srcY,
            srcW,
            srcH,
            0,
            0,
            canvas.width,
            canvas.height,
        );

        onConfirm(canvas);
    };

    if (!mounted) return null;

    const zoomPercent = minScale > 0 ? (scale / minScale - 1) / (MAX_ZOOM - 1) : 0;

    return createPortal(
        <div className={styles.overlay} role="dialog" aria-modal="true">
            <div className={styles.card}>
                <p className={styles.title}>{title}</p>
                <p className={styles.hint}>
                    Arraste para escolher o que aparece · use o zoom para
                    aproximar ou afastar
                </p>

                <div
                    ref={viewportRef}
                    className={`${styles.viewport} ${round ? styles.viewportRound : ''}`}
                    style={{ width: view.w, height: view.h }}
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={endDrag}
                    onMouseLeave={endDrag}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={endDrag}
                    onTouchCancel={endDrag}
                >
                    {natural && (
                        <img
                            src={src}
                            alt=""
                            draggable={false}
                            className={styles.img}
                            style={{
                                width: natural.w * scale,
                                height: natural.h * scale,
                                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                            }}
                        />
                    )}
                </div>

                <div className={styles.zoomRow}>
                    <button
                        type="button"
                        className={styles.zoomBtn}
                        aria-label="Diminuir zoom"
                        disabled={!natural || scale <= minScale}
                        onClick={() => applyScale(scale * 0.85)}
                    >
                        <FiMinus />
                    </button>
                    <input
                        type="range"
                        className={styles.zoomSlider}
                        aria-label="Zoom"
                        min={0}
                        max={100}
                        step={1}
                        value={Math.round(zoomPercent * 100)}
                        disabled={!natural}
                        onChange={(e) =>
                            applyScale(
                                minScale *
                                    (1 +
                                        (Number(e.target.value) / 100) *
                                            (MAX_ZOOM - 1)),
                            )
                        }
                    />
                    <button
                        type="button"
                        className={styles.zoomBtn}
                        aria-label="Aumentar zoom"
                        disabled={!natural || scale >= minScale * MAX_ZOOM}
                        onClick={() => applyScale(scale * 1.18)}
                    >
                        <FiPlus />
                    </button>
                </div>

                <div className={styles.actions}>
                    <button
                        type="button"
                        className={styles.cancel}
                        onClick={onCancel}
                        disabled={busy}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className={styles.save}
                        onClick={handleConfirm}
                        disabled={busy || !natural}
                    >
                        {busy ? 'Enviando…' : 'Aplicar'}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}

/** Converte o canvas do recorte em Blob JPEG, pronto para upload. */
export function cropCanvasToBlob(
    canvas: HTMLCanvasElement,
    quality = 0.85,
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) =>
                blob ? resolve(blob) : reject(new Error('Falha ao gerar a imagem')),
            'image/jpeg',
            quality,
        );
    });
}

/** Lê um arquivo escolhido como data URI — a entrada do recorte. */
export function fileToDataURI(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Falha ao ler o arquivo'));
        reader.readAsDataURL(file);
    });
}
