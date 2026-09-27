'use client';

import {
    CartesianGrid,
    ComposedChart,
    Line,
    ReferenceArea,
    ReferenceLine,
    ResponsiveContainer,
    Scatter,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
    formatDateBR,
    formatKg,
    formatSets,
    sessionValue,
    type ChartMetric,
    type LoadHistoryMesocycle,
    type LoadHistoryMetric,
    type LoadHistorySession,
} from '@/libs/loadHistory';
import { METRIC_LABEL, METRIC_UNIT, type TestedPoint } from './chartMeta';
import s from './LoadHistory.module.css';

// Paleta fixa, a mesma de EvolutionChart: o SVG do Recharts não resolve
// todas as CSS custom properties de forma confiável em todos os WebViews.
const COLORS = {
    line: '#0ffcbe',
    record: '#f0a500',
    outlier: '#ff6b6b',
    tested: '#8b5cf6',
} as const;

const DAY_MS = 86_400_000;

/** Meio-dia UTC do dia civil: a data vira número sem escorregar de dia em
 * fuso nenhum. */
function toT(date: string): number {
    return Date.parse(`${date.slice(0, 10)}T12:00:00Z`);
}

function tickLabel(t: number): string {
    const d = new Date(t);
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

interface Datum {
    t: number;
    date: string;
    value: number | null;
    planned: number | null;
    record: boolean;
    pending: boolean;
    deload: boolean;
    setsText: string;
}

interface Props {
    sessions: LoadHistorySession[];
    exerciseMetric: LoadHistoryMetric;
    metric: ChartMetric;
    mesocycles: LoadHistoryMesocycle[];
    /** Datas das avaliações físicas (EvolutionTimeline). */
    evaluationDates: string[];
    /** 1RM testado na avaliação, quando o exercício corresponde ao teste. */
    tested: TestedPoint[];
}

export default function LoadHistoryChart({
    sessions,
    exerciseMetric,
    metric,
    mesocycles,
    evaluationDates,
    tested,
}: Props) {
    const unit = METRIC_UNIT[metric];
    const ordered = [...sessions].sort((a, b) => a.date.localeCompare(b.date));

    const data: Datum[] = ordered
        .filter((x) => !x.outlier)
        .map((x) => ({
            t: toT(x.date),
            date: x.date,
            value: sessionValue(x, metric),
            planned: metric === 'top' && x.planned_load_kg ? x.planned_load_kg : null,
            record: !!x.record,
            pending: !!x.pending,
            deload: !!x.deload,
            setsText: formatSets(x.sets, exerciseMetric),
        }));
    const outliers = ordered
        .filter((x) => x.outlier)
        .map((x) => ({ t: toT(x.date), value: sessionValue(x, metric), date: x.date }));
    const hasPlanned = data.some((d) => d.planned != null);
    const testedData = metric === 'e1rm' ? tested.map((p) => ({ t: toT(p.date), value: p.value, date: p.date })) : [];

    if (data.every((d) => d.value == null)) {
        return <p className={s.legendNote}>Sem dados desta métrica ainda.</p>;
    }

    const allT = [...data.map((d) => d.t), ...testedData.map((d) => d.t)];
    const minT = Math.min(...allT);
    const maxT = Math.max(...allT);
    // Um único dia vira um domínio de largura zero; abre meio dia de cada lado.
    const domain: [number, number] = minT === maxT ? [minT - DAY_MS, maxT + DAY_MS] : [minT, maxT];

    // Faixas de deload: sessões de deload consecutivas viram um bloco só.
    const deloadAreas: Array<[number, number]> = [];
    for (const d of data) {
        if (!d.deload) continue;
        const last = deloadAreas[deloadAreas.length - 1];
        if (last && d.t - last[1] <= 8 * DAY_MS) last[1] = d.t;
        else deloadAreas.push([d.t, d.t]);
    }

    // Troca de fase: primeira sessão de cada mesociclo depois da primeira.
    const mesoName = new Map(mesocycles.map((m) => [m.id, m.name]));
    const phaseChanges: Array<{ t: number; label: string }> = [];
    let prevMeso: string | undefined;
    for (const x of ordered) {
        if (!x.mesocycle_id || x.pending) continue;
        if (prevMeso !== undefined && x.mesocycle_id !== prevMeso) {
            phaseChanges.push({ t: toT(x.date), label: mesoName.get(x.mesocycle_id) ?? 'Nova fase' });
        }
        prevMeso = x.mesocycle_id;
    }

    const evals = evaluationDates
        .map((d) => toT(d))
        .filter((t) => t >= domain[0] - DAY_MS && t <= domain[1] + DAY_MS);

    const renderDot = (props: unknown) => {
        const { cx, cy, payload, index } = props as {
            cx?: number;
            cy?: number;
            payload?: Datum;
            index?: number;
        };
        const key = `dot-${index ?? 0}`;
        if (cx == null || cy == null || !payload || payload.value == null) {
            return <g key={key} />;
        }
        if (payload.pending) {
            return (
                <circle key={key} cx={cx} cy={cy} r={4} fill="none" stroke={COLORS.line} strokeWidth={2} strokeDasharray="2 2" />
            );
        }
        if (payload.record) {
            return <circle key={key} cx={cx} cy={cy} r={5.5} fill={COLORS.record} stroke="#fff" strokeWidth={1.5} />;
        }
        return <circle key={key} cx={cx} cy={cy} r={3} fill={COLORS.line} />;
    };

    const renderTooltip = ({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }) => {
        if (!active || !payload?.length) return null;
        const d = payload[0]?.payload as (Datum & { tested?: boolean }) | undefined;
        if (!d) return null;
        return (
            <div
                style={{
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 8,
                    padding: '6px 10px',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    maxWidth: 240,
                }}
            >
                <strong>{formatDateBR(d.date)}</strong>
                {d.value != null && (
                    <div>
                        {METRIC_LABEL[metric]}: {formatKg(d.value)} {unit}
                    </div>
                )}
                {d.planned != null && <div>Prescrito: {formatKg(d.planned)} kg</div>}
                {d.setsText && <div style={{ color: 'var(--text-muted)' }}>{d.setsText}</div>}
                {d.record && <div style={{ color: COLORS.record }}>Recorde</div>}
                {d.deload && <div>Semana de deload</div>}
                {d.pending && <div>Pendente de envio</div>}
            </div>
        );
    };

    return (
        <div className={s.chartWrap}>
            <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={data} margin={{ top: 12, right: 12, left: -8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.15} />
                    <XAxis
                        dataKey="t"
                        type="number"
                        scale="time"
                        domain={domain}
                        tickFormatter={tickLabel}
                        tick={{ fill: 'currentColor', fontSize: 11 }}
                        minTickGap={24}
                    />
                    <YAxis
                        tick={{ fill: 'currentColor', fontSize: 11 }}
                        width={46}
                        domain={['auto', 'auto']}
                        allowDecimals={metric !== 'reps'}
                    />
                    <Tooltip content={renderTooltip} />
                    {deloadAreas.map(([a, b]) => (
                        <ReferenceArea
                            key={`deload-${a}`}
                            x1={a - 1.5 * DAY_MS}
                            x2={b + 1.5 * DAY_MS}
                            fill="currentColor"
                            fillOpacity={0.08}
                            ifOverflow="extendDomain"
                        />
                    ))}
                    {phaseChanges.map((p) => (
                        <ReferenceLine
                            key={`phase-${p.t}`}
                            x={p.t}
                            stroke="currentColor"
                            strokeOpacity={0.45}
                            label={{ value: p.label, position: 'insideTopLeft', fontSize: 10, fill: 'currentColor' }}
                        />
                    ))}
                    {evals.map((t) => (
                        <ReferenceLine
                            key={`eval-${t}`}
                            x={t}
                            stroke={COLORS.tested}
                            strokeDasharray="4 4"
                            label={{ value: 'Avaliação', position: 'insideBottomRight', fontSize: 10, fill: COLORS.tested }}
                        />
                    ))}
                    {hasPlanned && (
                        <Line
                            type="stepAfter"
                            dataKey="planned"
                            name="Prescrito"
                            stroke="currentColor"
                            strokeOpacity={0.6}
                            strokeDasharray="5 4"
                            dot={false}
                            connectNulls
                            isAnimationActive={false}
                        />
                    )}
                    <Line
                        type="monotone"
                        dataKey="value"
                        name={METRIC_LABEL[metric]}
                        stroke={COLORS.line}
                        strokeWidth={2}
                        dot={renderDot}
                        activeDot={{ r: 5 }}
                        connectNulls
                        isAnimationActive={false}
                    />
                    {outliers.length > 0 && (
                        <Scatter data={outliers} dataKey="value" name="Fora do padrão" fill={COLORS.outlier} shape="cross" />
                    )}
                    {testedData.length > 0 && (
                        <Scatter data={testedData} dataKey="value" name="1RM testado" fill={COLORS.tested} shape="diamond" />
                    )}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
