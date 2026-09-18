'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
    FiAlertTriangle,
    FiArrowLeft,
    FiCamera,
    FiCheck,
    FiLoader,
    FiX,
} from 'react-icons/fi';
import {
    estimateIsLate,
    formatLogWindowForDisplay,
    LOG_WINDOW_DEFAULT,
} from '@/libs/logWindow';
import {
    getCachedMyLogWindow,
    getMyLogWindow,
    isCheckInPhotoEnabled,
} from '@/libs/logWindowService';
import { clientCompletedAtNow } from '@/libs/workoutLogService';
import { usePoseOfDay } from '@/hooks/usePoseOfDay';
import PoseCapture from './PoseCapture';
import s from './WorkoutCheckIn.module.css';

interface WorkoutCheckInProps {
    /** "YYYY-MM-DD" — mesmo valor que vai em WorkoutSessionRequest.planned_date,
     * usado só para estimar o aviso de tardio (RN-39). */
    plannedDate: string;
    /** Enviando a mutação (mesmo `loading` do formulário pai) — desabilita
     * os botões para não disparar duas confirmações. */
    loading: boolean;
    error: string | null;
    onConfirm: (params: {
        confirmedAt: string;
        photoFile: File | null;
        /** Prova de pose do antifraude do Desafio entre Alunos.
         * Ausente quando o aluno não participa de desafio com pose, ou
         * quando estava offline — e nos dois casos o registro segue
         * normalmente, marcado como "sem prova" para o personal
         * conferir depois. */
        poseChallengeId?: string;
        poseId?: string;
    }) => void;
    onCancel: () => void;
    /** Acompanhamento presencial: quem está confirmando é o PERSONAL, com o
     * aluno ao lado. Muda três coisas, todas pelo mesmo motivo — nada aqui
     * pode falar de /me, porque /me agora é o personal:
     *
     * 1. Sem foto e sem pose. A prova do antifraude é o ALUNO fazendo a pose;
     *    uma foto tirada no aparelho do personal, contra a pose sorteada para
     *    o personal (`usePoseOfDay` é /me), seria prova de nada.
     * 2. Sem aviso de tardio. A janela de registro lida do cache é a do
     *    personal, não a do aluno — o servidor calcula a marcação de verdade
     *    a partir da janela do aluno, então é melhor não afirmar nada aqui do
     *    que afirmar pelo prazo errado.
     * 3. O texto deixa explícito de quem é o registro. */
    assisted?: boolean;
    /** Nome do aluno, só para o texto do modo assistido. */
    studentName?: string;
}

/**
 * Passo de check-in (US-03): confirmação explícita de que o treino foi
 * concluído, com foto opcional, antes de o registro seguir para a fila
 * offline. Renderizado DENTRO do mesmo Modal do WorkoutLogger (troca de
 * conteúdo, não um Modal novo empilhado) — mantém o fluxo em um único
 * diálogo e evita reabrir a pilha de Escape para um passo que é só mais uma
 * confirmação do mesmo formulário.
 *
 * A foto NUNCA bloqueia a confirmação: é só um arquivo local até o
 * componente pai chamar `enqueuePhoto` (mediaQueue.ts) depois que o check-in
 * já foi enfileirado — este componente não sabe nada de fila, só devolve o
 * `File` escolhido.
 */
