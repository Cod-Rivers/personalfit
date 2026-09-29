'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
    FiAlertTriangle,
    FiCheckCircle,
    FiCpu,
    FiExternalLink,
    FiPrinter,
    FiRefreshCw,
    FiThumbsUp,
} from 'react-icons/fi';
import Button from '@/components/atoms/Button';
import EvidenceTag from '@/components/atoms/EvidenceTag';
import MetricTile from '@/components/molecules/MetricTile';
import ReportDecisions from './ReportDecisions';
import {
    EVIDENCE_METRIC_LABELS,
    NUMBERS_ONLY_REASONS,
    SEVERITY_LABELS,
    attentionSignalLabel,
    canRetryAI,
    formatDelta,
    reportActionLabel,
    reviewStateLabel,
    shortDate,
    type ReportEvidence,
    type ReportSuggestion,
    type WorkoutReport,
} from '@/libs/workoutReport';
import { describeCommentFacts, feelingOption, painRegionLabel, WORKOUT_COMMENT_RETENTION_DAYS } from '@/libs/workoutComment';
import { markReportDecided, retryReportAI } from '@/libs/workoutReportService';
import styles from './styles.module.css';

interface WorkoutReportViewProps {
    report: WorkoutReport;
    isPro: boolean;
    onChange: (report: WorkoutReport) => void;
    onError: (message: string) => void;
}

/** Para onde leva o "Aplicar" de cada sugestão. */
function actionHref(action: string, studentId: string): string | null {
    switch (action) {
        case 'ajustar_carga':
        case 'trocar_exercicio':
        case 'deload':
            return `/personal/aluno/${studentId}/periodizacao`;
        case 'reavaliar':
            return `/personal/aluno/${studentId}/evolucao`;
        case 'conversar':
            return `/personal/aluno/${studentId}/feedback`;
        default:
            return null;
    }
}

function commentStillExists(e: ReportEvidence): boolean {
    if (!e.comment_id) return false;
    const [y, m, d] = e.date.split('-').map(Number);
    const age = (Date.now() - new Date(y, m - 1, d).getTime()) / 86_400_000;
    return age < WORKOUT_COMMENT_RETENTION_DAYS - 1;
}

/**
 * Relatório de acompanhamento de um aluno (PRO): números sem IA, leitura da IA
 * com evidência, sugestões com atalho para agir e o registro de decisões.
 * Feito para decidir, não só para ler (Todo/PLANO_COMENTARIO_POS_TREINO.md,
 * seção 7).
 */
