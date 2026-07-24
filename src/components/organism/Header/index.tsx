'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';

import './styles.css';
import { IUser } from './types';
import Link from 'next/link';
import * as notifService from '@/libs/notificationService';
import * as studentLinkService from '@/libs/studentLinkService';
import { useTheme } from '@/context/ThemeContext';
import { useBranding } from '@/context/BrandingContext';
import AvatarUpload from '@/components/molecules/AvatarUpload';
import { clearSession } from '@/libs/session';

const Header: React.FC = () => {
    const { theme, toggleTheme } = useTheme();
    const { branding } = useBranding();
    const pathname = usePathname();
    const [user, setUser] = useState<IUser>({});
    const [notifications, setNotifications] = useState<
        notifService.Notification[]
    >([]);
    const [showNotif, setShowNotif] = useState(false);
    const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
        if (typeof window === 'undefined') return [];
        try {
            return JSON.parse(
                localStorage.getItem('dismissedNotifications') ?? '[]',
            );
        } catch {
            return [];
        }
    });
    const [linkStatus, setLinkStatus] =
        useState<studentLinkService.LinkStatus | null>(null);
    const [linkResponding, setLinkResponding] = useState(false);
    const [linkError, setLinkError] = useState('');
    const [linkBannerDismissed, setLinkBannerDismissed] = useState(false);

    const checkUser = () => {
        const user = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (user && token) {
            setUser(JSON.parse(user));
            return;
        }
        window.location.href = '/';
    };

    const fetchNotifications = useCallback(async () => {
        try {
            const data = await notifService.getMyNotifications();
            setNotifications(data);
        } catch {
            /* silent */
        }
    }, []);

    const fetchLinkStatus = useCallback(async () => {
        try {
            const status = await studentLinkService.getMyLinkStatus();
            setLinkStatus(status);
        } catch {
            /* silent */
        }
    }, []);

    useEffect(checkUser, []);
    useEffect(() => {
        fetchNotifications();
        // Polling a cada 30 segundos para notificações em tempo real
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    useEffect(() => {
        // Buscamos independentemente da role: uma conta admin/personal pode
        // também ter um vínculo de aluno na mesma conta.
        if (!user.name) return;
        fetchLinkStatus();
        const interval = setInterval(fetchLinkStatus, 30000);
        return () => clearInterval(interval);
    }, [user.name, fetchLinkStatus]);

    const isOnStudentArea =
        pathname.startsWith('/app') ||
        pathname.startsWith('/meus-treinos') ||
        pathname.startsWith('/agendamentos') ||
        pathname.startsWith('/anamnese');
    const showProfileSwitcher =
        linkStatus === 'active' && user.role !== 'student';

    const handleAcceptLink = async () => {
        setLinkError('');
        setLinkResponding(true);
        try {
            await studentLinkService.acceptPersonalLink();
            await fetchLinkStatus();
        } catch {
            setLinkError('Erro ao confirmar o vínculo. Tente novamente.');
        } finally {
            setLinkResponding(false);
        }
    };

    const handleDeclineLink = async () => {
        setLinkError('');
        setLinkResponding(true);
        try {
            await studentLinkService.declinePersonalLink();
            await fetchLinkStatus();
        } catch {
            setLinkError('Erro ao recusar o vínculo. Tente novamente.');
        } finally {
            setLinkResponding(false);
        }
    };

    const visibleNotifications = notifications.filter(
        (n) => !dismissedIds.includes(n.id),
    );
    const unreadCount = visibleNotifications.filter((n) => !n.read).length;

    const handleMarkRead = async (id: string) => {
        try {
            await notifService.markAsRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
            );
        } catch {
            /* silent */
        }
    };

    const handleDismiss = (id: string) => {
        setDismissedIds((prev) => {
            const next = [...prev, id];
            localStorage.setItem(
                'dismissedNotifications',
                JSON.stringify(next),
            );
            return next;
        });
        handleMarkRead(id);
    };

    const logout = async () => {
        // Limpa localStorage, cookies e os dados sensíveis de saúde/treino em
        // cache local (IndexedDB offline + Cache Storage) — ver libs/session.ts.
        await clearSession();
        window.location.href = '/';
    };

    const anamineseLinkClass = `nav-link dropdown-toggle${pathname.startsWith('/anamnese') ? ' nav-link-active' : ''}`;
    const agendaLinkClass = `nav-link${pathname.startsWith('/personal/agenda') ? ' nav-link-active' : ''}`;
    const agendamentosLinkClass = `nav-link${pathname.startsWith('/agendamentos') ? ' nav-link-active' : ''}`;

    return (
        <>
        {linkStatus === 'pending' && !linkBannerDismissed && (
            <div
                className="d-flex flex-wrap align-items-center justify-content-between gap-2 px-3 py-2"
                style={{ background: '#f3a928', color: '#1a1a1a' }}
            >
                <span>
                    Seu personal quer reativar seu vínculo. Confirmar?
                    {linkError && (
                        <strong style={{ marginLeft: 8 }}>{linkError}</strong>
                    )}
                </span>
                <div className="d-flex align-items-center gap-2">
                    <button
                        className="btn btn-sm btn-dark"
                        onClick={handleAcceptLink}
                        disabled={linkResponding}
                    >
                        {linkResponding ? 'Aguarde...' : 'Aceitar'}
                    </button>
                    <button
                        className="btn btn-sm btn-outline-dark"
                        onClick={handleDeclineLink}
                        disabled={linkResponding}
                    >
                        Recusar
                    </button>
                    <button
                        type="button"
                        className="btn-close"
                        aria-label="Fechar"
                        onClick={() => setLinkBannerDismissed(true)}
                    />
                </div>
            </div>
        )}
        <nav className="navbar navbar-expand-lg navbar-dark bg-header">
            <div className="container-fluid">
                <a
                    className="navbar-brand d-flex align-items-center gap-2"
                    href="#"
                >
                    <AvatarUpload
                        current={user.avatar}
                        name={user.name ?? '?'}
                        size={36}
                        editable
                        onUploaded={(uri) => {
                            setUser((prev) => ({ ...prev, avatar: uri }));
                            const stored = localStorage.getItem('user');
                            if (stored) {
                                const parsed = JSON.parse(stored);
                                parsed.avatar = uri;
                                localStorage.setItem(
                                    'user',
                                    JSON.stringify(parsed),
                                );
                            }
                        }}
                    />
                    {branding?.logo_base64 && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={branding.logo_base64}
                            alt="Logo"
                            style={{
                                height: 32,
                                width: 'auto',
                                objectFit: 'contain',
                                borderRadius: 6,
                            }}
                        />
                    )}
                    Olá, {user.name}
                </a>
                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarSupportedContent"
                    aria-controls="navbarSupportedContent"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div
                    className="collapse navbar-collapse"
                    id="navbarSupportedContent"
                >
                    <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                        {!user.has_personal && (
                            <li className="nav-item dropdown">
                                <a
                                    className={anamineseLinkClass}
                                    href="#"
                                    role="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    Anaminese
                                </a>
                                <ul className="dropdown-menu">
                                    <li>
                                        <Link
                                            className="dropdown-item"
                                            href="/anamnese"
                                        >
                                            Refazer anaminese
                                        </Link>
                                    </li>
                                </ul>
                            </li>
                        )}
                        {user.role === 'personal' && (
                            <li className="nav-item">
                                <Link
                                    className={agendaLinkClass}
                                    href="/personal/agenda"
                                >
                                    Agenda
                                </Link>
                            </li>
                        )}
                        {user.role === 'personal' && (
                            <li className="nav-item">
                                <Link
                                    className={`nav-link${pathname === '/minha-conta' ? ' nav-link-active' : ''}`}
                                    href="/minha-conta"
                                >
                                    Minha Conta
                                </Link>
                            </li>
                        )}
                        {user.role === 'student' && (
                            <li className="nav-item">
                                <Link
                                    className={agendamentosLinkClass}
                                    href="/agendamentos"
                                >
                                    Agendamentos
                                </Link>
                            </li>
                        )}
                        {user.role === 'student' && (
                            <li className="nav-item">
                                <Link
                                    className={`nav-link${pathname === '/minha-conta' ? ' nav-link-active' : ''}`}
                                    href="/minha-conta"
                                >
                                    Minha Conta
                                </Link>
                            </li>
                        )}
                        {user.role === 'student' && (
                            <li className="nav-item">
                                <Link
                                    className={`nav-link${pathname === '/plano-alimentar' ? ' nav-link-active' : ''}`}
                                    href="/plano-alimentar"
                                >
                                    Plano Alimentar
                                </Link>
                            </li>
                        )}
                        {user.role === 'student' && (
                            <li className="nav-item">
                                <Link
                                    className={`nav-link${pathname === '/evolucao' ? ' nav-link-active' : ''}`}
                                    href="/evolucao"
                                >
                                    Evolução
                                </Link>
                            </li>
                        )}
                    </ul>
                    <div
                        className="d-flex align-items-center gap-3"
                        role="search"
                    >
                        <div
                            className="notif-wrapper"
                            style={{ position: 'relative' }}
                        >
                            <button
                                className="btn-icon-luxe"
                                style={{
                                    fontSize: '1.3rem',
                                    position: 'relative',
                                }}
                                onClick={() => setShowNotif(!showNotif)}
                                aria-label="Notificações"
                            >
                                🔔
                                {unreadCount > 0 && (
                                    <span className="notif-badge">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>
                            {showNotif && (
                                <div className="notif-dropdown">
                                    <div className="notif-dropdown-header">
                                        <strong>Notificações</strong>
                                        <button
                                            type="button"
                                            className="notif-dropdown-close"
                                            aria-label="Fechar notificações"
                                            onClick={() => setShowNotif(false)}
                                        >
                                            ×
                                        </button>
                                    </div>
                                    {visibleNotifications.length === 0 ? (
                                        <p className="notif-empty">
                                            Nenhuma notificação
                                        </p>
                                    ) : (
                                        <ul className="notif-list">
                                            {visibleNotifications
                                                .slice(0, 10)
                                                .map((n) => (
                                                    <li
                                                        key={n.id}
                                                        className={`notif-item ${!n.read ? 'notif-unread' : ''}`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="notif-item-check"
                                                            aria-label="Marcar como vista"
                                                            title="Marcar como vista"
                                                            onChange={() =>
                                                                handleDismiss(
                                                                    n.id,
                                                                )
                                                            }
                                                        />
                                                        <div
                                                            className="notif-item-body"
                                                            onClick={() =>
                                                                !n.read &&
                                                                handleMarkRead(
                                                                    n.id,
                                                                )
                                                            }
                                                        >
                                                            <strong className="notif-item-title">
                                                                {n.title}
                                                            </strong>
                                                            <p className="notif-item-msg">
                                                                {n.message}
                                                            </p>
                                                            <span className="notif-item-date">
                                                                {new Date(
                                                                    n.created_at,
                                                                ).toLocaleDateString(
                                                                    'pt-BR',
                                                                )}
                                                            </span>
                                                        </div>
                                                    </li>
                                                ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                        {showProfileSwitcher && (
                            <Link
                                href={
                                    isOnStudentArea
                                        ? user.role === 'admin' ||
                                          user.role === 'content_editor'
                                            ? '/admin'
                                            : '/personal'
                                        : '/meus-treinos'
                                }
                                className="btn-luxe"
                            >
                                {isOnStudentArea
                                    ? '← Voltar ao Painel'
                                    : 'Ver como Aluno'}
                            </Link>
                        )}
                        <Link
                            href="/ajuda"
                            className="btn-icon-luxe"
                            aria-label="Central de Ajuda"
                            title="Central de Ajuda"
                        >
                            ❓
                        </Link>
                        <button
                            className="btn-icon-luxe"
                            type="button"
                            onClick={toggleTheme}
                            aria-label="Alternar tema"
                        >
                            {theme === 'light' ? '🌙' : '☀️'}
                        </button>
                        <button
                            className="btn-luxe"
                            type="submit"
                            onClick={logout}
                        >
                            Sair
                        </button>
                    </div>
                </div>
            </div>
        </nav>
        </>
    );
};

export default Header;
