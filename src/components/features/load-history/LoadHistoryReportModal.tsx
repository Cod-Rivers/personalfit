'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { FiPrinter, FiSend } from 'react-icons/fi';
import Modal from '@/components/system/Modal';
import {
    addDaysISO,
    formatDateBR,
    formatKg,
    formatPct,
    todayLocalISO,
    weeksSinceImprovement,
    type ExerciseLoadHistory,
    type LoadHistoryPoint,
} from '@/libs/loadHistory';
import { getLoadHistorySummary } from '@/libs/loadHistoryService';
import type { EvolutionEntry } from '@/libs/evolutionService';
import { getCachedPersonalStudents } from '@/libs/offline/personalCache';
import { isInsideNativeApp } from '@/libs/androidApp';
import { shareText } from '@/libs/socialShare';
import s from './LoadHistory.module.css';

type Period = '30' | '90' | 'all';

const PERIOD_LABEL: Record<Period, string> = {
    '30': 'Últimos 30 dias',
    '90': 'Últimos 90 dias',
    all: 'Desde o início',
};

/** Semanas sem recorde a partir das quais o exercício entra em "estagnados". */
const STALLED_WEEKS = 4;

interface Props {
    open: boolean;
    onClose: () => void;
    studentId: string;
    evaluations: EvolutionEntry[];
    isPro: boolean | null;
}

function show(e: ExerciseLoadHistory, p?: LoadHistoryPoint): string {
    if (!p) return '—';
    return e.metric === 'reps' ? `${p.max_reps} reps` : `${formatKg(p.top_load_kg)} kg × ${p.top_reps}`;
}

/**
 * Relatório de evolução de carga para o personal enviar ao aluno (Pro).
 *
 * Sem biblioteca de PDF: a prévia é HTML e "Salvar em PDF" é a impressão do
 * navegador, como o Gantt da periodização já faz. A cópia impressa é
 * renderizada direto em document.body (portal) — dentro do Modal, o
 * position:fixed e o overflow do sheet cortariam as páginas. No app Android a
 * WebView não imprime, então lá o caminho é mandar o resumo em texto.
 */
