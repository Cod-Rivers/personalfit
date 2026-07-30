// src/app/meus-treinos/historico/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import {
    getMyWorkoutLogsInRange,
    NewWorkoutLogResponse,
} from '@/libs/workoutLogService';
import styles from './historico.module.css';

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
});

type DayStatus = 'completed' | 'skipped';

function toISODate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Agrega logs por dia civil: completed > skipped > sem marca. Um dia com
 * qualquer log `completed` fica verde mesmo que tenha outros `skipped`; usa
 * completed_date (dia real de execução) para concluídos e planned_date (dia
 * que era pra acontecer) para pulados.
 */
function aggregateByDay(
    logs: NewWorkoutLogResponse[],
): Map<string, DayStatus> {
    const byDay = new Map<string, DayStatus>();
    for (const log of logs) {
        if (log.status === 'completed') {
            const key = log.completed_date?.slice(0, 10);
            if (key) byDay.set(key, 'completed');
        } else if (log.status === 'skipped') {
            const key = log.planned_date?.slice(0, 10);
            if (key && byDay.get(key) !== 'completed') {
                byDay.set(key, 'skipped');
            }
        }
    }
    return byDay;
}

export default function HistoricoTreinosPage() {
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);
    const [viewedMonth, setViewedMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [statusByDay, setStatusByDay] = useState<Map<string, DayStatus>>(
        new Map(),
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted) return;

        const userString = localStorage.getItem('user');
        if (!userString || !localStorage.getItem('token')) {
            router.push('/app');
            return;
        }

        async function fetchMonth() {
            setLoading(true);
            setError(null);
            try {
                const from = toISODate(viewedMonth);
                const lastDay = new Date(
                    viewedMonth.getFullYear(),
                    viewedMonth.getMonth() + 1,
                    0,
                );
                const to = toISODate(lastDay);
                const logs = await getMyWorkoutLogsInRange(from, to);
                setStatusByDay(aggregateByDay(logs));
            } catch (e) {
                const err = e as Error;
                setError(
                    `Não foi possível carregar o histórico: ${err.message}`,
                );
            } finally {
                setLoading(false);
            }
        }

        fetchMonth();
    }, [isMounted, viewedMonth, router]);

    function changeMonth(delta: number) {
        setViewedMonth(
            (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1),
        );
    }

    if (!isMounted) return null;

    const today = new Date();
    const isCurrentMonth =
        viewedMonth.getFullYear() === today.getFullYear() &&
        viewedMonth.getMonth() === today.getMonth();

    const daysInMonth = new Date(
        viewedMonth.getFullYear(),
        viewedMonth.getMonth() + 1,
        0,
    ).getDate();
    const leadingBlanks = new Date(
        viewedMonth.getFullYear(),
        viewedMonth.getMonth(),
        1,
    ).getDay();

    const cells: Array<{ day: number; iso: string } | null> = [];
    for (let i = 0; i < leadingBlanks; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
        cells.push({
            day,
            iso: toISODate(
                new Date(viewedMonth.getFullYear(), viewedMonth.getMonth(), day),
            ),
        });
    }

    return (
        <div className="container mx-auto p-4" style={{ maxWidth: 480 }}>
            <div className={styles.header}>
                <h1
                    className="h5 mb-0"
                    style={{ color: 'var(--text-primary)' }}
                >
                    Histórico de treinos
                </h1>
                <Link
                    href="/meus-treinos"
                    className="btn btn-outline-secondary btn-sm"
                >
                    Voltar
                </Link>
            </div>

            <div className={styles.monthNav}>
                <button
                    type="button"
                    className={styles.navBtn}
                    onClick={() => changeMonth(-1)}
                    aria-label="Mês anterior"
                >
                    <FiChevronLeft size={18} />
                </button>
                <span className={styles.monthLabel}>
                    {MONTH_LABEL_FORMATTER.format(viewedMonth)}
                </span>
                <button
                    type="button"
                    className={styles.navBtn}
                    onClick={() => changeMonth(1)}
                    disabled={isCurrentMonth}
                    aria-label="Próximo mês"
                >
                    <FiChevronRight size={18} />
                </button>
            </div>

            {error && (
                <div className="alert alert-danger py-2 px-3 my-3" style={{ fontSize: '0.85rem' }}>
                    {error}
                </div>
            )}

            {loading ? (
                <p
                    className="text-center py-4"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    Carregando…
                </p>
            ) : (
                <>
                    <div className={styles.weekdayRow}>
                        {WEEKDAY_SHORT.map((label) => (
                            <span key={label} className={styles.weekdayLabel}>
                                {label}
                            </span>
                        ))}
                    </div>
                    <div className={styles.grid}>
                        {cells.map((cell, i) => {
                            if (!cell) {
                                return (
                                    <div
                                        key={`blank-${i}`}
                                        className={styles.dayCell}
                                        data-empty="true"
                                    />
                                );
                            }
                            const status = statusByDay.get(cell.iso);
                            const isToday = cell.iso === toISODate(today);
                            return (
                                <div
                                    key={cell.iso}
                                    className={styles.dayCell}
                                    data-status={status}
                                    data-today={isToday || undefined}
                                >
                                    {cell.day}
                                </div>
                            );
                        })}
                    </div>

                    <div className={styles.legend}>
                        <span className={styles.legendItem}>
                            <span
                                className={styles.legendDot}
                                data-status="completed"
                            />
                            Concluído
                        </span>
                        <span className={styles.legendItem}>
                            <span
                                className={styles.legendDot}
                                data-status="skipped"
                            />
                            Pulado
                        </span>
                    </div>
                </>
            )}
        </div>
    );
}
