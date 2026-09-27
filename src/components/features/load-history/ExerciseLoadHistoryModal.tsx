'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { FiAward, FiShare2, FiWifiOff } from 'react-icons/fi';
import Modal from '@/components/system/Modal';
import ShareAchievementModal from '@/components/features/ShareAchievementModal';
import HelpTooltip from '@/components/atoms/HelpTooltip';
import {
    formatDateBR,
    formatKg,
    formatPct,
    pendingSessionsFor,
    resolveExerciseKey,
    testedOneRepMaxMeasurement,
    type ChartMetric,
    type ExerciseLoadHistory,
    type LoadHistoryMesocycle,
    type LoadHistorySession,
} from '@/libs/loadHistory';
import {
    getExerciseLoadHistory,
    getPendingLoadSessions,
} from '@/libs/loadHistoryService';
import { listEvolutionEntries, type EvolutionEntry } from '@/libs/evolutionService';
import { isOverdueBlockError } from '@/libs/overdueBlock';
import LoadHistoryTimeline from './LoadHistoryTimeline';
import { METRIC_LABEL, type TestedPoint } from './chartMeta';
import s from './LoadHistory.module.css';

const LoadHistoryChart = dynamic(() => import('./LoadHistoryChart'), { ssr: false });

interface Props {
    open: boolean;
    onClose: () => void;
    /** Chave calculada pelo chamador (exerciseKeyFor); o servidor resolve o
     * apelido quando ela foi emendada no histórico da biblioteca. */
    exerciseKey: string;
    /** Título enquanto carrega (e quando ainda não há sessão). */
    exerciseName: string;
    /** Presente = visão do personal. */
    studentId?: string;
    /** Avaliações físicas, quando o chamador já tem (aba Cargas). Sem elas o
     * modal busca sozinho. */
    evaluations?: EvolutionEntry[];
}

