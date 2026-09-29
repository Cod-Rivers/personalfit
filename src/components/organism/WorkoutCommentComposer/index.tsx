'use client';

import React from 'react';
import Link from 'next/link';
import { FiMessageCircle } from 'react-icons/fi';
import FeelingScale from '@/components/molecules/FeelingScale';
import ChipGroup from '@/components/molecules/ChipGroup';
import {
    PAIN_REGIONS,
    PAIN_TAG,
    WORKOUT_COMMENT_MAX_TEXT,
    WORKOUT_COMMENT_RETENTION_DAYS,
    WORKOUT_COMMENT_TAGS,
    toggleRegion,
    toggleTag,
    type WorkoutCommentDraft,
} from '@/libs/workoutComment';
import styles from './styles.module.css';

interface WorkoutCommentComposerProps {
    /** Primeiro nome do personal (cache offline da janela de registro). */
    personalName: string | null;
    draft: WorkoutCommentDraft;
    onChange: (draft: WorkoutCommentDraft) => void;
    /** Pergunta contextual (workoutCommentPrompt). */
    prompt: string;
    /** O personal usa o relatório com IA e o aluno não saiu dele (D10). */
    aiReportEnabled: boolean;
    /** Lembrete leve: o aluno tocou em concluir sem comentar. */
    nudge?: boolean;
    disabled?: boolean;
}

/**
 * Comentário do aluno ao personal no passo de check-in
 * (Todo/PLANO_COMENTARIO_POS_TREINO.md, seção 5). Induz sem bloquear:
 * destinatário com nome, um toque basta (sensação ou chip), pergunta que muda
 * com o treino. Nada aqui é obrigatório para concluir.
 */
export default function WorkoutCommentComposer({
    personalName,
    draft,
    onChange,
    prompt,
    aiReportEnabled,
    nudge,
    disabled,
}: WorkoutCommentComposerProps) {
    const name = personalName?.trim() || null;
    const hasPain = draft.tags.includes(PAIN_TAG);

    return (
        <section className={styles.composer} aria-labelledby="workout-comment-title">
            <header className={styles.header}>
                <span className={styles.avatar} aria-hidden>
                    {name ? name.charAt(0).toUpperCase() : <FiMessageCircle />}
                </span>
                <span>
                    <h4 id="workout-comment-title" className={styles.title}>
                        Mensagem para {name ?? 'seu personal'}
                    </h4>
                    <span className={styles.subtitle}>{name ?? 'Seu personal'} lê todos os comentários.</span>
                </span>
            </header>

            <FeelingScale value={draft.feeling} onChange={(feeling) => onChange({ ...draft, feeling })} disabled={disabled} />

            <ChipGroup
                ariaLabel="Marcadores rápidos"
                options={WORKOUT_COMMENT_TAGS}
                selected={draft.tags}
                onToggle={(tag) => onChange(toggleTag(draft, tag))}
                toneFor={(v) => (v === PAIN_TAG ? 'danger' : 'default')}
                disabled={disabled}
            />

            {hasPain && (
                <div className={styles.pain}>
                    <span className={styles.painLabel}>Onde doeu?</span>
                    <ChipGroup
                        ariaLabel="Regiões com dor"
                        options={PAIN_REGIONS}
                        selected={draft.painRegions}
                        onToggle={(region) => onChange(toggleRegion(draft, region))}
                        toneFor={() => 'danger'}
                        disabled={disabled}
                    />
                </div>
            )}

            <label className={styles.textLabel}>
                <span className={styles.visuallyHidden}>Comentário</span>
                <textarea
                    className={styles.textarea}
                    value={draft.text}
                    maxLength={WORKOUT_COMMENT_MAX_TEXT}
                    placeholder={prompt}
                    onChange={(e) => onChange({ ...draft, text: e.target.value })}
                    disabled={disabled}
                    rows={3}
                />
            </label>
            <div className={styles.meta}>
                <span className={styles.notice}>
                    Só {name ?? 'seu personal'} vê. Fica guardado por {WORKOUT_COMMENT_RETENTION_DAYS} dias.
                    {aiReportEnabled && (
                        <>
                            {' '}
                            Pode entrar no relatório de acompanhamento, que usa IA.{' '}
                            <Link href="/meus-comentarios#privacidade" className={styles.link}>
                                Saber mais
                            </Link>
                        </>
                    )}
                </span>
                {draft.text.length > 0 && (
                    <span className={styles.counter}>
                        {draft.text.length}/{WORKOUT_COMMENT_MAX_TEXT}
                    </span>
                )}
            </div>

            {nudge && (
                <p className={styles.nudge} role="status">
                    Um toque num dos botões acima já ajuda {name ?? 'seu personal'} a ajustar seu treino.
                </p>
            )}
        </section>
    );
}
