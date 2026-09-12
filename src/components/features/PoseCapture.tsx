'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FiCamera, FiRefreshCw, FiX } from 'react-icons/fi';
import type { ActivePose } from '@/hooks/usePoseOfDay';
import s from './PoseCapture.module.css';

interface Props {
    pose: ActivePose;
    onCaptured: (file: File) => void;
    onCancel: () => void;
}

/**
 * Captura da foto de check-in com a pose do dia sobreposta e o código do aluno
 * estampado na imagem.
 *
 * A marca d'água não é prova criptográfica — qualquer um edita uma imagem. Ela
 * existe para tornar a foto reciclada VISÍVEL em meio segundo para quem
 * confere, que é o objetivo real. A prova de verdade continua sendo a soma de
 * pose do dia (sorteada pelo servidor, nunca revelada para o futuro), código
 * por aluno e conferência humana.
 *
 * Fallback obrigatório: quando `getUserMedia` não está disponível (iOS em
 * contexto não seguro, permissão negada, navegador antigo), cai no seletor de
 * arquivo com `capture`. O aluno nunca pode ficar sem caminho para registrar o
 * treino.
 */
export default function PoseCapture({ pose, onCaptured, onCancel }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraFailed, setCameraFailed] = useState(false);
    const [facing, setFacing] = useState<'user' | 'environment'>('user');

    const stop = useCallback(() => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    }, []);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            if (!navigator.mediaDevices?.getUserMedia) {
                setCameraFailed(true);
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: facing },
                    audio: false,
                });
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play().catch(() => {});
                }
                setCameraReady(true);
            } catch {
                setCameraFailed(true);
            }
        })();

        return () => {
            cancelled = true;
            stop();
        };
    }, [facing, stop]);

    /** Desenha o quadro atual num canvas e estampa código, data e desafio. */
    const shoot = () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        stampWatermark(ctx, canvas.width, canvas.height, pose);

        canvas.toBlob(
            (blob) => {
                if (!blob) return;
                onCaptured(
                    new File([blob], 'checkin.jpg', { type: 'image/jpeg' }),
                );
                stop();
            },
            'image/jpeg',
            0.85,
        );
    };

    return (
        <div className={s.wrap}>
            <div className={s.poseHeader}>
                <p className={s.poseLabel}>
                    Pose de hoje: <strong>{pose.pose.label}</strong>
                </p>
                <p className={s.code}>
                    Seu código do dia: <strong>{pose.pose.code}</strong>
                </p>
            </div>

            {cameraFailed ? (
                <div className={s.fallback}>
                    <p className={s.fallbackText}>
                        Não foi possível abrir a câmera aqui. Você pode tirar a
                        foto pelo aplicativo de câmera do aparelho.
                    </p>
                    <button
                        type="button"
                        className={s.btnPrimary}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <FiCamera /> Tirar foto
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        capture="user"
                        className={s.hiddenInput}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) onCaptured(file);
                        }}
                    />
                </div>
            ) : (
                <div className={s.stage}>
                    <video
                        ref={videoRef}
                        className={s.video}
                        playsInline
                        muted
                    />
                    {pose.pose.image_url && (
                        /* Silhueta semitransparente: o aluno se encaixa nela. */
                        <img
                            src={pose.pose.image_url}
                            alt=""
                            aria-hidden="true"
                            className={s.silhouette}
                        />
                    )}
                    <div className={s.codeOverlay}>{pose.pose.code}</div>
                </div>
            )}

            <div className={s.actions}>
                <button type="button" className={s.btnGhost} onClick={onCancel}>
                    <FiX /> Cancelar
                </button>
                {!cameraFailed && (
                    <>
                        <button
                            type="button"
                            className={s.btnGhost}
                            onClick={() =>
                                setFacing((f) =>
                                    f === 'user' ? 'environment' : 'user',
                                )
                            }
                        >
                            <FiRefreshCw /> Virar câmera
                        </button>
                        <button
                            type="button"
                            className={s.btnPrimary}
                            onClick={shoot}
                            disabled={!cameraReady}
                        >
                            <FiCamera /> Tirar foto
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

/** Estampa código, data e nome do desafio no canto inferior da imagem. */
function stampWatermark(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    pose: ActivePose,
) {
    const pad = Math.round(width * 0.03);
    const fontSize = Math.max(14, Math.round(width * 0.045));
    const line = `${pose.pose.code} · ${new Date().toLocaleDateString('pt-BR')} · ${pose.challengeName}`;

    ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
    const textWidth = ctx.measureText(line).width;
    const boxHeight = fontSize * 1.8;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(
        pad / 2,
        height - boxHeight - pad / 2,
        textWidth + pad,
        boxHeight,
    );

    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(line, pad, height - boxHeight / 2 - pad / 2);
}
