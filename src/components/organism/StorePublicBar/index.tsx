'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import s from './StorePublicBar.module.css';

/** Topo das páginas públicas da loja para quem não está logado (o Header do
 *  app manda para o login). "Entrar" e "Criar conta" voltam para a página em
 *  que a pessoa estava. */
export default function StorePublicBar() {
    const pathname = usePathname() || '/loja';
    const back = encodeURIComponent(pathname);
    return (
        <div className={s.bar}>
            <Link href="/loja" className={s.brand}>
                Venafit<span>Loja de treinos</span>
            </Link>
            <nav className={s.actions} aria-label="Conta">
                <Link href={`/?redirect=${back}`} className={s.login}>
                    Entrar
                </Link>
                <Link href={`/cadastro?redirect=${back}`} className={s.signup}>
                    Criar conta
                </Link>
            </nav>
        </div>
    );
}
