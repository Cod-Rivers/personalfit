'use client';

import { FiAward, FiClock, FiUser } from 'react-icons/fi';
import {
    formatDateBR,
    formatKg,
    formatSets,
    type LoadHistoryMetric,
    type LoadHistorySession,
} from '@/libs/loadHistory';
import s from './LoadHistory.module.css';

/** Linha do tempo do exercício, da sessão mais recente para a mais antiga. */
export default function LoadHistoryTimeline({
    sessions,
    metric,
}: {
    sessions: LoadHistorySession[];
    metric: LoadHistoryMetric;
}) {
    const ordered = [...sessions].sort(
        (a, b) => b.date.localeCompare(a.date) || Number(!!b.pending) - Number(!!a.pending),
    );
    if (ordered.length === 0) {
        return <p className={s.legendNote}>Nenhuma sessão registrada.</p>;
    }

    return (
        <ol className={s.timeline}>
            {ordered.map((x) => {
                const rpes = x.sets.map((set) => set.rpe).filter((r) => r > 0);
                const maxRpe = rpes.length ? Math.max(...rpes) : null;
                return (
                    <li
                        key={`${x.log_id}-${x.date}`}
                        className={s.timelineItem}
                        data-muted={x.outlier || undefined}
                    >
                        <span className={s.timelineDate}>{formatDateBR(x.date)}</span>
                        <div>
                            <div className={s.timelineSets}>{formatSets(x.sets, metric)}</div>
                            <div className={s.timelineMeta}>
                                {metric === 'load' && x.e1rm ? (
                                    <span>1RM est. {formatKg(x.e1rm)} kg</span>
                                ) : null}
                                {metric === 'load' && x.volume_kg > 0 ? (
                                    <span>Volume {formatKg(x.volume_kg)} kg</span>
                                ) : null}
                                {maxRpe != null && <span>RPE até {maxRpe}</span>}
                                {x.planned_load_kg ? (
                                    <span>Prescrito {formatKg(x.planned_load_kg)} kg</span>
                                ) : null}
                                {x.record && (
                                    <span className={s.chipRecord}>
                                        <FiAward aria-hidden="true" /> Recorde
                                    </span>
                                )}
                                {x.deload && <span className={s.chipMuted}>Deload</span>}
                                {x.recorded_via === 'personal_assisted' && (
                                    <span className={s.chipMuted}>
                                        <FiUser aria-hidden="true" /> No atendimento
                                    </span>
                                )}
                                {x.pending && (
                                    <span className={s.chipMuted}>
                                        <FiClock aria-hidden="true" /> Pendente de envio
                                    </span>
                                )}
                                {x.outlier && (
                                    <span className={s.chipDown}>
                                        Fora do padrão — não conta como recorde
                                    </span>
                                )}
                            </div>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
