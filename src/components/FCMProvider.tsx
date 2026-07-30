'use client';

import { useEffect, useState } from 'react';
import { useFCMToken } from '@/hooks/useFCMToken';
import { listenNativePushToken } from '@/libs/nativePush';
import { refreshNativeAuthToken } from '@/libs/session';

export default function FCMProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const { permissionState, requestPermission } = useFCMToken();
    const [dismissed, setDismissed] = useState(false);

    // Registra o token de push nativo (app Android) quando presente. No web
    // comum é no-op — o push do navegador continua vindo do useFCMToken acima.
    useEffect(() => listenNativePushToken(), []);

    // Reenvia o token de sessão à bridge nativa a cada boot do app (não só
    // no login) — mantém o widget de calendário sincronizando mesmo sem
    // refresh token (ver refreshNativeAuthToken).
    useEffect(() => {
        refreshNativeAuthToken();
    }, []);

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
                        bottom: 'calc(16px + env(safe-area-inset-bottom))',
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
                        bottom: 'calc(16px + env(safe-area-inset-bottom))',
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
