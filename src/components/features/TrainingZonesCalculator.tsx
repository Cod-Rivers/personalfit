'use client';
import { useEffect, useMemo, useState } from 'react';
import { FiHeart } from 'react-icons/fi';
import { listEvolutionEntries } from '@/libs/evolutionService';
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

interface Props {
    /** Presente = view do personal para um aluno específico; ausente = view do próprio aluno logado. */
    studentId?: string;
}

/**
 * Calcula zonas-alvo de FC pelo método de Karvonen (usa FC de reserva quando a
 * FC de repouso é informada; senão, percentual direto da FC máxima).
 * FCmáx estimada por 208 − 0,7×idade (Tanaka) se não informada.
 */
export default function TrainingZonesCalculator({ studentId }: Props) {
    const [age, setAge] = useState('');
    const [restHr, setRestHr] = useState('');
    const [maxHr, setMaxHr] = useState('');
    const [autoFilled, setAutoFilled] = useState(false);

    // Pré-preenche FC repouso/máxima com a última avaliação de evolução que
    // as tiver registradas — evita redigitar dado que o aluno já informou.
    useEffect(() => {
        let cancelled = false;
        listEvolutionEntries(studentId)
            .then((entries) => {
                if (cancelled) return;
                const latest = entries
                    .filter(
                        (e) =>
                            e.measurements?.fc_repouso != null ||
                            e.measurements?.fc_maxima != null,
                    )
                    .sort((a, b) => b.date.localeCompare(a.date))[0];
                if (!latest) return;
                if (latest.measurements?.fc_repouso != null) {
                    setRestHr(String(latest.measurements.fc_repouso));
                }
                if (latest.measurements?.fc_maxima != null) {
                    setMaxHr(String(latest.measurements.fc_maxima));
                }
                setAutoFilled(true);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [studentId]);

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
            <h3 className={s.title}><FiHeart /> Zonas de treino (FC)</h3>
            <p className={s.sub}>
                Calcule as faixas de frequência cardíaca-alvo para prescrever
                aeróbico com segurança.
            </p>
            {autoFilled && (
                <p className={s.meta}>
                    FC repouso/máxima preenchidas com a última avaliação
                    registrada — ajuste se necessário.
                </p>
            )}

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
