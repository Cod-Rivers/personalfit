'use client';

import React from 'react';
import ChoiceChip, { type ChoiceChipTone } from '@/components/atoms/ChoiceChip';
import styles from './styles.module.css';

export interface ChipOption {
    value: string;
    label: string;
}

interface ChipGroupProps {
    options: readonly ChipOption[];
    selected: readonly string[];
    onToggle: (value: string) => void;
    /** Rótulo do grupo para leitor de tela. */
    ariaLabel: string;
    /** Tom de um valor específico (ex.: "dor" em vermelho). */
    toneFor?: (value: string) => ChoiceChipTone;
    disabled?: boolean;
}

/** Chips de múltipla escolha, quebrando linha no celular. */
export default function ChipGroup({ options, selected, onToggle, ariaLabel, toneFor, disabled }: ChipGroupProps) {
    return (
        <div className={styles.group} role="group" aria-label={ariaLabel}>
            {options.map((o) => (
                <ChoiceChip
                    key={o.value}
                    selected={selected.includes(o.value)}
                    onToggle={() => onToggle(o.value)}
                    tone={toneFor?.(o.value)}
                    disabled={disabled}
                >
                    {o.label}
                </ChoiceChip>
            ))}
        </div>
    );
}
