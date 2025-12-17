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
            console.log(user);
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
        <nav className="navbar navbar-expand-lg navbar-dark bg-header">
            <div className="container-fluid">
                <ClientOnly fallback={<span className="navbar-brand">Carregando...</span>}>
                    <a className="navbar-brand" href="#">
                        Olá, {user.name}
                    </a>
                </ClientOnly>
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
                        <li className="nav-item dropdown">
                            <a
                                className="nav-link dropdown-toggle"
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
                                        href="/anaminese"
                                    >
                                        Refazer anaminese
                                    </Link>
                                </li>
                            </ul>
                        </li>
                    </ul>
                    <ClientOnly>
                        <div className="d-flex gap-2" role="search">
                            <Link href="/perfil" className="me-4 d-flex align-items-center">
                                <i className="fa-solid fa-user" style={{
                                    color: 'white',
                                }}></i>
                            </Link>
                            <button
                                className="btn btn-gold"
                                type="submit"
                                onClick={logout}
                            >
                                Sair
                            </button>
                        </div>
                    </ClientOnly>
                </div>
            </div>
        </nav>
    );
};

export default Header;
