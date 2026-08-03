'use client';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiCheckCircle, FiAlertTriangle, FiXCircle } from 'react-icons/fi';
import styles from './Toast.module.css';

type ToastType = 'success' | 'error' | 'warning';
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
    const showWarning = useCallback(
        (message: string) =>
            setToast({ id: Date.now(), type: 'warning', message }),
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
                                  : toast.type === 'warning'
                                    ? styles.toastWarning
                                    : styles.toastError
                          }
                      >
                          {toast.type === 'success' ? (
                              <FiCheckCircle className={styles.toastIcon} />
                          ) : toast.type === 'warning' ? (
                              <FiAlertTriangle className={styles.toastIcon} />
                          ) : (
                              <FiXCircle className={styles.toastIcon} />
                          )}
                          <span>{toast.message}</span>
                          <button
                              type="button"
                              className={styles.closeBtn}
                              onClick={dismiss}
                              aria-label="Fechar"
                          >
                              <FiX />
                          </button>
                      </div>
                  </div>,
                  document.body,
              )
            : null;

    return { showSuccess, showError, showWarning, dismiss, ToastSlot };
}
