'use client';

import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts';
import { useTheme } from '@/context/ThemeContext';
import type { PartnershipMonth } from '@/libs/referralPartnerService';
import s from './AdminPartnershipReport.module.css';

/**
 * Receita líquida × custos (comissão + gastos lançados) por mês. Arquivo
 * próprio para o recharts só entrar no bundle via next/dynamic, como
 * AdminSubscriptionChart.
 *
 * Cores: slots 1 e 2 da paleta categórica validada (azul/laranja), passados
 * no validador contra --surface-1 dos dois temas (#fffdf9 e #0f0f0f). O SVG
 * não resolve var() em atributo, então o tema escolhe o hex aqui.
 */
const SERIES = {
    light: {
        net: '#2a78d6',
        cost: '#eb6834',
        grid: '#f0e7d4',
        text: '#4a3f30',
    },
    dark: { net: '#3987e5', cost: '#d95926', grid: '#242424', text: '#a0a0a0' },
};

const MONTHS = [
    'jan',
    'fev',
    'mar',
    'abr',
    'mai',
    'jun',
    'jul',
    'ago',
    'set',
    'out',
    'nov',
    'dez',
];

function monthLabel(key: string): string {
    const [y, m] = key.split('-');
    return `${MONTHS[Number(m) - 1] ?? m}/${y.slice(2)}`;
}

const brl = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

export default function PartnershipMonthlyChart({
    months,
}: {
    months: PartnershipMonth[];
}) {
    const { theme } = useTheme();
    const c = SERIES[theme];
    const data = months.map((m) => ({
        label: monthLabel(m.month),
        net: m.net,
        cost: Math.round((m.commission + m.other_expenses) * 100) / 100,
    }));

    return (
        <>
            {/* Legenda em HTML: ordem fixa (receita, depois custos) e texto nas
            cores de texto do tema; a cor só no marcador. */}
            <ul className={s.legend}>
                <li>
                    <span
                        className={s.swatch}
                        style={{ background: c.net }}
                        aria-hidden="true"
                    />
                    Receita líquida
                </li>
                <li>
                    <span
                        className={s.swatch}
                        style={{ background: c.cost }}
                        aria-hidden="true"
                    />
                    Custos (comissão + gastos)
                </li>
            </ul>
            <ResponsiveContainer width="100%" height={240}>
                <BarChart
                    data={data}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    barGap={2}
                >
                    <CartesianGrid vertical={false} stroke={c.grid} />
                    <XAxis
                        dataKey="label"
                        tick={{ fill: c.text, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fill: c.text, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={56}
                        tickFormatter={(v: number) =>
                            v >= 1000
                                ? `${Math.round(v / 100) / 10} mil`
                                : String(Math.round(v))
                        }
                    />
                    <Tooltip
                        cursor={{ fill: c.grid, opacity: 0.4 }}
                        formatter={(value) => brl.format(Number(value))}
                        contentStyle={{
                            background: 'var(--surface-1)',
                            border: '1px solid var(--border-mid)',
                            borderRadius: 8,
                            fontSize: 12,
                        }}
                        labelStyle={{
                            color: 'var(--text-primary)',
                            fontWeight: 600,
                        }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Bar
                        dataKey="net"
                        name="Receita líquida"
                        fill={c.net}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28}
                    />
                    <Bar
                        dataKey="cost"
                        name="Custos (comissão + gastos)"
                        fill={c.cost}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28}
                    />
                </BarChart>
            </ResponsiveContainer>
        </>
    );
}
