'use client';

import React from 'react';
import { FiChevronRight } from 'react-icons/fi';
import s from '../../builder.module.css';

/**
 * Linha que leva ao próximo card.
 *
 * É a peça central do editor por blocos: o que não cabe nos ~6 controles de uma
 * tela vira uma linha com RESUMO, em vez de um bloco recolhível que empurra o
 * resto para baixo. O resumo é obrigatório de propósito — uma linha só com o
 * título obriga a abrir o card para saber o que tem lá dentro, que é
 * exatamente o problema que este editor existe para resolver.
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
    /** "warning" destaca a linha quando falta algo (ex.: treino sem exercício). */
    tone?: 'default' | 'warning';
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={tone === 'warning' ? s.navRowWarning : s.navRow}
        >
            {leading && <span className={s.navRowLeading}>{leading}</span>}
            <span className={s.navRowText}>
                <span className={s.navRowTitle}>{title}</span>
                <span className={s.navRowSummary}>{summary}</span>
            </span>
            <span className={s.navRowChevron} aria-hidden>
                <FiChevronRight />
            </span>
        </button>
    );
}
