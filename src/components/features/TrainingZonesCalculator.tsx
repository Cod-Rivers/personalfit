'use client';
import { useMemo, useState } from 'react';
import s from './TrainingZonesCalculator.module.css';

interface Zone {
    label: string;
    lowPct: number;
    highPct: number;
    color: string;
}

const ZONES: Zone[] = [
    { label: 'Z1 · Recuperação', lowPct: 50, highPct: 60, color: '#60a5fa' },
    { label: 'Z2 · Aeróbico leve', lowPct: 60, highPct: 70, color: '#34d399' },
    { label: 'Z3 · Aeróbico', lowPct: 70, highPct: 80, color: '#fbbf24' },
    { label: 'Z4 · Limiar', lowPct: 80, highPct: 90, color: '#fb923c' },
    { label: 'Z5 · Máximo', lowPct: 90, highPct: 100, color: '#f87171' },
];

/**
 * Calcula zonas-alvo de FC pelo método de Karvonen (usa FC de reserva quando a
 * FC de repouso é informada; senão, percentual direto da FC máxima).
 * FCmáx estimada por 208 − 0,7×idade (Tanaka) se não informada.
 */
export default function TrainingZonesCalculator() {
    const [age, setAge] = useState('');
    const [restHr, setRestHr] = useState('');
    const [maxHr, setMaxHr] = useState('');

    const result = useMemo(() => {
        const ageN = Number(age);
        const rest = Number(restHr);
        const maxManual = Number(maxHr);

        const fcMax =
            maxManual > 0
                ? maxManual
                : ageN > 0
                  ? Math.round(208 - 0.7 * ageN)
                  : 0;
        if (fcMax <= 0) return null;

        const useKarvonen = rest > 0 && rest < fcMax;
        const hrAt = (pct: number) =>
            useKarvonen
                ? Math.round(((fcMax - rest) * pct) / 100 + rest)
                : Math.round((fcMax * pct) / 100);

        return {
            fcMax,
            useKarvonen,
            zones: ZONES.map((z) => ({
                ...z,
                low: hrAt(z.lowPct),
                high: hrAt(z.highPct),
            })),
        };
    }, [age, restHr, maxHr]);

    return (
        <div className={s.card}>
            <h3 className={s.title}>❤️ Zonas de treino (FC)</h3>
            <p className={s.sub}>
                Calcule as faixas de frequência cardíaca-alvo para prescrever
                aeróbico com segurança.
            </p>

            <div className={s.inputs}>
                <div className={s.field}>
                    <label className={s.label}>Idade</label>
                    <input
                        className={s.input}
                        type="number"
                        inputMode="numeric"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="30"
                    />
                </div>
                <div className={s.field}>
                    <label className={s.label}>FC repouso (opcional)</label>
                    <input
                        className={s.input}
                        type="number"
                        inputMode="numeric"
                        value={restHr}
                        onChange={(e) => setRestHr(e.target.value)}
                        placeholder="60"
                    />
                </div>
                <div className={s.field}>
                    <label className={s.label}>FC máxima (opcional)</label>
                    <input
                        className={s.input}
                        type="number"
                        inputMode="numeric"
                        value={maxHr}
                        onChange={(e) => setMaxHr(e.target.value)}
                        placeholder="auto"
                    />
                </div>
            </div>

            {result ? (
                <>
                    <p className={s.meta}>
                        FC máxima {maxHr ? 'informada' : 'estimada'}:{' '}
                        <b>{result.fcMax} bpm</b> ·{' '}
                        {result.useKarvonen
                            ? 'método Karvonen (FC de reserva)'
                            : '% da FC máxima'}
                    </p>
                    <div className={s.zones}>
                        {result.zones.map((z) => (
                            <div className={s.zone} key={z.label}>
                                <span
                                    className={s.dot}
                                    style={{ background: z.color }}
                                />
                                <span className={s.zoneLabel}>{z.label}</span>
                                <span className={s.zoneRange}>
                                    {z.low}–{z.high} bpm
                                </span>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <p className={s.meta}>
                    Informe a idade (ou a FC máxima) para calcular as zonas.
                </p>
            )}
        </div>
    );
}
