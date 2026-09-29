'use client';

import React, { useEffect, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import Button from '@/components/atoms/Button';
import {
    REPORT_ACTIONS,
    reportActionLabel,
    type ReportSuggestion,
    type WorkoutReport,
} from '@/libs/workoutReport';
import { addReportDecision, updateReportDecision } from '@/libs/workoutReportService';
import styles from './styles.module.css';

interface ReportDecisionsProps {
    report: WorkoutReport;
    editable: boolean;
    /** Sugestão da IA que abriu o formulário ("Registrar decisão"). */
    seed: { suggestion: ReportSuggestion; index: number } | null;
    onSeedConsumed: () => void;
    onChange: (report: WorkoutReport) => void;
    onError: (message: string) => void;
}

interface DraftDecision {
    action: string;
    exercise: string;
    text: string;
    suggestionIndex?: number;
}

const EMPTY: DraftDecision = { action: 'manter', exercise: '', text: '' };
const MAX_TEXT = 1000;

/** Registro das decisões do personal: o que foi decidido a partir do
 * relatório. O relatório seguinte usa isto para dizer se funcionou. */
export default function ReportDecisions({ report, editable, seed, onSeedConsumed, onChange, onError }: ReportDecisionsProps) {
    const [draft, setDraft] = useState<DraftDecision | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!seed) return;
        setDraft({
            action: seed.suggestion.action,
            exercise: seed.suggestion.exercise ?? '',
            text: '',
            suggestionIndex: seed.index,
        });
        onSeedConsumed();
        document.getElementById('report-decision-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [seed, onSeedConsumed]);

    const save = async () => {
        if (!draft) return;
        if (draft.action === 'outra' && !draft.text.trim()) {
            onError('Descreva a decisão quando escolher “Outra”.');
            return;
        }
        setBusy(true);
        try {
            const updated = await addReportDecision(report.id, {
                action: draft.action,
                exercise: draft.exercise.trim() || undefined,
                text: draft.text.trim() || undefined,
                suggestion_index: draft.suggestionIndex,
            });
            onChange(updated);
            setDraft(null);
        } catch {
            onError('Não foi possível salvar a decisão.');
        } finally {
            setBusy(false);
        }
    };

    const toggleDone = async (id: string) => {
        const d = report.decisions.find((x) => x.id === id);
        if (!d) return;
        setBusy(true);
        try {
            onChange(
                await updateReportDecision(report.id, id, {
                    action: d.action,
                    exercise: d.exercise,
                    text: d.text,
                    suggestion_index: d.suggestion_index,
                    done: !d.done,
                }),
            );
        } catch {
            onError('Não foi possível atualizar a decisão.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className={styles.decisions}>
            {report.decisions.length === 0 && !draft && <p className={styles.muted}>Nenhuma decisão registrada ainda.</p>}
            {report.decisions.length > 0 && (
                <ul className={styles.decisionList}>
                    {report.decisions.map((d) => (
                        <li key={d.id} className={styles.decision}>
                            <label className={styles.doneToggle}>
                                <input
                                    type="checkbox"
                                    checked={d.done}
                                    onChange={() => void toggleDone(d.id)}
                                    disabled={!editable || busy}
                                />
                                <span className={styles.visuallyHidden}>Feito</span>
                            </label>
                            <span className={styles.decisionBody}>
                                <strong>
                                    {reportActionLabel(d.action)}
                                    {d.exercise ? ` · ${d.exercise}` : ''}
                                </strong>
                                {d.text && <span>{d.text}</span>}
                                <span className={styles.decisionMeta}>
                                    {new Date(d.created_at).toLocaleDateString('pt-BR')}
                                    {d.suggestion_index != null ? ' · a partir de uma sugestão' : ''}
                                    {d.done ? ' · feito' : ''}
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            {editable && !draft && (
                <Button variant="secondary" size="sm" leftIcon={<FiPlus />} onClick={() => setDraft({ ...EMPTY })}>
                    Nova decisão
                </Button>
            )}

            {editable && draft && (
                <form
                    id="report-decision-form"
                    className={styles.decisionForm}
                    onSubmit={(e) => {
                        e.preventDefault();
                        void save();
                    }}
                >
                    <label className={styles.field}>
                        <span>Decisão</span>
                        <select
                            value={draft.action}
                            onChange={(e) => setDraft({ ...draft, action: e.target.value })}
                            disabled={busy}
                        >
                            {REPORT_ACTIONS.map((a) => (
                                <option key={a.value} value={a.value}>
                                    {a.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className={styles.field}>
                        <span>Exercício (opcional)</span>
                        <input
                            type="text"
                            value={draft.exercise}
                            maxLength={120}
                            onChange={(e) => setDraft({ ...draft, exercise: e.target.value })}
                            disabled={busy}
                        />
                    </label>
                    <label className={styles.field}>
                        <span>Anotação (opcional)</span>
                        <textarea
                            value={draft.text}
                            maxLength={MAX_TEXT}
                            rows={3}
                            placeholder="Ex.: reduzi 10% no agachamento e troquei o leg press por hack."
                            onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                            disabled={busy}
                        />
                    </label>
                    <div className={styles.formActions}>
                        <Button variant="ghost" size="sm" onClick={() => setDraft(null)} disabled={busy}>
                            Cancelar
                        </Button>
                        <Button type="submit" size="sm" isLoading={busy}>
                            Salvar decisão
                        </Button>
                    </div>
                </form>
            )}
        </div>
    );
}