export default function LoadHistoryReportModal({ open, onClose, studentId, evaluations, isPro }: Props) {
    const [period, setPeriod] = useState<Period>('90');
    const [exercises, setExercises] = useState<ExerciseLoadHistory[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [studentName, setStudentName] = useState('');
    const [printing, setPrinting] = useState(false);
    const [shareStatus, setShareStatus] = useState('');
    const inApp = typeof navigator !== 'undefined' && isInsideNativeApp();

    const today = todayLocalISO();
    const from = period === 'all' ? undefined : addDaysISO(today, -(Number(period) - 1));

    useEffect(() => {
        if (!open) return;
        getCachedPersonalStudents<{ id: string; name: string }>()
            .then((list) => setStudentName(list?.find((st) => st.id === studentId)?.name ?? ''))
            .catch(() => {});
    }, [open, studentId]);

    useEffect(() => {
        if (!open || isPro === false) return;
        let cancelled = false;
        setLoading(true);
        setError('');
        getLoadHistorySummary(studentId, from ? { from, to: today } : {})
            .then((r) => {
                if (!cancelled) setExercises(r.data.exercises.filter((e) => e.summary.first));
            })
            .catch(() => {
                if (!cancelled) setError('Não foi possível montar o relatório agora.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [open, isPro, studentId, from, today]);

    // Impressão: monta a cópia no body, espera o navegador pintar e chama o
    // diálogo; "afterprint" desmonta. O prazo é rede de segurança para
    // navegador que não dispara o evento.
    useEffect(() => {
        if (!printing) return;
        const done = () => setPrinting(false);
        window.addEventListener('afterprint', done);
        const raf = requestAnimationFrame(() => window.print());
        const fallback = window.setTimeout(done, 60_000);
        return () => {
            window.removeEventListener('afterprint', done);
            cancelAnimationFrame(raf);
            window.clearTimeout(fallback);
        };
    }, [printing]);

    const ranked = useMemo(
        () => [...exercises].sort((a, b) => b.summary.sessions_count - a.summary.sessions_count),
        [exercises],
    );
    const highlights = useMemo(
        () =>
            [...exercises]
                .filter((e) => (e.summary.change_pct_total ?? 0) > 0)
                .sort((a, b) => (b.summary.change_pct_total ?? 0) - (a.summary.change_pct_total ?? 0))
                .slice(0, 3),
        [exercises],
    );
    const stalled = useMemo(
        () =>
            exercises.filter(
                (e) => e.summary.sessions_count >= 3 && (weeksSinceImprovement(e.summary, today) ?? 0) >= STALLED_WEEKS,
            ),
        [exercises, today],
    );
    const evalsInPeriod = useMemo(
        () =>
            [...evaluations]
                .filter((e) => !from || e.date >= from)
                .sort((a, b) => a.date.localeCompare(b.date)),
        [evaluations, from],
    );
    const firstEval = evalsInPeriod[0];
    const lastEval = evalsInPeriod[evalsInPeriod.length - 1];
    const hasEvalDiff = !!firstEval && !!lastEval && firstEval.id !== lastEval.id;

    const title = `Evolução de carga${studentName ? ` — ${studentName}` : ''}`;

    const plainText = useMemo(() => {
        const lines = [
            title,
            `${PERIOD_LABEL[period]} · gerado em ${formatDateBR(today)}`,
            '',
        ];
        if (highlights.length) {
            lines.push('Destaques:');
            highlights.forEach((e) => lines.push(`• ${e.name}: ${formatPct(e.summary.change_pct_total)} (${show(e, e.summary.first)} → ${show(e, e.summary.last)})`));
            lines.push('');
        }
        lines.push('Exercícios:');
        ranked.forEach((e) =>
            lines.push(`• ${e.name}: ${show(e, e.summary.last)} · ${e.summary.sessions_count} sessões · ${formatPct(e.summary.change_pct_total)}`),
        );
        if (hasEvalDiff && firstEval && lastEval) {
            lines.push('', `Avaliação física ${formatDateBR(firstEval.date)} → ${formatDateBR(lastEval.date)}:`);
            if (firstEval.weight_kg != null && lastEval.weight_kg != null) {
                lines.push(`• Peso: ${formatKg(firstEval.weight_kg)} → ${formatKg(lastEval.weight_kg)} kg`);
            }
            if (firstEval.body_fat_percent != null && lastEval.body_fat_percent != null) {
                lines.push(`• % gordura: ${formatKg(firstEval.body_fat_percent)} → ${formatKg(lastEval.body_fat_percent)}%`);
            }
        }
        return lines.join('\n');
    }, [title, period, today, highlights, ranked, hasEvalDiff, firstEval, lastEval]);

    const body = (
        <div className={s.report}>
            <h3>{title}</h3>
            <p className={s.reportSub}>
                {PERIOD_LABEL[period]} · gerado em {formatDateBR(today)}. 1RM estimado pela fórmula de
                Epley; cargas de halteres e máquinas unilaterais são por lado.
            </p>

            {highlights.length > 0 && (
                <>
                    <h4>Destaques</h4>
                    <ul>
                        {highlights.map((e) => (
                            <li key={e.exercise_key}>
                                <strong>{e.name}</strong>: {formatPct(e.summary.change_pct_total)} ({show(e, e.summary.first)} →{' '}
                                {show(e, e.summary.last)})
                            </li>
                        ))}
                    </ul>
                </>
            )}

            <h4>Exercícios</h4>
            <div className={s.tableScroll}>
                <table className={s.table}>
                    <thead>
                        <tr>
                            <th>Exercício</th>
                            <th>Sessões</th>
                            <th>Início</th>
                            <th>Atual</th>
                            <th>Δ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ranked.map((e) => (
                            <tr key={e.exercise_key}>
                                <td>{e.name}</td>
                                <td>{e.summary.sessions_count}</td>
                                <td>{show(e, e.summary.first)}</td>
                                <td>{show(e, e.summary.last)}</td>
                                <td>{formatPct(e.summary.change_pct_total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {stalled.length > 0 && (
                <>
                    <h4>Sem progresso há {STALLED_WEEKS}+ semanas</h4>
                    <p className={s.reportSub}>{stalled.map((e) => e.name).join(', ')}</p>
                </>
            )}

            {hasEvalDiff && firstEval && lastEval && (
                <>
                    <h4>
                        Avaliação física ({formatDateBR(firstEval.date)} → {formatDateBR(lastEval.date)})
                    </h4>
                    <ul>
                        {firstEval.weight_kg != null && lastEval.weight_kg != null && (
                            <li>
                                Peso: {formatKg(firstEval.weight_kg)} → {formatKg(lastEval.weight_kg)} kg
                            </li>
                        )}
                        {firstEval.body_fat_percent != null && lastEval.body_fat_percent != null && (
                            <li>
                                % gordura: {formatKg(firstEval.body_fat_percent)} → {formatKg(lastEval.body_fat_percent)}%
                            </li>
                        )}
                    </ul>
                </>
            )}
        </div>
    );

    const canPrint = !inApp && !loading && exercises.length > 0;

    return (
        <>
            <Modal
                open={open}
                onClose={onClose}
                title="Relatório de carga"
                footer={
                    isPro === false ? undefined : (
                        <div className={s.footerActions}>
                            <button
                                type="button"
                                className={s.btn}
                                disabled={loading || exercises.length === 0}
                                onClick={async () => {
                                    const outcome = await shareText(plainText);
                                    setShareStatus(
                                        outcome === 'shared'
                                            ? ''
                                            : outcome === 'downloaded'
                                              ? 'Resumo copiado — cole na conversa com o aluno.'
                                              : outcome === 'failed'
                                                ? 'Não foi possível enviar agora.'
                                                : '',
                                    );
                                }}
                            >
                                <FiSend aria-hidden="true" /> Enviar como texto
                            </button>
                            {canPrint && (
                                <button type="button" className={s.btnPrimary} onClick={() => setPrinting(true)}>
                                    <FiPrinter aria-hidden="true" /> Imprimir / salvar PDF
                                </button>
                            )}
                        </div>
                    )
                }
            >
                {isPro === false ? (
                    <p className={s.proLock}>
                        O relatório de evolução para enviar ao aluno é um recurso do{' '}
                        <Link href="/pagamento?produto=pro">plano Pro</Link>.
                    </p>
                ) : (
                    <>
                        <div className={s.formRow}>
                            <label>
                                Período
                                <select className={s.control} value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
                                    {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
                                        <option key={p} value={p}>
                                            {PERIOD_LABEL[p]}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        {inApp && (
                            <p className={s.notice}>
                                No app, a impressão não está disponível: envie o resumo em texto, ou abra o
                                Venafit pelo navegador para salvar em PDF.
                            </p>
                        )}
                        {shareStatus && <p className={s.notice}>{shareStatus}</p>}
                        {error && <div className={s.errorMsg}>{error}</div>}
                        {loading ? (
                            <p className={s.loading}>Montando o relatório…</p>
                        ) : exercises.length === 0 && !error ? (
                            <div className={s.empty}>Nenhuma carga registrada neste período.</div>
                        ) : (
                            body
                        )}
                    </>
                )}
            </Modal>
            {printing &&
                typeof document !== 'undefined' &&
                createPortal(<div className="load-report-print-target load-report-print-copy">{body}</div>, document.body)}
        </>
    );
}
