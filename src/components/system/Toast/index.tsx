'use client';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Toast.module.css';

type ToastType = 'success' | 'error';
interface ToastState {
    id: number;
    type: ToastType;
    message: string;
}

/** Toast simples (sem provider global): cada tela que precisa de confirmação
 * transiente de sucesso/erro chama o hook e renderiza `ToastSlot`. */
export function useToast(durationMs = 4000) {
    const [toast, setToast] = useState<ToastState | null>(null);

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), durationMs);
        return () => clearTimeout(timer);
    }, [toast, durationMs]);

    const showSuccess = useCallback(
        (message: string) =>
            setToast({ id: Date.now(), type: 'success', message }),
        [],
    );
    const showError = useCallback(
        (message: string) =>
            setToast({ id: Date.now(), type: 'error', message }),
        [],
    );
    const dismiss = useCallback(() => setToast(null), []);

    const ToastSlot =
        toast && typeof document !== 'undefined'
            ? createPortal(
                  <div className={styles.wrap} role="status">
                      <div
                          className={
                              toast.type === 'success'
                                  ? styles.toastSuccess
                                  : styles.toastError
                          }
                      >
                          <span>{toast.message}</span>
                          <button
                              type="button"
                              className={styles.closeBtn}
                              onClick={dismiss}
                              aria-label="Fechar"
                          >
                              ✕
                          </button>
                      </div>
                  </div>,
                  document.body,
              )
            : null;

    return { showSuccess, showError, dismiss, ToastSlot };
}
