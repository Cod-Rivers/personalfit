'use client';

import Link from 'next/link';
import { FiArrowRight, FiCheckCircle, FiFlag, FiShare2, FiThumbsUp, FiUser } from 'react-icons/fi';
import {
    formatDelta,
    goalLabel,
    measurementLabel,
    type ResultCard,
} from '@/libs/resultService';
import { saveStoreEntryPoint } from '@/libs/storeSaleRef';
import { BeforeAfterPair, BeforeAfterSlider } from './ResultPhotos';
import s from './results.module.css';

/** "12 semanas" / "1 semana". */
export function weeksLabel(weeks: number): string {
    return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
}

/** Os números que o aluno escolheu mostrar. */
export function ResultStatsRow({ stats }: { stats: ResultCard['stats'] }) {
    const items: { value: string; label: string }[] = [];
    if (stats.weight_delta_kg != null) {
        items.push({ value: formatDelta(stats.weight_delta_kg, 'kg'), label: 'Peso' });
    }
    if (stats.body_fat_delta != null) {
        items.push({ value: `${formatDelta(stats.body_fat_delta, '%')} p.p.`, label: '% de gordura' });
    }
    for (const [k, v] of Object.entries(stats.measurements ?? {})) {
        items.push({ value: formatDelta(v, 'cm'), label: measurementLabel(k) });
    }
    if (items.length === 0) return null;
    return (
        <div className={s.stats}>
            {items.map((it) => (
                <div key={it.label} className={s.stat}>
                    <span className={s.statValue}>{it.value}</span>
                    <span className={s.statLabel}>{it.label}</span>
                </div>
            ))}
        </div>
    );
}

/** Selo "Resultado verificado" + objetivo + treinos. */
export function ResultBadges({ result }: { result: ResultCard }) {
    const goal = goalLabel(result.goal);
    return (
        <div className={s.badges}>
            {result.verified && (
                <span
                    className={`${s.badge} ${s.badgeVerified}`}
                    title="As duas fotos foram enviadas pela Evolução, com pelo menos 4 semanas entre elas, e há treinos registrados no período."
                >
                    <FiCheckCircle aria-hidden="true" /> Resultado verificado
                </span>
            )}
            {goal && <span className={s.badge}>{goal}</span>}
            {result.workouts_logged > 0 && (
                <span className={s.badge}>
                    {result.workouts_logged} treinos registrados
                    {result.adherence_pct ? ` · ${result.adherence_pct}% do plano` : ''}
                </span>
            )}
        </div>
    );
}

/** Link para o programa da loja: guarda a origem "mural:<id>" para a compra. */
export function ResultProgramLink({ result }: { result: ResultCard }) {
    if (!result.program) return null;
    return (
        <Link
            href={`/loja/programa/${result.program.id}`}
            className={s.programLink}
            onClick={() => saveStoreEntryPoint(`mural:${result.id}`)}
        >
            <span>Feito com: {result.program.title}</span>
            <FiArrowRight aria-hidden="true" />
        </Link>
    );
}

export const RESULTS_DISCLAIMER =
    'Resultados individuais. Dependem de alimentação, sono, frequência dos treinos e genética.';

interface Props {
    result: ResultCard;
    /** Página de detalhe: deslizador em vez de fotos lado a lado. */
    detailed?: boolean;
    /** Esconde o link do programa (já estamos na página dele). */
    hideProgram?: boolean;
    cheered?: boolean;
    onCheer?: () => void;
    onReport?: () => void;
    onShare?: () => void;
}

/** Card de um resultado do mural. */
export default function ResultCardView({
    result,
    detailed,
    hideProgram,
    cheered,
    onCheer,
    onReport,
    onShare,
}: Props) {
    const Photos = detailed ? BeforeAfterSlider : BeforeAfterPair;
    return (
        <article className={s.card}>
            <div className={s.cardHead}>
                <span className={s.cardName}>{result.display_name}</span>
                <span className={s.cardWeeks}>{weeksLabel(result.weeks_between)}</span>
            </div>
            <Photos
                beforeUrl={result.before_url}
                afterUrl={result.after_url}
                beforeDate={result.before_date}
                afterDate={result.after_date}
                name={result.display_name}
            />
            <ResultBadges result={result} />
            <ResultStatsRow stats={result.stats} />
            {result.caption && <p className={s.caption}>“{result.caption}”</p>}
            {result.personal_name && (
                <span className={s.badge}>
                    <FiUser aria-hidden="true" /> Acompanhado por {result.personal_name}
                </span>
            )}
            {!hideProgram && <ResultProgramLink result={result} />}
            <div className={s.cardFoot}>
                <div>
                    {onCheer && (
                        <button
                            type="button"
                            className={`${s.linkBtn} ${cheered ? s.cheerOn : ''}`}
                            onClick={onCheer}
                            aria-pressed={!!cheered}
                        >
                            <FiThumbsUp aria-hidden="true" /> {result.cheers_count > 0 ? result.cheers_count : ''} Aplaudir
                        </button>
                    )}
                    {onShare && (
                        <button type="button" className={s.linkBtn} onClick={onShare}>
                            <FiShare2 aria-hidden="true" /> Compartilhar
                        </button>
                    )}
                </div>
                <div>
                    {!detailed && (
                        <Link href={`/resultados/${result.id}`} className={s.linkBtn}>
                            Ver
                        </Link>
                    )}
                    {onReport && (
                        <button type="button" className={s.linkBtn} onClick={onReport}>
                            <FiFlag aria-hidden="true" /> Denunciar
                        </button>
                    )}
                </div>
            </div>
            {detailed && <p className={s.disclaimer}>{RESULTS_DISCLAIMER}</p>}
        </article>
    );
}
