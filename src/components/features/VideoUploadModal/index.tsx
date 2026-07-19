'use client';
import { useState } from 'react';
import Image from 'next/image';
import * as videoService from '@/libs/exerciseVideoService';

interface VideoUploadModalProps {
    /** ID do exercício (pessoal ou fork via libraryId) ao qual a mídia será vinculada */
    exerciseId: string;
    /** Modo de operação: 'personal' = exercício pessoal; 'fork' = fork de biblioteca */
    mode: 'personal' | 'fork';
    /** Plano do usuário: somente 'pro' pode usar TikTok e upload direto */
    planType: 'free' | 'pro';
    onSuccess: () => void;
    onClose: () => void;
}

type Tab = 'link' | 'tiktok' | 'upload';

/**
 * VideoUploadModal — modal reutilizável para definir mídia de exercício.
 *
 * Três abas:
 * - "Link" (YouTube/Vimeo/Instagram — disponível para todos os planos)
 * - "TikTok" (requer PlanPro)
 * - "Upload de arquivo" (requer PlanPro)
 *
 * Upload vai direto ao R2 via presigned URL (zero tráfego no backend).
 * Limite de tamanho (MAX_UPLOAD_BYTES) e duração (MAX_UPLOAD_DURATION_SECONDS)
 * validados no cliente antes de solicitar a URL de upload.
 */
