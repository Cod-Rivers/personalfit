'use client';

import type { LoadHistoryRecentPoint } from '@/libs/loadHistory';

const WIDTH = 96;
const HEIGHT = 30;
const PAD = 3;

/**
 * Minigráfico da lista de exercícios: SVG puro, sem Recharts — a lista pode
 * ter dezenas de exercícios, e o gráfico pesado só entra no detalhe.
 * Decorativo (aria-hidden): o texto do cartão já diz a carga e a variação.
 */
export default function LoadHistorySparkline({
    points,
    className,
}: {
    points: LoadHistoryRecentPoint[];
    className?: string;
}) {
    if (points.length < 2) return null;

    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const step = (WIDTH - PAD * 2) / (points.length - 1);
    const coords = values.map((v, i) => {
        const x = PAD + i * step;
        // Série plana fica no meio, e não colada na base.
        const y = max === min ? HEIGHT / 2 : HEIGHT - PAD - ((v - min) / span) * (HEIGHT - PAD * 2);
        return [x, y] as const;
    });
    const last = coords[coords.length - 1];

    return (
        <svg
            className={className}
            width={WIDTH}
            height={HEIGHT}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-hidden="true"
            focusable="false"
        >
            <polyline
                points={coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
            />
            <circle cx={last[0]} cy={last[1]} r={3} fill="currentColor" />
        </svg>
    );
}
