'use client';

import React, { useEffect, useRef } from 'react';
import { gantt } from 'dhtmlx-gantt';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import styles from './GanttPlanning.module.css';

export interface GanttPhase {
    id: string;
    name: string;
    start: string; // "YYYY-MM-DD"
    end: string; // "YYYY-MM-DD"
}

interface GanttPlanningProps {
    phases: GanttPhase[];
    onPhaseUpdate?: (id: string, start: string, end: string) => void;
    onReorder?: (orderedIds: string[]) => void;
    readOnly?: boolean;
    enabled?: boolean;
    onToggle?: (enabled: boolean) => void;
}

const GanttPlanning: React.FC<GanttPlanningProps> = ({
    phases,
    onPhaseUpdate,
    onReorder,
    readOnly = false,
    enabled = true,
    onToggle,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const initializedRef = useRef(false);

    useEffect(() => {
        if (!containerRef.current || !enabled) return;

        /* ── Config ── */
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
        gantt.config.readonly = readOnly;
        gantt.config.drag_resize = !readOnly;
        gantt.config.drag_move = !readOnly;
        gantt.config.drag_progress = false;
        gantt.config.details_on_dblclick = false;
        gantt.config.show_links = false;
        // Enable row reordering by drag
        gantt.config.order_branch = !readOnly;
        gantt.config.order_branch_free = !readOnly;
        gantt.config.columns = [
            { name: 'text', label: 'Fase', width: 140, tree: false },
        ];
        gantt.config.scales = [
            { unit: 'month', step: 1, format: '%F %Y' },
            {
                unit: 'week',
                step: 1,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                format: ((date: Date) => {
                    const d = String(date.getDate()).padStart(2, '0');
                    const m = String(date.getMonth() + 1).padStart(2, '0');
                    return `${d}/${m}`;
                }) as unknown as string,
            },
        ];

        /* ── Alternating week colors ── */
        gantt.templates.timeline_cell_class = (_task: unknown, date: Date) => {
            const weekIndex = Math.floor(
                date.getTime() / (7 * 24 * 60 * 60 * 1000),
            );
            return weekIndex % 2 === 0 ? 'ganttWeekEven' : 'ganttWeekOdd';
        };

        /* ── Init (once) ── */
        if (!initializedRef.current) {
            gantt.init(containerRef.current);
            initializedRef.current = true;
        }

        /* ── Data ── */
        const tasks = phases.map((p) => ({
            id: p.id,
            text: p.name,
            start_date: p.start,
            end_date: p.end,
        }));

        if (initializedRef.current && containerRef.current) {
            gantt.clearAll();
            gantt.parse({ data: tasks, links: [] });
        }

        /* ── Drag date callback ── */
        const dateEventId = gantt.attachEvent('onAfterTaskDrag', (id) => {
            if (readOnly || !onPhaseUpdate) return;
            const task = gantt.getTask(id);
            const fmt = gantt.date.date_to_str('%Y-%m-%d');
            onPhaseUpdate(String(id), fmt(task.start_date), fmt(task.end_date));
        });

        /* ── Row reorder callback ── */
        const reorderEventId = gantt.attachEvent('onRowDragEnd', () => {
            if (readOnly || !onReorder) return;
            const ids: string[] = [];
            gantt.eachTask((task) => ids.push(String(task.id)));
            onReorder(ids);
        });

        return () => {
            gantt.detachEvent(dateEventId);
            gantt.detachEvent(reorderEventId);
            // Reset init flag so reinit happens if container remounts
            try {
                gantt.clearAll();
            } catch {
                /* ignore */
            }
            initializedRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phases, readOnly, enabled]);

    return (
        <div className={styles.wrapper}>
            <div className={styles.toolbar}>
                <button
                    type="button"
                    className={styles.toggleBtn}
                    onClick={() => onToggle?.(!enabled)}
                    aria-label={
                        enabled
                            ? 'Desativar gráfico de Gantt'
                            : 'Ativar gráfico de Gantt'
                    }
                >
                    {enabled ? <FiEye size={18} /> : <FiEyeOff size={18} />}
                </button>
            </div>

            {enabled ? (
                phases.length === 0 ? (
                    <div className={styles.placeholder}>
                        Adicione datas de início e fim aos mesociclos para
                        visualizar o gráfico
                    </div>
                ) : (
                    <div ref={containerRef} className={styles.ganttContainer} />
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
