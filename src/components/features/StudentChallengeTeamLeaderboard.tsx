'use client';

import { FiAward, FiInfo, FiUsers } from 'react-icons/fi';
import {
    teamLabel,
    type TeamScore,
} from '@/libs/studentChallengeService';
import s from './StudentChallengeTeamLeaderboard.module.css';

interface Props {
    teams: TeamScore[];
    loading?: boolean;
    /** `true` depois do fim da janela — só então existe vencedor oficial. */
    finished?: boolean;
}

/** Uma casa decimal, vírgula decimal como manda o pt-BR. */
function pct(value: number): string {
    return `${value.toFixed(1).replace('.', ',')}%`;
}

/**
 * Quadro de EQUIPES (personal x personal) do Desafio entre Alunos.
 *
 * Duas regras de produto que não podem ser omitidas daqui:
 *  1. a taxa bruta aparece SEMPRE ao lado do score ajustado — sem isso o
 *     personal faz a conta de cabeça, não bate, e conclui que o app erra;
 *  2. empate é escrito como empate. Duas equipes com o mesmo `rank` nunca
 *     viram "1º e 2º" por desempate inventado no cliente.
 */
export default function StudentChallengeTeamLeaderboard({
    teams,
    loading,
    finished,
}: Props) {
    if (loading) {
        return <div className={s.loading}>Carregando equipes…</div>;
    }

    if (!teams || teams.length === 0) {
        return (
            <div className={s.empty}>
                Nenhuma equipe no quadro ainda — assim que os alunos de um
                personal registrarem treinos com foto, a equipe dele aparece
                aqui.
            </div>
        );
    }

    // `rank === 0` significa "sem colocação" (equipe abaixo do mínimo). Elas
    // ficam no fim, visíveis: esconder parece bug e tira do personal a chance
    // de perceber que falta um aluno para entrar na disputa.
    const ranked = teams
        .filter((t) => t.eligible && t.rank > 0)
        .sort((a, b) => a.rank - b.rank);
    const unranked = teams.filter((t) => !t.eligible || t.rank <= 0);

    const rankCount = new Map<number, number>();
    ranked.forEach((t) => {
        rankCount.set(t.rank, (rankCount.get(t.rank) ?? 0) + 1);
    });

    return (
        <div className={s.wrap}>
            <div className={s.legend}>
                <FiInfo aria-hidden="true" className={s.legendIcon} />
                <span>
                    A classificação usa a <strong>taxa ajustada</strong>, que
                    puxa equipes pequenas para a média do desafio enquanto não
                    há alunos suficientes para confiar só no número delas. A{' '}
                    <strong>taxa bruta</strong> é o número direto da equipe,
                    sem ajuste.
                </span>
            </div>

            {!finished && (
                <div className={s.partial}>
                    Quadro parcial — o resultado oficial só vale no fim do
                    desafio.
                </div>
            )}

            {teams.length === 1 && (
                <div className={s.partial}>
                    Só uma equipe no quadro. Convide outro personal para o
                    desafio valer como torneio.
                </div>
            )}

            <ul className={s.list}>
                {ranked.map((team) => {
                    const tied = (rankCount.get(team.rank) ?? 0) > 1;
                    return (
                        <li
                            key={team.personal_id}
                            className={`${s.item} ${team.is_self ? s.itemSelf : ''}`}
                        >
                            <div className={s.rank}>
                                {team.rank === 1 ? (
                                    <FiAward
                                        className={s.rankIcon}
                                        aria-label="1º lugar"
                                    />
                                ) : (
                                    `#${team.rank}`
                                )}
                            </div>

                            <div className={s.body}>
                                <div className={s.nameRow}>
                                    <span className={s.name}>
                                        {teamLabel(team)}
                                    </span>
                                    {team.is_self && (
                                        <span className={s.selfTag}>
                                            Sua equipe
                                        </span>
                                    )}
                                    {tied && (
                                        <span className={s.tieTag}>
                                            empate no {team.rank}º lugar
                                        </span>
                                    )}
                                </div>

                                <div className={s.scores}>
                                    <span className={s.scoreMain}>
                                        <strong>{pct(team.score)}</strong> taxa
                                        ajustada
                                    </span>
                                    <span className={s.scoreRaw}>
                                        {pct(team.raw_rate)} taxa bruta
                                    </span>
                                </div>

                                <div className={s.stats}>
                                    <span className={s.stat}>
                                        <FiUsers aria-hidden="true" />{' '}
                                        {team.contributors} de{' '}
                                        {team.active_count}{' '}
                                        {team.active_count === 1
                                            ? 'aluno registrou'
                                            : 'alunos registraram'}{' '}
                                        pelo menos um dia
                                    </span>
                                    <span className={s.stat}>
                                        {team.total_days}{' '}
                                        {team.total_days === 1
                                            ? 'dia somado'
                                            : 'dias somados'}
                                    </span>
                                </div>
                            </div>
                        </li>
                    );
                })}

                {unranked.map((team) => (
                    <li
                        key={team.personal_id}
                        className={`${s.item} ${s.itemUnranked} ${
                            team.is_self ? s.itemSelf : ''
                        }`}
                    >
                        <div className={`${s.rank} ${s.rankEmpty}`}>—</div>
                        <div className={s.body}>
                            <div className={s.nameRow}>
                                <span className={s.name}>
                                    {teamLabel(team)}
                                </span>
                                {team.is_self && (
                                    <span className={s.selfTag}>
                                        Sua equipe
                                    </span>
                                )}
                                <span className={s.outTag}>
                                    fora de classificação — mínimo de 3 alunos
                                </span>
                            </div>

                            <div className={s.scores}>
                                <span className={s.scoreMain}>
                                    <strong>{pct(team.score)}</strong> taxa
                                    ajustada
                                </span>
                                <span className={s.scoreRaw}>
                                    {pct(team.raw_rate)} taxa bruta
                                </span>
                            </div>

                            <div className={s.stats}>
                                <span className={s.stat}>
                                    <FiUsers aria-hidden="true" />{' '}
                                    {team.contributors} de {team.active_count}{' '}
                                    {team.active_count === 1
                                        ? 'aluno registrou'
                                        : 'alunos registraram'}{' '}
                                    pelo menos um dia
                                </span>
                                <span className={s.stat}>
                                    {team.total_days}{' '}
                                    {team.total_days === 1
                                        ? 'dia somado'
                                        : 'dias somados'}
                                </span>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