const WorkoutCheckIn: React.FC<WorkoutCheckInProps> = ({
    plannedDate,
    loading,
    error,
    onConfirm,
    onCancel,
    assisted = false,
    studentName,
}) => {
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [capturing, setCapturing] = useState(false);
    // A pose do dia é buscada aqui, e não recebida por prop: o fluxo de
    // treino não sabe nada de desafio, e descer isso por três telas não
    // traria ganho nenhum. Falha silenciosa = sem pose hoje.
    const { pose } = usePoseOfDay();
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [lateWarning, setLateWarning] = useState<string | null>(null);
    // Com ADHERENCE_PHOTO_ENABLED desligado no servidor, a foto nunca chega:
    // o envio falharia depois, em silêncio, na fila. Lido do mesmo cache
    // offline da janela de registro, e atualizado quando a busca em segundo
    // plano abaixo responder.
    const [photoEnabled, setPhotoEnabled] = useState(() =>
        assisted ? false : isCheckInPhotoEnabled(getCachedMyLogWindow()),
    );
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Aviso de tardio (RN-39): lido do cache LOCAL, nunca de uma chamada de
    // rede feita agora — o aluno pode estar sem sinal neste exato momento,
    // que é o caso de uso desta feature. Sem cache ainda (aparelho novo,
    // storage limpo), assume o default do backend (48h) em vez de não
    // avisar nada — é a mesma suposição que EffectiveLogWindow faz do lado
    // do servidor quando o campo está ausente.
    useEffect(() => {
        // Modo assistido: a janela em cache é a do PERSONAL logado, então
        // tanto o aviso de tardio quanto o flag de foto seriam sobre a pessoa
        // errada. Nenhum dos dois é necessário aqui — o servidor faz a
        // marcação de tardio com a janela do aluno de qualquer forma.
        if (assisted) {
            setLateWarning(null);
            setPhotoEnabled(false);
            return;
        }

        const cached = getCachedMyLogWindow();
        const window = cached?.log_window ?? LOG_WINDOW_DEFAULT;
        const isDefault = cached?.is_default ?? true;

        if (estimateIsLate(plannedDate, new Date(), window)) {
            setLateWarning(
                `Pelo prazo atual (${formatLogWindowForDisplay(window, isDefault)}), este registro deve ficar marcado como tardio. Isso não impede a confirmação — é só um aviso.`,
            );
        } else {
            setLateWarning(null);
        }

        // Atualiza o cache em segundo plano, para a PRÓXIMA vez que faltar
        // rede — não bloqueia o aviso acima, que já foi calculado com o que
        // já tínhamos localmente. Falha (offline agora mesmo) é silenciosa
        // de propósito: é exatamente o cenário que este aviso existe para
        // cobrir.
        getMyLogWindow()
            .then((res) => setPhotoEnabled(isCheckInPhotoEnabled(res)))
            .catch(() => {});
    }, [plannedDate, assisted]);

    useEffect(() => {
        if (!photoFile) {
            setPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(photoFile);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [photoFile]);

    const handleConfirm = () => {
        onConfirm({
            confirmedAt: clientCompletedAtNow(),
            photoFile: photoEnabled ? photoFile : null,
            poseChallengeId: photoEnabled ? pose?.challengeId : undefined,
            poseId: photoEnabled ? pose?.pose.pose_id : undefined,
        });
    };

    return (
        <div className={s.container}>
            <h3 className={s.title}>
                {assisted
                    ? 'Finalizar o treino do aluno?'
                    : 'Confirmar treino concluído?'}
            </h3>
            <p className={s.subtitle}>
                {assisted
                    ? `O treino entra no histórico ${studentName ? `de ${studentName}` : 'do aluno'} — conta na aderência, na evolução e no desafio — marcado como registrado por você no atendimento.`
                    : photoEnabled
                      ? 'Isso registra o treino como feito. A foto é opcional — pular não atrasa nem bloqueia o registro.'
                      : 'Isso registra o treino como feito.'}
            </p>

            {error && (
                <div className={s.errorBanner}>
                    <FiAlertTriangle /> {error}
                </div>
            )}

            {lateWarning && (
                <div className={s.lateBanner}>
                    <FiAlertTriangle /> {lateWarning}
                </div>
            )}

            {photoEnabled && pose && !previewUrl && (
                <div className={s.poseBanner}>
                    <strong>Pose de hoje: {pose.pose.label}</strong>
                    <span>
                        Envie a foto fazendo esta pose, com o código{' '}
                        <strong>{pose.pose.code}</strong> à mostra. Seu personal
                        confere e pode não aceitar a foto.
                    </span>
                </div>
            )}

            {!photoEnabled ? null : capturing && pose ? (
                <PoseCapture
                    pose={pose}
                    onCaptured={(file) => {
                        setPhotoFile(file);
                        setCapturing(false);
                    }}
                    onCancel={() => setCapturing(false)}
                />
            ) : (
            <div className={s.photoSection}>
                {previewUrl ? (
                    <div className={s.previewWrap}>
                        {/* Preview local (blob), nunca sobe pro CDN — <img>
                            é o padrão do projeto para preview de blob. */}
                        <img
                            src={previewUrl}
                            alt="Prévia da foto do check-in"
                            className={s.preview}
                        />
                        <button
                            type="button"
                            className={s.removePhotoBtn}
                            onClick={() => setPhotoFile(null)}
                            disabled={loading}
                        >
                            <FiX /> Remover foto
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        className={s.addPhotoBtn}
                        onClick={() =>
                            pose
                                ? setCapturing(true)
                                : fileInputRef.current?.click()
                        }
                        disabled={loading}
                    >
                        <FiCamera />{' '}
                        {pose
                            ? 'Fazer a pose e tirar a foto'
                            : 'Adicionar foto (opcional)'}
                    </button>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className={s.hiddenFileInput}
                    onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                    disabled={loading}
                />
            </div>
            )}

            <div className={s.actions}>
                <button
                    type="button"
                    className={s.btnBack}
                    onClick={onCancel}
                    disabled={loading}
                >
                    <FiArrowLeft /> Voltar
                </button>
                <button
                    type="button"
                    className={s.btnConfirm}
                    onClick={handleConfirm}
                    disabled={loading}
                >
                    {loading ? <FiLoader className={s.spin} /> : <FiCheck />}{' '}
                    Confirmar
                </button>
            </div>
        </div>
    );
};

export default WorkoutCheckIn;
