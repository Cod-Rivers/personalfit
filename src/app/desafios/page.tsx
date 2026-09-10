'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiAward, FiArrowLeft, FiLogOut } from 'react-icons/fi';
import { getToken, getUser, getStudentHomeRoute } from '@/libs/session';
import StudentChallengeLeaderboard from '@/components/features/StudentChallengeLeaderboard';
import StudentChallengeConsentModal from '@/components/features/StudentChallengeConsentModal';
import {
    listMyStudentChallenges,
    getMyLeaderboard,
    optOutStudentChallenge,
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
    const active = challenges.filter(
        (c) => myParticipant(c)?.status === 'active',
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
                            alunos do seu personal.
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
                                                    Seu personal te convidou
                                                    para este desafio.
                                                </div>
                                            </div>
                                            <button
                                                className={ms.btnPrimary}
                                                onClick={() =>
                                                    setConsentTarget(c)
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
                                    {active.map((c) => (
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
                                                </div>
                                                <button
                                                    className={ms.btnLeave}
                                                    onClick={() =>
                                                        handleOptOut(c)
                                                    }
                                                    disabled={
                                                        optOutTargetId === c.id
                                                    }
                                                >
                                                    <FiLogOut />{' '}
                                                    {optOutTargetId === c.id
                                                        ? 'Saindo…'
                                                        : 'Sair do desafio'}
                                                </button>
                                            </div>
                                            <StudentChallengeLeaderboard
                                                entries={
                                                    leaderboards[c.id]
                                                        ?.entries ?? []
                                                }
                                                loading={
                                                    leaderboardLoading === c.id
                                                }
                                            />
                                        </div>
                                    ))}
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
