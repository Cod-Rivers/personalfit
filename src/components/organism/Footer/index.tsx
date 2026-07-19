'use client';
import React from 'react';
import Link from 'next/link';
import './styles.css';

const Footer: React.FC = () => {
    const year = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="container">
                <p className="footer__brand mb-1">Venafit</p>
                <p className="footer__copy mb-0">
                    &copy; {year} Venafit. Todos os direitos reservados.
                    {' · '}
                    <Link href="/ajuda">Central de Ajuda</Link>
                    {' · '}
                    <Link href="/politica-privacidade">
                        Política de Privacidade
                    </Link>
                </p>
            </div>
        </footer>
    );
};

export default Footer;
