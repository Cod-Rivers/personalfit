'use client';

import { useState } from 'react';
import { FiEdit3, FiCopy, FiTrash2, FiChevronRight } from 'react-icons/fi';
import type { MesocycleResponse } from '@/libs/planningService';
import { formatDate, weekdayLabel } from '../lib/mesocycleTransforms';
import ExerciseThumbnail from '@/components/features/ExerciseThumbnail';
import s from '../builder.module.css';

interface Props {
    meso: MesocycleResponse;
    onEdit: () => void;
    onDelete: () => void;
    /** Ausente no modo simples — o mesociclo único e oculto não faz sentido duplicar. */
    onDuplicate?: () => void;
    /** Mostra o dia da semana (ou número) no lugar de "Treino {reference}". */
    simpleMode?: boolean;
    /** "weekday" (padrão) ou "number" — só relevante quando simpleMode=true. */
    dayLabelStyle?: 'weekday' | 'number';
}

export default function MesocycleSection({
    meso,
    onEdit,
    onDelete,
    onDuplicate,
    simpleMode,
    dayLabelStyle,
}: Props) {
    const isNumbered = simpleMode && dayLabelStyle === 'number';
    const [open, setOpen] = useState(false);

    return (
        <div className={s.mesoSection}>
            <div
                className={open ? s.mesoHeader : s.mesoHeaderCollapsed}
                onClick={() => setOpen((v) => !v)}
            >
                <div>
                    <p className={s.mesoTitle}>
                        {simpleMode ? meso.name : `${meso.order}. ${meso.name}`}
                    </p>
                    {simpleMode ? (
                        <p className={s.mesoMeta}>
                            {meso.trainings.length} treino
                            {meso.trainings.length !== 1 ? 's' : ''}{' '}
                            configurado{meso.trainings.length !== 1 ? 's' : ''}
                        </p>
                    ) : (
                        <p className={s.mesoMeta}>
                            {meso.phase} · {meso.duration_weeks} semana(s){' '}
                            <span
                                style={{
                                    color: 'var(--text-muted)',
                                    fontSize: '0.75em',
                                }}
                            >
                                ({meso.duration_weeks} microciclo
                                {meso.duration_weeks !== 1 ? 's' : ''})
                            </span>{' '}
                            · {meso.methodology}
                            {meso.start_date &&
                                ` · ${formatDate(meso.start_date)} → ${formatDate(meso.end_date)}`}
                        </p>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                        className={s.btnSmall}
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit();
                        }}
                    >
                        <FiEdit3 /> Editar
                    </button>
                    {onDuplicate && (
                        <button
                            className={s.btnSmall}
                            onClick={(e) => {
                                e.stopPropagation();
                                onDuplicate();
                            }}
                        >
                            <FiCopy /> Duplicar
                        </button>
                    )}
                    <button
                        className={s.btnSmall}
                        style={{
                            color: 'var(--coral, #e74c3c)',
                            borderColor: 'var(--coral, #e74c3c)',
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                    >
                        <FiTrash2 /> Excluir
                    </button>
                    <span className={open ? s.mesoToggleOpen : s.mesoToggle}>
                        <FiChevronRight />
                    </span>
                </div>
            </div>

            {open && (
                <div className={s.mesoBody}>
                    {meso.trainings.length === 0 ? (
                        <p
                            style={{
                                color: 'var(--text-muted)',
                                fontSize: '0.85rem',
                            }}
                        >
                            Nenhum treino cadastrado. Clique em &quot;Editar&quot; para
                            adicionar.
                        </p>
                    ) : (
                        meso.trainings.map((t, index) => (
                            <div key={t.id} className={s.trainingBlock}>
                                <div className={s.trainingHeader}>
                                    <p className={s.trainingLabel}>
                                        {isNumbered
                                            ? `Treino ${index + 1}`
                                            : simpleMode
                                              ? (weekdayLabel(t.weekday) ??
                                                'Sem dia definido')
                                              : `Treino ${t.reference}`}
                                    </p>
                                    <span
                                        style={{
                                            fontSize: '0.8rem',
                                            color: 'var(--text-muted)',
                                        }}
                                    >
                                        {t.exercises.length} exercício(s)
                                    </span>
                                </div>
                                {t.exercises.length > 0 && (
                                    <ul className={s.exerciseList}>
                                        {t.exercises.map((ex, i) => {
                                            const seriesText = ex.series_label
                                                ? ex.series_label
                                                : ex.timed
                                                  ? ex.series
                                                        .map((s) => `${s}s`)
                                                        .join(' / ')
                                                  : ex.series.join('/');
                                            return (
                                                <li
                                                    key={ex.id ?? i}
                                                    className={s.exerciseCard}
                                                >
                                                    <ExerciseThumbnail
                                                        name={ex.name}
                                                        videoThumb={
                                                            ex.video_thumb
                                                        }
                                                        videoUrl={
                                                            ex.video_url
                                                        }
                                                        captureFrame={false}
                                                        lazyCapture
                                                        className={
                                                            s.exerciseThumbnail
                                                        }
                                                    />
                                                    <div
                                                        className={
                                                            s.exerciseInfo
                                                        }
                                                    >
                                                        <p
                                                            className={
                                                                s.exerciseName
                                                            }
                                                        >
                                                            {ex.name}
                                                        </p>
                                                        <p
                                                            className={
                                                                s.exerciseMeta
                                                            }
                                                        >
                                                            {seriesText}
                                                            {ex.variations &&
                                                                ` · ${ex.variations}`}
                                                        </p>
                                                        {ex.comments && (
                                                            <p
                                                                className={
                                                                    s.exerciseComments
                                                                }
                                                            >
                                                                {ex.comments}
                                                            </p>
                                                        )}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
