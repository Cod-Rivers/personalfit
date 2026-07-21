export default function Loading() {
    return (
        <div
            className="d-flex justify-content-center align-items-center"
            style={{ minHeight: '60vh' }}
            role="status"
            aria-live="polite"
        >
            <span className="spinner-border" />
            <span className="visually-hidden">Carregando…</span>
        </div>
    );
}
