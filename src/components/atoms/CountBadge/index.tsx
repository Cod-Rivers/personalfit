import React from 'react';
import styles from './styles.module.css';

interface CountBadgeProps {
    count: number;
    /** Texto para leitor de tela ("3 comentários não lidos"). */
    label: string;
    icon?: React.ReactNode;
    tone?: 'mint' | 'coral';
}

/** Selo com contagem (não lidos, alunos com atenção). Some com zero. */
export default function CountBadge({ count, label, icon, tone = 'mint' }: CountBadgeProps) {
    if (count <= 0) return null;
    return (
        <span className={`${styles.badge} ${tone === 'coral' ? styles.coral : ''}`} aria-label={label} title={label}>
            {icon}
            {count > 99 ? '99+' : count}
        </span>
    );
}
