'use client';

import { useEffect, useState } from 'react';
import { useFCMToken } from '@/hooks/useFCMToken';
import { useVisiblePolling } from '@/hooks/useVisiblePolling';
import { listenNativePushToken } from '@/libs/nativePush';
import { getToken, refreshNativeAuthToken } from '@/libs/session';
import { renewSession } from '@/libs/sessionHeartbeat';

const SESSION_HEARTBEAT_INTERVAL_MS = 30 * 60 * 1000;

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

    // Heartbeat de sessão: renova o access token em silêncio a cada 30min
    // com a página aberta (pausa em aba oculta, renova na volta do foco —
    // ver useVisiblePolling). Roda igual no navegador e no app Android, já
    // que o app é a mesma página carregada dentro de uma WebView. `enabled`
    // só fica true após um carregamento com sessão salva (login/reload) —
    // como este app navega entre telas autenticadas via window.location,
    // isso é reavaliado a cada troca de estado logado/deslogado.
    useVisiblePolling(
        () => {
            void renewSession();
        },
        SESSION_HEARTBEAT_INTERVAL_MS,
        Boolean(getToken()),
    );

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
