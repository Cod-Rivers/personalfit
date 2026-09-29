'use client';

import React from 'react';
import styles from './styles.module.css';

export type ChoiceChipTone = 'default' | 'danger';

interface ChoiceChipProps {
    selected: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    /** "danger" para escolhas de alerta (ex.: "Senti dor"). */
    tone?: ChoiceChipTone;
    disabled?: boolean;
}

/**
 * Chip de escolha de um toque (liga/desliga). É um botão com aria-pressed,
 * não um checkbox escondido: funciona com leitor de tela e com o toque do
 * celular sem precisar de label associada.
 */
export default function ChoiceChip({ selected, onToggle, children, tone = 'default', disabled }: ChoiceChipProps) {
    const classes = [styles.chip, tone === 'danger' && styles.danger, selected && styles.selected]
        .filter(Boolean)
        .join(' ');
    return (
        <button type="button" className={classes} aria-pressed={selected} onClick={onToggle} disabled={disabled}>
            {children}
        </button>
    );
}
