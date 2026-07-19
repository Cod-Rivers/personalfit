'use client';
import React, { useState } from 'react';

interface StarRatingProps {
    initialValue?: number;
    onSubmit: (stars: number, comment: string) => Promise<void>;
    disabled?: boolean;
}

export default function StarRating({
    initialValue = 0,
    onSubmit,
    disabled = false,
}: StarRatingProps) {
    const [stars, setStars] = useState(initialValue);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async () => {
        if (stars === 0 || submitting) return;
        setSubmitting(true);
        try {
            await onSubmit(stars, comment);
            setSubmitted(true);
        } catch {
            /* parent handles */
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div style={styles.container}>
                <p style={styles.thanks}>✅ Avaliação enviada! Obrigado.</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <p style={styles.label}>Avalie este treino:</p>
            <div style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                    <span
                        key={n}
                        style={{
                            ...styles.star,
                            color:
                                n <= (hover || stars) ? '#f1c40f' : '#4a5568',
                            cursor: disabled ? 'default' : 'pointer',
                        }}
                        onClick={() => !disabled && setStars(n)}
                        onMouseEnter={() => !disabled && setHover(n)}
                        onMouseLeave={() => !disabled && setHover(0)}
                    >
                        ★
                    </span>
                ))}
            </div>
            <textarea
                style={styles.textarea}
                placeholder="Comentário (opcional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={disabled}
                rows={2}
            />
            <button
                style={{
                    ...styles.btn,
                    opacity: stars === 0 || submitting ? 0.5 : 1,
                    cursor:
                        stars === 0 || submitting ? 'not-allowed' : 'pointer',
                }}
                onClick={handleSubmit}
                disabled={stars === 0 || submitting || disabled}
            >
                {submitting ? 'Enviando...' : 'Enviar Avaliação'}
            </button>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        background: '#1a1a2e',
        border: '1px solid #2a2a4a',
        borderRadius: 10,
        padding: 16,
        marginTop: 16,
    },
    label: {
        margin: '0 0 8px',
        fontSize: '0.9rem',
        color: '#c8d6e5',
    },
    starsRow: {
        display: 'flex',
        gap: 4,
        marginBottom: 10,
    },
    star: {
        fontSize: '1.6rem',
        transition: 'color 0.15s',
    },
    textarea: {
        width: '100%',
        background: '#0f0f23',
        border: '1px solid #2a2a4a',
        borderRadius: 6,
        color: '#fff',
        padding: '8px 10px',
        fontSize: '0.85rem',
        resize: 'vertical' as const,
        marginBottom: 10,
        boxSizing: 'border-box' as const,
    },
    btn: {
        background: '#5bc0be',
        color: '#0b132b',
        border: 'none',
        padding: '8px 18px',
        borderRadius: 6,
        fontWeight: 600,
        fontSize: '0.85rem',
    },
    thanks: {
        margin: 0,
        color: '#2ecc71',
        fontSize: '0.9rem',
    },
};
