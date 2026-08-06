'use client';

import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';
import s from './EvolutionCompareChart.module.css';

interface MeasurementRow {
    label: string;
    antes?: number;
    depois?: number;
}

interface Props {
    weightAntes?: number;
    weightDepois?: number;
    bodyFatAntes?: number;
    bodyFatDepois?: number;
    measurementRows: MeasurementRow[];
}

const ANTES_COLOR = '#8b5cf6';
const DEPOIS_COLOR = '#0ffcbe';

const tooltipProps = {
    contentStyle: {
        background: 'var(--surface-1)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 8,
        fontSize: 13,
    },
    labelStyle: { color: 'var(--text-primary)' },
};

function MetricBars({
    label,
    unit,
    antes,
    depois,
}: {
    label: string;
    unit?: string;
    antes?: number;
    depois?: number;
}) {
    if (antes == null && depois == null) return null;
    const data = [{ name: label, antes, depois }];
    return (
        <div className={s.metricPanel}>
            <h4 className={s.panelTitle}>
                {label}
                {unit ? ` (${unit})` : ''}
            </h4>
            <ResponsiveContainer width="100%" height={150}>
                <BarChart
                    data={data}
                    margin={{ top: 8, right: 8, left: -12, bottom: 4 }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="currentColor"
                        strokeOpacity={0.12}
                        vertical={false}
                    />
                    <XAxis dataKey="name" tick={false} axisLine={false} />
                    <YAxis
                        tick={{ fill: 'currentColor', fontSize: 11 }}
                        width={36}
                        domain={['dataMin - 2', 'dataMax + 2']}
                    />
                    <Tooltip {...tooltipProps} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                        dataKey="antes"
                        name="Antes"
                        fill={ANTES_COLOR}
                        radius={[4, 4, 0, 0]}
                        barSize={40}
                    />
                    <Bar
                        dataKey="depois"
                        name="Depois"
                        fill={DEPOIS_COLOR}
                        radius={[4, 4, 0, 0]}
                        barSize={40}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

/**
 * Isolado num arquivo próprio (mesmo padrão de EvolutionChart) para que
 * `recharts` só entre no bundle via `next/dynamic` quando o modo comparação
 * for aberto.
 */
export default function EvolutionCompareChart({
    weightAntes,
    weightDepois,
    bodyFatAntes,
    bodyFatDepois,
    measurementRows,
}: Props) {
    const hasWeight = weightAntes != null || weightDepois != null;
    const hasBodyFat = bodyFatAntes != null || bodyFatDepois != null;

    if (!hasWeight && !hasBodyFat && measurementRows.length === 0) {
        return null;
    }

    return (
        <div className={s.wrap}>
            {(hasWeight || hasBodyFat) && (
                <div className={s.metricsRow}>
                    <MetricBars
                        label="Peso"
                        unit="kg"
                        antes={weightAntes}
                        depois={weightDepois}
                    />
                    <MetricBars
                        label="% gordura"
                        antes={bodyFatAntes}
                        depois={bodyFatDepois}
                    />
                </div>
            )}

            {measurementRows.length > 0 && (
                <div className={s.panel}>
                    <h4 className={s.panelTitle}>Medidas (cm)</h4>
                    <ResponsiveContainer
                        width="100%"
                        height={Math.max(140, measurementRows.length * 34)}
                    >
                        <BarChart
                            data={measurementRows}
                            layout="vertical"
                            margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="currentColor"
                                strokeOpacity={0.12}
                                horizontal={false}
                            />
                            <XAxis
                                type="number"
                                tick={{ fill: 'currentColor', fontSize: 11 }}
                            />
                            <YAxis
                                type="category"
                                dataKey="label"
                                width={130}
                                tick={{ fill: 'currentColor', fontSize: 11 }}
                            />
                            <Tooltip {...tooltipProps} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar
                                dataKey="antes"
                                name="Antes"
                                fill={ANTES_COLOR}
                                radius={[0, 4, 4, 0]}
                            />
                            <Bar
                                dataKey="depois"
                                name="Depois"
                                fill={DEPOIS_COLOR}
                                radius={[0, 4, 4, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
