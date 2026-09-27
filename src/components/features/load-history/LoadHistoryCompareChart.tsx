'use client';

import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import s from './LoadHistory.module.css';

// Até 4 séries (limite da comparação), cores distintas também em daltonismo
// comum: mint, violeta, âmbar, azul.
const SERIES_COLORS = ['#0ffcbe', '#8b5cf6', '#f0a500', '#3b82f6'];

export interface CompareSeries {
    key: string;
    name: string;
    points: Array<{ date: string; pct: number }>;
}

function toT(date: string): number {
    return Date.parse(`${date.slice(0, 10)}T12:00:00Z`);
}

function tickLabel(t: number): string {
    const d = new Date(t);
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Vários exercícios no mesmo gráfico, cada um em % da própria primeira
 * sessão (base 100) — sem isso o agachamento esmaga a rosca na escala. */
export default function LoadHistoryCompareChart({ series }: { series: CompareSeries[] }) {
    const byT = new Map<number, Record<string, number>>();
    for (const sr of series) {
        for (const p of sr.points) {
            const t = toT(p.date);
            const row = byT.get(t) ?? {};
            row[sr.key] = p.pct;
            byT.set(t, row);
        }
    }
    const data = [...byT.entries()]
        .sort(([a], [b]) => a - b)
        .map(([t, row]) => ({ t, ...row }));

    if (data.length === 0) {
        return <p className={s.legendNote}>Os exercícios escolhidos ainda não têm sessões para comparar.</p>;
    }

    return (
        <div className={s.chartWrap}>
            <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data} margin={{ top: 12, right: 12, left: -8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.15} />
                    <XAxis
                        dataKey="t"
                        type="number"
                        scale="time"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={tickLabel}
                        tick={{ fill: 'currentColor', fontSize: 11 }}
                        minTickGap={24}
                    />
                    <YAxis
                        tick={{ fill: 'currentColor', fontSize: 11 }}
                        width={46}
                        domain={['auto', 'auto']}
                        tickFormatter={(v: number) => `${v}%`}
                    />
                    <ReferenceLine y={100} stroke="currentColor" strokeOpacity={0.4} strokeDasharray="4 4" />
                    <Tooltip
                        labelFormatter={(t) => tickLabel(Number(t))}
                        formatter={(v) => `${v}%`}
                        contentStyle={{
                            background: 'var(--surface-1)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 8,
                            fontSize: 13,
                        }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {series.map((sr, i) => (
                        <Line
                            key={sr.key}
                            type="monotone"
                            dataKey={sr.key}
                            name={sr.name}
                            stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            connectNulls
                            isAnimationActive={false}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
