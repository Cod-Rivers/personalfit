'use client';

import React from 'react';
import { REPLY_REACTIONS } from '@/libs/workoutComment';
import styles from './styles.module.css';

interface ReactionBarProps {
    value?: string | null;
    onReact: (reaction: string) => void;
    disabled?: boolean;
}

/** Reação de um toque do personal ao comentário (👏 💪 🔥 ❤️ 👍). */
export default function ReactionBar({ value, onReact, disabled }: ReactionBarProps) {
    return (
        <div className={styles.bar} role="group" aria-label="Reagir ao comentário">
            {REPLY_REACTIONS.map((r) => (
                <button
                    key={r.value}
                    type="button"
                    className={`${styles.reaction} ${value === r.value ? styles.selected : ''}`}
                    aria-pressed={value === r.value}
                    aria-label={r.label}
                    title={r.label}
                    onClick={() => onReact(r.value)}
                    disabled={disabled}
                >
                    <span aria-hidden>{r.emoji}</span>
                </button>
            ))}
        </div>
    );
}
