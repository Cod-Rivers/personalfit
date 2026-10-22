'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FiCamera, FiRefreshCw, FiX } from 'react-icons/fi';
import s from './results.module.css';

interface Props {
    /** Foto anterior mostrada em transparência sobre a câmera (opcional). */
    ghostUrl?: string;
    busy?: boolean;
    onCaptured: (file: File) => void;
    onCancel: () => void;
}

/**
 * Câmera com guia: a foto de antes aparece em transparência sobre a imagem
 * da câmera, para a foto de hoje sair na mesma pose, distância e ângulo.
 * Sem câmera (permissão negada, WebView antiga), cai no seletor de arquivo
 * com `capture` — mesmo contrato do PoseCapture.
 */
export default function GhostCamera({ ghostUrl, busy, onCaptured, onCancel }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState(false);
    const [facing, setFacing] = useState<'user' | 'environment'>('environment');
    const [opacity, setOpacity] = useState(35);

    const stop = useCallback(() => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    }, []);

    useEffect(() => {
        let cancelled = false;
        setReady(false);
        (async () => {
            if (!navigator.mediaDevices?.getUserMedia) {
                setFailed(true);
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 1600 } },
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
                setReady(true);
            } catch {
                setFailed(true);
            }
        })();
        return () => {
            cancelled = true;
            stop();
        };
    }, [facing, stop]);

    /** Fotografa o quadro inteiro (o recorte fica para a publicação). A
     *  câmera frontal aparece espelhada na tela, mas a foto sai sem espelho. */
    const shoot = () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
            (blob) => {
                if (!blob) return;
                stop();
                onCaptured(new File([blob], 'evolucao.jpg', { type: 'image/jpeg' }));
            },
            'image/jpeg',
            0.9,
        );
    };

    return (
        <div className={s.section}>
            {failed ? (
                <div className={s.empty}>
                    <p className={s.muted}>
                        Não foi possível abrir a câmera aqui. Tire a foto pelo aplicativo de câmera do aparelho.
                    </p>
                    <button type="button" className={s.btnPrimary} onClick={() => fileInputRef.current?.click()} disabled={busy}>
                        <FiCamera aria-hidden="true" /> Tirar foto
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        capture="environment"
                        hidden
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) onCaptured(file);
                        }}
                    />
                </div>
            ) : (
                <>
                    <div className={s.cameraStage}>
                        <video
                            ref={videoRef}
                            playsInline
                            muted
                            className={facing === 'user' ? s.mirrored : undefined}
                        />
                        {ghostUrl && (
                             
                            <img
                                src={ghostUrl}
                                alt=""
                                aria-hidden="true"
                                className={`${s.ghost} ${facing === 'user' ? s.mirrored : ''}`}
                                style={{ opacity: opacity / 100 }}
                            />
                        )}
                    </div>
                    {ghostUrl && (
                        <label className={s.opacityRow}>
                            Guia
                            <input
                                type="range"
                                min={0}
                                max={70}
                                value={opacity}
                                onChange={(e) => setOpacity(Number(e.target.value))}
                                aria-label="Transparência da foto de antes"
                            />
                        </label>
                    )}
                    <p className={s.muted}>
                        {ghostUrl
                            ? 'Encaixe o corpo na foto de antes: mesma distância, mesma pose, mesma luz.'
                            : 'Corpo inteiro, de frente, com boa luz. Use roupa de treino.'}
                    </p>
                </>
            )}
            <div className={s.actions}>
                <button type="button" className={s.btn} onClick={() => { stop(); onCancel(); }} disabled={busy}>
                    <FiX aria-hidden="true" /> Cancelar
                </button>
                {!failed && (
                    <>
                        <button
                            type="button"
                            className={s.btn}
                            onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
                            disabled={busy}
                        >
                            <FiRefreshCw aria-hidden="true" /> Virar câmera
                        </button>
                        <button type="button" className={s.btnPrimary} onClick={shoot} disabled={!ready || busy}>
                            <FiCamera aria-hidden="true" /> {busy ? 'Salvando…' : 'Tirar foto'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
