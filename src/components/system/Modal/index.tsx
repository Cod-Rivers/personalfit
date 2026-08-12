'use client';
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import styles from './Modal.module.css';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    closeOnBackdrop?: boolean;
}

/** Pilha dos modais abertos, na ordem em que foram montados. Só o do topo
 * responde ao Escape: modais aninhados são comuns aqui (player de vídeo dentro
 * do card de exercício, card de exercício dentro do editor de mesociclo) e sem
 * isso um Escape fecharia todos de uma vez — no editor, descartando o
 * formulário inteiro sem querer. */
const openModals: symbol[] = [];

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
    const idRef = useRef<symbol | null>(null);
    if (idRef.current === null) idRef.current = Symbol('modal');

    // onClose vive num ref para o efeito abaixo depender só de `open`: se ele
    // remontasse a cada nova identidade de onClose, o modal se reempilharia e
    // passaria à frente de um filho já aberto na disputa pelo Escape.
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    });

    useEffect(() => {
        if (!open) return;
        const id = idRef.current as symbol;
        openModals.push(id);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (openModals[openModals.length - 1] !== id) return;
            onCloseRef.current();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            const idx = openModals.indexOf(id);
            if (idx !== -1) openModals.splice(idx, 1);
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    // No Safari iOS, elementos com position:fixed são posicionados contra o
    // layout viewport, que não encolhe quando o teclado abre — só o visual
    // viewport encolhe. Resultado: o rodapé (com os botões de Cancelar/
    // Cadastrar) fica fora da área visível, atrás do teclado, num formulário
    // como o de "Adicionar Aluno". Espelhamos a altura real em --modal-vh
    // para o CSS poder se ajustar.
    useEffect(() => {
        if (!open) return;
        const vv = window.visualViewport;
        if (!vv) return;
        const update = () =>
            document.documentElement.style.setProperty(
                '--modal-vh',
                `${vv.height}px`,
            );
        update();
        vv.addEventListener('resize', update);
        return () => {
            vv.removeEventListener('resize', update);
            document.documentElement.style.removeProperty('--modal-vh');
        };
    }, [open]);

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
                            <FiX />
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
