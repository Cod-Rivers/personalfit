'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft } from 'react-icons/fi';
import HelpTooltip from '@/components/atoms/HelpTooltip';
import styles from './styles.module.css';

interface FollowUpPageProps {
    title: string;
    icon?: React.ReactNode;
    subtitle?: React.ReactNode;
    /** Ajuda da página (balão "?"). */
    help?: { text: string; href: string };
    /** Ações à direita do título. */
    actions?: React.ReactNode;
    /** Rota do botão voltar; sem ela, volta no histórico. */
    backHref?: string;
    children: React.ReactNode;
}

/**
 * Layout das telas de acompanhamento (comentários e relatórios): título com
 * ajuda, subtítulo, voltar e o conteúdo numa coluna de leitura confortável.
 */
export default function FollowUpPage({ title, icon, subtitle, help, actions, backHref, children }: FollowUpPageProps) {
    const router = useRouter();
    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <header className={styles.header}>
                    <div className={styles.titleBlock}>
                        <h1 className={styles.title}>
                            {icon}
                            {title}
                            {help && <HelpTooltip text={help.text} href={help.href} label={`Ajuda sobre ${title}`} />}
                        </h1>
                        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
                    </div>
                    <div className={styles.actions}>
                        {actions}
                        <button
                            type="button"
                            className={styles.back}
                            onClick={() => (backHref ? router.push(backHref) : router.back())}
                        >
                            <FiArrowLeft aria-hidden /> Voltar
                        </button>
                    </div>
                </header>
                {children}
            </div>
        </div>
    );
}
