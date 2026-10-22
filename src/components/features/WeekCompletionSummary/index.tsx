'use client';

import { useState } from 'react';
import type { WeekCompletion } from '@/libs/currentWeek';
import s from './WeekCompletionSummary.module.css';

const WEEKDAY = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

interface Props {
    completions: WeekCompletion[];
    /** Treino aberto na tela: ganha o contador "feito N× nesta semana". */
    trainingRef?: string;
    /** Nome do treino aberto, para a frase do contador. */
    trainingLabel?: string;
    /** Treinos pulados na semana — só aparecem com onUndo, para desfazer. */
    skipped?: WeekCompletion[];
    /** Desfaz uma finalização marcada por engano. Ausente = sem o botão.
     * Só aparece nos itens já sincronizados (com logId). */
    onUndo?: (completion: WeekCompletion) => Promise<void>;
}

/**
 * Ordem dos treinos finalizados na semana ("1º Treino A · seg") e quantas
 * vezes o treino aberto já foi feito — sem isto, repetir um treino na mesma
 * semana não deixava rastro na tela.
 */
export default function WeekCompletionSummary({
    completions,
    trainingRef,
    trainingLabel,
    skipped = [],
    onUndo,
}: Props) {
    // Confirmação inline em dois toques: window.confirm não é confiável na
    // WebView do app.
    const [confirming, setConfirming] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(false);

    const skips = onUndo ? skipped.filter((c) => c.logId) : [];
    if (completions.length === 0 && skips.length === 0) return null;
    const timesThis = trainingRef
        ? completions.filter((c) => c.trainingRef === trainingRef).length
        : 0;

    const undo = async (c: WeekCompletion) => {
        if (!onUndo) return;
        setBusy(true);
        setError(false);
        try {
            await onUndo(c);
            setConfirming(null);
        } catch {
            setError(true);
        } finally {
            setBusy(false);
        }
    };

    const undoControls = (c: WeekCompletion, what: string) => (
        <>
            {onUndo && c.logId && confirming !== c.logId && (
                <button
                    type="button"
                    className={s.undo}
                    onClick={() => {
                        setError(false);
                        setConfirming(c.logId!);
                    }}
                    aria-label={`Desfazer ${what} do Treino ${c.trainingRef}`}
                >
                    desfazer
                </button>
            )}
            {onUndo && c.logId && confirming === c.logId && (
                <span className={s.confirm}>
                    Desfazer?
                    <button
                        type="button"
                        className={s.undoYes}
                        disabled={busy}
                        onClick={() => undo(c)}
                    >
                        {busy ? '…' : 'Sim'}
                    </button>
                    <button
                        type="button"
                        className={s.undo}
                        disabled={busy}
                        onClick={() => setConfirming(null)}
                    >
                        Não
                    </button>
                </span>
            )}
        </>
    );

    return (
        <section
            className={s.box}
            aria-label="Treinos finalizados nesta semana"
        >
            {trainingRef && (
                <p className={s.counter}>
                    {trainingLabel || `Treino ${trainingRef}`}:{' '}
                    {timesThis === 0
                        ? 'ainda não finalizado nesta semana'
                        : `finalizado ${timesThis}× nesta semana`}
                </p>
            )}
            {completions.length > 0 && (
                <>
                    <p className={s.title}>
                        Ordem da semana · {completions.length}{' '}
                        {completions.length === 1
                            ? 'treino finalizado'
                            : 'treinos finalizados'}
                    </p>
                    <ol className={s.list}>
                        {completions.map((c) => (
                            <li
                                key={`${c.order}-${c.at.getTime()}`}
                                className={
                                    c.trainingRef === trainingRef
                                        ? s.current
                                        : undefined
                                }
                            >
                                {c.order}º · Treino {c.trainingRef}
                                {c.repetition > 1 &&
                                    ` (${c.repetition}ª vez)`}{' '}
                                · {WEEKDAY[c.at.getDay()]}
                                {undoControls(c, 'finalização')}
                            </li>
                        ))}
                    </ol>
                </>
            )}
            {skips.length > 0 && (
                <>
                    <p className={s.title}>Pulados nesta semana</p>
                    <ul className={s.list}>
                        {skips.map((c) => (
                            <li key={c.logId}>
                                Treino {c.trainingRef} ·{' '}
                                {WEEKDAY[c.at.getDay()]}
                                {undoControls(c, 'pulo')}
                            </li>
                        ))}
                    </ul>
                </>
            )}
            {error && (
                <p className={s.error} role="alert">
                    Não foi possível desfazer. Verifique a internet e tente de
                    novo.
                </p>
            )}
        </section>
    );
}
