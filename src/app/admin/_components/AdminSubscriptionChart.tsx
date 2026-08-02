'use client';

import type { DailyEventCount } from '@/libs/adminService';
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

/**
 * Isolado num arquivo próprio para que `recharts` (~pesado) só entre no
 * bundle via `next/dynamic` em admin/page.tsx, e não no bundle inicial da
 * rota /admin — a aba "Relatórios" é raramente aberta.
 */
export default function AdminSubscriptionChart({
    dailyCounts,
}: {
    dailyCounts: DailyEventCount[];
}) {
    return (
        <ResponsiveContainer width="100%" height={260}>
            <BarChart
                data={dailyCounts}
                margin={{
                    top: 4,
                    right: 16,
                    left: 0,
                    bottom: 4,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3a5e" />
                <XAxis
                    dataKey="date"
                    tick={{
                        fill: '#8892b0',
                        fontSize: 11,
                    }}
                    tickFormatter={(d) => d.slice(5)}
                />
                <YAxis
                    tick={{
                        fill: '#8892b0',
                        fontSize: 11,
                    }}
                    allowDecimals={false}
                />
                <Tooltip
                    contentStyle={{
                        background: '#1a2035',
                        border: '1px solid #2d3a5e',
                        borderRadius: 8,
                    }}
                    labelStyle={{ color: '#ccd6f6' }}
                    itemStyle={{ color: '#ccd6f6' }}
                />
                <Legend
                    wrapperStyle={{
                        color: '#8892b0',
                        fontSize: 12,
                    }}
                />
                <Bar
                    dataKey="subscriptions"
                    name="Assinaturas"
                    fill="#0d6efd"
                    radius={[4, 4, 0, 0]}
                />
                <Bar
                    dataKey="cancellations"
                    name="Cancelamentos"
                    fill="#dc3545"
                    radius={[4, 4, 0, 0]}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}
