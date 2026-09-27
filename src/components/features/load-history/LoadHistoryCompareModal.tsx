'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Modal from '@/components/system/Modal';
import {
    addDaysISO,
    formatDateBR,
    formatKg,
    formatPct,
    normalizedProgress,
    pctChange,
    periodStats,
    todayLocalISO,
    type ExerciseLoadHistory,
    type LoadHistoryMesocycle,
    type LoadHistorySession,
    type PeriodStats,
} from '@/libs/loadHistory';
import { getExerciseLoadHistory, getLoadHistorySummary } from '@/libs/loadHistoryService';
import type { EvolutionEntry } from '@/libs/evolutionService';
import type { CompareSeries } from './LoadHistoryCompareChart';
import s from './LoadHistory.module.css';

const LoadHistoryCompareChart = dynamic(() => import('./LoadHistoryCompareChart'), { ssr: false });

type Mode = 'period' | 'exercises' | 'evaluations';
const MAX_EXERCISES = 4;

interface Props {
    open: boolean;
    onClose: () => void;
    studentId?: string;
    exercises: ExerciseLoadHistory[];
    mesocycles: LoadHistoryMesocycle[];
    evaluations: EvolutionEntry[];
    /** null = ainda não se sabe (ou é o aluno). Ver usePersonalProPlan. */
    isPro: boolean | null;
}

/* ── Períodos ── */

type PeriodChoice = string; // "last30" | "prev30" | "meso:<id>" | "custom"

interface ResolvedPeriod {
    label: string;
    from: string;
    to: string;
    /** Fase: filtra pela fase do registro, não só pela data. */
    mesocycleId?: string;
}

function resolvePeriod(
    choice: PeriodChoice,
    custom: { from: string; to: string },
    mesocycles: LoadHistoryMesocycle[],
    sessions: LoadHistorySession[],
): ResolvedPeriod | null {
    const today = todayLocalISO();
    if (choice === 'last30') return { label: 'Últimos 30 dias', from: addDaysISO(today, -29), to: today };
    if (choice === 'prev30') return { label: '30 dias anteriores', from: addDaysISO(today, -59), to: addDaysISO(today, -30) };
    if (choice === 'custom') {
        if (!custom.from || !custom.to || custom.from > custom.to) return null;
        return { label: `${formatDateBR(custom.from)} a ${formatDateBR(custom.to)}`, from: custom.from, to: custom.to };
    }
    if (choice.startsWith('meso:')) {
        const id = choice.slice(5);
        const meso = mesocycles.find((m) => m.id === id);
        const dates = sessions.filter((x) => x.mesocycle_id === id).map((x) => x.date).sort();
        const from = meso?.start_date ?? dates[0];
        const to = meso?.end_date ?? dates[dates.length - 1];
        if (!from || !to) return null;
        return { label: meso?.name ?? 'Fase', from, to, mesocycleId: id };
    }
    return null;
}

function statsFor(period: ResolvedPeriod | null, sessions: LoadHistorySession[], metric: ExerciseLoadHistory['metric']): PeriodStats | null {
    if (!period) return null;
    const scoped = period.mesocycleId ? sessions.filter((x) => x.mesocycle_id === period.mesocycleId) : sessions;
    return periodStats(scoped, metric, period.from, period.to);
}

function Delta({ a, b }: { a: number | null | undefined; b: number | null | undefined }) {
    const pct = pctChange(a, b);
    if (pct == null) return <>—</>;
    return <span className={pct > 0 ? s.up : pct < 0 ? s.down : undefined}>{formatPct(pct)}</span>;
}

