'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiAlertTriangle, FiCheck, FiRefreshCw, FiX } from 'react-icons/fi';
import Modal from '@/components/system/Modal';
import {
    bulkAcceptPhotos,
    getReviewQueue,
    reviewCheckInPhoto,
    REJECT_REASON_LABELS,
    SIGNAL_LABELS,
    type RejectReason,
    type ReviewQueue,
    type ReviewQueueEntry,
} from '@/libs/studentChallengeAntiFraudService';
import type { StudentChallenge } from '@/libs/studentChallengeService';
import s from './reviewQueue.module.css';

interface Props {
    challenge: StudentChallenge;
    open: boolean;
    onClose: () => void;
    /** Chamado depois de qualquer decisão, para o mural ser recarregado — a
     * pontuação é calculada na leitura, então aceitar ou recusar muda o
     * ranking na hora. */
    onReviewed: () => void;
}

const REASONS: RejectReason[] = [
    'pose_incorreta',
    'foto_repetida',
    'sem_codigo',
    'nao_e_o_aluno',
    'fora_do_contexto',
    'outro',
];

function fmtDay(day: string) {
    const d = new Date(day + 'T00:00:00');
    return isNaN(d.getTime()) ? day : d.toLocaleDateString('pt-BR');
}

/**
 * Fila de conferência das fotos de check-in de um desafio.
 *
 * Duas coisas fazem esta tela caber na rotina de quem confere vinte alunos por
 * dia, e as duas são deliberadas: a pose ESPERADA aparece ao lado da foto
 * enviada (comparar é olhar, não investigar), e existe aceite em lote do que
 * não tem nenhum sinal. Sem as duas, a feature é abandonada na segunda semana.
 *
 * Os sinais automáticos aparecem como AVISO, nunca como veredito. Nada aqui
 * recusa nada sozinho — a decisão é sempre de uma pessoa.
 */
