'use client';
import type { ReactNode } from 'react';
import s from './finance.module.css';

interface FinanceSwitchProps {
    title: string;
    description?: ReactNode;
    checked: boolean;
    disabled?: boolean;
    onChange: (next: boolean) => void;
    /** Controle extra ao lado do título (ex.: seletor de dias). */
    extra?: ReactNode;
}

/** Linha de preferência com interruptor (mesmo visual de
 * AISubstitutionSettings). */
export default function FinanceSwitch({ title, description, checked, disabled, onChange, extra }: FinanceSwitchProps) {
    return (
        <div className={s.toggleRow}>
            <div className={s.toggleText}>
                <span className={s.toggleTitle}>{title}</span>
                {description && <span className={s.toggleDesc}>{description}</span>}
                {extra}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={title}
                className={checked ? s.switchOn : s.switchOff}
                disabled={disabled}
                onClick={() => onChange(!checked)}
            >
                <span className={s.switchKnob} />
            </button>
        </div>
    );
}
