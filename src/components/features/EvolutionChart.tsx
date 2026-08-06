'use client';

import type { EvolutionEntry } from '@/libs/evolutionService';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';
import s from './EvolutionChart.module.css';

/**
 * Isolado num arquivo próprio para que `recharts` (~pesado) só entre no
 * bundle via `next/dynamic` em EvolutionTimeline.tsx (mesmo padrão de
 * AdminSubscriptionChart) — a maioria das visitas à página de evolução não
 * chega a olhar o gráfico.
 */
export default function EvolutionChart({
    entries,
    extraMeasurementKey,
    extraMeasurementLabel,
}: {
    entries: EvolutionEntry[];
    /** Chave de measurements (ex.: "cintura") plotada como 3ª linha. */
    extraMeasurementKey?: string;
    extraMeasurementLabel?: string;
}) {
    const data = entries
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((e) => ({
            label: new Date(e.date + 'T00:00:00').toLocaleDateString(
                'pt-BR',
                { day: '2-digit', month: '2-digit' },
            ),
            peso: e.weight_kg ?? undefined,
            gordura: e.body_fat_percent ?? undefined,
            extra: extraMeasurementKey
                ? e.measurements?.[extraMeasurementKey] ?? undefined
                : undefined,
        }));

    return (
        <div className={s.chartWrap}>
            <ResponsiveContainer width="100%" height={240}>
                <LineChart
                    data={data}
                    margin={{ top: 8, right: 8, left: -12, bottom: 4 }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="currentColor"
                        strokeOpacity={0.15}
                    />
                    <XAxis
                        dataKey="label"
                        tick={{ fill: 'currentColor', fontSize: 11 }}
                    />
                    <YAxis
                        yAxisId="peso"
                        tick={{ fill: 'currentColor', fontSize: 11 }}
                        width={44}
                        domain={['dataMin - 2', 'dataMax + 2']}
                    />
                    <YAxis
                        yAxisId="gordura"
                        orientation="right"
                        tick={{ fill: 'currentColor', fontSize: 11 }}
                        width={44}
                        domain={['dataMin - 2', 'dataMax + 2']}
                    />
                    {extraMeasurementKey && (
                        <YAxis
                            yAxisId="extra"
                            hide
                            domain={['dataMin - 2', 'dataMax + 2']}
                        />
                    )}
                    <Tooltip
                        contentStyle={{
                            background: 'var(--surface-1)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 8,
                            fontSize: 13,
                        }}
                        labelStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                        yAxisId="peso"
                        type="monotone"
                        dataKey="peso"
                        name="Peso (kg)"
                        stroke="#0ffcbe"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                    />
                    <Line
                        yAxisId="gordura"
                        type="monotone"
                        dataKey="gordura"
                        name="% gordura"
                        stroke="#ff6b6b"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                    />
                    {extraMeasurementKey && (
                        <Line
                            yAxisId="extra"
                            type="monotone"
                            dataKey="extra"
                            name={extraMeasurementLabel ?? 'Medida'}
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            connectNulls
                        />
                    )}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
