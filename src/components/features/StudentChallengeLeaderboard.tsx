'use client';

import { FiAward } from 'react-icons/fi';
import type { LeaderboardEntry } from '@/libs/studentChallengeService';
import s from './StudentChallengeLeaderboard.module.css';

interface Props {
    entries: LeaderboardEntry[];
    loading?: boolean;
}

function fmtDate(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
}

// avatar_url vem com `omitempty` do backend — aluno sem foto de perfil
// cadastrada (comum logo após o pré-cadastro por senha temporária) não tem
// esse campo no JSON, então o <img> precisa de um fallback em vez de
// quebrar (mesmo cuidado de src/app/vitrine/page.tsx para mídia opcional).
function initials(name: string): string {
    return name.trim().charAt(0).toUpperCase() || '?';
}

/**
 * Mural/ranking do Desafio entre Alunos, compartilhado entre a tela do
 * personal e a do aluno. Todas as URLs (`avatar_url`, `latest_photo_url`) já
 * vêm prontas do backend — nenhuma lógica de assinatura de mídia aqui, mesmo
 * contrato de `EvolutionTimeline.tsx`.
 */
export default function StudentChallengeLeaderboard({ entries, loading }: Props) {
    if (loading) {
        return <div className={s.loading}>Carregando mural…</div>;
    }

    if (entries.length === 0) {
        return (
            <div className={s.empty}>
                Ninguém no mural ainda — assim que um participante confirmar
                um treino com foto, ele aparece aqui.
            </div>
        );
    }

    return (
        <div className={s.grid}>
            {entries.map((entry) => (
                <div
                    key={entry.student_id}
                    className={`${s.card} ${entry.is_self ? s.cardSelf : ''}`}
                >
                    <div className={s.rank}>
                        {entry.rank === 1 ? (
                            <FiAward className={s.rankIcon} aria-label="1º lugar" />
                        ) : (
                            `#${entry.rank}`
                        )}
                    </div>

                    <div className={s.photoWrap}>
                        {entry.latest_photo_url ? (
                            <img
                                src={entry.latest_photo_url}
                                alt={`Foto mais recente de ${entry.name}`}
                                className={s.photo}
                            />
                        ) : (
                            <div className={s.photoPlaceholder}>
                                Sem foto ainda
                            </div>
                        )}
                    </div>

                    <div className={s.info}>
                        <div className={s.nameRow}>
                            {entry.avatar_url ? (
                                <img
                                    src={entry.avatar_url}
                                    alt=""
                                    className={s.avatar}
                                />
                            ) : (
                                <div className={s.avatarPlaceholder} aria-hidden="true">
                                    {initials(entry.name)}
                                </div>
                            )}
                            <span className={s.name}>{entry.name}</span>
                            {entry.is_self && (
                                <span className={s.youTag}>Você</span>
                            )}
                        </div>
                        <div className={s.streaks}>
                            <span className={s.streakBadge}>
                                <strong>{entry.current_streak}</strong> streak
                                atual
                            </span>
                            <span className={s.streakBadgeRecord}>
                                <strong>{entry.longest_streak}</strong>{' '}
                                recorde
                            </span>
                        </div>
                        {entry.latest_photo_at && (
                            <div className={s.photoDate}>
                                Última foto: {fmtDate(entry.latest_photo_at)}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
