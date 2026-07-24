'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
    getPublicChallenge,
    joinChallenge,
    type PublicChallenge,
} from '@/libs/challengeService';
import s from './desafio.module.css';

function fmt(d: string) {
    const dt = new Date(d + 'T00:00:00');
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('pt-BR');
}

export default function PublicChallengePage() {
    const params = useParams<{ token: string }>();
    const token = params.token;

    const [challenge, setChallenge] = useState<PublicChallenge | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const c = await getPublicChallenge(token);
                if (alive) setChallenge(c);
            } catch {
                if (alive) setNotFound(true);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [token]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            await joinChallenge(token, {
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim() || undefined,
            });
            setDone(true);
        } catch {
            setError(
                'Não foi possível concluir a inscrição. As inscrições podem estar encerradas.',
            );
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className={s.page}>
                <span className={s.loading}>Carregando desafio…</span>
            </div>
        );
    }

    if (notFound || !challenge) {
        return (
            <div className={s.page}>
                <div className={s.card}>
                    <p className={s.eyebrow}>Venafit · Desafio</p>
                    <h1 className={s.title}>Desafio não encontrado</h1>
                    <p className={s.by}>
                        O link pode estar incorreto ou o desafio foi removido.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={s.page}>
            <div className={s.card}>
                <p className={s.eyebrow}>Venafit · Desafio</p>
                <h1 className={s.title}>{challenge.name}</h1>
                <p className={s.by}>com {challenge.personal_name}</p>

                <div className={s.meta}>
                    <span className={s.pill}>
                        {fmt(challenge.start_date)} → {fmt(challenge.end_date)}
                    </span>
                    <span className={s.pill}>
                        {challenge.participant_count} inscrito(s)
                    </span>
                </div>

                {challenge.description && (
                    <p className={s.desc}>{challenge.description}</p>
                )}

                {done ? (
                    <div className={s.success}>
                        <div className={s.successIcon}>🎉</div>
                        <div className={s.successTitle}>Inscrição confirmada!</div>
                        <p className={s.successText}>
                            {challenge.personal_name} vai entrar em contato com
                            você. Prepare-se para começar!
                        </p>
                    </div>
                ) : challenge.accepting_signups ? (
                    <form className={s.form} onSubmit={handleSubmit}>
                        <div>
                            <label className={s.label}>Nome completo</label>
                            <input
                                className={s.input}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                autoComplete="name"
                            />
                        </div>
                        <div>
                            <label className={s.label}>E-mail</label>
                            <input
                                className={s.input}
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>
                        <div>
                            <label className={s.label}>
                                WhatsApp (opcional)
                            </label>
                            <input
                                className={s.input}
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                autoComplete="tel"
                                inputMode="tel"
                            />
                        </div>
                        {error && <div className={s.error}>{error}</div>}
                        <button
                            className={s.btn}
                            type="submit"
                            disabled={submitting}
                        >
                            {submitting ? 'Enviando…' : 'Quero participar 🚀'}
                        </button>
                    </form>
                ) : (
                    <div className={s.closed}>
                        As inscrições para este desafio estão encerradas.
                    </div>
                )}
            </div>
        </div>
    );
}
