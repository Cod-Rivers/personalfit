'use client';
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    closeOnBackdrop?: boolean;
}

/**
 * Sheet full-screen: preenche a área abaixo do header (que permanece visível,
 * pois o backdrop começa em --app-header-height) e cobre o footer, que fica
 * sempre fixo na base do viewport no layout atual.
 */
export default function Modal({
    open,
    onClose,
    title,
    children,
    footer,
    closeOnBackdrop = true,
}: ModalProps) {
    useEffect(() => {
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, onClose]);

    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className={styles.backdrop}
            onClick={closeOnBackdrop ? onClose : undefined}
            role="presentation"
        >
            <div
                className={styles.sheet}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {title && (
                    <div className={styles.sheetHeader}>
                        <h2 className={styles.title}>{title}</h2>
                        <button
                            type="button"
                            className={styles.closeBtn}
                            onClick={onClose}
                            aria-label="Fechar"
                        >
                            ✕
                        </button>
                    </div>
                )}
                <div className={styles.body}>{children}</div>
                {footer && <div className={styles.footer}>{footer}</div>}
            </div>
        </div>,
        document.body,
    );
}
