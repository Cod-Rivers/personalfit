'use client';

import { useMemo } from 'react';
import { FiTarget, FiTrendingUp } from 'react-icons/fi';
import {
    teamLabel,
    type CollaborativeProgress,
    type LeaderboardEntry,
    type TeamScore,
} from '@/libs/studentChallengeService';
import s from './StudentChallengeGoalProgress.module.css';

interface Props {
    progress: CollaborativeProgress;
    /** Quando vier, é a fonte preferida da contribuição por equipe. */
    teams?: TeamScore[];
    /** Fallback: as entradas do mural, agrupadas por `team_id`. */
    entries?: LeaderboardEntry[];
    loading?: boolean;
    /** `true` depois do fim da janela do desafio. */
    finished?: boolean;
}

interface Contribution {
    key: string;
    label: string;
    days: number;
    isSelf: boolean;
}

function plural(n: number, one: string, many: string): string {
    return n === 1 ? one : many;
}

/**
 * Modalidade COLABORATIVA: uma meta coletiva única, do grupo inteiro.
 *
 * A regra de produto mais importante deste componente é o que ele NÃO faz:
 * a contribuição por equipe não é ranking, não tem colocação, não tem
 * vencedor e não usa a palavra "ranking" em lugar nenhum. Se a UI reintroduz
 * competição aqui, a modalidade perde o sentido. Pelo mesmo motivo, meta não
 * atingida nunca vira "falhou" nem badge negativo — o texto é sempre o que o
 * grupo alcançou.
 */
export default function StudentChallengeGoalProgress({
    progress,
    teams,
    entries,
    loading,
    finished,
}: Props) {
    const contributions = useMemo<Contribution[]>(() => {
        if (teams && teams.length > 0) {
            return teams
                .map((t) => ({
                    key: t.personal_id,
                    label: teamLabel(t),
                    days: t.total_days,
                    isSelf: t.is_self,
                }))
                .filter((c) => c.days > 0)
                .sort((a, b) => b.days - a.days);
        }

        // Fallback quando o mural não trouxe `teams`: agrupa as entradas
        // individuais por equipe. Entrada sem `team_id` (desafio antigo, ou
        // participante do organizador) cai num balde único.
        const buckets = new Map<string, Contribution>();
        (entries ?? []).forEach((entry) => {
            const key = entry.team_id || 'sem-equipe';
            const current = buckets.get(key);
            if (current) {
                current.days += entry.total_qualifying_days;
                current.isSelf = current.isSelf || entry.is_self;
                return;
            }
            buckets.set(key, {
                key,
                label: entry.team_name?.trim() || 'Demais participantes',
                days: entry.total_qualifying_days,
                isSelf: entry.is_self,
            });
        });
        return [...buckets.values()]
            .filter((c) => c.days > 0)
            .sort((a, b) => b.days - a.days);
    }, [teams, entries]);

    if (loading) {
        return <div className={s.loading}>Carregando a meta do grupo…</div>;
    }

    const goal = progress.goal > 0 ? progress.goal : 1;
    // Quando o grupo passa da meta, a barra empilhada continua fazendo
    // sentido porque o denominador cresce junto com o excedente.
    const scale = Math.max(goal, progress.progress, 1);
    const barPercent = Math.min(100, progress.percent);
    const ended = finished || progress.remaining_days <= 0;

    return (
        <section className={s.wrap} aria-label="Meta coletiva do desafio">
            <header className={s.head}>
                <h3 className={s.title}>
                    <FiTarget aria-hidden="true" /> Meta do grupo
                </h3>
                <span className={s.counter}>
                    <strong>{progress.progress}</strong> de {progress.goal}{' '}
                    {plural(progress.goal, 'dia', 'dias')}
                </span>
            </header>

            <div
                className={`${s.bar} ${progress.reached ? s.barReached : ''}`}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={barPercent}
                aria-label={`${barPercent}% da meta do grupo`}
            >
                <div
                    className={s.barFill}
                    style={{ width: `${barPercent}%` }}
                />
            </div>

            {progress.reached ? (
                <div className={s.reached}>
                    <strong>Meta batida!</strong> O grupo alcançou{' '}
                    {progress.progress} {plural(progress.progress, 'dia', 'dias')}{' '}
                    de treino com foto
                    {progress.surplus > 0 && (
                        <>
                            {' '}
                            — {progress.surplus}{' '}
                            {plural(progress.surplus, 'dia', 'dias')} além da
                            meta
                        </>
                    )}
                    . O desafio continua até o fim: cada registro novo ainda
                    conta para a sequência de quem treinou.
                </div>
            ) : ended ? (
                <div className={s.closing}>
                    O grupo alcançou <strong>{progress.percent}%</strong> da
                    meta, somando {progress.progress}{' '}
                    {plural(progress.progress, 'dia', 'dias')} de treino com
                    foto.
                </div>
            ) : (
                <div className={s.status}>
                    <span>
                        <strong>{progress.percent}%</strong> da meta ·{' '}
                        {progress.remaining_days}{' '}
                        {plural(
                            progress.remaining_days,
                            'dia restante',
                            'dias restantes',
                        )}
                    </span>
                    {progress.has_projection && (
                        <span className={s.projection}>
                            <FiTrendingUp aria-hidden="true" /> No ritmo atual,
                            o grupo chega a ~{progress.projected} de{' '}
                            {progress.goal}
                        </span>
                    )}
                </div>
            )}

            {contributions.length > 0 && (
                <div className={s.contribBlock}>
                    <h4 className={s.contribTitle}>Contribuição por equipe</h4>
                    <p className={s.contribNote}>
                        Aqui não há colocação nem vencedor — é só a soma de
                        cada equipe dentro do esforço do grupo.
                    </p>

                    <div className={s.stack}>
                        {contributions.map((c, i) => (
                            <div
                                key={c.key}
                                className={`${s.segment} ${s[`seg${i % 6}`]}`}
                                style={{
                                    width: `${(c.days / scale) * 100}%`,
                                }}
                                title={`${c.label}: ${c.days} ${plural(c.days, 'dia', 'dias')}`}
                            />
                        ))}
                    </div>

                    <ul className={s.contribList}>
                        {contributions.map((c, i) => (
                            <li className={s.contribItem} key={c.key}>
                                <span
                                    className={`${s.dot} ${s[`seg${i % 6}`]}`}
                                    aria-hidden="true"
                                />
                                <span className={s.contribName}>
                                    {c.label}
                                    {c.isSelf && (
                                        <span className={s.selfTag}>
                                            Sua equipe
                                        </span>
                                    )}
                                </span>
                                <span className={s.contribDays}>
                                    {c.days} {plural(c.days, 'dia', 'dias')}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}
