'use client';

import { useState } from 'react';
import { useFCMToken } from '@/hooks/useFCMToken';

export default function FCMProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const { permissionDenied } = useFCMToken();
    const [dismissed, setDismissed] = useState(false);

    return (
        <>
            {permissionDenied && !dismissed && (
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
            {children}
        </>
    );
}
