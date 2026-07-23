'use client';
import React from 'react';
import Link from 'next/link';
import './styles.css';

const Footer: React.FC = () => {
    const year = new Date().getFullYear();
    const ref = React.useRef<HTMLElement>(null);

    // Publica a altura real do footer como CSS var, para que elementos
    // fixos de rodapé (ex.: banner de anúncio sticky) possam se ancorar
    // logo acima dele e nunca ficar por baixo do footer.
    React.useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const setVar = (h: number) =>
            document.documentElement.style.setProperty(
                '--app-footer-height',
                `${h}px`,
            );
        setVar(el.offsetHeight);
        const observer = new ResizeObserver((entries) => {
            setVar(entries[0].contentRect.height);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

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
