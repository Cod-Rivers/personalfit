'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiAlertCircle, FiMessageSquare } from 'react-icons/fi';
import {
    contestReview,
    getMyReviews,
    REJECT_REASON_LABELS,
    type RejectReason,
    type ReviewQueueEntry,
} from '@/libs/studentChallengeAntiFraudService';
import s from './ChallengeReviewNotice.module.css';

interface Props {
    challengeId: string;
    /** Só busca quando o desafio realmente confere fotos. */
    enabled: boolean;
}

function fmtDay(day: string) {
    const d = new Date(day + 'T00:00:00');
    return isNaN(d.getTime()) ? day : d.toLocaleDateString('pt-BR');
}

/**
 * Avisa o aluno quando uma foto dele não foi aceita, com o motivo, e oferece o
 * botão de discordar.
 *
 * Esta tela não é enfeite: sem ela o aluno vê a própria sequência cair e não
 * descobre por quê, o que é o pior resultado possível de uma feature de
 * antifraude — vira sensação de bug ou de perseguição, e nos dois casos ele
 * abandona o desafio.
 *
 * "Discordo" não é recurso automatizado e não desfaz a decisão: marca a
 * discordância e põe o caso no topo da fila do personal, para abrir conversa.
 */
export default function ChallengeReviewNotice({ challengeId, enabled }: Props) {
    const [rejected, setRejected] = useState<ReviewQueueEntry[]>([]);
    const [busyLog, setBusyLog] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!enabled) return;
        try {
            const queue = await getMyReviews(challengeId);
            setRejected(
                queue.entries.filter((e) => e.review_status === 'rejected'),
            );
        } catch {
            // Sem o antifraude ligado no servidor a rota não existe. O bloco
            // simplesmente não aparece.
            setRejected([]);
        }
    }, [challengeId, enabled]);

    useEffect(() => {
        void load();
    }, [load]);

    if (rejected.length === 0) return null;

    const contest = async (entry: ReviewQueueEntry) => {
        setBusyLog(entry.log_id);
        try {
            await contestReview(entry.log_id);
            await load();
        } catch {
            /* silencioso: o botão volta a ficar disponível */
        } finally {
            setBusyLog(null);
        }
    };

    return (
        <div className={s.box}>
            <h4 className={s.title}>
                <FiAlertCircle aria-hidden="true" /> Fotos não aceitas
            </h4>
            <p className={s.intro}>
                Estes dias não estão contando no seu ranking. Se você acha que
                houve engano, avise seu personal.
            </p>
            <ul className={s.list}>
                {rejected.map((entry) => (
                    <li key={entry.log_id} className={s.item}>
                        <div className={s.itemInfo}>
                            <strong>{fmtDay(entry.day)}</strong>
                            <span className={s.reason}>
                                {REJECT_REASON_LABELS[
                                    entry.reason as RejectReason
                                ] ?? 'Seu personal pediu uma nova foto'}
                            </span>
                            {entry.reason_note && (
                                <span className={s.note}>
                                    {entry.reason_note}
                                </span>
                            )}
                        </div>
                        {entry.contested_at ? (
                            <span className={s.contested}>
                                Seu personal foi avisado
                            </span>
                        ) : (
                            <button
                                type="button"
                                className={s.btnContest}
                                disabled={busyLog === entry.log_id}
                                onClick={() => void contest(entry)}
                            >
                                <FiMessageSquare aria-hidden="true" /> Discordo
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
