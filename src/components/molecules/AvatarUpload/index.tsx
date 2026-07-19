'use client';
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { uploadAvatar } from '@/libs/avatarService';
import styles from './AvatarUpload.module.css';

interface Props {
    current?: string;
    name: string;
    size?: number;
    onUploaded?: (dataURI: string) => void;
    editable?: boolean;
}

const VIEWPORT = 280; // diâmetro do círculo no modal de recorte (px)
const OUTPUT_SIZE = 400; // tamanho do canvas de saída (px)

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('');
}

function fileToDataURI(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function clampOffset(
    ox: number,
    oy: number,
    sc: number,
    nw: number,
    nh: number,
) {
    const maxX = Math.max(0, (nw * sc - VIEWPORT) / 2);
    const maxY = Math.max(0, (nh * sc - VIEWPORT) / 2);
    return {
        x: Math.max(-maxX, Math.min(maxX, ox)),
        y: Math.max(-maxY, Math.min(maxY, oy)),
    };
}

export default function AvatarUpload({
    current,
    name,
    size = 64,
    onUploaded,
    editable = true,
}: Props) {
    const [mounted, setMounted] = useState(false);
    const [preview, setPreview] = useState<string | undefined>(current);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Crop modal state
    const [cropSrc, setCropSrc] = useState<string | null>(null);
    const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
    const [coverScale, setCoverScale] = useState(1);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    const isDragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });
    const inputRef = useRef<HTMLInputElement>(null);
    const cropViewportRef = useRef<HTMLDivElement>(null);

    // Garante que portais só renderizam no cliente
    useEffect(() => {
        setMounted(true);
    }, []);

    // Bloqueia scroll da página enquanto o modal está aberto
    useEffect(() => {
        if (cropSrc) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [cropSrc]);

    // Registra o listener de wheel como não-passivo para poder fazer preventDefault
    const handleWheel = useCallback(
        (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.93 : 1.07;
            setScale((prev) => {
                const next = Math.max(
                    coverScale,
                    Math.min(prev * delta, coverScale * 5),
                );
                setOffset((prevOff) =>
                    clampOffset(
                        prevOff.x,
                        prevOff.y,
                        next,
                        naturalSize.w,
                        naturalSize.h,
                    ),
                );
                return next;
            });
        },
        [coverScale, naturalSize],
    );

    useEffect(() => {
        const el = cropViewportRef.current;
        if (!el || !cropSrc) return;
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, [cropSrc, handleWheel]);

    // ── Seleção de arquivo ──────────────────────────────────────────────────
    async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.type)) {
            setError('Use jpg, png ou webp');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('Imagem muito grande (máx 10 MB)');
            return;
        }

        setError('');
        const uri = await fileToDataURI(file);

        const img = new Image();
        img.onload = () => {
            const nw = img.naturalWidth;
            const nh = img.naturalHeight;
            const cs = Math.max(VIEWPORT / nw, VIEWPORT / nh);
            setNaturalSize({ w: nw, h: nh });
            setCoverScale(cs);
            setScale(cs);
            setOffset({ x: 0, y: 0 });
            setCropSrc(uri);
        };
        img.src = uri;

        if (inputRef.current) inputRef.current.value = '';
    }

    // ── Drag (mouse) ────────────────────────────────────────────────────────
    function onMouseDown(e: React.MouseEvent) {
        isDragging.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
        e.preventDefault();
    }

    function onMouseMove(e: React.MouseEvent) {
        if (!isDragging.current) return;
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        lastPos.current = { x: e.clientX, y: e.clientY };
        setOffset((prev) =>
            clampOffset(
                prev.x + dx,
                prev.y + dy,
                scale,
                naturalSize.w,
                naturalSize.h,
            ),
        );
    }

    function onMouseUp() {
        isDragging.current = false;
    }

    // ── Drag (touch) ────────────────────────────────────────────────────────
    function onTouchStart(e: React.TouchEvent) {
        isDragging.current = true;
        lastPos.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
        };
        e.preventDefault();
    }

    function onTouchMove(e: React.TouchEvent) {
        if (!isDragging.current) return;
        const dx = e.touches[0].clientX - lastPos.current.x;
        const dy = e.touches[0].clientY - lastPos.current.y;
        lastPos.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
        };
        setOffset((prev) =>
            clampOffset(
                prev.x + dx,
                prev.y + dy,
                scale,
                naturalSize.w,
                naturalSize.h,
            ),
        );
    }

    function onTouchEnd() {
        isDragging.current = false;
    }

    // ── Confirmar recorte e fazer upload ────────────────────────────────────
    async function handleCropConfirm() {
        if (!cropSrc) return;
        setLoading(true);

        const img = new Image();
        img.onload = async () => {
            const { w: nw, h: nh } = naturalSize;

            // Região visível em coordenadas naturais da imagem
            const srcW = VIEWPORT / scale;
            const srcH = VIEWPORT / scale;
            const srcX = nw / 2 - offset.x / scale - srcW / 2;
            const srcY = nh / 2 - offset.y / scale - srcH / 2;

            const canvas = document.createElement('canvas');
            canvas.width = OUTPUT_SIZE;
            canvas.height = OUTPUT_SIZE;
            const ctx = canvas.getContext('2d')!;

            // Recorte circular
            ctx.beginPath();
            ctx.arc(
                OUTPUT_SIZE / 2,
                OUTPUT_SIZE / 2,
                OUTPUT_SIZE / 2,
                0,
                Math.PI * 2,
            );
            ctx.clip();

            ctx.drawImage(
                img,
                srcX,
                srcY,
                srcW,
                srcH,
                0,
                0,
                OUTPUT_SIZE,
                OUTPUT_SIZE,
            );

            const uri = canvas.toDataURL('image/jpeg', 0.85);
            setCropSrc(null);
            setPreview(uri);

            try {
                const saved = await uploadAvatar(uri);
                setPreview(saved);
                onUploaded?.(saved);
            } catch {
                setError('Erro ao salvar foto');
            } finally {
                setLoading(false);
            }
        };
        img.src = cropSrc;
    }

    return (
        <>
            <div
                className={styles.wrapper}
                style={{ width: size, height: size }}
            >
                <div
                    className={styles.circle}
                    style={{ width: size, height: size, fontSize: size * 0.35 }}
                >
                    {preview ? (
                        <img
                            src={preview}
                            alt={`Foto de ${name}`}
                            className={styles.img}
                        />
                    ) : (
                        <span className={styles.initials}>
                            {initials(name)}
                        </span>
                    )}

                    {loading && (
                        <div className={styles.overlay}>
                            <span className={styles.spinner} />
                        </div>
                    )}
                </div>

                {editable && (
                    <>
                        <button
                            type="button"
                            className={`${styles.editBtn}${error ? ' ' + styles.editBtnError : ''}`}
                            onClick={() => inputRef.current?.click()}
                            title={error || 'Alterar foto'}
                            aria-label="Alterar foto de perfil"
                        >
                            {error ? '⚠️' : '✏️'}
                        </button>
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className={styles.hiddenInput}
                            onChange={handleFile}
                        />
                    </>
                )}

                {error && size >= 60 && <p className={styles.error}>{error}</p>}
            </div>

            {/* Modal de posicionamento — montado via portal para evitar conflito de hidratação */}
            {mounted &&
                cropSrc &&
                createPortal(
                    <div className={styles.cropModal}>
                        <div className={styles.cropCard}>
                            <p className={styles.cropTitle}>Posicionar foto</p>
                            <p className={styles.cropHint}>
                                Arraste para centralizar&nbsp;·&nbsp;Scroll para
                                zoom
                            </p>

                            <div
                                ref={cropViewportRef}
                                className={styles.cropViewport}
                                onMouseDown={onMouseDown}
                                onMouseMove={onMouseMove}
                                onMouseUp={onMouseUp}
                                onMouseLeave={onMouseUp}
                                onTouchStart={onTouchStart}
                                onTouchMove={onTouchMove}
                                onTouchEnd={onTouchEnd}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={cropSrc}
                                    alt="Posicionar foto"
                                    draggable={false}
                                    className={styles.cropImg}
                                    style={{
                                        width: naturalSize.w * scale,
                                        height: naturalSize.h * scale,
                                        transform: `translate(calc(-50% + ${
                                            offset.x
                                        }px), calc(-50% + ${offset.y}px))`,
                                    }}
                                />
                            </div>

                            <div className={styles.cropActions}>
                                <button
                                    type="button"
                                    className={styles.cropCancel}
                                    onClick={() => setCropSrc(null)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    className={styles.cropSave}
                                    onClick={handleCropConfirm}
                                >
                                    Salvar foto
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
}
