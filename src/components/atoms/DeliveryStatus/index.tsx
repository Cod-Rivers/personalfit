import React from 'react';
import { FiCheck, FiMessageCircle } from 'react-icons/fi';
import type { CommentDeliveryState } from '@/libs/workoutCommentService';
import styles from './styles.module.css';

const LABELS: Record<CommentDeliveryState | 'queued', string> = {
    queued: 'Vai quando tiver internet',
    sent: 'Enviado',
    seen: 'Visto',
    replied: 'Resposta nova',
    reply_seen: 'Respondido',
};

/** ✓ enviado · ✓✓ visto · 💬 respondido — o retorno que faz o aluno voltar a
 * comentar. Ícone e texto juntos: o estado não depende só da cor. */
export default function DeliveryStatus({ state }: { state: CommentDeliveryState | 'queued' }) {
    const icon =
        state === 'replied' || state === 'reply_seen' ? (
            <FiMessageCircle aria-hidden />
        ) : state === 'seen' ? (
            <span className={styles.double} aria-hidden>
                <FiCheck />
                <FiCheck />
            </span>
        ) : state === 'sent' ? (
            <FiCheck aria-hidden />
        ) : null;
    return (
        <span className={`${styles.status} ${styles[state]}`}>
            {icon}
            {LABELS[state]}
        </span>
    );
}