export default function VideoUploadModal({
    exerciseId,
    mode,
    planType,
    onSuccess,
    onClose,
}: VideoUploadModalProps) {
    const [tab, setTab] = useState<Tab>(planType === 'pro' ? 'upload' : 'link');
    const [linkUrl, setLinkUrl] = useState('');
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState('');
    const [progress, setProgress] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const isPro = planType === 'pro';

    const handleFileChange = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const validationError = await videoService.validateMediaFile(file);
        if (validationError) {
            setError(validationError);
            return;
        }
        setError('');
        setMediaFile(file);
        if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
            setMediaPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async () => {
        setError('');
        setSubmitting(true);
        try {
            if (tab === 'link' || tab === 'tiktok') {
                if (!linkUrl.trim()) {
                    setError('Informe a URL do vídeo');
                    return;
                }
                if (
                    tab === 'link' &&
                    !videoService.isSupportedExternalVideoUrl(linkUrl)
                ) {
                    setError(
                        'Informe um link válido do YouTube, Vimeo ou Instagram',
                    );
                    return;
                }
                if (tab === 'tiktok' && !videoService.isTikTokUrl(linkUrl)) {
                    setError('Informe um link válido do TikTok');
                    return;
                }
                if (mode === 'personal') {
                    await videoService.setPersonalVideoUrl(
                        exerciseId,
                        linkUrl,
                    );
                } else {
                    await videoService.setForkVideoUrl(exerciseId, linkUrl);
                }
            } else {
                if (!mediaFile) {
                    setError('Selecione um arquivo para upload');
                    return;
                }
                setProgress(1);
                let signedUrl: string;
                let objectPath: string;
                if (mode === 'personal') {
                    const res = await videoService.requestPersonalUploadUrl(
                        exerciseId,
                        mediaFile,
                    );
                    signedUrl = res.upload_url;
                    objectPath = res.object_path;
                } else {
                    const res = await videoService.requestForkUploadUrl(
                        exerciseId,
                        mediaFile,
                    );
                    signedUrl = res.upload_url;
                    objectPath = res.object_path;
                }
                await videoService.uploadToR2(
                    signedUrl,
                    mediaFile,
                    setProgress,
                );
                if (mode === 'personal') {
                    await videoService.confirmPersonalVideo(
                        exerciseId,
                        objectPath,
                    );
                } else {
                    await videoService.confirmFork(exerciseId, objectPath);
                }
                setProgress(100);
            }
            onSuccess();
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message : 'Erro ao salvar mídia';
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="modal d-block"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            Definir mídia do exercício
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={onClose}
                        />
                    </div>
                    <div className="modal-body">
                        {/* Tabs */}
                        <ul className="nav nav-tabs mb-3">
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${tab === 'link' ? 'active' : ''}`}
                                    onClick={() => setTab('link')}
                                >
                                    🔗 Link
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${tab === 'tiktok' ? 'active' : ''} ${!isPro ? 'disabled text-muted' : ''}`}
                                    onClick={() => isPro && setTab('tiktok')}
                                    title={
                                        !isPro
                                            ? 'TikTok requer plano Pro'
                                            : undefined
                                    }
                                >
                                    🎵 TikTok
                                    {!isPro && (
                                        <span className="badge bg-warning text-dark ms-1 small">
                                            Pro
                                        </span>
                                    )}
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${tab === 'upload' ? 'active' : ''} ${!isPro ? 'disabled text-muted' : ''}`}
                                    onClick={() => isPro && setTab('upload')}
                                    title={
                                        !isPro
                                            ? 'Upload requer plano Pro'
                                            : undefined
                                    }
                                >
                                    ⬆️ Upload de arquivo
                                    {!isPro && (
                                        <span className="badge bg-warning text-dark ms-1 small">
                                            Pro
                                        </span>
                                    )}
                                </button>
                            </li>
                        </ul>

                        {error && (
                            <div className="alert alert-danger py-2">
                                {error}
                            </div>
                        )}

                        {tab === 'link' ? (
                            <div>
                                <label className="form-label">
                                    URL do YouTube, Vimeo ou Instagram
                                </label>
                                <input
                                    className="form-control"
                                    value={linkUrl}
                                    onChange={(e) =>
                                        setLinkUrl(e.target.value)
                                    }
                                    placeholder="https://youtube.com/watch?v=..."
                                />
                                <small className="text-muted d-block mt-1">
                                    Links do Instagram abrem em uma nova aba
                                    (não é possível embutir o player).
                                </small>
                            </div>
                        ) : tab === 'tiktok' ? (
                            <div>
                                <label className="form-label">
                                    URL do TikTok
                                </label>
                                <input
                                    className="form-control"
                                    value={linkUrl}
                                    onChange={(e) =>
                                        setLinkUrl(e.target.value)
                                    }
                                    placeholder="https://www.tiktok.com/@usuario/video/..."
                                />
                            </div>
                        ) : (
                            <div>
                                {mediaPreview &&
                                    (videoService.isVideoExtension(
                                        mediaPreview,
                                    ) ? (
                                        <video
                                            src={mediaPreview}
                                            controls
                                            className="w-100 mb-3 rounded"
                                            style={{ maxHeight: 200 }}
                                        />
                                    ) : (
                                        <Image
                                            src={mediaPreview}
                                            alt="Preview"
                                            className="w-100 mb-3 rounded"
                                            width={200}
                                            height={150}
                                        />
                                    ))}
                                <input
                                    type="file"
                                    className="form-control"
                                    accept={
                                        videoService.ACCEPTED_UPLOAD_EXTENSIONS
                                    }
                                    onChange={handleFileChange}
                                />
                                <small className="text-muted d-block mt-1">
                                    Máximo:{' '}
                                    {videoService.MAX_UPLOAD_BYTES /
                                        1024 /
                                        1024}
                                    MB · Até{' '}
                                    {videoService.MAX_UPLOAD_DURATION_SECONDS}
                                    s de vídeo · Formatos: MP4, WebM, JPG,
                                    PNG, WebP
                                </small>
                                {progress > 0 && progress < 100 && (
                                    <div
                                        className="progress mt-2"
                                        style={{ height: 20 }}
                                    >
                                        <div
                                            className="progress-bar progress-bar-striped progress-bar-animated"
                                            style={{ width: `${progress}%` }}
                                        >
                                            {progress}%
                                        </div>
                                    </div>
                                )}
                                {progress === 100 && (
                                    <div className="alert alert-success py-1 mt-2 mb-0">
                                        Upload concluído!
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button
                            className="btn btn-outline-secondary"
                            onClick={onClose}
                            disabled={submitting}
                        >
                            Cancelar
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" />
                                    {tab === 'upload'
                                        ? 'Enviando...'
                                        : 'Salvando...'}
                                </>
                            ) : (
                                'Salvar'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
