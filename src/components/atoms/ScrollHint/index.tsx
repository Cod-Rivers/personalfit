'use client';
import React, { useEffect, useRef, useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import styles from './ScrollHint.module.css';

/**
 * Seta que sinaliza "há mais conteúdo abaixo" em telas onde usuários não
 * percebem que a área é rolável (relatado em iPhone 15 e telas do mesmo
 * tamanho). Aparece só enquanto o container `.main-content` estiver com
 * overflow e o usuário ainda não tiver rolado nesta visita à página; some
 * no primeiro gesto de scroll para não virar ruído visual permanente.
 */
export default function ScrollHint() {
    const [visible, setVisible] = useState(false);
    const dismissedRef = useRef(false);

    useEffect(() => {
        const container = document.querySelector<HTMLElement>('.main-content');
        if (!container) return;

        const checkOverflow = () => {
            if (dismissedRef.current) return;
            const overflowing =
                container.scrollHeight - container.clientHeight > 48;
            setVisible(overflowing);
        };

        checkOverflow();

        const resizeObserver = new ResizeObserver(checkOverflow);
        resizeObserver.observe(container);

        const handleScroll = () => {
            if (container.scrollTop <= 4) return;
            dismissedRef.current = true;
            setVisible(false);
        };
        container.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            resizeObserver.disconnect();
            container.removeEventListener('scroll', handleScroll);
        };
    }, []);

    if (!visible) return null;

    return (
        <div className={styles.hint} aria-hidden="true">
            <FiChevronDown />
        </div>
    );
}
