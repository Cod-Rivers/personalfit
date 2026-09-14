'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    FiAlertTriangle,
    FiCheck,
    FiCopy,
    FiDownload,
    FiLoader,
    FiShare2,
} from 'react-icons/fi';
import Modal from '@/components/system/Modal';
import { buildShareCard, type ShareCardInput } from '@/libs/shareCard';
import {
    buildCaption,
    copyToClipboard,
    shareImage,
    type ShareOutcome,
} from '@/libs/socialShare';
import s from './ShareAchievementModal.module.css';

interface Props {
    open: boolean;
    onClose: () => void;
    /** O que desenhar no card. Mudou o conteúdo, o card é recomposto. */
    card: ShareCardInput;
    /** Linhas da legenda sugerida (o rodapé com a marca é acrescentado por
     *  buildCaption). */
    captionLines: string[];
    /** Título do diálogo. */
    title?: string;
}

/**
 * Tela única de compartilhamento: mostra a PRÉVIA exata da imagem que vai
 * sair (com a marca d'água já aplicada) e entrega ao sistema.
 *
 * Mostrar a prévia não é enfeite: a imagem leva a marca, o nome e os números
 * do treino, e ninguém deve descobrir o que publicou depois de publicar. É
 * também o que dá ao aluno a chance de desistir antes, em vez de se
 * arrepender depois — a foto é dele.
 *
 * A composição roda uma vez por abertura e o resultado fica em ref: a folha
 * de compartilhamento do Android pode voltar e ir várias vezes, e recompor a
 * cada toque desperdiçaria segundos no aparelho de quem acabou de treinar.
 */
export default function ShareAchievementModal({
    open,
    onClose,
    card,
    captionLines,
    title = 'Compartilhar',
}: Props) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [building, setBuilding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [outcome, setOutcome] = useState<ShareOutcome | null>(null);
    const [copied, setCopied] = useState(false);
    const fileRef = useRef<File | null>(null);

    const caption = buildCaption(captionLines);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        let url: string | null = null;

        setBuilding(true);
        setError(null);
        setOutcome(null);
        setCopied(false);

        buildShareCard(card)
            .then((file) => {
                if (cancelled) return;
                fileRef.current = file;
                url = URL.createObjectURL(file);
                setPreviewUrl(url);
            })
            .catch(() => {
                if (cancelled) return;
                // Sem card não há o que compartilhar, e isso NÃO afeta nada do
                // que já foi registrado — a mensagem diz só o que é verdade.
                setError(
                    'Não foi possível montar a imagem neste aparelho. Seu treino continua registrado normalmente.',
                );
            })
            .finally(() => {
                if (!cancelled) setBuilding(false);
            });

        return () => {
            cancelled = true;
            if (url) URL.revokeObjectURL(url);
            fileRef.current = null;
            setPreviewUrl(null);
        };
        // `card` é um objeto literal recriado pelo pai a cada render; depender
        // dele remontaria a composição em loop. A abertura é o gatilho certo:
        // o conteúdo do card é decidido no instante em que o diálogo abre.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const handleShare = useCallback(async () => {
        const file = fileRef.current;
        if (!file) return;
        setOutcome(await shareImage(file, caption));
    }, [caption]);

    const handleCopyCaption = useCallback(async () => {
        setCopied(await copyToClipboard(caption));
    }, [caption]);

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title}
            footer={
                <button type="button" className={s.btnGhost} onClick={onClose}>
                    Fechar
                </button>
            }
        >
            <div className={s.container}>
                <p className={s.intro}>
                    A imagem sai com a marca do Venafit. Toque em compartilhar e
                    escolha o Instagram, o Facebook ou o WhatsApp.
                </p>

                <div className={s.previewBox}>
                    {building && (
                        <div className={s.previewLoading}>
                            <FiLoader className={s.spin} /> Montando a imagem…
                        </div>
                    )}
                    {previewUrl && (
                        // Blob local, nunca vai ao CDN — <img> é o padrão do
                        // projeto para prévia de blob.
                        <img
                            src={previewUrl}
                            alt="Prévia da imagem que será compartilhada"
                            className={s.preview}
                        />
                    )}
                </div>

                {error && (
                    <div className={s.errorBanner}>
                        <FiAlertTriangle aria-hidden="true" /> {error}
                    </div>
                )}

                {outcome === 'downloaded' && (
                    <div className={s.okBanner}>
                        <FiCheck aria-hidden="true" /> Imagem salva no seu
                        aparelho. Abra o Instagram ou o Facebook e publique a
                        partir da galeria.
                    </div>
                )}
                {outcome === 'unsupported' && (
                    <div className={s.warnBanner}>
                        <FiAlertTriangle aria-hidden="true" /> Esta versão do
                        app ainda não compartilha imagens. Atualize o app na
                        Play Store, ou abra o Venafit pelo navegador do celular
                        para compartilhar agora.
                    </div>
                )}
                {outcome === 'failed' && (
                    <div className={s.errorBanner}>
                        <FiAlertTriangle aria-hidden="true" /> Não foi possível
                        compartilhar agora. Tente de novo ou copie a legenda e
                        publique pela galeria.
                    </div>
                )}

                <div className={s.actions}>
                    <button
                        type="button"
                        className={s.btnPrimary}
                        onClick={handleShare}
                        disabled={building || !previewUrl}
                    >
                        <FiShare2 aria-hidden="true" /> Compartilhar
                    </button>
                    <button
                        type="button"
                        className={s.btnSecondary}
                        onClick={handleCopyCaption}
                    >
                        <FiCopy aria-hidden="true" />{' '}
                        {copied ? 'Legenda copiada' : 'Copiar legenda'}
                    </button>
                </div>

                <details className={s.captionBox}>
                    <summary className={s.captionSummary}>
                        <FiDownload aria-hidden="true" /> Ver a legenda sugerida
                    </summary>
                    <pre className={s.caption}>{caption}</pre>
                </details>
            </div>
        </Modal>
    );
}
