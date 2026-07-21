import Link from 'next/link';

export default function NotFound() {
    return (
        <div
            className="container d-flex flex-column justify-content-center align-items-center text-center gap-3"
            style={{ minHeight: '60vh' }}
        >
            <h1 className="display-6">404</h1>
            <p className="text-secondary">
                A página que você procura não existe ou foi movida.
            </p>
            <Link href="/" className="btn btn-gold">
                Voltar ao início
            </Link>
        </div>
    );
}
