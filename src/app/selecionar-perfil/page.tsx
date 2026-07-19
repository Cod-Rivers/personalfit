'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserData {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface PendingAuth {
    token: string;
    refresh_token: string;
    user: UserData;
    alt_token: string;
    alt_user: UserData;
}

export default function SelecionarPerfil() {
    const router = useRouter();
    const [pending, setPending] = useState<PendingAuth | null>(null);

    useEffect(() => {
        const raw = sessionStorage.getItem('pending_auth');
        if (!raw) {
            router.replace('/');
            return;
        }
        setPending(JSON.parse(raw));
    }, [router]);

    const choose = (user: UserData, token: string, refreshToken: string) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', token);
        localStorage.setItem('refresh_token', refreshToken);
        sessionStorage.removeItem('pending_auth');
        window.location.href =
            user.role === 'admin' || user.role === 'content_editor'
                ? '/admin'
                : user.role === 'personal'
                  ? '/personal'
                  : '/app';
    };

    if (!pending) return null;

    const roleLabel = (role: string) =>
        role === 'admin'
            ? 'Administrador'
            : role === 'content_editor'
              ? 'Editor de Conteúdo'
              : role === 'personal'
                ? 'Personal Trainer'
                : 'Aluno';

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0f0f0f',
            }}
        >
            <div style={{ textAlign: 'center', color: '#fff' }}>
                <h1 style={{ marginBottom: 8 }}>Selecionar Perfil</h1>
                <p style={{ color: '#aaa', marginBottom: 32 }}>
                    Você possui dois perfis com este CPF. Escolha com qual
                    deseja entrar.
                </p>
                <div
                    style={{
                        display: 'flex',
                        gap: 24,
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                    }}
                >
                    <button
                        onClick={() =>
                            choose(
                                pending.user,
                                pending.token,
                                pending.refresh_token,
                            )
                        }
                        style={cardStyle}
                    >
                        <span style={{ fontSize: 40 }}>
                            {pending.user.role === 'admin'
                                ? '🛡️'
                                : pending.user.role === 'personal'
                                  ? '💪'
                                  : '🏃'}
                        </span>
                        <strong style={{ fontSize: 18, marginTop: 8 }}>
                            {pending.user.name}
                        </strong>
                        <span style={{ color: '#f0c040', fontWeight: 600 }}>
                            {roleLabel(pending.user.role)}
                        </span>
                        <span style={{ color: '#aaa', fontSize: 14 }}>
                            {pending.user.email}
                        </span>
                    </button>
                    <button
                        onClick={() =>
                            choose(
                                pending.alt_user,
                                pending.alt_token,
                                pending.refresh_token,
                            )
                        }
                        style={cardStyle}
                    >
                        <span style={{ fontSize: 40 }}>
                            {pending.alt_user.role === 'admin'
                                ? '🛡️'
                                : pending.alt_user.role === 'personal'
                                  ? '💪'
                                  : '🏃'}
                        </span>
                        <strong style={{ fontSize: 18, marginTop: 8 }}>
                            {pending.alt_user.name}
                        </strong>
                        <span style={{ color: '#f0c040', fontWeight: 600 }}>
                            {roleLabel(pending.alt_user.role)}
                        </span>
                        <span style={{ color: '#aaa', fontSize: 14 }}>
                            {pending.alt_user.email}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}

const cardStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: '32px 40px',
    background: '#1a1a1a',
    border: '2px solid #333',
    borderRadius: 16,
    cursor: 'pointer',
    color: '#fff',
    transition: 'border-color 0.2s',
    minWidth: 200,
};
