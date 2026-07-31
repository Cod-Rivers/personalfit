'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { gantt } from 'dhtmlx-gantt';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import { FiEye, FiEyeOff, FiPrinter } from 'react-icons/fi';
import { phaseColorKey } from './ganttPhaseColors';
import styles from './GanttPlanning.module.css';

/** Avaliação física agendada — marco vertical no Gantt (ver AppointmentType
 * "avaliacao" no backend). */
export interface GanttAssessment {
    id: string;
    date: string; // "YYYY-MM-DD"
}

export interface GanttPhase {
    id: string;
    name: string;
    start: string; // "YYYY-MM-DD"
    end: string; // "YYYY-MM-DD"
    /** Classificação da fase (Matveyev/Bompa) — define a cor da barra. */
    phase?: string;
    methodology?: string;
    /** 0–1: fração de microciclos concluídos; undefined se não há microciclos. */
    progress?: number;
    /** Foco do microciclo "atual" (ver pickActiveMicrocycle) — exibido no tooltip. */
    activeFocus?: string;
    /** Início/fim REAL da fase (min/max de completed_date entre os
     * PeriodizedWorkoutLogs concluídos) — comparativo plano×realizado.
     * undefined enquanto não há nenhum treino concluído na fase. */
    actualStart?: string;
    actualEnd?: string;
}

export interface GanttPlanningProps {
    phases: GanttPhase[];
    onPhaseUpdate?: (id: string, start: string, end: string) => void;
    readOnly?: boolean;
    enabled?: boolean;
    onToggle?: (enabled: boolean) => void;
    /** Avaliações físicas agendadas — desenhadas como marcos verticais. */
    assessments?: GanttAssessment[];
    /** Título mostrado só na impressão (ver botão "Imprimir"); some no dia a dia. */
    printTitle?: string;
}

