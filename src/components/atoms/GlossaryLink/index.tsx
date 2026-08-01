'use client';

import Link from 'next/link';
import styles from './styles.module.css';

interface GlossaryLinkProps {
    /** id do verbete em glossaryContent.ts (âncora #glossario-<id>) */
    id: string;
    children: React.ReactNode;
}

/** Link discreto (sublinhado pontilhado) que leva ao cartão correspondente
 * no Glossário da Central de Ajuda (/ajuda#glossario-<id>). */
export default function GlossaryLink({ id, children }: GlossaryLinkProps) {
    return (
        <Link href={`#glossario-${id}`} className={styles.term}>
            {children}
        </Link>
    );
}
