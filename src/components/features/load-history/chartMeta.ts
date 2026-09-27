import type { ChartMetric } from '@/libs/loadHistory';

// Separado de LoadHistoryChart.tsx de propósito: importar QUALQUER valor de lá
// puxaria o Recharts inteiro para o bundle das telas de treino, que só
// carregam o gráfico sob demanda (next/dynamic).

export const METRIC_UNIT: Record<ChartMetric, string> = {
    top: 'kg',
    e1rm: 'kg',
    volume: 'kg',
    reps: 'reps',
};

export const METRIC_LABEL: Record<ChartMetric, string> = {
    top: 'Maior carga',
    e1rm: '1RM estimado',
    volume: 'Volume',
    reps: 'Repetições',
};

export interface TestedPoint {
    date: string;
    value: number;
}
