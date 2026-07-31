'use client';

import { useCallback, useState } from 'react';
import type { MacrocycleResponse } from '@/libs/planningService';

type SavePhaseDatesFn = (
    phaseId: string,
    start: string,
    end: string,
) => Promise<MacrocycleResponse>;

interface UseEditablePhaseDatesResult {
    handlePhaseUpdate: (phaseId: string, start: string, end: string) => void;
    phaseError: string | null;
}

/**
 * Liga o drag-and-drop do GanttPlanning à API: atualiza a fase
 * otimisticamente no estado local e salva no backend; se o servidor rejeitar
 * (ex.: sobreposição de datas ou fase fora dos limites do macrociclo — ver
 * ValidatePhaseDateRange no backend), reverte a mudança e expõe o motivo.
 */
export function useEditablePhaseDates(
    macro: MacrocycleResponse | null,
    setMacro: (m: MacrocycleResponse) => void,
    saveDates: SavePhaseDatesFn,
): UseEditablePhaseDatesResult {
    const [phaseError, setPhaseError] = useState<string | null>(null);

    const handlePhaseUpdate = useCallback(
        (phaseId: string, start: string, end: string) => {
            if (!macro) return;
            const previous = macro;
            setPhaseError(null);

            setMacro({
                ...macro,
                mesocycles: macro.mesocycles.map((m) =>
                    m.id === phaseId
                        ? { ...m, start_date: start, end_date: end }
                        : m,
                ),
            });

            saveDates(phaseId, start, end)
                .then(setMacro)
                .catch((err: unknown) => {
                    setMacro(previous);
                    const msg =
                        (err as { response?: { data?: { message?: string } } })
                            ?.response?.data?.message ??
                        'Não foi possível salvar a data da fase.';
                    setPhaseError(msg);
                });
        },
        [macro, setMacro, saveDates],
    );

    return { handlePhaseUpdate, phaseError };
}
