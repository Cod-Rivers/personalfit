'use client';
import React, { useState } from 'react';
import { FiStar } from 'react-icons/fi';

interface StarRatingProps {
    initialValue?: number;
    initialComment?: string;
    label?: string;
    submitLabel?: string;
    onSubmit: (stars: number, comment: string) => Promise<void>;
    onCancel?: () => void;
    disabled?: boolean;
    /** Conteúdo entre o comentário e os botões (ex.: a autorização de
     *  publicar o comentário na loja). */
    extra?: React.ReactNode;
}

/** Estrelas de 1 a 5 + comentário opcional. Quem chama decide o que fazer
 *  depois de enviar (onSubmit rejeita em erro; a mensagem é de quem chama). */
export default function StarRating({
    initialValue = 0,
    initialComment = '',
    label = 'Avalie este treino:',
    submitLabel = 'Enviar avaliação',
    onSubmit,
    onCancel,
    disabled = false,
    extra,
}: StarRatingProps) {
    const [stars, setStars] = useState(initialValue);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState(initialComment);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (stars === 0 || submitting) return;
        setSubmitting(true);
        try {
            await onSubmit(stars, comment.trim());
        } catch {
            /* quem chama mostra o erro */
        } finally {
            setSubmitting(false);
        }
    };

    const blocked = disabled || submitting;

    return (
        <div>
            <p style={styles.label}>{label}</p>
            <div style={styles.starsRow} role="radiogroup" aria-label="Nota de 1 a 5 estrelas">
                {[1, 2, 3, 4, 5].map((n) => {
                    const lit = n <= (hover || stars);
                    return (
                        <button
                            key={n}
                            type="button"
                            role="radio"
                            aria-checked={stars === n}
                            aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
                            disabled={blocked}
                            onClick={() => setStars(n)}
                            onMouseEnter={() => setHover(n)}
                            onMouseLeave={() => setHover(0)}
                            style={{
                                ...styles.star,
                                color: lit ? 'var(--amber)' : 'var(--text-muted)',
                            }}
                        >
                            <FiStar style={{ fill: lit ? 'currentColor' : 'none' }} />
                        </button>
                    );
                })}
            </div>
            <textarea
                style={styles.textarea}
                placeholder="Comentário (opcional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={blocked}
                maxLength={500}
                rows={2}
            />
            {extra}
            <div className="d-flex gap-2 flex-wrap">
                <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleSubmit}
                    disabled={stars === 0 || blocked}
                >
                    {submitting ? 'Enviando...' : submitLabel}
                </button>
                {onCancel && (
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={onCancel}
                        disabled={submitting}
                    >
                        Cancelar
                    </button>
                )}
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    label: {
        margin: '0 0 6px',
        fontSize: '0.9rem',
        color: 'var(--text-secondary)',
    },
    starsRow: {
        display: 'flex',
        gap: 2,
        marginBottom: 10,
    },
    star: {
        background: 'transparent',
        border: 'none',
        padding: 4,
        fontSize: '1.6rem',
        lineHeight: 1,
        display: 'inline-flex',
        cursor: 'pointer',
        transition: 'color 0.15s',
    },
    textarea: {
        width: '100%',
        background: 'var(--surface-2)',
        border: '1px solid var(--border-mid)',
        borderRadius: 6,
        color: 'var(--text-primary)',
        padding: '8px 10px',
        fontSize: '1rem',
        resize: 'vertical',
        marginBottom: 10,
        boxSizing: 'border-box',
    },
};
