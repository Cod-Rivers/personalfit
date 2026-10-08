'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/organism/Header';
import StorePublicBar from '@/components/organism/StorePublicBar';
import { getToken } from '@/libs/session';

// /excluir-conta entra aqui pelo mesmo motivo da política de privacidade: é
// uma página que o Google Play exige que abra para quem NÃO está logado (e,
// muitas vezes, nem tem mais o app), então não pode vir com o cabeçalho de
// navegação interna do aplicativo.
const PUBLIC_PATHS = [
    '/',
    '/cadastro',
    '/esqueceu-senha',
    '/politica-privacidade',
    '/excluir-conta',
];

export default function HeaderCondicional() {
    const pathname = usePathname();
    const ref = useRef<HTMLDivElement>(null);

    const isPublic =
        PUBLIC_PATHS.includes(pathname) ||
        pathname.startsWith('/cadastro/') ||
        pathname.startsWith('/redefinir-senha/') ||
        pathname.startsWith('/excluir-conta/');

    // A loja é pública (fase 3 do plano da loja): sem login, a barra própria
    // dela no lugar do Header, que manda quem não tem sessão para o login.
    // null = sessão ainda não lida (no servidor e no primeiro render).
    const isStore = pathname === '/loja' || pathname.startsWith('/loja/');
    const [hasSession, setHasSession] = useState<boolean | null>(null);
    useEffect(() => {
        setHasSession(!!getToken());
    }, [pathname]);
    const storeVisitor = isStore && hasSession === false;
    const storeUnknown = isStore && hasSession === null;

    // Publica a altura real do header como CSS var, usada pelos modais
    // full-screen (components/system/Modal) para começar exatamente abaixo
    // do header, mantendo-o sempre visível.
    useEffect(() => {
        const setVar = (h: number) =>
            document.documentElement.style.setProperty(
                '--app-header-height',
                `${h}px`,
            );
        const el = ref.current;
        if (!el) {
            setVar(0);
            return;
        }
        setVar(el.offsetHeight);
        const observer = new ResizeObserver((entries) => {
            setVar(entries[0].contentRect.height);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [isPublic, storeVisitor, storeUnknown]);

    if (isPublic || storeUnknown) return null;

    return (
        <div ref={ref} className="header-shell">
            {storeVisitor ? <StorePublicBar /> : <Header />}
        </div>
    );
}
