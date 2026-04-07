'use client';
import React, { useEffect, useState } from 'react';
import ClientOnly from '@/components/molecules/ClientOnly';
import { useMounted } from '@/hooks/useMounted';

import './styles.css';
import { IUser } from './interface';
import Link from 'next/link';

const Header: React.FC = () => {
    const [user, setUser] = useState<IUser>({});
    const mounted = useMounted();

    const checkUser = () => {
        if (typeof window === 'undefined') return;

        const user = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (user && token) {
            setUser(JSON.parse(user));
            return;
        }
        window.location.href = '/';
    };

    const logout = () => {
        if (typeof window === 'undefined') return;

        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/';
    };

    useEffect(() => {
        if (mounted) {
            checkUser();
        }
    }, [mounted]);

    return (
        <nav className="bottom-nav">
            <ClientOnly fallback={null}>
                <Link href="/app" className="bottom-nav__item">
                    <i className="fa-solid fa-house"></i>
                    <span>Início</span>
                </Link>
                <Link href="/anaminese" className="bottom-nav__item">
                    <i className="fa-solid fa-clipboard-list"></i>
                    <span>Anaminese</span>
                </Link>
                <Link href="/perfil" className="bottom-nav__item">
                    <i className="fa-solid fa-user"></i>
                    <span>{user.name ? user.name.split(' ')[0] : 'Perfil'}</span>
                </Link>
                <button className="bottom-nav__item bottom-nav__logout" onClick={logout}>
                    <i className="fa-solid fa-right-from-bracket"></i>
                    <span>Sair</span>
                </button>
            </ClientOnly>
        </nav>
    );
};

export default Header;

