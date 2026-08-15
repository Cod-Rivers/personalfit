'use client';

import { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { useFCMToken } from '@/hooks/useFCMToken';
import { useVisiblePolling } from '@/hooks/useVisiblePolling';
import { listenNativePushToken } from '@/libs/nativePush';
import { getToken, refreshNativeAuthToken } from '@/libs/session';
import { renewSession } from '@/libs/sessionHeartbeat';
import s from './FCMProvider.module.css';

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

    const hasSession = Boolean(getToken());
    const showBlocked = hasSession && permissionState === 'denied' && !dismissed;
    const showOptIn = hasSession && permissionState === 'default' && !dismissed;

    return (
        <>
            {showBlocked && (
                <div className={s.banner} role="alert" aria-live="polite">
                    <button
                        type="button"
                        className={s.close}
                        aria-label="Fechar"
                        onClick={() => setDismissed(true)}
                    >
                        <FiX />
                    </button>
                    <p className={s.text}>
                        Notificações bloqueadas. Para recebê-las, habilite as
                        permissões nas configurações do navegador.
                    </p>
                </div>
            )}
            {showOptIn && (
                <div className={s.banner} role="alert" aria-live="polite">
                    <button
                        type="button"
                        className={s.close}
                        aria-label="Fechar"
                        onClick={() => setDismissed(true)}
                    >
                        <FiX />
                    </button>
                    <div className={s.row}>
                        <p className={s.text}>
                            Ative as notificações para não perder avisos
                            importantes.
                        </p>
                        <button
                            type="button"
                            className={s.actionBtn}
                            onClick={() => requestPermission()}
                        >
                            Ativar
                        </button>
                    </div>
                </div>
            )}
            {children}
        </>
    );
}
