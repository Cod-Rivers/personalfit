'use client';

import React from 'react';
import { FiCheck, FiChevronRight } from 'react-icons/fi';
import styles from './styles.module.css';

/** Agrupa linhas de navegação com o espaçamento certo entre elas. */
export function NavRowGroup({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={[styles.group, className].filter(Boolean).join(' ')}>
            {children}
        </div>
    );
}

export type NavRowTone = 'default' | 'warning' | 'done';

const ROW_CLASS: Record<NavRowTone, string> = {
    default: styles.row,
    warning: styles.rowWarning,
    done: styles.rowDone,
};

/**
 * Linha que leva ao próximo card.
 *
 * É a peça central dos editores por blocos: o que não cabe nos ~6 controles de
 * uma tela vira uma linha com RESUMO, em vez de um bloco recolhível que empurra
 * o resto para baixo. O resumo é obrigatório de propósito — uma linha só com o
 * título obriga a abrir o card para saber o que tem lá dentro, que é
 * exatamente o problema que este padrão existe para resolver.
 */
export default function NavRow({
    title,
    summary,
    leading,
    onClick,
    tone = 'default',
}: {
    title: string;
    summary: React.ReactNode;
    /** Miniatura, número de ordem ou ícone à esquerda. */
    leading?: React.ReactNode;
    onClick: () => void;
    /** "warning" quando falta algo; "done" quando o bloco já foi resolvido. */
    tone?: NavRowTone;
}) {
    return (
        <button type="button" onClick={onClick} className={ROW_CLASS[tone]}>
            {leading && <span className={styles.leading}>{leading}</span>}
            <span className={styles.text}>
                <span className={styles.title}>{title}</span>
                <span className={styles.summary}>{summary}</span>
            </span>
            <span
                className={tone === 'done' ? styles.chevronDone : styles.chevron}
                aria-hidden
            >
                {tone === 'done' ? <FiCheck /> : <FiChevronRight />}
            </span>
        </button>
    );
}

/** Classe da segunda linha de resumo, para quem precisa renderizar duas. */
export const navRowSummarySecondary = styles.summarySecondary;
