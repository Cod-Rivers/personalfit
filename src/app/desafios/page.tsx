'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiAward, FiArrowLeft, FiLogOut, FiAlertCircle } from 'react-icons/fi';
import { getToken, getUser, getStudentHomeRoute } from '@/libs/session';
import StudentChallengeLeaderboard from '@/components/features/StudentChallengeLeaderboard';
import StudentChallengeTeamLeaderboard from '@/components/features/StudentChallengeTeamLeaderboard';
import StudentChallengeGoalProgress from '@/components/features/StudentChallengeGoalProgress';
import ChallengePerksBlock from '@/components/features/ChallengePerksBlock';
import ChallengeReviewNotice from '@/components/features/ChallengeReviewNotice';
import StudentChallengeConsentModal, {
    type ConsentModalMode,
} from '@/components/features/StudentChallengeConsentModal';
import {
    listMyStudentChallenges,
    getMyLeaderboard,
    optOutStudentChallenge,
    challengeMode,
    acceptedPersonals,
    isMultiPersonal,
    type StudentChallenge,
    type StudentChallengeLeaderboard as Leaderboard,
} from '@/libs/studentChallengeService';
import s from '../agendamentos/agendamentos.module.css';
import ms from './desafios.module.css';

/** Lado do ALUNO do Desafio entre Alunos — convites pendentes (que exigem
 * consentimento explícito do titular) e desafios ativos em que já participo
 * (com o mural compartilhado e a opção de sair a qualquer momento). */
