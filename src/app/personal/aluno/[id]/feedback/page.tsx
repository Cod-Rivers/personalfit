'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    getStudentFeedback,
    type StudentFeedback,
} from '@/libs/feedbackService';
import s from './feedback.module.css';

const TARGET_LABEL: Record<string, string> = {
    macrocycle: 'Macrociclo',
    mesocycle: 'Mesociclo',
    microcycle: 'Microciclo',
};

function stars(n: number) {
    const full = Math.round(n);
    return '★'.repeat(full) + '☆'.repeat(Math.max(0, 5 - full));
}

function rpeClass(rpe: number) {
    if (rpe >= 8) return `${s.rpeBadge} ${s.rpeHigh}`;
    if (rpe >= 6) return `${s.rpeBadge} ${s.rpeMid}`;
    return s.rpeBadge;
}

function formatDate(iso: string) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('pt-BR');
}

export default function StudentFeedbackPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const studentId = params.id;

    const [data, setData] = useState<StudentFeedback | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const fb = await getStudentFeedback(studentId);
                if (alive) setData(fb);
            } catch {
                if (alive)
                    setError('Não foi possível carregar o feedback do aluno.');
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [studentId]);

    return (
        <div className={s.page}>
            <div className={s.container}>
                <div className={s.header}>
                    <div>
                        <h1 className={s.headerTitle}>💬 Feedback do aluno</h1>
                        <p className={s.headerSub}>
                            Avaliações dos ciclos e esforço percebido (RPE) nas
                            sessões
                        </p>
                    </div>
                    <button className={s.btnBack} onClick={() => router.back()}>
                        ← Voltar
                    </button>
                </div>

                {loading && <div className={s.loading}>Carregando…</div>}
                {error && <div className={s.empty}>{error}</div>}

                {data && !loading && (
                    <>
                        <div className={s.tiles}>
                            <div className={s.tile}>
                                <div
                                    className={s.tileValue}
                                    style={{ color: '#f59e0b' }}
                                >
                                    {data.summary.ratings_count > 0
                                        ? data.summary.avg_stars.toFixed(1)
                                        : '—'}
                                </div>
                                <div className={s.tileLabel}>
                                    Média de estrelas ·{' '}
                                    {data.summary.ratings_count} avaliação(ões)
                                </div>
                            </div>
                            <div className={s.tile}>
                                <div className={s.tileValue}>
                                    {data.summary.rpe_sample_count > 0
                                        ? data.summary.avg_rpe.toFixed(1)
                                        : '—'}
                                </div>
                                <div className={s.tileLabel}>
                                    RPE médio · {data.summary.rpe_sample_count}{' '}
                                    séries
                                </div>
                            </div>
                            <div className={s.tile}>
                                <div className={s.tileValue}>
                                    {data.session_feedback.length}
                                </div>
                                <div className={s.tileLabel}>
                                    Sessões com retorno
                                </div>
                            </div>
                        </div>

                        <div>
                            <h2 className={s.sectionTitle}>
                                Retorno por sessão
                            </h2>
                            {data.session_feedback.length === 0 ? (
                                <div className={s.empty}>
                                    O aluno ainda não deixou RPE ou notas nas
                                    sessões.
                                </div>
                            ) : (
                                <div className={s.list}>
                                    {data.session_feedback.map((f) => (
                                        <div className={s.item} key={f.log_id}>
                                            <div className={s.itemHead}>
                                                <span className={s.itemTitle}>
                                                    Treino {f.training_ref || '—'}
                                                </span>
                                                <span className={s.itemDate}>
                                                    {formatDate(f.date)}
                                                </span>
                                                {f.avg_rpe > 0 && (
                                                    <span
                                                        className={rpeClass(
                                                            f.avg_rpe,
                                                        )}
                                                    >
                                                        RPE {f.avg_rpe.toFixed(1)}
                                                    </span>
                                                )}
                                            </div>
                                            {f.notes && (
                                                <p className={s.comment}>
                                                    {f.notes}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <h2 className={s.sectionTitle}>
                                Avaliações dos ciclos
                            </h2>
                            {data.ratings.length === 0 ? (
                                <div className={s.empty}>
                                    Nenhuma avaliação de ciclo enviada ainda.
                                </div>
                            ) : (
                                <div className={s.list}>
                                    {data.ratings.map((r) => (
                                        <div className={s.item} key={r.id}>
                                            <div className={s.itemHead}>
                                                <span className={s.stars}>
                                                    {stars(r.stars)}
                                                </span>
                                                <span className={s.targetTag}>
                                                    {TARGET_LABEL[
                                                        r.target_type
                                                    ] ?? r.target_type}
                                                </span>
                                            </div>
                                            {r.comment && (
                                                <p className={s.comment}>
                                                    {r.comment}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
