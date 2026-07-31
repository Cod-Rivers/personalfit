'use client';

import React from 'react';
import { FiEye, FiEyeOff, FiPrinter } from 'react-icons/fi';
import { phaseColorKey } from './ganttPhaseColors';
import type { GanttAssessment, GanttPhase } from './GanttPlanning';
import styles from './GanttPhasesTimeline.module.css';

interface GanttPhasesTimelineProps {
    phases: GanttPhase[];
    enabled?: boolean;
    onToggle?: (enabled: boolean) => void;
    assessments?: GanttAssessment[];
    printTitle?: string;
}

interface LooseMarker {
    id: string;
    dateMs: number;
    kind: 'today' | 'assessment';
}

const BADGE_CLASS: Record<string, string> = {
    mint: 'badgeMint',
    violet: 'badgeViolet',
    amber: 'badgeAmber',
    coral: 'badgeCoral',
    deload: 'badgeDeload',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function fmtShort(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
    });
}

function weeksBetween(startIso: string, endIso: string): number {
    const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
    return Math.max(1, Math.round(ms / WEEK_MS));
}

function isWithin(dateMs: number, startIso: string, endIso: string): boolean {
    return dateMs >= new Date(startIso).getTime() && dateMs < new Date(endIso).getTime();
}

/**
 * Timeline vertical em CSS puro — troca o dhtmlx-gantt em telas estreitas
 * (ver GanttPlanningResponsive). Um Gantt horizontal denso, feito pra
 * arraste de precisão, não é legível num celular; uma lista vertical com
 * barra de progresso e a fase atual em destaque é.
 */