export default function MyStudentChallengesPage() {
    const router = useRouter();
    const [studentId, setStudentId] = useState<string | null>(null);
    const [challenges, setChallenges] = useState<StudentChallenge[]>([]);
    const [loading, setLoading] = useState(true);
    const [consentTarget, setConsentTarget] = useState<StudentChallenge | null>(
        null,
    );
    const [consentMode, setConsentMode] = useState<ConsentModalMode>('accept');
    const [leaderboards, setLeaderboards] = useState<
        Record<string, Leaderboard>
    >({});
    const [leaderboardLoading, setLeaderboardLoading] = useState<string | null>(
        null,
    );
    const [optOutTargetId, setOptOutTargetId] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setChallenges(await listMyStudentChallenges());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const token = getToken();
        const stored = getUser();
        if (!token || !stored) {
            router.replace('/');
            return;
        }
        // Uma conta admin/personal que também é aluna (has_personal) pode
        // acessar seus próprios desafios, mesmo sem role=student.
        if (stored.role !== 'student' && !stored.has_personal) {
            router.replace('/app');
            return;
        }
        setStudentId(stored.id ?? null);
        void load();
    }, [router, load]);

    function myParticipant(challenge: StudentChallenge) {
        return challenge.participants.find((p) => p.student_id === studentId);
    }

    const invited = challenges.filter(
        (c) => myParticipant(c)?.status === 'invited',
    );
    // O consentimento antigo (v1) deixou de cobrir o escopo do desafio, que
    // virou multi-personal. O aluno continua inscrito, mas fora do mural: nem
    // expõe, nem enxerga. Por isso ele sai da lista de ativos e ganha uma
    // seção própria — carregar o mural dele aqui só devolveria vazio.
    const needsReconsent = challenges.filter(
        (c) => myParticipant(c)?.status === 'active' && c.needs_reconsent,
    );
    const active = challenges.filter(
        (c) => myParticipant(c)?.status === 'active' && !c.needs_reconsent,
    );

    const loadLeaderboard = useCallback(
        async (challengeId: string) => {
            setLeaderboardLoading(challengeId);
            try {
                const lb = await getMyLeaderboard(challengeId);
                setLeaderboards((prev) => ({ ...prev, [challengeId]: lb }));
            } catch {
                /* mural fica vazio — o resto da tela segue normal */
            } finally {
                setLeaderboardLoading(null);
            }
        },
        [],
    );

    useEffect(() => {
        active.forEach((c) => {
            if (!leaderboards[c.id]) void loadLeaderboard(c.id);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active.map((c) => c.id).join(',')]);

    async function handleOptOut(challenge: StudentChallenge) {
        if (
            !confirm(
                `Sair do desafio "${challenge.name}"? Suas fotos e sua sequência deixam de ficar visíveis aos outros participantes imediatamente. Para voltar a participar, você precisaria de um novo convite.`,
            )
        )
            return;
        setOptOutTargetId(challenge.id);
        try {
            await optOutStudentChallenge(challenge.id);
            await load();
        } finally {
            setOptOutTargetId(null);
        }
    }

    function openConsent(
        challenge: StudentChallenge,
        mode: ConsentModalMode,
    ) {
        setConsentMode(mode);
        setConsentTarget(challenge);
    }

    /** Nomes dos personais participantes, para a faixa de reconfirmação — o
     * aluno decide sabendo quem passou a fazer parte, não só "outros". */
    function personalNames(challenge: StudentChallenge): string {
        const names = acceptedPersonals(challenge)
            .map((p) => p.name?.trim())
            .filter((n): n is string => !!n);
        return names.join(', ');
    }

    if (!studentId && loading) return null;

    return (
        <div className={s.page}>
            <div className={s.container}>
                <div className={s.header}>
                    <div>
                        <h1 className={s.headerTitle}>
                            <FiAward /> Desafios
                        </h1>
                        <p className={s.headerSub}>
                            Competições de constância entre você e os outros
                            alunos participantes.
                        </p>
                    </div>
                    <button
                        className={s.btnBack}
                        onClick={() => router.push(getStudentHomeRoute())}
                    >
                        <FiArrowLeft /> Voltar
                    </button>
                </div>

                {loading ? (
                    <div className={s.loadingMsg}>Carregando…</div>
                ) : (
                    <>
                        {needsReconsent.length > 0 && (
                            <section className={ms.section}>
                                <h2 className={ms.sectionTitle}>
                                    Confirme sua participação
                                </h2>
                                <div className={ms.inviteList}>
                                    {needsReconsent.map((c) => (
                                        <div
                                            className={ms.reconsentCard}
                                            key={c.id}
                                        >
                                            <div className={ms.reconsentBody}>
                                                <div
                                                    className={
                                                        ms.reconsentTitle
                                                    }
                                                >
                                                    <FiAlertCircle
                                                        aria-hidden="true"
                                                    />
                                                    {c.name}
                                                </div>
                                                <p className={ms.inviteMeta}>
                                                    Este desafio agora reúne
                                                    alunos de mais de um
                                                    personal
                                                    {personalNames(c) &&
                                                        ` (${personalNames(c)})`}
                                                    . Como isso muda quem
                                                    enxerga suas fotos e sua
                                                    sequência, precisamos da sua
                                                    confirmação de novo.
                                                </p>
                                                <p className={ms.inviteMeta}>
                                                    Até lá você fica{' '}
                                                    <strong>
                                                        fora do mural
                                                    </strong>
                                                    : ninguém vê seus dados e
                                                    você também não vê os dos
                                                    outros. Sua sequência não é
                                                    perdida.
                                                </p>
                                            </div>
                                            <button
                                                className={ms.btnPrimary}
                                                onClick={() =>
                                                    openConsent(c, 'renew')
                                                }
                                            >
                                                Confirmar participação
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {invited.length > 0 && (
                            <section className={ms.section}>
                                <h2 className={ms.sectionTitle}>
                                    Convites pendentes
                                </h2>
                                <div className={ms.inviteList}>
                                    {invited.map((c) => (
                                        <div
                                            className={ms.inviteCard}
                                            key={c.id}
                                        >
                                            <div>
                                                <div className={ms.inviteName}>
                                                    {c.name}
                                                </div>
                                                <div className={ms.inviteMeta}>
                                                    {isMultiPersonal(c)
                                                        ? 'Convite para um desafio que reúne alunos de mais de um personal.'
                                                        : 'Seu personal te convidou para este desafio.'}
                                                </div>
                                            </div>
                                            <button
                                                className={ms.btnPrimary}
                                                onClick={() =>
                                                    openConsent(c, 'accept')
                                                }
                                            >
                                                Ver convite
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        <section className={ms.section}>
                            <h2 className={ms.sectionTitle}>
                                Meus desafios ativos
                            </h2>
                            {active.length === 0 ? (
                                <div className={s.emptyMsg}>
                                    Você ainda não participa de nenhum desafio
                                    entre alunos.
                                </div>
                            ) : (
                                <div className={ms.activeList}>
                                    {active.map((c) => {
                                        const lb = leaderboards[c.id];
                                        const mode = challengeMode(c);
                                        return (
                                            <div
                                                className={ms.activeCard}
                                                key={c.id}
                                            >
                                                <div className={ms.activeHead}>
                                                    <div>
                                                        <div
                                                            className={
                                                                ms.inviteName
                                                            }
                                                        >
                                                            {c.name}
                                                        </div>
                                                        {c.description && (
                                                            <div
                                                                className={
                                                                    ms.inviteMeta
                                                                }
                                                            >
                                                                {c.description}
                                                            </div>
                                                        )}
                                                        {isMultiPersonal(c) && (
                                                            <div
                                                                className={
                                                                    ms.multiTag
                                                                }
                                                            >
                                                                Desafio entre
                                                                alunos de vários
                                                                personais
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        className={ms.btnLeave}
                                                        onClick={() =>
                                                            handleOptOut(c)
                                                        }
                                                        disabled={
                                                            optOutTargetId ===
                                                            c.id
                                                        }
                                                    >
                                                        <FiLogOut />{' '}
                                                        {optOutTargetId === c.id
                                                            ? 'Saindo…'
                                                            : 'Sair do desafio'}
                                                    </button>
                                                </div>

                                                {/* Fotos recusadas: o aluno
                                                    precisa saber por que a
                                                    sequência dele caiu. */}
                                                <ChallengeReviewNotice
                                                    challengeId={c.id}
                                                    enabled={
                                                        !!c.pose_required ||
                                                        !!c.anti_fraud?.enabled
                                                    }
                                                />

                                                {/* Prêmio, grupo e material
                                                    exclusivo — o que o aluno
                                                    ganha por participar. */}
                                                <ChallengePerksBlock
                                                    challengeId={c.id}
                                                    hasContent={
                                                        !!c.has_exclusive_content ||
                                                        !!c.prize
                                                    }
                                                />

                                                {mode === 'collaborative' &&
                                                    lb?.collaborative && (
                                                        <StudentChallengeGoalProgress
                                                            progress={
                                                                lb.collaborative
                                                            }
                                                            teams={lb.teams}
                                                            entries={lb.entries}
                                                            finished={
                                                                c.status ===
                                                                'finished'
                                                            }
                                                        />
                                                    )}

                                                {mode === 'teams' &&
                                                    lb?.teams && (
                                                        <div
                                                            className={
                                                                ms.teamBlock
                                                            }
                                                        >
                                                            <h3
                                                                className={
                                                                    ms.blockTitle
                                                                }
                                                            >
                                                                Quadro de
                                                                equipes
                                                            </h3>
                                                            <StudentChallengeTeamLeaderboard
                                                                teams={lb.teams}
                                                                finished={
                                                                    c.status ===
                                                                    'finished'
                                                                }
                                                            />
                                                        </div>
                                                    )}

                                                {mode !== 'individual' && (
                                                    <h3
                                                        className={
                                                            ms.blockTitle
                                                        }
                                                    >
                                                        {mode ===
                                                        'individual_multi'
                                                            ? 'Mural de constância (todas as carteiras)'
                                                            : 'Mural de constância'}
                                                    </h3>
                                                )}
                                                <StudentChallengeLeaderboard
                                                    entries={lb?.entries ?? []}
                                                    loading={
                                                        leaderboardLoading ===
                                                        c.id
                                                    }
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </div>

            {consentTarget && (
                <StudentChallengeConsentModal
                    open={!!consentTarget}
                    challenge={consentTarget}
                    mode={consentMode}
                    onClose={() => setConsentTarget(null)}
                    onAccepted={() => {
                        setConsentTarget(null);
                        void load();
                    }}
                    onDeclined={() => {
                        setConsentTarget(null);
                        void load();
                    }}
                />
            )}
        </div>
    );
}