export default function ReviewQueueModal({
    challenge,
    open,
    onClose,
    onReviewed,
}: Props) {
    const [queue, setQueue] = useState<ReviewQueue | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busyLog, setBusyLog] = useState<string | null>(null);
    const [rejecting, setRejecting] = useState<ReviewQueueEntry | null>(null);
    const [reason, setReason] = useState<RejectReason>('pose_incorreta');
    const [reasonNote, setReasonNote] = useState('');
    const [onlyPending, setOnlyPending] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getReviewQueue(challenge.id, {
                status: onlyPending ? 'pending' : undefined,
            });
            setQueue(data);
        } catch {
            // A rota não existe com o antifraude desligado no servidor. Tratar
            // como indisponibilidade, não como falha da tela.
            setError(
                'Não foi possível carregar a fila de conferência agora. Tente de novo em instantes.',
            );
        } finally {
            setLoading(false);
        }
    }, [challenge.id, onlyPending]);

    useEffect(() => {
        if (open) void load();
    }, [open, load]);

    const cleanPending = useMemo(
        () =>
            (queue?.entries ?? []).filter(
                (e) => e.review_status === 'pending' && e.signals.length === 0,
            ),
        [queue],
    );

    const decide = async (
        entry: ReviewQueueEntry,
        accept: boolean,
        rejectReason?: RejectReason,
        note?: string,
    ) => {
        setBusyLog(entry.log_id);
        setError(null);
        try {
            await reviewCheckInPhoto(challenge.id, entry.log_id, {
                accept,
                reason: rejectReason,
                reason_note: note,
            });
            setRejecting(null);
            setReasonNote('');
            await load();
            onReviewed();
        } catch {
            setError('Não foi possível registrar a conferência.');
        } finally {
            setBusyLog(null);
        }
    };

    const acceptClean = async () => {
        if (cleanPending.length === 0) return;
        setBusyLog('bulk');
        setError(null);
        try {
            await bulkAcceptPhotos(
                challenge.id,
                cleanPending.map((e) => e.log_id),
            );
            await load();
            onReviewed();
        } catch {
            setError('Não foi possível aceitar o lote.');
        } finally {
            setBusyLog(null);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`Conferir fotos — ${challenge.name}`}
            footer={
                <>
                    <button
                        type="button"
                        className={s.btnGhost}
                        onClick={onClose}
                    >
                        Fechar
                    </button>
                    <button
                        type="button"
                        className={s.btnPrimary}
                        onClick={acceptClean}
                        disabled={busyLog !== null || cleanPending.length === 0}
                    >
                        <FiCheck /> Aceitar {cleanPending.length} sem sinal
                    </button>
                </>
            }
        >
            <div className={s.toolbar}>
                <label className={s.filterLabel}>
                    <input
                        type="checkbox"
                        checked={onlyPending}
                        onChange={(e) => setOnlyPending(e.target.checked)}
                    />
                    Mostrar só as pendentes
                </label>
                <button
                    type="button"
                    className={s.btnGhost}
                    onClick={() => void load()}
                    disabled={loading}
                >
                    <FiRefreshCw /> Atualizar
                </button>
            </div>

            {queue && (
                <p className={s.summary}>
                    {queue.pending_count} pendente(s) · {queue.accepted_count}{' '}
                    aceita(s) · {queue.rejected_count} recusada(s)
                    {queue.count_policy === 'strict' && (
                        <>
                            {' '}
                            · Modo estrito: a foto só conta depois de aceita, ou
                            sozinha após o prazo.
                        </>
                    )}
                </p>
            )}

            {error && <div className={s.errorMsg}>{error}</div>}
            {loading && <p className={s.loading}>Carregando…</p>}

            {!loading && queue && queue.entries.length === 0 && (
                <p className={s.empty}>
                    Nenhuma foto para conferir com este filtro.
                </p>
            )}

            <div className={s.list}>
                {(queue?.entries ?? []).map((entry) => (
                    <article key={entry.log_id} className={s.item}>
                        <header className={s.itemHead}>
                            <div>
                                <strong className={s.itemName}>
                                    {entry.name || 'Aluno'}
                                </strong>
                                <span className={s.itemDay}>
                                    {fmtDay(entry.day)}
                                </span>
                            </div>
                            <span
                                className={`${s.statusTag} ${s['status_' + entry.review_status]}`}
                            >
                                {entry.review_status === 'pending'
                                    ? 'Pendente'
                                    : entry.review_status === 'accepted'
                                      ? 'Aceita'
                                      : 'Recusada'}
                            </span>
                        </header>

                        {entry.contested_at && (
                            <div className={s.contested}>
                                O aluno discorda desta recusa. Vale conversar
                                antes de manter a decisão.
                            </div>
                        )}

                        <div className={s.photos}>
                            <figure className={s.photoBox}>
                                <figcaption className={s.photoCaption}>
                                    Foto enviada
                                </figcaption>
                                {entry.photo_url ? (
                                    <img
                                        src={entry.photo_url}
                                        alt={`Foto de check-in de ${entry.name}`}
                                        className={s.photo}
                                    />
                                ) : (
                                    <div className={s.photoMissing}>
                                        Sem foto
                                    </div>
                                )}
                            </figure>

                            {queue?.pose_required && (
                                <figure className={s.photoBox}>
                                    <figcaption className={s.photoCaption}>
                                        Pose esperada
                                    </figcaption>
                                    {entry.pose_image_url ? (
                                        <img
                                            src={entry.pose_image_url}
                                            alt={
                                                entry.pose_label ??
                                                'Pose do dia'
                                            }
                                            className={s.photo}
                                        />
                                    ) : (
                                        <div className={s.photoMissing}>
                                            Sem pose registrada
                                        </div>
                                    )}
                                    {entry.pose_label && (
                                        <p className={s.poseLabel}>
                                            {entry.pose_label}
                                        </p>
                                    )}
                                    {entry.pose_code && (
                                        <p className={s.poseCode}>
                                            Código esperado:{' '}
                                            <strong>{entry.pose_code}</strong>
                                        </p>
                                    )}
                                </figure>
                            )}
                        </div>

                        {entry.signals.length > 0 && (
                            <ul className={s.signals}>
                                {entry.signals.map((sig) => (
                                    <li key={sig} className={s.signal}>
                                        <FiAlertTriangle />{' '}
                                        {SIGNAL_LABELS[sig] ?? sig}
                                    </li>
                                ))}
                            </ul>
                        )}

                        {entry.review_status === 'rejected' && entry.reason && (
                            <p className={s.reasonShown}>
                                Motivo:{' '}
                                {REJECT_REASON_LABELS[
                                    entry.reason as RejectReason
                                ] ?? entry.reason}
                                {entry.reason_note && ` — ${entry.reason_note}`}
                            </p>
                        )}

                        {!entry.counts_now &&
                            entry.review_status === 'pending' && (
                                <p className={s.hint}>
                                    Este dia ainda não está contando no ranking.
                                </p>
                            )}

                        {rejecting?.log_id === entry.log_id ? (
                            <div className={s.rejectForm}>
                                <p className={s.rejectWarning}>
                                    Recusar tira este dia do ranking e pode
                                    partir a sequência do aluno em duas. Ele
                                    será avisado com o motivo.
                                </p>
                                <select
                                    className={s.select}
                                    value={reason}
                                    onChange={(e) =>
                                        setReason(
                                            e.target.value as RejectReason,
                                        )
                                    }
                                >
                                    {REASONS.map((r) => (
                                        <option key={r} value={r}>
                                            {REJECT_REASON_LABELS[r]}
                                        </option>
                                    ))}
                                </select>
                                <textarea
                                    className={s.textarea}
                                    placeholder="Observação para o aluno (opcional)"
                                    maxLength={500}
                                    value={reasonNote}
                                    onChange={(e) =>
                                        setReasonNote(e.target.value)
                                    }
                                />
                                <div className={s.itemActions}>
                                    <button
                                        type="button"
                                        className={s.btnGhost}
                                        onClick={() => setRejecting(null)}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        className={s.btnDanger}
                                        disabled={busyLog === entry.log_id}
                                        onClick={() =>
                                            void decide(
                                                entry,
                                                false,
                                                reason,
                                                reasonNote,
                                            )
                                        }
                                    >
                                        Confirmar recusa
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className={s.itemActions}>
                                <button
                                    type="button"
                                    className={s.btnDanger}
                                    disabled={busyLog === entry.log_id}
                                    onClick={() => {
                                        setRejecting(entry);
                                        setReason('pose_incorreta');
                                        setReasonNote('');
                                    }}
                                >
                                    <FiX /> Não aceitar
                                </button>
                                <button
                                    type="button"
                                    className={s.btnPrimary}
                                    disabled={busyLog === entry.log_id}
                                    onClick={() => void decide(entry, true)}
                                >
                                    <FiCheck /> Aceitar
                                </button>
                            </div>
                        )}
                    </article>
                ))}
            </div>
        </Modal>
    );
}