const GanttPhasesTimeline: React.FC<GanttPhasesTimelineProps> = ({
    phases,
    enabled = true,
    onToggle,
    assessments = [],
    printTitle,
}) => {
    const sorted = [...phases].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
    );
    // Mesma convenção de parsing das datas das fases (YYYY-MM-DD → UTC
    // meia-noite) para comparar "hoje" no mesmo referencial, sem deriva de
    // fuso horário entre os dois lados da comparação.
    const todayIso = new Date().toISOString().split('T')[0];
    const todayMs = new Date(todayIso).getTime();
    const todayCovered = sorted.some((p) => isWithin(todayMs, p.start, p.end));

    // Marcos "soltos" (não caem dentro de nenhuma fase) — desenhados como
    // divisor entre duas fases; os que caem DENTRO de uma fase aparecem
    // embutidos na própria linha (chip "Hoje" / badge de avaliação).
    const looseMarkers: LooseMarker[] = [];
    if (!todayCovered) {
        looseMarkers.push({ id: 'today', dateMs: todayMs, kind: 'today' });
    }
    for (const a of assessments) {
        const aMs = new Date(a.date).getTime();
        if (!sorted.some((p) => isWithin(aMs, p.start, p.end))) {
            looseMarkers.push({ id: `assess-${a.id}`, dateMs: aMs, kind: 'assessment' });
        }
    }
    looseMarkers.sort((a, b) => a.dateMs - b.dateMs);

    function markersBetween(afterMs: number, beforeMs: number): LooseMarker[] {
        return looseMarkers.filter((m) => m.dateMs >= afterMs && m.dateMs < beforeMs);
    }

    const lastEndMs =
        sorted.length > 0 ? new Date(sorted[sorted.length - 1].end).getTime() : null;
    const trailingMarkers = lastEndMs !== null ? markersBetween(lastEndMs, Infinity) : [];

    function renderMarker(m: LooseMarker) {
        const label =
            m.kind === 'today'
                ? 'Hoje'
                : `Avaliação · ${fmtShort(new Date(m.dateMs).toISOString())}`;
        return (
            <div
                key={m.id}
                className={`${styles.divider} ${m.kind === 'assessment' ? styles.dividerAssessment : ''}`}
                aria-hidden="true"
            >
                <span>{label}</span>
            </div>
        );
    }

    return (
        <div className={`${styles.wrapper} gantt-print-target`}>
            {printTitle && (
                <div className="gantt-print-only">
                    <h3>{printTitle}</h3>
                    <p>Gerado em {new Date().toLocaleDateString('pt-BR')}</p>
                </div>
            )}
            <div className={`${styles.toolbar} ${styles.noPrint}`}>
                {enabled && sorted.length > 0 && (
                    <button
                        type="button"
                        className={styles.toggleBtn}
                        onClick={() => window.print()}
                        aria-label="Imprimir ou exportar como PDF"
                    >
                        <FiPrinter size={18} />
                        <span>Imprimir</span>
                    </button>
                )}
                <button
                    type="button"
                    className={styles.toggleBtn}
                    onClick={() => onToggle?.(!enabled)}
                    aria-label={
                        enabled
                            ? 'Ocultar linha do tempo'
                            : 'Mostrar linha do tempo'
                    }
                >
                    {enabled ? <FiEye size={18} /> : <FiEyeOff size={18} />}
                    <span>
                        {enabled ? 'Ocultar linha do tempo' : 'Mostrar linha do tempo'}
                    </span>
                </button>
            </div>

            {!enabled ? (
                <div className={styles.placeholder}>
                    Gráfico de Gantt desativado
                </div>
            ) : sorted.length === 0 ? (
                <div className={styles.placeholder}>
                    Adicione datas de início e fim aos mesociclos para
                    visualizar o gráfico
                </div>
            ) : (
                <ol className={styles.timeline}>
                    {sorted.map((p, i) => {
                        const startMs = new Date(p.start).getTime();
                        const endMs = new Date(p.end).getTime();
                        const isCurrent = todayMs >= startMs && todayMs < endMs;
                        const prevEndMs = sorted[i - 1]
                            ? new Date(sorted[i - 1].end).getTime()
                            : -Infinity;
                        const markersBefore = markersBetween(prevEndMs, startMs);

                        const assessmentsWithin = assessments.filter((a) =>
                            isWithin(new Date(a.date).getTime(), p.start, p.end),
                        );

                        const badgeClass =
                            styles[BADGE_CLASS[phaseColorKey(p.phase)]];
                        const weeks = weeksBetween(p.start, p.end);

                        const deltaDays = p.actualStart
                            ? Math.round(
                                  (new Date(p.actualStart).getTime() - startMs) / DAY_MS,
                              )
                            : null;

                        return (
                            <li key={p.id} className={styles.item}>
                                {markersBefore.map(renderMarker)}
                                <div
                                    className={`${styles.row} ${isCurrent ? styles.rowCurrent : ''}`}
                                >
                                    <span className={styles.railCol}>
                                        <span
                                            className={`${styles.dot} ${badgeClass}`}
                                        />
                                    </span>
                                    <div className={styles.itemBody}>
                                        <div className={styles.itemHeader}>
                                            <span className={styles.itemName}>
                                                {p.name}
                                            </span>
                                            {isCurrent && (
                                                <span
                                                    className={styles.currentChip}
                                                >
                                                    Hoje
                                                </span>
                                            )}
                                        </div>
                                        {(p.phase || p.methodology) && (
                                            <div className={styles.itemMeta}>
                                                {[p.phase, p.methodology]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                            </div>
                                        )}
                                        <div className={styles.itemPeriod}>
                                            {fmtShort(p.start)} –{' '}
                                            {fmtShort(p.end)} ({weeks}{' '}
                                            {weeks === 1 ? 'semana' : 'semanas'})
                                        </div>
                                        {p.actualStart && (
                                            <div className={styles.itemActual}>
                                                Realizado:{' '}
                                                {fmtShort(p.actualStart)}
                                                {p.actualEnd &&
                                                p.actualEnd !== p.actualStart
                                                    ? ` – ${fmtShort(p.actualEnd)}`
                                                    : ''}
                                                {deltaDays !== null && (
                                                    <span
                                                        className={
                                                            deltaDays === 0
                                                                ? styles.deltaOnTime
                                                                : deltaDays > 0
                                                                  ? styles.deltaLate
                                                                  : styles.deltaEarly
                                                        }
                                                    >
                                                        {deltaDays === 0
                                                            ? 'No prazo'
                                                            : deltaDays > 0
                                                              ? `+${deltaDays}d atraso`
                                                              : `${Math.abs(deltaDays)}d adiantado`}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {typeof p.progress === 'number' && (
                                            <div className={styles.progressTrack}>
                                                <div
                                                    className={`${styles.progressFill} ${badgeClass}`}
                                                    style={{
                                                        width: `${Math.round(p.progress * 100)}%`,
                                                    }}
                                                />
                                            </div>
                                        )}
                                        {p.activeFocus && (
                                            <div className={styles.itemFocus}>
                                                Foco atual: {p.activeFocus}
                                            </div>
                                        )}
                                        {assessmentsWithin.length > 0 && (
                                            <div className={styles.itemAssessment}>
                                                {assessmentsWithin
                                                    .map(
                                                        (a) =>
                                                            `Avaliação em ${fmtShort(a.date)}`,
                                                    )
                                                    .join(' · ')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                    {trailingMarkers.length > 0 && (
                        <li className={styles.item}>
                            {trailingMarkers.map(renderMarker)}
                        </li>
                    )}
                </ol>
            )}
        </div>
    );
};

export default GanttPhasesTimeline;
