'use client';

/**
 * Foto de perfil da conta: círculo com iniciais como fallback e um botão de
 * edição que abre o enquadramento (arrastar + zoom) antes de salvar.
 *
 * O recorte em si vive em components/system/ImageCropper — o mesmo usado pelas
 * imagens da vitrine —, então o gesto é idêntico em todo lugar do app onde se
 * escolhe uma foto.
 */

import React, { useRef, useState } from 'react';
import { FiAlertTriangle, FiEdit3 } from 'react-icons/fi';
import ImageCropper, { fileToDataURI } from '@/components/system/ImageCropper';
import { uploadAvatar } from '@/libs/avatarService';
import styles from './AvatarUpload.module.css';

interface Props {
    current?: string;
    name: string;
    size?: number;
    onUploaded?: (dataURI: string) => void;
    editable?: boolean;
}

/** Lado do avatar gerado, em px — o mesmo em qualquer tela que o exiba. */
const OUTPUT_SIZE = 400;

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('');
}

export default function AvatarUpload({
    current,
    name,
    size = 64,
    onUploaded,
    editable = true,
}: Props) {
    const [preview, setPreview] = useState<string | undefined>(current);
    const [cropSrc, setCropSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const inputRef = useRef<HTMLInputElement>(null);

    async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        // Zera o input para que reescolher o MESMO arquivo dispare o change.
        e.target.value = '';
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
        try {
            setCropSrc(await fileToDataURI(file));
        } catch {
            setError('Não foi possível abrir esta imagem');
        }
    }

    async function handleCropConfirm(canvas: HTMLCanvasElement) {
        setLoading(true);
        const uri = canvas.toDataURL('image/jpeg', 0.85);
        // Mostra o recorte na hora; a resposta do servidor confirma logo em
        // seguida (e é ela que vale para as outras telas).
        setPreview(uri);
        try {
            const saved = await uploadAvatar(uri);
            setPreview(saved);
            onUploaded?.(saved);
            setCropSrc(null);
        } catch {
            setError('Erro ao salvar foto');
            setCropSrc(null);
        } finally {
            setLoading(false);
        }
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
                            {error ? <FiAlertTriangle /> : <FiEdit3 />}
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

            {cropSrc && (
                <ImageCropper
                    src={cropSrc}
                    aspect={1}
                    round
                    outputWidth={OUTPUT_SIZE}
                    title="Posicionar foto"
                    busy={loading}
                    onCancel={() => setCropSrc(null)}
                    onConfirm={handleCropConfirm}
                />
            )}
        </>
    );
}
