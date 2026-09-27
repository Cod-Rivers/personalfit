'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiAward, FiBarChart2, FiClock, FiFileText, FiWifiOff } from 'react-icons/fi';
import HelpTooltip from '@/components/atoms/HelpTooltip';
import OverdueBlockNotice from '@/components/features/OverdueBlockNotice';
import {
    daysBetween,
    formatDateBR,
    formatKg,
    formatPct,
    muscleGroupLabel,
    normalizeExerciseName,
    sortExercises,
    todayLocalISO,
    weeksSinceImprovement,
    type ExerciseLoadHistory,
    type LoadHistoryResponse,
    type OverviewSort,
} from '@/libs/loadHistory';
import { getLoadHistorySummary, getPendingLoadSessions } from '@/libs/loadHistoryService';
import { listEvolutionEntries, type EvolutionEntry } from '@/libs/evolutionService';
import { isOverdueBlockError } from '@/libs/overdueBlock';
import { usePersonalProPlan } from '@/hooks/usePersonalProPlan';
import LoadHistorySparkline from './LoadHistorySparkline';
import ExerciseLoadHistoryModal from './ExerciseLoadHistoryModal';
import LoadHistoryCompareModal from './LoadHistoryCompareModal';
import LoadHistoryReportModal from './LoadHistoryReportModal';
import s from './LoadHistory.module.css';

/** Recorde nos últimos N dias ganha o selo na lista. */
const RECENT_RECORD_DAYS = 14;
/** Semanas sem recorde a partir das quais o exercício aparece como parado. */
const STALLED_WEEKS = 4;

const SORT_LABEL: Record<OverviewSort, string> = {
    trained: 'Mais treinados',
    progress: 'Maior evolução',
    stalled: 'Parados há mais tempo',
    name: 'Nome',
};

/**
 * Aba "Cargas" da Evolução (Todo/PLANO_EVOLUCAO_DE_CARGA.md): o histórico de
 * carga de cada exercício, em ordem cronológica e comparável.
 * `studentId` presente = visão do personal; ausente = o próprio aluno.
 */
