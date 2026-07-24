'use client';

import { useState } from 'react';
import { useFCMToken } from '@/hooks/useFCMToken';

export default function FCMProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const { permissionState, requestPermission } = useFCMToken();
    const [dismissed, setDismissed] = useState(false);

    const showBlocked = permissionState === 'denied' && !dismissed;
    const showOptIn = permissionState === 'default' && !dismissed;

    return (
        <>
            {showBlocked && (
                <div
                    className="alert alert-warning alert-dismissible fade show m-2"
                    role="alert"
                    style={{
                        position: 'fixed',
                        bottom: 16,
                        left: 16,
                        right: 16,
                        zIndex: 9999,
                    }}
                >
                    <i className="fa-solid fa-bell-slash me-2"></i>
                    Notificações bloqueadas. Para recebê-las, habilite as
                    permissões nas configurações do navegador.
                    <button
                        type="button"
                        className="btn-close"
                        aria-label="Fechar"
                        onClick={() => setDismissed(true)}
                    />
                </div>
            )}
            {showOptIn && (
                <div
                    className="alert alert-info alert-dismissible fade show m-2"
                    role="alert"
                    style={{
                        position: 'fixed',
                        bottom: 16,
                        left: 16,
                        right: 16,
                        zIndex: 9999,
                    }}
                >
                    <i className="fa-solid fa-bell me-2"></i>
                    Ative as notificações para não perder avisos importantes.{' '}
                    <button
                        type="button"
                        className="btn btn-sm btn-primary ms-1"
                        onClick={() => requestPermission()}
                    >
                        Ativar
                    </button>
                    <button
                        type="button"
                        className="btn-close"
                        aria-label="Fechar"
                        onClick={() => setDismissed(true)}
                    />
                </div>
            )}
            {children}
        </>
    );
}
