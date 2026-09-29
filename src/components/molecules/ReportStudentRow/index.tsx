'use client';

import React from 'react';
import { FiAlertTriangle, FiChevronRight } from 'react-icons/fi';
import { attentionSignalLabel, reviewStateLabel, type WorkoutReport } from '@/libs/workoutReport';
import styles from './styles.module.css';

interface ReportStudentRowProps {
    report: WorkoutReport;
    onOpen: () => void;
}

function pct(v?: number) {
    return v == null ? '—' : `${Math.round(v)}%`;
}

/** Linha de um aluno no painel do período: sinais de atenção, estado e os
 * números que mais pesam. Tocar abre o relatório. */
export default function ReportStudentRow({ report, onOpen }: ReportStudentRowProps) {
    const m = report.metrics;
    const state = reviewStateLabel(report.review_state, report.status);
    const stateClass =
        report.status === 'pending' || report.status === 'ai_pending'
            ? styles.pending
            : report.review_state === 'decided'
              ? styles.decided
              : report.review_state === 'new'
                ? styles.fresh
                : styles.reviewed;
    return (
        <button type="button" className={styles.row} onClick={onOpen}>
            <span className={styles.main}>
                <span className={styles.head}>
                    <span className={styles.name}>{report.student_name || 'Aluno'}</span>
                    <span className={`${styles.state} ${stateClass}`}>{state}</span>
                </span>
                {report.attention_signals.length > 0 && (
                    <span className={styles.signals}>
                        <FiAlertTriangle aria-hidden className={styles.signalIcon} />
                        {report.attention_signals.map((s) => (
                            <span key={s} className={styles.signal}>
                                {attentionSignalLabel(s)}
                            </span>
                        ))}
                    </span>
                )}
                <span className={styles.numbers}>
                    <span>Aderência {pct(m.adherence_pct)}</span>
                    <span>Sensação {m.feeling_avg != null ? m.feeling_avg.toFixed(1) : '—'}</span>
                    <span>{m.comments} comentário(s)</span>
                    {m.pain_total > 0 && <span className={styles.pain}>{m.pain_total} com dor</span>}
                </span>
                {report.ai?.summary && <span className={styles.summary}>{report.ai.summary}</span>}
            </span>
            <FiChevronRight className={styles.chevron} aria-hidden />
        </button>
    );
}
