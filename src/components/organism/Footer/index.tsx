'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './styles.css';

// Rotas com layout/app-shell próprio (ex.: sidebar fixa de rodapé a rodapé)
// onde o footer global não deve aparecer.
const HIDDEN_PATHS = ['/admin'];

const Footer: React.FC = () => {
    const year = new Date().getFullYear();
    const pathname = usePathname();
    const ref = React.useRef<HTMLElement>(null);
    const hidden = HIDDEN_PATHS.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`),
    );

    // Publica a altura real do footer como CSS var, para que elementos
    // fixos de rodapé (ex.: banner de anúncio sticky) possam se ancorar
    // logo acima dele e nunca ficar por baixo do footer.
    React.useEffect(() => {
        const setVar = (h: number) =>
            document.documentElement.style.setProperty(
                '--app-footer-height',
                `${h}px`,
            );
        const el = ref.current;
        if (hidden || !el) {
            setVar(0);
            return;
        }
        setVar(el.offsetHeight);
        const observer = new ResizeObserver((entries) => {
            setVar(entries[0].contentRect.height);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [hidden]);

    if (hidden) return null;

    return (
        <footer className="footer" ref={ref}>
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
