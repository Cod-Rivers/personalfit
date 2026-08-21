'use client';

import React, { useState } from 'react';
import { isAxiosError } from 'axios';
import { FiVideo, FiX, FiExternalLink } from 'react-icons/fi';
import {
    SUPPORTED_VIDEO_PLATFORMS,
    externalVideoPlatform,
    isSupportedExternalVideoUrl,
    resolveExternalVideoLink,
} from '@/libs/exerciseVideoService';
import s from '../builder.module.css';

interface Props {
    videoUrl: string;
    videoThumb: string;
    /** Exercício vinculado à exercise_library. Muda o significado de limpar o
     * campo: o backend repõe a mídia da biblioteca em todo exercício vinculado
     * que chegue sem vídeo (ver hydrateMacrocycleLibraryMedia), então aqui
     * limpar restaura o padrão em vez de deixar sem vídeo. */
    libraryLinked: boolean;
    /** Recebe os dois campos de uma vez: a thumbnail derivada do link só faz
     * sentido junto do link que a originou, e gravar um sem o outro deixaria o
     * exercício com a capa de um vídeo e o player de outro. */
    onChange: (videoUrl: string, videoThumb: string) => void;
}

const PLATFORMS_LABEL = SUPPORTED_VIDEO_PLATFORMS.join(', ').replace(
    /, ([^,]*)$/,
    ' ou $1',
);

/**
 * Campo de vídeo de demonstração de um exercício do plano.
 *
 * Vale para exercício vindo da biblioteca (onde o link substitui a mídia padrão
 * apenas neste plano, sem tocar na biblioteca) e para exercício avulso —
 * inclusive os importados de PDF pela IA, que nascem sem mídia nenhuma.
 *
 * Só aceita as plataformas padrão do sistema; o backend revalida e é quem deriva
 * a thumbnail (ver resolveExternalVideoLink).
 */
export default function ExerciseVideoField({
    videoUrl,
    videoThumb,
    libraryLinked,
    onChange,
}: Props) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const platform = externalVideoPlatform(videoUrl);
    // Vídeo que não é de plataforma externa veio da mídia padrão da biblioteca
    // ou de um upload — o personal pode trocar por um link, mas o rótulo não
    // deve inventar um nome de plataforma.
    const sourceLabel = !videoUrl
        ? ''
        : (platform ??
          (libraryLinked ? 'Vídeo da biblioteca' : 'Vídeo próprio'));

    const openEditor = () => {
        setDraft(platform ? videoUrl : '');
        setError('');
        setEditing(true);
    };

    const closeEditor = () => {
        setEditing(false);
        setDraft('');
        setError('');
    };

    const apply = async () => {
        const url = draft.trim();
        if (!url) {
            setError('Cole o link do vídeo.');
            return;
        }
        if (!isSupportedExternalVideoUrl(url)) {
            setError('Use um link do ' + PLATFORMS_LABEL + '.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const resolved = await resolveExternalVideoLink(url);
            onChange(resolved.video_url, resolved.video_thumb);
            closeEditor();
        } catch (err) {
            setError(
                isAxiosError(err)
                    ? (err.response?.data?.error ??
                          'Não foi possível validar o link. Tente novamente.')
                    : 'Não foi possível validar o link. Tente novamente.',
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={s.formGroup} style={{ marginBottom: 0 }}>
            <label className={s.formLabel}>Vídeo de demonstração</label>

            {!editing && (
                <div className={s.videoFieldRow}>
                    {videoUrl ? (
                        <>
                            <span className={s.videoSourceChip}>
                                <FiVideo aria-hidden /> {sourceLabel}
                            </span>
                            {platform && (
                                <a
                                    href={videoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={s.linkBtn}
                                    title="Abrir o vídeo em nova aba"
                                >
                                    <FiExternalLink aria-hidden /> Abrir
                                </a>
                            )}
                            <button
                                type="button"
                                className={s.linkBtnAccent}
                                onClick={openEditor}
                            >
                                Trocar vídeo
                            </button>
                            <button
                                type="button"
                                className={s.linkBtn}
                                onClick={() => onChange('', '')}
                                title={
                                    libraryLinked
                                        ? 'Volta a usar o vídeo padrão da biblioteca'
                                        : 'Deixa o exercício sem vídeo'
                                }
                            >
                                <FiX aria-hidden />{' '}
                                {libraryLinked
                                    ? 'Usar vídeo da biblioteca'
                                    : 'Remover'}
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            className={s.btnSmall}
                            onClick={openEditor}
                        >
                            <FiVideo aria-hidden /> Adicionar vídeo
                        </button>
                    )}
                </div>
            )}

            {editing && (
                <div className={s.videoEditor}>
                    <div className={s.videoInputRow}>
                        <input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    void apply();
                                }
                            }}
                            placeholder={'Cole o link do ' + PLATFORMS_LABEL}
                            className={s.formInput}
                            autoFocus
                        />
                        <button
                            type="button"
                            className={s.btnSmallActive}
                            onClick={() => void apply()}
                            disabled={saving}
                        >
                            {saving ? 'Validando…' : 'Aplicar'}
                        </button>
                        <button
                            type="button"
                            className={s.btnSmall}
                            onClick={closeEditor}
                            disabled={saving}
                        >
                            Cancelar
                        </button>
                    </div>
                    {error ? (
                        <p className={s.videoFieldError}>{error}</p>
                    ) : (
                        <p className={s.videoFieldHint}>
                            Plataformas aceitas: {PLATFORMS_LABEL}. Vídeos do
                            TikTok requerem plano Pro.
                        </p>
                    )}
                </div>
            )}

            {videoThumb && !editing && (
                // Confirmação visual de que a capa veio junto do link — sem
                // isso o personal só descobre qual thumbnail ficou salva
                // depois de reabrir o card do exercício.
                <img
                    src={videoThumb}
                    alt=""
                    aria-hidden
                    className={s.videoThumbPreview}
                />
            )}
        </div>
    );
}
