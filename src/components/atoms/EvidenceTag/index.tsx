import React from 'react';
import styles from './styles.module.css';

interface EvidenceTagProps {
    children: React.ReactNode;
    /** Com onClick vira botão (ex.: abre o comentário enquanto ele existir). */
    onClick?: () => void;
    tone?: 'default' | 'metric';
    title?: string;
}

/**
 * Etiqueta de evidência do relatório: "12/08 · treino B · dor (joelho)" ou um
 * número do período ("Aderência"). A leitura da IA só afirma o que uma destas
 * etiquetas sustenta.
 */
export default function EvidenceTag({ children, onClick, tone = 'default', title }: EvidenceTagProps) {
    const className = `${styles.tag} ${tone === 'metric' ? styles.metric : ''}`;
    if (onClick) {
        return (
            <button type="button" className={`${className} ${styles.clickable}`} onClick={onClick} title={title}>
                {children}
            </button>
        );
    }
    return (
        <span className={className} title={title}>
            {children}
        </span>
    );
}
