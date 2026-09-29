'use client';

import React from 'react';
import { FEELINGS } from '@/libs/workoutComment';
import styles from './styles.module.css';

interface FeelingScaleProps {
    value: number | null;
    onChange: (value: number | null) => void;
    disabled?: boolean;
    /** Pergunta acima dos emojis. */
    label?: string;
}

/** "Como foi hoje?" em 5 emojis. Tocar de novo no escolhido desmarca: um
 * toque errado não pode virar resposta obrigatória. */
export default function FeelingScale({ value, onChange, disabled, label = 'Como foi hoje?' }: FeelingScaleProps) {
    return (
        <div className={styles.wrap}>
            <span className={styles.label} id="feeling-scale-label">
                {label}
            </span>
            <div className={styles.scale} role="radiogroup" aria-labelledby="feeling-scale-label">
                {FEELINGS.map((f) => {
                    const selected = value === f.value;
                    return (
                        <button
                            key={f.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            aria-label={f.label}
                            title={f.label}
                            className={`${styles.option} ${selected ? styles.selected : ''}`}
                            onClick={() => onChange(selected ? null : f.value)}
                            disabled={disabled}
                        >
                            <span className={styles.emoji} aria-hidden>
                                {f.emoji}
                            </span>
                            <span className={styles.caption}>{f.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
