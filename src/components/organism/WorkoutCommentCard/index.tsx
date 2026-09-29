'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FiAlertTriangle, FiClock, FiCornerUpLeft, FiUser } from 'react-icons/fi';
import ReactionBar from '@/components/molecules/ReactionBar';
import ReplyComposer from '@/components/molecules/ReplyComposer';
import Button from '@/components/atoms/Button';
import {
    PAIN_TAG,
    WORKOUT_COMMENT_REPLY_MAX,
    daysUntilExpiry,
    describeCommentFacts,
    feelingOption,
    reactionOption,
} from '@/libs/workoutComment';
import { replyToComment, type WorkoutComment } from '@/libs/workoutCommentService';
import styles from './styles.module.css';

interface WorkoutCommentCardProps {
    comment: WorkoutComment;
    /** Veio da notificação: rola até aqui e destaca. */
    highlighted?: boolean;
    showStudent?: boolean;
    /** Chamado na primeira interação com um comentário não lido. */
    onRead?: (id: string) => void;
    onUpdated?: (comment: WorkoutComment) => void;
    /** Toast de erro do pai. */
    onError?: (message: string) => void;
}

function formatWorkoutDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/** Comentário do aluno na caixa do personal, com o resumo do treino junto —
 * o personal não precisa abrir outra tela para entender o contexto. */
export default function WorkoutCommentCard({
    comment,
    highlighted,
    showStudent = true,
    onRead,
    onUpdated,
    onError,
}: WorkoutCommentCardProps) {
    const ref = useRef<HTMLElement>(null);
    const [replying, setReplying] = useState(false);
    const [busy, setBusy] = useState(false);
    const unread = !comment.read_at;
    const feeling = feelingOption(comment.feeling);
    const hasPain = comment.tags.includes(PAIN_TAG);
    const facts = describeCommentFacts(
        comment.tags.filter((t) => t !== PAIN_TAG),
        [],
    );
    const w = comment.workout;
    const expires = daysUntilExpiry(comment.expires_at);

    useEffect(() => {
        if (!highlighted) return;
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (unread) onRead?.(comment.id);
        // Só na chegada pela notificação.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [highlighted]);

    const markRead = () => {
        if (unread) onRead?.(comment.id);
    };

    const sendReply = async (body: { reaction?: string; text?: string }) => {
        setBusy(true);
        try {
            const updated = await replyToComment(comment.id, {
                reaction: body.reaction ?? comment.reply?.reaction,
                text: body.text ?? comment.reply?.text,
            });
            onUpdated?.({ ...comment, ...updated, workout: comment.workout, student_name: comment.student_name });
            setReplying(false);
        } catch {
            onError?.('Não foi possível enviar a resposta. Tente de novo.');
        } finally {
            setBusy(false);
        }
    };

    const reaction = reactionOption(comment.reply?.reaction);

    return (
        <article
            ref={ref}
            className={[styles.card, unread && styles.unread, highlighted && styles.highlighted, hasPain && styles.painCard]
                .filter(Boolean)
                .join(' ')}
            onClick={markRead}
            onFocus={markRead}
        >
            <header className={styles.head}>
                {showStudent && (
                    <Link href={`/personal/aluno/${comment.student_id}/feedback`} className={styles.student}>
                        <FiUser aria-hidden /> {comment.student_name || 'Aluno'}
                    </Link>
                )}
                <span className={styles.when}>
                    Treino {comment.training_ref} · {formatWorkoutDate(comment.workout_at)}
                </span>
                {unread && <span className={styles.newTag}>Novo</span>}
            </header>

            {hasPain && (
                <p className={styles.painLine}>
                    <FiAlertTriangle aria-hidden /> {describeCommentFacts([PAIN_TAG], comment.pain_regions)}
                </p>
            )}

            {(feeling || facts) && (
                <p className={styles.facts}>
                    {feeling && (
                        <span className={styles.feeling}>
                            <span aria-hidden>{feeling.emoji}</span> {feeling.label}
                        </span>
                    )}
                    {facts && <span>{facts}</span>}
                </p>
            )}

            {comment.text && <p className={styles.text}>{comment.text}</p>}

            {w && (
                <div className={styles.workout}>
                    {w.photo_url && (
                        // Foto de check-in com URL assinada de validade curta.
                        <img src={w.photo_url} alt="Foto do check-in" className={styles.photo} />
                    )}
                    <ul className={styles.stats}>
                        {w.duration_minutes != null && <li>{w.duration_minutes} min</li>}
                        <li>{w.exercise_count} exercício(s)</li>
                        {w.volume_kg > 0 && <li>{w.volume_kg.toLocaleString('pt-BR')} kg de volume</li>}
                        {w.rpe_avg != null && <li>RPE médio {w.rpe_avg.toFixed(1)}</li>}
                        {w.late && <li className={styles.warn}>Registrado depois do prazo</li>}
                        {w.assisted && <li>Registrado no atendimento</li>}
                    </ul>
                    {w.exercise_notes && w.exercise_notes.length > 0 && (
                        <ul className={styles.notes}>
                            {w.exercise_notes.map((n, i) => (
                                <li key={`${n.exercise}-${i}`}>
                                    <strong>{n.exercise}:</strong> {n.note}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {comment.reply && !replying && (
                <div className={styles.reply}>
                    <FiCornerUpLeft aria-hidden />
                    <span>
                        {reaction && <span aria-label={reaction.label}>{reaction.emoji} </span>}
                        {comment.reply.text || (reaction ? 'Reação enviada' : '')}
                        {comment.reply.seen_at && <span className={styles.seen}> · o aluno viu</span>}
                    </span>
                </div>
            )}

            <footer className={styles.footer}>
                <ReactionBar
                    value={comment.reply?.reaction}
                    onReact={(r) => void sendReply({ reaction: r })}
                    disabled={busy}
                />
                {!replying && (
                    <Button variant="secondary" size="sm" onClick={() => setReplying(true)} disabled={busy}>
                        {comment.reply?.text ? 'Editar resposta' : 'Responder'}
                    </Button>
                )}
                <span className={styles.expires}>
                    <FiClock aria-hidden /> {expires === 0 ? 'expira hoje' : `expira em ${expires} dia(s)`}
                </span>
            </footer>

            {replying && (
                <ReplyComposer
                    maxLength={WORKOUT_COMMENT_REPLY_MAX}
                    placeholder="Resposta curta para o aluno"
                    initialValue={comment.reply?.text ?? ''}
                    busy={busy}
                    onSubmit={(text) => void sendReply({ text })}
                    onCancel={() => setReplying(false)}
                />
            )}
        </article>
    );
}
