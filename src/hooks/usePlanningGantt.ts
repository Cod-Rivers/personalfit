'use client';

import { useCallback, useRef, useState } from 'react';
import { GanttPhase } from '@/components/features/GanttPlanning';
import {
    MacrocycleResponse,
    toGanttPhases,
    updatePhaseDate,
} from '@/libs/planningService';

interface UsePlanningGanttOptions {
    studentId: string;
    planningId: string;
    initialMacrocycle?: MacrocycleResponse;
}

interface UsePlanningGanttReturn {
    phases: GanttPhase[];
    loading: boolean;
    error: string | null;
    ganttEnabled: boolean;
    setGanttEnabled: (v: boolean) => void;
    handlePhaseUpdate: (phaseId: string, start: string, end: string) => void;
}

export function usePlanningGantt({
    studentId,
    planningId,
    initialMacrocycle,
}: UsePlanningGanttOptions): UsePlanningGanttReturn {
    const [phases, setPhases] = useState<GanttPhase[]>(
        initialMacrocycle ? toGanttPhases(initialMacrocycle.mesocycles) : [],
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ganttEnabled, setGanttEnabled] = useState(true);

    // Debounce ref to avoid rapid API calls during sequential drags
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handlePhaseUpdate = useCallback(
        (phaseId: string, start: string, end: string) => {
            // Optimistic update — reflect immediately in the chart
            setPhases((prev) =>
                prev.map((p) => (p.id === phaseId ? { ...p, start, end } : p)),
            );
            setError(null);

            // Debounce the API call (300ms)
            if (timerRef.current) clearTimeout(timerRef.current);

            timerRef.current = setTimeout(async () => {
                setLoading(true);
                try {
                    const updated = await updatePhaseDate(
                        studentId,
                        planningId,
                        phaseId,
                        start,
                        end,
                    );
                    // Sync with server response
                    setPhases(toGanttPhases(updated.mesocycles));
                } catch (err) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : 'Erro ao atualizar fase';
                    setError(message);
                    // Revert optimistic update on failure — leave current phases
                    // (user can retry by dragging again)
                } finally {
                    setLoading(false);
                }
            }, 300);
        },
        [studentId, planningId],
    );

    return {
        phases,
        loading,
        error,
        ganttEnabled,
        setGanttEnabled,
        handlePhaseUpdate,
    };
}