export default function LoadHistoryCompareModal({
    open,
    onClose,
    studentId,
    exercises,
    mesocycles,
    evaluations,
    isPro,
}: Props) {
    const isPersonal = !!studentId;
    const [mode, setMode] = useState<Mode>('period');

    // ── Período × período ──
    const defaultKey = useMemo(
        () => [...exercises].sort((a, b) => b.summary.sessions_count - a.summary.sessions_count)[0]?.exercise_key ?? '',
        [exercises],
    );
    const [periodKey, setPeriodKey] = useState('');
    const [sessions, setSessions] = useState<LoadHistorySession[]>([]);
    const [choiceA, setChoiceA] = useState<PeriodChoice>('prev30');
    const [choiceB, setChoiceB] = useState<PeriodChoice>('last30');
    const [customA, setCustomA] = useState({ from: '', to: '' });
    const [customB, setCustomB] = useState({ from: '', to: '' });
    const [loadingSessions, setLoadingSessions] = useState(false);

    const key = periodKey || defaultKey;
    const selectedExercise = exercises.find((e) => e.exercise_key === key);

    useEffect(() => {
        if (!open || mode !== 'period' || !key) return;
        let cancelled = false;
        setLoadingSessions(true);
        getExerciseLoadHistory(key, studentId)
            .then((r) => {
                if (!cancelled) setSessions(r.data.exercises[0]?.sessions ?? []);
            })
            .catch(() => {
                if (!cancelled) setSessions([]);
            })
            .finally(() => {
                if (!cancelled) setLoadingSessions(false);
            });
        return () => {
            cancelled = true;
        };
    }, [open, mode, key, studentId]);

    const mesoOptions = useMemo(() => {
        const used = new Set(sessions.map((x) => x.mesocycle_id).filter(Boolean));
        return mesocycles.filter((m) => used.has(m.id));
    }, [mesocycles, sessions]);

    const periodA = resolvePeriod(choiceA, customA, mesocycles, sessions);
    const periodB = resolvePeriod(choiceB, customB, mesocycles, sessions);
    const metric = selectedExercise?.metric ?? 'load';
    const statsA = statsFor(periodA, sessions, metric);
    const statsB = statsFor(periodB, sessions, metric);

    // ── Exercício × exercício (Pro) ──
    const [picked, setPicked] = useState<string[]>([]);
    const [series, setSeries] = useState<CompareSeries[]>([]);
    const [loadingSeries, setLoadingSeries] = useState(false);

    useEffect(() => {
        if (!open || mode !== 'exercises' || picked.length === 0) {
            setSeries([]);
            return;
        }
        let cancelled = false;
        setLoadingSeries(true);
        Promise.all(
            picked.map((k) =>
                getExerciseLoadHistory(k, studentId)
                    .then((r) => r.data.exercises[0] ?? null)
                    .catch(() => null),
            ),
        )
            .then((list) => {
                if (cancelled) return;
                setSeries(
                    list
                        .filter((e): e is ExerciseLoadHistory => !!e)
                        .map((e) => ({
                            key: e.exercise_key,
                            name: e.name,
                            points: normalizedProgress(e.sessions ?? [], e.metric),
                        })),
                );
            })
            .finally(() => {
                if (!cancelled) setLoadingSeries(false);
            });
        return () => {
            cancelled = true;
        };
    }, [open, mode, picked, studentId]);

    const togglePicked = (k: string) =>
        setPicked((prev) =>
            prev.includes(k) ? prev.filter((x) => x !== k) : prev.length >= MAX_EXERCISES ? prev : [...prev, k],
        );

    // ── Entre duas avaliações (Pro) ──
    const sortedEvals = useMemo(() => [...evaluations].sort((a, b) => a.date.localeCompare(b.date)), [evaluations]);
    const [evalA, setEvalA] = useState('');
    const [evalB, setEvalB] = useState('');
    const entryA = sortedEvals.find((e) => e.id === (evalA || sortedEvals[sortedEvals.length - 2]?.id));
    const entryB = sortedEvals.find((e) => e.id === (evalB || sortedEvals[sortedEvals.length - 1]?.id));
    const [intervalExercises, setIntervalExercises] = useState<ExerciseLoadHistory[]>([]);
    const [loadingInterval, setLoadingInterval] = useState(false);

    useEffect(() => {
        if (!open || mode !== 'evaluations' || !entryA || !entryB || entryA.date >= entryB.date) {
            setIntervalExercises([]);
            return;
        }
        let cancelled = false;
        setLoadingInterval(true);
        getLoadHistorySummary(studentId, { from: entryA.date, to: entryB.date })
            .then((r) => {
                if (cancelled) return;
                setIntervalExercises(
                    r.data.exercises
                        .filter((e) => e.summary.first && e.summary.last && e.summary.first.date !== e.summary.last.date)
                        .sort((a, b) => b.summary.sessions_count - a.summary.sessions_count)
                        .slice(0, 10),
                );
            })
            .catch(() => {
                if (!cancelled) setIntervalExercises([]);
            })
            .finally(() => {
                if (!cancelled) setLoadingInterval(false);
            });
        return () => {
            cancelled = true;
        };
    }, [open, mode, entryA, entryB, studentId]);

    const proLocked = isPersonal && isPro === false;

    const periodPicker = (
        label: string,
        choice: PeriodChoice,
        setChoice: (v: PeriodChoice) => void,
        custom: { from: string; to: string },
        setCustom: (v: { from: string; to: string }) => void,
    ) => (
        <>
            <label>
                {label}
                <select className={s.control} value={choice} onChange={(e) => setChoice(e.target.value)}>
                    <option value="last30">Últimos 30 dias</option>
                    <option value="prev30">30 dias anteriores</option>
                    {mesoOptions.map((m) => (
                        <option key={m.id} value={`meso:${m.id}`}>
                            Fase: {m.name}
                        </option>
                    ))}
                    <option value="custom">Escolher datas…</option>
                </select>
            </label>
            {choice === 'custom' && (
                <>
                    <label>
                        De
                        <input type="date" className={s.control} value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
                    </label>
                    <label>
                        Até
                        <input type="date" className={s.control} value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
                    </label>
                </>
            )}
        </>
    );

    const statRow = (
        label: string,
        a: number | null | undefined,
        b: number | null | undefined,
        fmt: (v: number) => string,
    ) => (
        <tr>
            <td>{label}</td>
            <td>{a != null ? fmt(a) : '—'}</td>
            <td>{b != null ? fmt(b) : '—'}</td>
            <td>
                <Delta a={a} b={b} />
            </td>
        </tr>
    );

    return (
        <Modal open={open} onClose={onClose} title="Comparar cargas">
            <div className={s.segmented} role="group" aria-label="Tipo de comparação">
                <button type="button" className={s.btn} aria-pressed={mode === 'period'} onClick={() => setMode('period')}>
                    Período × período
                </button>
                {isPersonal && (
                    <>
                        <button type="button" className={s.btn} aria-pressed={mode === 'exercises'} onClick={() => setMode('exercises')}>
                            Exercícios
                        </button>
                        <button type="button" className={s.btn} aria-pressed={mode === 'evaluations'} onClick={() => setMode('evaluations')}>
                            Entre avaliações
                        </button>
                    </>
                )}
            </div>

            {mode === 'period' && (
                <div className={s.card}>
                    <div className={s.formRow}>
                        <label>
                            Exercício
                            <select className={s.control} value={key} onChange={(e) => setPeriodKey(e.target.value)}>
                                {exercises.map((e) => (
                                    <option key={e.exercise_key} value={e.exercise_key}>
                                        {e.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <div className={s.formRow}>{periodPicker('Período A', choiceA, setChoiceA, customA, setCustomA)}</div>
                    <div className={s.formRow}>{periodPicker('Período B', choiceB, setChoiceB, customB, setCustomB)}</div>

                    {loadingSessions ? (
                        <p className={s.loading}>Carregando…</p>
                    ) : (
                        <div className={s.tableScroll}>
                            <table className={s.table}>
                                <thead>
                                    <tr>
                                        <th />
                                        <th>{periodA?.label ?? 'A'}</th>
                                        <th>{periodB?.label ?? 'B'}</th>
                                        <th>Δ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {statRow('Sessões', statsA?.count, statsB?.count, (v) => String(v))}
                                    {metric === 'load' ? (
                                        <>
                                            {statRow('Maior carga', statsA?.bestTopLoadKg, statsB?.bestTopLoadKg, (v) => `${formatKg(v)} kg`)}
                                            {statRow('1RM estimado', statsA?.bestE1RM, statsB?.bestE1RM, (v) => `${formatKg(v)} kg`)}
                                            {statRow('Volume médio/sessão', statsA?.avgVolumeKg, statsB?.avgVolumeKg, (v) => `${formatKg(v)} kg`)}
                                        </>
                                    ) : (
                                        statRow('Reps máximas', statsA?.bestReps, statsB?.bestReps, (v) => String(v))
                                    )}
                                    {statRow('Sessões por semana', statsA?.perWeek, statsB?.perWeek, (v) => formatKg(v))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <p className={s.legendNote}>
                        Fase compara pelos treinos registrados naquela fase; as outras opções, pelas datas.
                        Valores fora do padrão não entram.
                    </p>
                </div>
            )}

            {mode !== 'period' && proLocked && (
                <p className={s.proLock}>
                    Comparar vários exercícios e cruzar a carga com as avaliações físicas são
                    recursos do <Link href="/pagamento?produto=pro">plano Pro</Link>. A comparação
                    entre períodos continua liberada.
                </p>
            )}

            {mode === 'exercises' && !proLocked && (
                <div className={s.card}>
                    <p className={s.legendNote}>
                        Escolha até {MAX_EXERCISES}. Cada exercício aparece em % da própria primeira
                        sessão (100% = ponto de partida), para exercícios de cargas diferentes caberem
                        no mesmo gráfico.
                    </p>
                    <ul className={s.checkList}>
                        {exercises.map((e) => (
                            <li key={e.exercise_key}>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={picked.includes(e.exercise_key)}
                                        disabled={!picked.includes(e.exercise_key) && picked.length >= MAX_EXERCISES}
                                        onChange={() => togglePicked(e.exercise_key)}
                                    />
                                    {e.name}
                                </label>
                            </li>
                        ))}
                    </ul>
                    {loadingSeries ? <p className={s.loading}>Carregando…</p> : picked.length > 0 && <LoadHistoryCompareChart series={series} />}
                </div>
            )}

            {mode === 'evaluations' && !proLocked && (
                <div className={s.card}>
                    {sortedEvals.length < 2 ? (
                        <p className={s.legendNote}>
                            Registre ao menos duas avaliações físicas na aba Avaliações para cruzar a
                            carga com as medidas.
                        </p>
                    ) : (
                        <>
                            <div className={s.formRow}>
                                <label>
                                    Avaliação A
                                    <select className={s.control} value={entryA?.id ?? ''} onChange={(e) => setEvalA(e.target.value)}>
                                        {sortedEvals.map((e) => (
                                            <option key={e.id} value={e.id}>
                                                {formatDateBR(e.date)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label>
                                    Avaliação B
                                    <select className={s.control} value={entryB?.id ?? ''} onChange={(e) => setEvalB(e.target.value)}>
                                        {sortedEvals.map((e) => (
                                            <option key={e.id} value={e.id}>
                                                {formatDateBR(e.date)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                            {entryA && entryB && entryA.date >= entryB.date ? (
                                <p className={s.legendNote}>A avaliação B precisa ser posterior à A.</p>
                            ) : (
                                entryA &&
                                entryB && (
                                    <>
                                        <div className={s.tableScroll}>
                                            <table className={s.table}>
                                                <thead>
                                                    <tr>
                                                        <th>Corpo</th>
                                                        <th>{formatDateBR(entryA.date)}</th>
                                                        <th>{formatDateBR(entryB.date)}</th>
                                                        <th>Δ</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {statRow('Peso', entryA.weight_kg, entryB.weight_kg, (v) => `${formatKg(v)} kg`)}
                                                    {statRow('% gordura', entryA.body_fat_percent, entryB.body_fat_percent, (v) => `${formatKg(v)}%`)}
                                                    {statRow('Cintura', entryA.measurements?.cintura, entryB.measurements?.cintura, (v) => `${formatKg(v)} cm`)}
                                                </tbody>
                                            </table>
                                        </div>
                                        <h3 className={s.cardTitle} style={{ marginTop: '1rem' }}>
                                            Carga no mesmo intervalo
                                        </h3>
                                        {loadingInterval ? (
                                            <p className={s.loading}>Carregando…</p>
                                        ) : intervalExercises.length === 0 ? (
                                            <p className={s.legendNote}>
                                                Nenhum exercício com duas ou mais sessões entre essas avaliações.
                                            </p>
                                        ) : (
                                            <div className={s.tableScroll}>
                                                <table className={s.table}>
                                                    <thead>
                                                        <tr>
                                                            <th>Exercício</th>
                                                            <th>Início</th>
                                                            <th>Fim</th>
                                                            <th>Δ</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {intervalExercises.map((e) => {
                                                            const f = e.summary.first!;
                                                            const l = e.summary.last!;
                                                            const show = (p: typeof f) =>
                                                                e.metric === 'reps' ? `${p.max_reps} reps` : `${formatKg(p.top_load_kg)} kg × ${p.top_reps}`;
                                                            return (
                                                                <tr key={e.exercise_key}>
                                                                    <td>{e.name}</td>
                                                                    <td>{show(f)}</td>
                                                                    <td>{show(l)}</td>
                                                                    <td>
                                                                        {e.summary.change_pct_total == null ? '—' : (
                                                                            <span className={e.summary.change_pct_total > 0 ? s.up : e.summary.change_pct_total < 0 ? s.down : undefined}>
                                                                                {formatPct(e.summary.change_pct_total)}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                        <p className={s.legendNote}>
                                            Δ da carga = variação do 1RM estimado (ou da maior carga) entre a primeira e a
                                            última sessão do intervalo.
                                        </p>
                                    </>
                                )
                            )}
                        </>
                    )}
                </div>
            )}
        </Modal>
    );
}
