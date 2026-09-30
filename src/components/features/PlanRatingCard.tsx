'use client';
import React, { useEffect, useState } from 'react';
import { FiStar } from 'react-icons/fi';
import StarRating from './StarRating';
import { type MyRating, getMyRating, submitRating } from '@/libs/ratingService';

interface PlanRatingCardProps {
    planId: string;
    /** Categoria do macrociclo (MacrocycleResponse.category). */
    category?: string;
    /** O aluno tem personal vinculado (muda só o texto de apoio). */
    hasPersonal?: boolean;
}

// Planos que o próprio aluno montou ou importou: avaliar a si mesmo não
// informa ninguém.
const SELF_AUTHORED = new Set(['self_made', 'imported_pdf']);

/**
 * "Avaliar este plano" em Meus treinos. A nota vai para a tela de feedback
 * do personal e, se o plano veio de um modelo da biblioteca, para o ranking
 * de modelos do admin. Uma nota por plano: enviar de novo substitui.
 */
export default function PlanRatingCard({ planId, category, hasPersonal }: PlanRatingCardProps) {
    const [rating, setRating] = useState<MyRating | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [editing, setEditing] = useState(false);
    const [error, setError] = useState('');
    const [justSaved, setJustSaved] = useState(false);

    useEffect(() => {
        let alive = true;
        setLoaded(false);
        setEditing(false);
        setJustSaved(false);
        setError('');
        getMyRating(planId)
            .then((r) => alive && setRating(r))
            .catch(() => alive && setRating(null))
            .finally(() => alive && setLoaded(true));
        return () => {
            alive = false;
        };
    }, [planId]);

    if (!loaded || (category && SELF_AUTHORED.has(category))) return null;

    const handleSubmit = async (stars: number, comment: string) => {
        setError('');
        try {
            await submitRating({ target_id: planId, target_type: 'macrocycle', stars, comment });
            setRating(await getMyRating(planId));
            setEditing(false);
            setJustSaved(true);
        } catch (e) {
            setError('Não foi possível enviar sua avaliação. Tente de novo.');
            throw e;
        }
    };

    const audience = hasPersonal
        ? 'Sua nota e seu comentário vão para o seu personal.'
        : 'Sua nota ajuda a mostrar quais planos funcionam melhor.';

    return (
        <section
            aria-label="Avaliar este plano"
            style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 12,
                padding: '12px 14px',
                marginBottom: '1.2rem',
            }}
        >
            {error && <div className="alert alert-danger py-2 mb-2">{error}</div>}

            {rating && !editing ? (
                <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                    <div>
                        <p className="mb-1" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            {justSaved ? 'Obrigado! Sua avaliação deste plano:' : 'Sua avaliação deste plano:'}
                        </p>
                        <span aria-label={`${rating.stars} de 5 estrelas`} style={{ color: 'var(--amber)' }}>
                            {[1, 2, 3, 4, 5].map((n) => (
                                <FiStar key={n} style={{ fill: n <= rating.stars ? 'currentColor' : 'none', marginRight: 2 }} />
                            ))}
                        </span>
                        {rating.comment && (
                            <p className="mb-0 mt-1" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                “{rating.comment}”
                            </p>
                        )}
                    </div>
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setEditing(true)}>
                        Alterar
                    </button>
                </div>
            ) : (
                <>
                    <StarRating
                        label={`Como está este plano para você? ${audience}`}
                        initialValue={rating?.stars ?? 0}
                        initialComment={rating?.comment ?? ''}
                        submitLabel={rating ? 'Salvar avaliação' : 'Enviar avaliação'}
                        onSubmit={handleSubmit}
                        onCancel={rating ? () => setEditing(false) : undefined}
                    />
                </>
            )}
        </section>
    );
}