export default function LoadHistoryPanel({ studentId }: { studentId?: string }) {
    const isPersonal = !!studentId;
    const isPro = usePersonalProPlan(isPersonal);

    const [data, setData] = useState<LoadHistoryResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [overdueBlocked, setOverdueBlocked] = useState(false);
    const [cachedAt, setCachedAt] = useState<string | null>(null);
    const [pendingCount, setPendingCount] = useState(0);
    const [evaluations, setEvaluations] = useState<EvolutionEntry[]>([]);

    const [search, setSearch] = useState('');
    const [muscle, setMuscle] = useState('');
    const [sort, setSort] = useState<OverviewSort>('trained');

    const [detail, setDetail] = useState<ExerciseLoadHistory | null>(null);
    const [compareOpen, setCompareOpen] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        setOverdueBlocked(false);
        try {
            const result = await getLoadHistorySummary(studentId);
            setData(result.data);
            setCachedAt(result.fromCache ? result.cachedAt : null);
        } catch (err) {
            if (isOverdueBlockError(err)) {
                setOverdueBlocked(true);
            } else {
                setError('Não foi possível carregar o histórico de carga.');
            }
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    useEffect(() => {
        void load();
        getPendingLoadSessions(studentId).then((p) => setPendingCount(p.length));
        listEvolutionEntries(studentId)
            .then(setEvaluations)
            .catch(() => {});
    }, [load, studentId]);

    // Volta a buscar quando a rede volta, para não ficar preso à cópia offline.
    useEffect(() => {
        const onOnline = () => void load();
        window.addEventListener('online', onOnline);
        return () => window.removeEventListener('online', onOnline);
    }, [load]);

    const today = todayLocalISO();
    const exercises = useMemo(() => data?.exercises ?? [], [data]);
    const muscles = useMemo(
        () => [...new Set(exercises.map((e) => muscleGroupLabel(e.muscle_group)))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
        [exercises],
    );

    const groups = useMemo(() => {
        const term = normalizeExerciseName(search);
        const filtered = exercises.filter(
            (e) =>
                (!term || normalizeExerciseName(e.name).includes(term)) &&
                (!muscle || muscleGroupLabel(e.muscle_group) === muscle),
        );
        const sorted = sortExercises(filtered, sort, today);
        // Ordenações "de ranking" leem melhor numa lista só; por nome ou mais
        // treinados, o agrupamento por músculo ajuda a achar o exercício.
        if (sort === 'progress' || sort === 'stalled') return [{ title: '', items: sorted }];
        const map = new Map<string, ExerciseLoadHistory[]>();
        for (const e of sorted) {
            const label = muscleGroupLabel(e.muscle_group);
            map.set(label, [...(map.get(label) ?? []), e]);
        }
        return [...map.entries()]
            .sort(([a], [b]) => (a === 'Outros' ? 1 : b === 'Outros' ? -1 : a.localeCompare(b, 'pt-BR')))
            .map(([title, items]) => ({ title, items }));
    }, [exercises, search, muscle, sort, today]);

    if (overdueBlocked) {
        return <OverdueBlockNotice what="ao seu histórico de carga" />;
    }

    return (
        <div className={s.section}>
            <p className={s.legendNote} style={{ marginTop: 0, marginBottom: '0.75rem' }}>
                Cada exercício em ordem cronológica, a partir dos treinos concluídos: maior carga,
                1RM estimado, volume e recordes.
                <HelpTooltip
                    text="O histórico junta o mesmo exercício de todos os planos, mesmo depois de trocar de ciclo. Halteres e máquinas unilaterais: a carga é por lado."
                    href={isPersonal ? '/ajuda#evolucao-carga-personal' : '/ajuda#evolucao-carga'}
                    label="Ajuda sobre o histórico de carga"
                />
            </p>

            {cachedAt && (
                <div className={s.noticeWarn}>
                    <FiWifiOff aria-hidden="true" />
                    <span>
                        Sem conexão — mostrando o histórico salvo neste aparelho em{' '}
                        {new Date(cachedAt).toLocaleString('pt-BR')}.
                    </span>
                </div>
            )}
            {pendingCount > 0 && (
                <div className={s.notice}>
                    <FiClock aria-hidden="true" />
                    <span>
                        {pendingCount === 1
                            ? '1 treino deste aparelho ainda não foi enviado.'
                            : `${pendingCount} treinos deste aparelho ainda não foram enviados.`}{' '}
                        Eles aparecem como “pendente de envio” no histórico de cada exercício e entram
                        nos números assim que sincronizarem.
                    </span>
                </div>
            )}
            {error && <div className={s.errorMsg}>{error}</div>}

            {exercises.length > 0 && (
                <div className={s.toolbar}>
                    <input
                        type="search"
                        className={s.search}
                        placeholder="Buscar exercício"
                        aria-label="Buscar exercício"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <select className={s.control} aria-label="Grupo muscular" value={muscle} onChange={(e) => setMuscle(e.target.value)}>
                        <option value="">Todos os grupos</option>
                        {muscles.map((m) => (
                            <option key={m} value={m}>
                                {m}
                            </option>
                        ))}
                    </select>
                    <select className={s.control} aria-label="Ordenar" value={sort} onChange={(e) => setSort(e.target.value as OverviewSort)}>
                        {(Object.keys(SORT_LABEL) as OverviewSort[]).map((k) => (
                            <option key={k} value={k}>
                                {SORT_LABEL[k]}
                            </option>
                        ))}
                    </select>
                    <div className={s.toolbarActions}>
                        <button type="button" className={s.btn} onClick={() => setCompareOpen(true)}>
                            <FiBarChart2 aria-hidden="true" /> Comparar
                        </button>
                        {isPersonal && (
                            <button type="button" className={s.btn} onClick={() => setReportOpen(true)}>
                                <FiFileText aria-hidden="true" /> Relatório
                                {isPro === false && <span className={s.chipRecord}>Pro</span>}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {loading && !data ? (
                <p className={s.loading}>Carregando histórico de carga…</p>
            ) : exercises.length === 0 && !error ? (
                <div className={s.empty}>
                    {isPersonal
                        ? 'Nenhuma carga registrada ainda. O histórico aparece aqui assim que o aluno concluir o primeiro treino com carga.'
                        : 'Nenhuma carga registrada ainda. O histórico aparece aqui assim que você concluir o primeiro treino com carga.'}
                </div>
            ) : (
                groups.map((g) => (
                    <section key={g.title || 'all'} aria-label={g.title || 'Exercícios'}>
                        {g.title && <h3 className={s.groupTitle}>{g.title}</h3>}
                        {g.items.map((e) => (
                            <ExerciseRow key={e.exercise_key} exercise={e} today={today} onOpen={() => setDetail(e)} />
                        ))}
                    </section>
                ))
            )}

            {detail && (
                <ExerciseLoadHistoryModal
                    open={!!detail}
                    onClose={() => setDetail(null)}
                    exerciseKey={detail.exercise_key}
                    exerciseName={detail.name}
                    studentId={studentId}
                    evaluations={evaluations}
                />
            )}

            {compareOpen && (
                <LoadHistoryCompareModal
                    open={compareOpen}
                    onClose={() => setCompareOpen(false)}
                    studentId={studentId}
                    exercises={exercises}
                    mesocycles={data?.mesocycles ?? []}
                    evaluations={evaluations}
                    isPro={isPro}
                />
            )}

            {isPersonal && reportOpen && studentId && (
                <LoadHistoryReportModal
                    open={reportOpen}
                    onClose={() => setReportOpen(false)}
                    studentId={studentId}
                    evaluations={evaluations}
                    isPro={isPro}
                />
            )}
        </div>
    );
}

function ExerciseRow({
    exercise: e,
    today,
    onOpen,
}: {
    exercise: ExerciseLoadHistory;
    today: string;
    onOpen: () => void;
}) {
    const last = e.summary.last;
    const isReps = e.metric === 'reps';
    const recentRecord =
        !!e.summary.last_record_date && daysBetween(e.summary.last_record_date, today) <= RECENT_RECORD_DAYS;
    const weeks = weeksSinceImprovement(e.summary, today);
    const stalled = e.summary.sessions_count >= 3 && weeks != null && weeks >= STALLED_WEEKS;
    const change = e.summary.change_pct_30d ?? e.summary.change_pct_total;
    const changeLabel = e.summary.change_pct_30d != null ? '30 dias' : 'desde o início';

    return (
        <button type="button" className={s.exerciseCard} onClick={onOpen}>
            <span className={s.exerciseName}>{e.name}</span>
            <LoadHistorySparkline points={e.recent ?? []} className={s.sparkline} />
            <span className={s.exerciseMeta}>
                {last && (
                    <span>
                        Última: {isReps ? `${last.max_reps} reps` : `${formatKg(last.top_load_kg)} kg × ${last.top_reps}`} ·{' '}
                        {formatDateBR(last.date)}
                    </span>
                )}
                {change != null && (
                    <span className={change > 0 ? s.chipUp : change < 0 ? s.chipDown : s.chip}>
                        {formatPct(change)} {changeLabel}
                    </span>
                )}
                {recentRecord && (
                    <span className={s.chipRecord}>
                        <FiAward aria-hidden="true" /> Recorde recente
                    </span>
                )}
                {stalled && !recentRecord && <span className={s.chipStalled}>Sem subir há {weeks} semanas</span>}
            </span>
        </button>
    );
}
