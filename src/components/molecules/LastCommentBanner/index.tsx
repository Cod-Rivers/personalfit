'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiAlertTriangle, FiMessageCircle } from 'react-icons/fi';
import { listStudentComments, type WorkoutComment } from '@/libs/workoutCommentService';
import { PAIN_TAG, describeCommentFacts, feelingOption } from '@/libs/workoutComment';
import styles from './styles.module.css';

/**
 * Último comentário do aluno no topo do atendimento presencial: o encontro
 * começa pelo que o aluno disse no último treino. Falha em silêncio (offline,
 * sem comentário) — é contexto, não pré-requisito.
 */
export default function LastCommentBanner({ studentId }: { studentId: string }) {
    const [last, setLast] = useState<WorkoutComment | null>(null);

    useEffect(() => {
        let alive = true;
        listStudentComments(studentId)
            .then((list) => alive && setLast(list[0] ?? null))
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, [studentId]);

    if (!last) return null;
    const hasPain = last.tags.includes(PAIN_TAG);
    const feeling = feelingOption(last.feeling);
    const facts = describeCommentFacts(last.tags, last.pain_regions);

    return (
        <aside className={`${styles.banner} ${hasPain ? styles.pain : ''}`} aria-label="Último comentário do aluno">
            {hasPain ? <FiAlertTriangle aria-hidden className={styles.icon} /> : <FiMessageCircle aria-hidden className={styles.icon} />}
            <div className={styles.body}>
                <span className={styles.label}>
                    Último comentário · treino {last.training_ref} ·{' '}
                    {new Date(last.workout_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </span>
                {(feeling || facts) && (
                    <span className={styles.facts}>
                        {feeling ? `${feeling.emoji} ${feeling.label}` : ''}
                        {feeling && facts ? ' · ' : ''}
                        {facts}
                    </span>
                )}
                {last.text && <span className={styles.text}>“{last.text}”</span>}
            </div>
            <Link href={`/personal/aluno/${studentId}/feedback`} className={styles.link}>
                Ver todos
            </Link>
        </aside>
    );
}