export default function WorkoutReportView({ report, isPro, onChange, onError }: WorkoutReportViewProps) {
    const [busy, setBusy] = useState(false);
    const [decisionSeed, setDecisionSeed] = useState<{ suggestion: ReportSuggestion; index: number } | null>(null);
    const m = report.metrics;
    const prev = m.previous;
    const ready = report.status === 'generated' || report.status === 'numbers_only';

    const evidenceByRef = useMemo(() => new Map(report.evidence.map((e) => [e.ref, e])), [report.evidence]);

    const renderEvidence = (refs: string[]) => (
        <span className={styles.evidence}>
            {refs.map((ref) => {
                const metric = EVIDENCE_METRIC_LABELS[ref];
                if (metric) {
                    return (
                        <EvidenceTag key={ref} tone="metric" title="Número do período">
                            {metric}
                        </EvidenceTag>
                    );
                }
                const e = evidenceByRef.get(ref);
                if (!e) return null;
                const feeling = feelingOption(e.feeling);
                const label = [
                    shortDate(e.date),
                    e.training_ref ? `treino ${e.training_ref}` : null,
                    feeling ? feeling.emoji : null,
                    describeCommentFacts(e.tags ?? [], e.pain_regions ?? []).toLowerCase() || null,
                ]
                    .filter(Boolean)
                    .join(' · ');
                if (commentStillExists(e)) {
                    return (
                        <Link key={ref} href={`/personal/comentarios?c=${e.comment_id}`} className={styles.evidenceLink}>
                            <EvidenceTag title="Abrir o comentário">{label}</EvidenceTag>
                        </Link>
                    );
                }
                return (
                    <EvidenceTag key={ref} title="O texto deste comentário já expirou (60 dias)">
                        {label}
                    </EvidenceTag>
                );
            })}
        </span>
    );

    const retry = async () => {
        setBusy(true);
        try {
            onChange(await retryReportAI(report.id));
        } catch {
            onError('Não foi possível refazer a leitura agora.');
        } finally {
            setBusy(false);
        }
    };

    const decide = async () => {
        setBusy(true);
        try {
            onChange(await markReportDecided(report.id));
        } catch {
            onError('Registre ao menos uma decisão antes de marcar como decidido.');
        } finally {
            setBusy(false);
        }
    };

    const painRegions = Object.entries(m.pain_by_region ?? {}).sort((a, b) => b[1] - a[1]);
    const maxPlanned = Math.max(1, ...(m.weeks ?? []).map((w) => Math.max(w.planned, w.done)));

    return (
        <div className={styles.view}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>{report.student_name || 'Aluno'}</h1>
                    <p className={styles.period}>
                        {report.period_kind === 'on_demand' ? 'Relatório sob demanda · ' : ''}
                        {report.period_label} ({shortDate(report.period_start)} a {shortDate(report.period_end)})
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <span className={styles.state}>{reviewStateLabel(report.review_state, report.status)}</span>
                    <Button variant="ghost" size="sm" leftIcon={<FiPrinter />} onClick={() => window.print()}>
                        Imprimir ou salvar PDF
                    </Button>
                </div>
            </header>

            {report.attention_signals.length > 0 && (
                <div className={styles.signals} role="note">
                    <FiAlertTriangle aria-hidden />
                    {report.attention_signals.map((s) => (
                        <span key={s} className={styles.signal}>
                            {attentionSignalLabel(s)}
                        </span>
                    ))}
                </div>
            )}

            {/* ── Números (sem IA) ── */}
            <section className={styles.section} aria-labelledby="report-numbers">
                <h2 id="report-numbers" className={styles.sectionTitle}>
                    Números do período
                </h2>
                <div className={styles.tiles}>
                    <MetricTile
                        value={m.adherence_pct != null ? `${Math.round(m.adherence_pct)}%` : '—'}
                        label={`Aderência · ${m.done} de ${m.planned} dias`}
                        delta={formatDelta(m.adherence_pct, prev?.adherence_pct)}
                        deltaTone={(m.adherence_pct ?? 0) >= (prev?.adherence_pct ?? 0) ? 'good' : 'bad'}
                    />
                    <MetricTile
                        value={m.feeling_avg != null ? m.feeling_avg.toFixed(1) : '—'}
                        label="Sensação média (1 a 5)"
                        delta={formatDelta(m.feeling_avg, prev?.feeling_avg, 1)}
                        deltaTone={(m.feeling_avg ?? 0) >= (prev?.feeling_avg ?? 0) ? 'good' : 'bad'}
                    />
                    <MetricTile value={m.rpe_avg != null ? m.rpe_avg.toFixed(1) : '—'} label="RPE médio" />
                    <MetricTile
                        value={m.comments}
                        label="Comentários"
                        delta={formatDelta(m.comments, prev?.comments)}
                        deltaTone="neutral"
                    />
                    <MetricTile
                        value={m.pain_total}
                        label="Comentários com dor"
                        delta={formatDelta(m.pain_total, prev?.pain_total)}
                        deltaTone={m.pain_total <= (prev?.pain_total ?? m.pain_total) ? 'good' : 'bad'}
                    />
                    <MetricTile value={m.sessions} label={`Treinos · ${m.late} tardio(s)`} />
                </div>

                {m.weeks && m.weeks.length > 0 && (
                    <div className={styles.weeks} role="table" aria-label="Semanas do período">
                        <div className={styles.weekRow} role="row">
                            <span role="columnheader">Semana</span>
                            <span role="columnheader">Dias feitos</span>
                            <span role="columnheader">Sensação</span>
                            <span role="columnheader">RPE</span>
                            <span role="columnheader">Coment.</span>
                        </div>
                        {m.weeks.map((w) => (
                            <div className={styles.weekRow} role="row" key={w.start}>
                                <span role="cell">{shortDate(w.start)}</span>
                                <span role="cell" className={styles.barCell}>
                                    <span className={styles.bar} aria-hidden>
                                        <span
                                            className={styles.barPlanned}
                                            style={{ width: `${(w.planned / maxPlanned) * 100}%` }}
                                        />
                                        <span className={styles.barDone} style={{ width: `${(w.done / maxPlanned) * 100}%` }} />
                                    </span>
                                    {w.done}/{w.planned}
                                </span>
                                <span role="cell">{w.feeling_avg != null ? w.feeling_avg.toFixed(1) : '—'}</span>
                                <span role="cell">{w.rpe_avg != null ? w.rpe_avg.toFixed(1) : '—'}</span>
                                <span role="cell">{w.comments}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className={styles.facts}>
                    {painRegions.length > 0 && (
                        <p>
                            <strong>Dor por região:</strong>{' '}
                            {painRegions.map(([r, n]) => `${painRegionLabel(r)} (${n})`).join(', ')}
                        </p>
                    )}
                    {m.records && m.records.length > 0 && (
                        <p>
                            <strong>Recordes:</strong>{' '}
                            {m.records.map((r) => `${r.name} ${r.load_kg} kg (${shortDate(r.date)})`).join('; ')}
                        </p>
                    )}
                    {m.stalled && m.stalled.length > 0 && (
                        <p>
                            <strong>Sem progressão há 3 semanas:</strong>{' '}
                            {m.stalled.map((s) => `${s.name} (${s.load_kg} kg)`).join('; ')}
                        </p>
                    )}
                    {m.phases && m.phases.length > 0 && (
                        <p>
                            <strong>Fases:</strong> {m.phases.join(', ')}
                            {m.deload_weeks > 0 ? ` · ${m.deload_weeks} semana(s) de deload` : ''}
                        </p>
                    )}
                </div>
            </section>

            {/* ── Leitura da IA ── */}
            <section className={styles.section} aria-labelledby="report-ai">
                <h2 id="report-ai" className={styles.sectionTitle}>
                    <FiCpu aria-hidden /> Leitura dos comentários
                </h2>
                {!ready && <p className={styles.muted}>O relatório ainda está sendo gerado. Volte em alguns minutos.</p>}
                {report.status === 'numbers_only' && (
                    <div className={styles.noAI}>
                        <p>{NUMBERS_ONLY_REASONS[report.numbers_only_reason ?? ''] ?? 'Relatório só com números.'}</p>
                        {isPro && canRetryAI(report.numbers_only_reason) && (
                            <Button size="sm" variant="secondary" leftIcon={<FiRefreshCw />} isLoading={busy} onClick={() => void retry()}>
                                Tentar de novo
                            </Button>
                        )}
                    </div>
                )}
                {report.ai && report.status === 'generated' && (
                    <div className={styles.ai}>
                        <p className={styles.aiBadge}>Gerada por IA a partir dos números e comentários. Confira as evidências.</p>
                        <p className={styles.summary}>{report.ai.summary}</p>

                        {report.ai.attention && report.ai.attention.length > 0 && (
                            <div className={styles.block}>
                                <h3 className={styles.blockTitle}>Pontos de atenção</h3>
                                <ul className={styles.items}>
                                    {report.ai.attention.map((a, i) => (
                                        <li key={i} className={`${styles.item} ${styles[`sev_${a.severity}`] ?? ''}`}>
                                            <span className={styles.itemHead}>
                                                <strong>{a.title}</strong>
                                                <span className={styles.severity}>{SEVERITY_LABELS[a.severity] ?? a.severity}</span>
                                            </span>
                                            {a.description && <span>{a.description}</span>}
                                            {renderEvidence(a.evidence)}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {report.ai.positives && report.ai.positives.length > 0 && (
                            <div className={styles.block}>
                                <h3 className={styles.blockTitle}>
                                    <FiThumbsUp aria-hidden /> Sinais positivos
                                </h3>
                                <ul className={styles.items}>
                                    {report.ai.positives.map((p, i) => (
                                        <li key={i} className={styles.item}>
                                            <span>{p.description}</span>
                                            {renderEvidence(p.evidence)}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {report.ai.suggestions && report.ai.suggestions.length > 0 && (
                            <div className={styles.block}>
                                <h3 className={styles.blockTitle}>Pauta para decidir</h3>
                                <ul className={styles.items}>
                                    {report.ai.suggestions.map((sug, i) => {
                                        const href = actionHref(sug.action, report.student_id);
                                        return (
                                            <li key={i} className={styles.item}>
                                                <span className={styles.itemHead}>
                                                    <strong>
                                                        {reportActionLabel(sug.action)}
                                                        {sug.exercise ? ` · ${sug.exercise}` : ''}
                                                    </strong>
                                                </span>
                                                <span>{sug.justification}</span>
                                                {renderEvidence(sug.evidence)}
                                                {isPro && (
                                                    <span className={styles.suggestionActions}>
                                                        {href && (
                                                            <Link href={href} className={styles.applyLink}>
                                                                <FiExternalLink aria-hidden /> Aplicar
                                                            </Link>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            onClick={() => setDecisionSeed({ suggestion: sug, index: i })}
                                                        >
                                                            Registrar decisão
                                                        </Button>
                                                    </span>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}

                        {report.ai.previous_decisions_effect && (
                            <div className={styles.block}>
                                <h3 className={styles.blockTitle}>Efeito das decisões anteriores</h3>
                                <p className={styles.summary}>{report.ai.previous_decisions_effect}</p>
                            </div>
                        )}
                        <p className={styles.aiMeta}>
                            Modelo {report.ai.model} · regra {report.ai.prompt_version}
                        </p>
                    </div>
                )}
            </section>

            {/* ── Decisões ── */}
            {ready && (
                <section className={styles.section} aria-labelledby="report-decisions">
                    <h2 id="report-decisions" className={styles.sectionTitle}>
                        <FiCheckCircle aria-hidden /> Decisões
                    </h2>
                    <ReportDecisions
                        report={report}
                        editable={isPro}
                        seed={decisionSeed}
                        onSeedConsumed={() => setDecisionSeed(null)}
                        onChange={onChange}
                        onError={onError}
                    />
                    {isPro && report.review_state !== 'decided' && (
                        <div className={styles.decideBar}>
                            <Button
                                onClick={() => void decide()}
                                isLoading={busy}
                                disabled={report.decisions.length === 0}
                                leftIcon={<FiCheckCircle />}
                            >
                                Marcar como decidido
                            </Button>
                            {report.decisions.length === 0 && (
                                <span className={styles.muted}>Registre ao menos uma decisão, mesmo que seja “manter”.</span>
                            )}
                        </div>
                    )}
                    {!isPro && (
                        <p className={styles.muted}>
                            Relatórios antigos continuam aqui para consulta. Para registrar decisões e receber novos, volte ao{' '}
                            <Link href="/pagamento?produto=pro">PRO</Link>.
                        </p>
                    )}
                </section>
            )}
        </div>
    );
}
