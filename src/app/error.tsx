'use client';

export default function Error({
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div
            className="container d-flex flex-column justify-content-center align-items-center text-center gap-3"
            style={{ minHeight: '60vh' }}
        >
            <h1 className="h4">Algo deu errado</h1>
            <p className="text-secondary" style={{ maxWidth: '40ch' }}>
                Não foi possível carregar esta página. Verifique sua conexão e
                tente novamente.
            </p>
            <button className="btn btn-gold" onClick={() => reset()}>
                Tentar novamente
            </button>
        </div>
    );
}
