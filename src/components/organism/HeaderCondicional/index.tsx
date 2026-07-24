'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/organism/Header';

const PUBLIC_PATHS = ['/', '/cadastro', '/esqueceu-senha'];

export default function HeaderCondicional() {
    const pathname = usePathname();
    const ref = useRef<HTMLDivElement>(null);

    const isPublic =
        PUBLIC_PATHS.includes(pathname) ||
        pathname.startsWith('/cadastro/') ||
        pathname.startsWith('/redefinir-senha/');

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
    }, [isPublic]);

    if (isPublic) return null;

    return (
        <div ref={ref} className="header-shell">
            <Header />
        </div>
    );
}