interface GanttTaskData {
    id: string | number;
    text: string;
    start_date: Date;
    end_date: Date;
    phase?: string;
    methodology?: string;
    progress?: number;
    activeFocus?: string;
    actualStart?: string;
    actualEnd?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const LEGEND_SWATCH_CLASS: Record<string, string> = {
    mint: 'legendSwatchMint',
    violet: 'legendSwatchViolet',
    amber: 'legendSwatchAmber',
    coral: 'legendSwatchCoral',
    deload: 'legendSwatchDeload',
};

function phaseGanttClass(phase?: string): string {
    return `ganttPhase-${phaseColorKey(phase)}`;
}

function phaseSwatchClass(phase?: string): string {
    return LEGEND_SWATCH_CLASS[phaseColorKey(phase)];
}

function weekColumnFormat(date: Date): string {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}`;
}

/** Extensão total do plano em dias — decide a escala do timeline e a altura
 * do container (ver computeGanttHeight). */
function computeGanttSpanDays(phases: GanttPhase[]): number {
    if (phases.length === 0) return 0;
    const starts = phases.map((p) => new Date(p.start).getTime());
    const ends = phases.map((p) => new Date(p.end).getTime());
    return (Math.max(...ends) - Math.min(...starts)) / DAY_MS;
}

/** Altura = cabeçalho da escala (1 ou 2 linhas) + uma linha por fase, com
 * teto — evita tanto um bloco vazio de 300px pra 2 fases quanto scroll
 * vertical aninhado (dentro do scroll horizontal) pra 10+ fases. */
function computeGanttHeight(phaseCount: number, spanDays: number): number {
    const scaleRows = spanDays > 183 ? 1 : 2;
    const headerHeight = scaleRows * 26;
    const rowHeight = 38;
    return Math.min(420, Math.max(120, headerHeight + phaseCount * rowHeight));
}

const GanttPlanning: React.FC<GanttPlanningProps> = ({
    phases,
    onPhaseUpdate,
    readOnly = false,
    enabled = true,
    onToggle,
    assessments = [],
    printTitle,
}) => {
    // O container só existe no DOM quando enabled && phases.length > 0 (ver
    // JSX abaixo); usar callback ref em vez de useRef simples garante que o
    // efeito de init dispare assim que o <div> de fato montar, mesmo que o
    // Gantt comece vazio e ganhe fases depois.
    const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(
        null,
    );
    const containerRef = useCallback((node: HTMLDivElement | null) => {
        setContainerEl(node);
    }, []);
    const initializedRef = useRef(false);
    const markerIdRef = useRef<string | number | null>(null);
    const assessmentMarkerIdsRef = useRef<(string | number)[]>([]);

    // Refs para os callbacks: os listeners do dhtmlx são anexados uma única
    // vez (no init), então precisam ler a versão mais recente via ref em vez
    // de fechar sobre props antigas.
    const readOnlyRef = useRef(readOnly);
    const onPhaseUpdateRef = useRef(onPhaseUpdate);
    useEffect(() => {
        readOnlyRef.current = readOnly;
    }, [readOnly]);
    useEffect(() => {
        onPhaseUpdateRef.current = onPhaseUpdate;
    }, [onPhaseUpdate]);

    /* ── Init (uma única vez por montagem) ── */
    useEffect(() => {
        if (!containerEl || !enabled) return;

        gantt.plugins({ marker: true, tooltip: true });

        gantt.i18n.setLocale({
            date: {
                month_full: [
                    'Janeiro',
                    'Fevereiro',
                    'Março',
                    'Abril',
                    'Maio',
                    'Junho',
                    'Julho',
                    'Agosto',
                    'Setembro',
                    'Outubro',
                    'Novembro',
                    'Dezembro',
                ],
                month_short: [
                    'Jan',
                    'Fev',
                    'Mar',
                    'Abr',
                    'Mai',
                    'Jun',
                    'Jul',
                    'Ago',
                    'Set',
                    'Out',
                    'Nov',
                    'Dez',
                ],
                day_full: [
                    'Domingo',
                    'Segunda',
                    'Terça',
                    'Quarta',
                    'Quinta',
                    'Sexta',
                    'Sábado',
                ],
                day_short: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
            },
        });
        gantt.config.date_format = '%Y-%m-%d';
        gantt.config.drag_progress = false;
        gantt.config.details_on_dblclick = false;
        gantt.config.show_links = false;
        gantt.config.columns = [
            { name: 'text', label: 'Fase', width: 140, tree: false },
        ];

        /* ── Alternating week colors ── */
        gantt.templates.timeline_cell_class = (_task: unknown, date: Date) => {
            const weekIndex = Math.floor(date.getTime() / WEEK_MS);
            return weekIndex % 2 === 0 ? 'ganttWeekEven' : 'ganttWeekOdd';
        };

        /* ── Cor por fase ── */
        gantt.templates.task_class = (
            _start: Date,
            _end: Date,
            task: unknown,
        ) => phaseGanttClass((task as GanttTaskData).phase);

        /* ── Tooltip: fase, metodologia, período, foco atual, progresso,
         * comparativo plano×realizado ── */
        gantt.templates.tooltip_text = (
            start: Date,
            end: Date,
            task: unknown,
        ) => {
            const t = task as GanttTaskData;
            const fmtDate = (d: Date) => d.toLocaleDateString('pt-BR');
            const weeks = Math.max(
                1,
                Math.round((end.getTime() - start.getTime()) / WEEK_MS),
            );
            const lines = [`<strong>${t.text}</strong>`];
            if (t.phase) lines.push(t.phase);
            if (t.methodology) lines.push(t.methodology);
            lines.push(
                `${fmtDate(start)} – ${fmtDate(end)} (${weeks} ${weeks === 1 ? 'semana' : 'semanas'})`,
            );
            if (t.activeFocus) lines.push(`Foco atual: ${t.activeFocus}`);
            if (typeof t.progress === 'number') {
                lines.push(`${Math.round(t.progress * 100)}% concluído`);
            }
            if (t.actualStart) {
                const real = t.actualEnd && t.actualEnd !== t.actualStart
                    ? `${fmtDate(new Date(t.actualStart))} – ${fmtDate(new Date(t.actualEnd))}`
                    : fmtDate(new Date(t.actualStart));
                lines.push(`Realizado: ${real}`);
            }
            return lines.join('<br/>');
        };

        /* ── Badge de atraso/adiantamento (início real vs. planejado) —
         * visível direto na barra, sem precisar do hover do tooltip ── */
        gantt.templates.rightside_text = (
            start: Date,
            _end: Date,
            task: unknown,
        ) => {
            const t = task as GanttTaskData;
            if (!t.actualStart) return '';
            const deltaDays = Math.round(
                (new Date(t.actualStart).getTime() - start.getTime()) / DAY_MS,
            );
            if (deltaDays === 0) {
                return '<span class="ganttDelta ganttDeltaOnTime">No prazo</span>';
            }
            if (deltaDays > 0) {
                return `<span class="ganttDelta ganttDeltaLate">+${deltaDays}d atraso</span>`;
            }
            return `<span class="ganttDelta ganttDeltaEarly">${Math.abs(deltaDays)}d adiantado</span>`;
        };

        gantt.init(containerEl);
        initializedRef.current = true;

        /* ── Drag date callback ── */
        const dateEventId = gantt.attachEvent('onAfterTaskDrag', (id) => {
            if (readOnlyRef.current || !onPhaseUpdateRef.current) return;
            const task = gantt.getTask(id);
            const fmt = gantt.date.date_to_str('%Y-%m-%d');
            onPhaseUpdateRef.current(
                String(id),
                fmt(task.start_date),
                fmt(task.end_date),
            );
        });

        return () => {
            gantt.detachEvent(dateEventId);
            gantt.destructor();
            initializedRef.current = false;
            markerIdRef.current = null;
            assessmentMarkerIdsRef.current = [];
        };
    }, [containerEl, enabled]);

    /* ── Config que depende de readOnly (sem reinicializar o gantt) ──
     * Reordenar linhas (order_branch) fica sempre desligado: não há
     * persistência de ordem via drag — só de datas (drag_resize/drag_move). */
    useEffect(() => {
        if (!initializedRef.current) return;
        gantt.config.readonly = readOnly;
        gantt.config.drag_resize = !readOnly;
        gantt.config.drag_move = !readOnly;
        gantt.config.order_branch = false;
        gantt.config.order_branch_free = false;
        gantt.render();
    }, [readOnly, enabled]);

    /* ── Dados + escala adaptativa + marcador de "hoje" ── */
    useEffect(() => {
        if (!initializedRef.current) return;

        const spanDays = computeGanttSpanDays(phases);

        // Zoom adaptativo: ≤8 semanas ganha granularidade diária (ajuste
        // fino), 2–6 meses usa mês/semana, acima disso só mês — senão a
        // régua semanal vira ruído ilegível num plano de 12 meses.
        if (spanDays <= 56) {
            gantt.config.scales = [
                { unit: 'week', step: 1, format: weekColumnFormat as unknown as string },
                { unit: 'day', step: 1, format: '%d' },
            ];
        } else if (spanDays <= 183) {
            gantt.config.scales = [
                { unit: 'month', step: 1, format: '%F %Y' },
                { unit: 'week', step: 1, format: weekColumnFormat as unknown as string },
            ];
        } else {
            gantt.config.scales = [{ unit: 'month', step: 1, format: '%F %Y' }];
        }

        const tasks = phases.map((p) => ({
            id: p.id,
            text: p.name,
            start_date: p.start,
            end_date: p.end,
            phase: p.phase,
            methodology: p.methodology,
            progress: p.progress,
            activeFocus: p.activeFocus,
            actualStart: p.actualStart,
            actualEnd: p.actualEnd,
        }));

        gantt.clearAll();
        gantt.parse({ data: tasks, links: [] });
        gantt.setSizes();

        if (markerIdRef.current !== null) {
            gantt.deleteMarker(markerIdRef.current);
            markerIdRef.current = null;
        }
        assessmentMarkerIdsRef.current.forEach((id) => gantt.deleteMarker(id));
        assessmentMarkerIdsRef.current = [];

        if (tasks.length > 0) {
            markerIdRef.current = gantt.addMarker({
                start_date: new Date(),
                css: 'ganttToday',
                text: 'Hoje',
                title: 'Hoje',
            });

            assessmentMarkerIdsRef.current = assessments.map((a) =>
                gantt.addMarker({
                    start_date: new Date(a.date),
                    css: 'ganttAssessment',
                    text: 'Avaliação',
                    title: `Avaliação física agendada — ${new Date(a.date).toLocaleDateString('pt-BR')}`,
                }),
            );
        }
    }, [phases, assessments, enabled]);

    const legendItems = Array.from(
        new Map(phases.filter((p) => p.phase).map((p) => [p.phase as string, p.phase as string])).keys(),
    );
    const containerHeight = computeGanttHeight(
        phases.length,
        computeGanttSpanDays(phases),
    );

    return (
        <div className={`${styles.wrapper} gantt-print-target`}>
            {printTitle && (
                <div className="gantt-print-only">
                    <h3>{printTitle}</h3>
                    <p>Gerado em {new Date().toLocaleDateString('pt-BR')}</p>
                </div>
            )}
            <div className={`${styles.toolbar} ${styles.noPrint}`}>
                {enabled && phases.length > 0 && (
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

            {enabled ? (
                phases.length === 0 ? (
                    <div className={styles.placeholder}>
                        Adicione datas de início e fim aos mesociclos para
                        visualizar o gráfico
                    </div>
                ) : (
                    <>
                        {legendItems.length > 0 && (
                            <div className={styles.legend}>
                                {legendItems.map((phaseName) => (
                                    <span
                                        key={phaseName}
                                        className={styles.legendItem}
                                    >
                                        <span
                                            className={`${styles.legendSwatch} ${styles[phaseSwatchClass(phaseName)]}`}
                                        />
                                        {phaseName}
                                    </span>
                                ))}
                            </div>
                        )}
                        <div
                            ref={containerRef}
                            className={styles.ganttContainer}
                            style={{ height: containerHeight }}
                        />
                    </>
                )
            ) : (
                <div className={styles.placeholder}>
                    Gráfico de Gantt desativado
                </div>
            )}
        </div>
    );
};

export default GanttPlanning;
