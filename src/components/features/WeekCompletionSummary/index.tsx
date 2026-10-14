import type { WeekCompletion } from '@/libs/currentWeek';
import s from './WeekCompletionSummary.module.css';

const WEEKDAY = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

interface Props {
    completions: WeekCompletion[];
    /** Treino aberto na tela: ganha o contador "feito N× nesta semana". */
    trainingRef?: string;
    /** Nome do treino aberto, para a frase do contador. */
    trainingLabel?: string;
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
}: Props) {
    if (completions.length === 0) return null;
    const timesThis = trainingRef
        ? completions.filter((c) => c.trainingRef === trainingRef).length
        : 0;

    return (
        <section className={s.box} aria-label="Treinos finalizados nesta semana">
            {trainingRef && (
                <p className={s.counter}>
                    {trainingLabel || `Treino ${trainingRef}`}:{' '}
                    {timesThis === 0
                        ? 'ainda não finalizado nesta semana'
                        : `finalizado ${timesThis}× nesta semana`}
                </p>
            )}
            <p className={s.title}>
                Ordem da semana · {completions.length}{' '}
                {completions.length === 1 ? 'treino finalizado' : 'treinos finalizados'}
            </p>
            <ol className={s.list}>
                {completions.map((c) => (
                    <li
                        key={`${c.order}-${c.at.getTime()}`}
                        className={c.trainingRef === trainingRef ? s.current : undefined}
                    >
                        {c.order}º · Treino {c.trainingRef}
                        {c.repetition > 1 && ` (${c.repetition}ª vez)`} ·{' '}
                        {WEEKDAY[c.at.getDay()]}
                    </li>
                ))}
            </ol>
        </section>
    );
}