export default function ExerciseLoadHistoryModal({
    open,
    onClose,
    exerciseKey,
    exerciseName,
    studentId,
    evaluations,
}: Props) {
    const [exercise, setExercise] = useState<ExerciseLoadHistory | null>(null);
    const [mesocycles, setMesocycles] = useState<LoadHistoryMesocycle[]>([]);
    const [pending, setPending] = useState<LoadHistorySession[]>([]);
    const [ownEvaluations, setOwnEvaluations] = useState<EvolutionEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [cachedAt, setCachedAt] = useState<string | null>(null);
    const [metric, setMetric] = useState<ChartMetric>('top');
    const [shareOpen, setShareOpen] = useState(false);

    useEffect(() => {
        if (!open || !exerciseKey) return;
        let cancelled = false;
        setLoading(true);
        setError('');
        setExercise(null);
        setPending([]);
        setCachedAt(null);

        (async () => {
            try {
                const result = await getExerciseLoadHistory(exerciseKey, studentId);
                if (cancelled) return;
                const found = result.data.exercises[0] ?? null;
                setExercise(found);
                setMesocycles(result.data.mesocycles);
                setCachedAt(result.fromCache ? result.cachedAt : null);
                setMetric(found?.metric === 'reps' ? 'reps' : 'top');

                const key = found?.exercise_key ?? resolveExerciseKey(exerciseKey, result.data.aliases);
                const queued = await getPendingLoadSessions(studentId);
                if (!cancelled) setPending(pendingSessionsFor(key, queued, result.data.aliases));
            } catch (err) {
                if (cancelled) return;
                setError(
                    isOverdueBlockError(err)
                        ? 'O histórico está pausado enquanto a mensalidade estiver em aberto.'
                        : 'Não foi possível carregar o histórico deste exercício.',
                );
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        if (!evaluations) {
            listEvolutionEntries(studentId)
                .then((list) => {
                    if (!cancelled) setOwnEvaluations(list);
                })
                .catch(() => {});
        }
        return () => {
            cancelled = true;
        };
    }, [open, exerciseKey, studentId, evaluations]);

    const evals = evaluations ?? ownEvaluations;
    const sessions = useMemo(
        () => [...(exercise?.sessions ?? []), ...pending],
        [exercise, pending],
    );

    const tested: TestedPoint[] = useMemo(() => {
        const measurement = testedOneRepMaxMeasurement(exercise?.name ?? exerciseName);
        if (!measurement) return [];
        return evals
            .filter((e) => (e.measurements?.[measurement] ?? 0) > 0)
            .map((e) => ({ date: e.date, value: e.measurements![measurement] }));
    }, [evals, exercise, exerciseName]);

    const summary = exercise?.summary;
    const isReps = exercise?.metric === 'reps';
    const record = isReps ? summary?.record_reps : summary?.record_e1rm ?? summary?.record_load;
    const metrics: ChartMetric[] = isReps ? ['reps'] : ['top', 'e1rm', 'volume'];

    return (
        <>
            <Modal
                open={open}
                onClose={onClose}
                title={exercise?.name ?? exerciseName}
                footer={
                    <div className={s.footerActions}>
                        {/* Só o próprio aluno publica o recorde dele: o
                            personal postar dado de treino de aluno seria
                            divulgar dado de outra pessoa. */}
                        {record && !studentId && (
                            <button type="button" className={s.btn} onClick={() => setShareOpen(true)}>
                                <FiShare2 aria-hidden="true" /> Compartilhar recorde
                            </button>
                        )}
                        <button type="button" className={s.btnGhost} onClick={onClose}>
                            Fechar
                        </button>
                    </div>
                }
            >
                {loading && <p className={s.loading}>Carregando histórico…</p>}
                {error && <div className={s.errorMsg}>{error}</div>}
                {cachedAt && (
                    <div className={s.noticeWarn}>
                        <FiWifiOff aria-hidden="true" />
                        <span>
                            Sem conexão — mostrando o histórico salvo neste aparelho em{' '}
                            {new Date(cachedAt).toLocaleString('pt-BR')}.
                        </span>
                    </div>
                )}

                {!loading && !error && !exercise && pending.length === 0 && (
                    <div className={s.empty}>
                        Ainda não há carga registrada para este exercício. O
                        histórico começa no primeiro treino concluído com ele.
                    </div>
                )}

                {!loading && (exercise || pending.length > 0) && (
                    <>
                        {summary && (
                            <div className={s.summaryGrid}>
                                {summary.last && (
                                    <div className={s.stat}>
                                        <span className={s.statLabel}>Última sessão</span>
                                        <span className={s.statValue}>
                                            {isReps
                                                ? `${summary.last.max_reps} reps`
                                                : `${formatKg(summary.last.top_load_kg)} kg`}
                                        </span>
                                        <span className={s.statSub}>
                                            {!isReps && `${summary.last.top_reps} reps · `}
                                            {formatDateBR(summary.last.date)}
                                        </span>
                                    </div>
                                )}
                                {record && (
                                    <div className={s.stat}>
                                        <span className={s.statLabel}>
                                            <FiAward aria-hidden="true" /> Recorde
                                        </span>
                                        <span className={s.statValue}>
                                            {isReps
                                                ? `${record.max_reps} reps`
                                                : record.e1rm
                                                  ? `${formatKg(record.e1rm)} kg`
                                                  : `${formatKg(record.top_load_kg)} kg`}
                                        </span>
                                        <span className={s.statSub}>
                                            {!isReps && record.e1rm ? '1RM est. · ' : ''}
                                            {formatDateBR(record.date)}
                                        </span>
                                    </div>
                                )}
                                {!isReps && summary.record_load && (
                                    <div className={s.stat}>
                                        <span className={s.statLabel}>Maior carga</span>
                                        <span className={s.statValue}>
                                            {formatKg(summary.record_load.top_load_kg)} kg
                                        </span>
                                        <span className={s.statSub}>
                                            {summary.record_load.top_reps} reps ·{' '}
                                            {formatDateBR(summary.record_load.date)}
                                        </span>
                                    </div>
                                )}
                                <div className={s.stat}>
                                    <span className={s.statLabel}>
                                        30 dias
                                        <HelpTooltip
                                            text="Variação do 1RM estimado (ou da maior carga, quando a série passou de 12 reps) entre a última sessão e a última de pelo menos 30 dias antes dela."
                                            href="/ajuda#glossario-1rm-estimado"
                                            label="Ajuda sobre a variação de 30 dias"
                                        />
                                    </span>
                                    <span className={s.statValue}>{formatPct(summary.change_pct_30d)}</span>
                                    <span className={s.statSub}>
                                        {summary.change_pct_30d == null ? 'histórico ainda curto' : 'força estimada'}
                                    </span>
                                </div>
                                <div className={s.stat}>
                                    <span className={s.statLabel}>Desde o início</span>
                                    <span className={s.statValue}>{formatPct(summary.change_pct_total)}</span>
                                    <span className={s.statSub}>{summary.sessions_count} sessões</span>
                                </div>
                            </div>
                        )}

                        <div className={s.card}>
                            {metrics.length > 1 && (
                                <div className={s.segmented} role="group" aria-label="Métrica do gráfico">
                                    {metrics.map((m) => (
                                        <button
                                            key={m}
                                            type="button"
                                            className={s.btn}
                                            aria-pressed={metric === m}
                                            onClick={() => setMetric(m)}
                                        >
                                            {METRIC_LABEL[m]}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <LoadHistoryChart
                                sessions={sessions}
                                exerciseMetric={exercise?.metric ?? 'load'}
                                metric={metric}
                                mesocycles={mesocycles}
                                evaluationDates={evals.map((e) => e.date)}
                                tested={tested}
                            />
                            <p className={s.legendNote}>
                                Ponto dourado = recorde · círculo tracejado = pendente de envio ·
                                faixa cinza = semana de deload · linha tracejada = carga prescrita ·
                                linha violeta = avaliação física
                                {tested.length > 0 && ' · losango = 1RM testado na avaliação'}.
                            </p>
                        </div>

                        <div className={s.card}>
                            <h3 className={s.cardTitle}>Sessão a sessão</h3>
                            <LoadHistoryTimeline sessions={sessions} metric={exercise?.metric ?? 'load'} />
                        </div>
                    </>
                )}
            </Modal>

            {exercise && record && !studentId && (
                <ShareAchievementModal
                    open={shareOpen}
                    onClose={() => setShareOpen(false)}
                    title="Compartilhar recorde"
                    card={{
                        headline: 'Novo recorde',
                        subline: `${exercise.name} · ${formatDateBR(record.date)}`,
                        stats: isReps
                            ? [{ label: 'repetições', value: String(record.max_reps) }]
                            : [
                                  { label: 'kg', value: formatKg(record.top_load_kg) },
                                  { label: 'repetições', value: String(record.top_reps) },
                                  ...(record.e1rm ? [{ label: '1RM estimado', value: `${formatKg(record.e1rm)} kg` }] : []),
                              ],
                        callToAction: 'Minha evolução de carga, registrada no',
                    }}
                    captionLines={[
                        isReps
                            ? `Novo recorde no ${exercise.name}: ${record.max_reps} repetições.`
                            : `Novo recorde no ${exercise.name}: ${formatKg(record.top_load_kg)} kg × ${record.top_reps}.`,
                    ]}
                />
            )}
        </>
    );
}
