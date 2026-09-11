'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FiMail, FiUserPlus, FiUsers } from 'react-icons/fi';
import { usePersonalStudents } from '@/hooks/usePersonalStudents';
import { getUser } from '@/libs/session';
import Modal from '@/components/system/Modal';
import StudentChallengeLeaderboard from '@/components/features/StudentChallengeLeaderboard';
import StudentChallengeTeamLeaderboard from '@/components/features/StudentChallengeTeamLeaderboard';
import StudentChallengeGoalProgress from '@/components/features/StudentChallengeGoalProgress';
import PersonalInviteModal from './PersonalInviteModal';
import {
    createStudentChallenge,
    listStudentChallenges,
    listPersonalChallengeInvites,
    inviteStudents,
    endStudentChallenge,
    deleteStudentChallenge,
    getLeaderboard,
    acceptPersonalInvite,
    declinePersonalInvite,
    leaveStudentChallenge,
    removePersonal,
    renameTeam,
    setStudentChallengeMode,
    removeChallengeStudent,
    offerOwnerTransfer,
    acceptOwnerTransfer,
    declineOwnerTransfer,
    cancelOwnerTransfer,
    challengeMode,
    challengePersonals,
    participantsCount,
    teamLabel,
    suggestCollaborativeGoal,
    windowDaysBetween,
    type StudentChallenge,
    type StudentChallengeMode,
    type StudentChallengePersonal,
    type StudentChallengeLeaderboard as Leaderboard,
} from '@/libs/studentChallengeService';
import s from '../desafios.module.css';

function todayISO(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
}

function fmt(d: string) {
    const dt = new Date(d + 'T00:00:00');
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('pt-BR');
}

function activeParticipantCount(c: StudentChallenge): number {
    return c.participants.filter((p) => p.status === 'active').length;
}

/** Modo só é editável enquanto o desafio não começou (plano, 7.1). */
function hasStarted(c: StudentChallenge): boolean {
    return c.start_date <= todayISO();
}

const MODE_LABEL: Record<StudentChallengeMode, string> = {
    individual: 'Individual',
    teams: 'Equipes (personal x personal)',
    collaborative: 'Colaborativo (meta do grupo)',
};

const MODE_HINT: Record<StudentChallengeMode, string> = {
    individual:
        'Ranking de constância entre os alunos, um a um. É o formato de sempre.',
    teams: 'Além do mural individual, um quadro de equipes: cada personal é uma equipe, com a pontuação ajustada para que carteiras de tamanhos diferentes disputem em pé de igualdade.',
    collaborative:
        'Sem disputa: todos somam dias de treino rumo a uma meta única do grupo.',
};

const PERSONAL_STATUS_LABEL: Record<
    StudentChallengePersonal['status'],
    string
> = {
    invited: 'Convite enviado',
    accepted: 'Participando',
    declined: 'Recusou',
    left: 'Saiu',
};

function describeError(err: unknown, fallback: string): string {
    if (axios.isAxiosError(err) && !err.response) {
        return 'Sem conexão. Nada foi alterado — tente de novo quando estiver online.';
    }
    if (axios.isAxiosError(err)) {
        const data = err.response?.data as
            | { error?: string; message?: string }
            | undefined;
        return data?.error || data?.message || fallback;
    }
    return fallback;
}

/** Aba "Entre Alunos" da tela /personal/desafios — desafio competitivo entre
 * alunos já vinculados, em paralelo à aba de captação de leads (que fica
 * intocada). */
export default function StudentChallengeTab() {
    const { students } = usePersonalStudents(true);
    const activeStudents = students.filter((st) => st.link_status === 'active');
    // Toda a carteira (inclusive vínculo inativo): é o que decide se um
    // participante é MEU aluno e portanto se eu posso removê-lo. Aluno que se
    // desvinculou no meio do desafio continua sendo da minha equipe.
    const myStudentIds = useMemo(
        () => new Set(students.map((st) => st.id)),
        [students],
    );
    const myPersonalId = useMemo(() => getUser()?.id ?? null, []);

    const [challenges, setChallenges] = useState<StudentChallenge[]>([]);
    const [personalInvites, setPersonalInvites] = useState<StudentChallenge[]>(
        [],
    );
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [leaderboards, setLeaderboards] = useState<
        Record<string, Leaderboard>
    >({});
    const [leaderboardLoading, setLeaderboardLoading] = useState<string | null>(
        null,
    );
    const [actionError, setActionError] = useState('');
    const [busyId, setBusyId] = useState<string | null>(null);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState(todayISO());
    const [endDate, setEndDate] = useState(todayISO(21));
    const [createMode, setCreateMode] =
        useState<StudentChallengeMode>('individual');
    const [createGoal, setCreateGoal] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const [inviteTarget, setInviteTarget] = useState<StudentChallenge | null>(
        null,
    );
    const [inviteSelection, setInviteSelection] = useState<string[]>([]);
    const [inviteSaving, setInviteSaving] = useState(false);

    const [personalInviteTarget, setPersonalInviteTarget] =
        useState<StudentChallenge | null>(null);

    const [renameTarget, setRenameTarget] = useState<StudentChallenge | null>(
        null,
    );
    const [renameValue, setRenameValue] = useState('');

    const [modeTarget, setModeTarget] = useState<StudentChallenge | null>(null);
    const [modeValue, setModeValue] =
        useState<StudentChallengeMode>('individual');
    const [modeGoal, setModeGoal] = useState('');

    const [transferPick, setTransferPick] = useState<Record<string, string>>(
        {},
    );

    async function load() {
        try {
            const [list, invites] = await Promise.all([
                listStudentChallenges(),
                listPersonalChallengeInvites().catch(() => []),
            ]);
            setChallenges(list);
            setPersonalInvites(invites);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
    }, []);

    /** Toda rota nova devolve o desafio atualizado — troca na lista em vez de
     * recarregar tudo, mas recarrega os convites porque aceitar/recusar muda
     * as duas listas ao mesmo tempo. */
    function replaceChallenge(updated: StudentChallenge) {
        setChallenges((prev) =>
            prev.some((c) => c.id === updated.id)
                ? prev.map((c) => (c.id === updated.id ? updated : c))
                : [updated, ...prev],
        );
    }

    async function run(
        id: string,
        fallbackMsg: string,
        fn: () => Promise<StudentChallenge | void>,
        reloadAll = false,
    ) {
        setBusyId(id);
        setActionError('');
        try {
            const updated = await fn();
            if (reloadAll || !updated) {
                await load();
            } else {
                replaceChallenge(updated);
            }
        } catch (err) {
            setActionError(describeError(err, fallbackMsg));
        } finally {
            setBusyId(null);
        }
    }

    function toggleStudentSelection(id: string) {
        setSelectedStudentIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    }

    /** Sugestão de meta: nunca imposta, só oferecida num botão. */
    const createGoalSuggestion = useMemo(
        () =>
            suggestCollaborativeGoal(
                selectedStudentIds.length || activeStudents.length || 1,
                windowDaysBetween(startDate, endDate),
            ),
        [selectedStudentIds.length, activeStudents.length, startDate, endDate],
    );

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setFormError('');
        if (!name.trim()) {
            setFormError('Informe o nome do desafio.');
            return;
        }
        const goal = Number(createGoal);
        if (
            createMode === 'collaborative' &&
            (!Number.isFinite(goal) || goal < 1)
        ) {
            setFormError(
                'Informe a meta do grupo (em dias de treino somados) para o modo colaborativo.',
            );
            return;
        }
        setSaving(true);
        try {
            await createStudentChallenge({
                name: name.trim(),
                description: description.trim() || undefined,
                start_date: startDate,
                end_date: endDate,
                student_ids: selectedStudentIds.length
                    ? selectedStudentIds
                    : undefined,
                mode: createMode === 'individual' ? undefined : createMode,
                collaborative_goal:
                    createMode === 'collaborative' ? goal : undefined,
            });
            setName('');
            setDescription('');
            setSelectedStudentIds([]);
            setCreateMode('individual');
            setCreateGoal('');
            setShowForm(false);
            await load();
        } catch (err) {
            setFormError(
                describeError(
                    err,
                    'Não foi possível criar o desafio. Verifique as datas.',
                ),
            );
        } finally {
            setSaving(false);
        }
    }

    async function toggleExpand(challenge: StudentChallenge) {
        if (expandedId === challenge.id) {
            setExpandedId(null);
            return;
        }
        setExpandedId(challenge.id);
        if (!leaderboards[challenge.id]) {
            setLeaderboardLoading(challenge.id);
            try {
                const lb = await getLeaderboard(challenge.id);
                setLeaderboards((prev) => ({ ...prev, [challenge.id]: lb }));
            } catch {
                /* mural fica vazio — o card ainda mostra os dados básicos */
            } finally {
                setLeaderboardLoading(null);
            }
        }
    }

    async function handleEnd(challenge: StudentChallenge) {
        if (
            !confirm(
                `Encerrar o desafio "${challenge.name}"? Os participantes deixam de poder pontuar.`,
            )
        )
            return;
        await run(challenge.id, 'Não foi possível encerrar o desafio.', () =>
            endStudentChallenge(challenge.id),
        );
    }

    async function handleDelete(challenge: StudentChallenge) {
        if (
            !confirm(
                `Excluir o desafio "${challenge.name}"? Essa ação não pode ser desfeita.`,
            )
        )
            return;
        await run(
            challenge.id,
            'Não foi possível excluir o desafio.',
            async () => {
                await deleteStudentChallenge(challenge.id);
            },
            true,
        );
    }

    async function handleLeave(challenge: StudentChallenge) {
        if (
            !confirm(
                `Sair do desafio "${challenge.name}"? Os seus alunos saem do mural junto, e as fotos deles deixam de ficar visíveis imediatamente.`,
            )
        )
            return;
        await run(
            challenge.id,
            'Não foi possível sair do desafio.',
            () => leaveStudentChallenge(challenge.id),
            true,
        );
    }

    async function handleRemovePersonal(
        challenge: StudentChallenge,
        personal: StudentChallengePersonal,
    ) {
        if (
            !confirm(
                `Remover ${teamLabel(personal)} do desafio "${challenge.name}"? Os alunos dele saem do mural junto.`,
            )
        )
            return;
        await run(challenge.id, 'Não foi possível remover o personal.', () =>
            removePersonal(challenge.id, personal.personal_id),
        );
    }

    async function handleRemoveStudent(
        challenge: StudentChallenge,
        studentId: string,
        studentName: string,
    ) {
        if (
            !confirm(
                `Remover ${studentName} do desafio "${challenge.name}"? As fotos e a sequência dele deixam de ficar visíveis no mural imediatamente.`,
            )
        )
            return;
        await run(challenge.id, 'Não foi possível remover o aluno.', () =>
            removeChallengeStudent(challenge.id, studentId),
        );
    }

    function openRename(challenge: StudentChallenge) {
        const mine = challengePersonals(challenge).find((p) => p.is_self);
        setRenameValue(mine?.team_name ?? '');
        setRenameTarget(challenge);
    }

    async function submitRename() {
        if (!renameTarget) return;
        const target = renameTarget;
        setRenameTarget(null);
        await run(target.id, 'Não foi possível renomear a equipe.', () =>
            renameTeam(target.id, renameValue.trim()),
        );
    }

    function openModeEditor(challenge: StudentChallenge) {
        setModeValue(challengeMode(challenge));
        setModeGoal(
            challenge.collaborative_goal
                ? String(challenge.collaborative_goal)
                : '',
        );
        setModeTarget(challenge);
    }

    async function submitMode() {
        if (!modeTarget) return;
        const target = modeTarget;
        const goal = Number(modeGoal);
        if (
            modeValue === 'collaborative' &&
            (!Number.isFinite(goal) || goal < 1)
        ) {
            setActionError('Informe a meta do grupo para o modo colaborativo.');
            return;
        }
        setModeTarget(null);
        await run(target.id, 'Não foi possível alterar a modalidade.', () =>
            setStudentChallengeMode(
                target.id,
                modeValue,
                modeValue === 'collaborative' ? goal : undefined,
            ),
        );
    }

    async function handleOfferTransfer(challenge: StudentChallenge) {
        const personalId = transferPick[challenge.id];
        if (!personalId) return;
        const target = challengePersonals(challenge).find(
            (p) => p.personal_id === personalId,
        );
        if (
            !confirm(
                `Oferecer a titularidade de "${challenge.name}" para ${teamLabel(target ?? {})}? Ele precisa aceitar para a troca valer. Depois disso, você continua no desafio como participante, com os seus alunos — só deixa de poder encerrar e excluir.`,
            )
        )
            return;
        await run(
            challenge.id,
            'Não foi possível oferecer a transferência.',
            () => offerOwnerTransfer(challenge.id, personalId),
        );
    }

    function openInvite(challenge: StudentChallenge) {
        setInviteTarget(challenge);
        setInviteSelection([]);
    }

    function toggleInviteSelection(id: string) {
        setInviteSelection((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    }

    async function submitInvite() {
        if (!inviteTarget || inviteSelection.length === 0) return;
        setInviteSaving(true);
        try {
            const updated = await inviteStudents(
                inviteTarget.id,
                inviteSelection,
            );
            replaceChallenge(updated);
            setInviteTarget(null);
            setInviteSelection([]);
        } catch (err) {
            setActionError(
                describeError(err, 'Não foi possível convidar os alunos.'),
            );
        } finally {
            setInviteSaving(false);
        }
    }

    // Alunos já convidados/participantes daquele desafio, pra não oferecer de
    // novo no modal de convite.
    function invitedIdsFor(challenge: StudentChallenge): Set<string> {
        return new Set(challenge.participants.map((p) => p.student_id));
    }

    function ownerNameOf(challenge: StudentChallenge): string {
        const owner = challengePersonals(challenge).find(
            (p) => p.role === 'owner',
        );
        return owner?.name?.trim() || 'O organizador';
    }

    function renderCard(c: StudentChallenge) {
        const mode = challengeMode(c);
        // `my_role` vazio = desafio antigo, respondido antes da feature: o
        // personal que consegue listá-lo é o dono, como sempre foi.
        const role = c.my_role || 'owner';
        const owner = role === 'owner';
        const personals = challengePersonals(c);
        const transferable = personals.filter(
            (p) => p.role === 'member' && p.status === 'accepted',
        );
        const pendingTransferTo = c.pending_owner_transfer_to
            ? personals.find(
                  (p) => p.personal_id === c.pending_owner_transfer_to,
              )
            : undefined;
        const iAmTransferTarget =
            !!c.pending_owner_transfer_to &&
            !!myPersonalId &&
            c.pending_owner_transfer_to === myPersonalId;
        const lb = leaderboards[c.id];
        const busy = busyId === c.id;
        const myParticipants = c.participants.filter((p) =>
            myStudentIds.has(p.student_id),
        );

        return (
            <div className={s.card} key={c.id}>
                <div className={s.cardHead}>
                    <div>
                        <div className={s.cardName}>{c.name}</div>
                        <div className={s.cardMeta}>
                            {fmt(c.start_date)} → {fmt(c.end_date)}
                        </div>
                    </div>
                    <div className={s.badgeGroup}>
                        {mode !== 'individual' && (
                            <span className={s.modeBadge}>
                                {MODE_LABEL[mode]}
                            </span>
                        )}
                        {!owner && (
                            <span className={s.roleBadge}>Convidado</span>
                        )}
                        <span className={s.statusBadge}>
                            {c.status === 'active' ? 'Ativo' : 'Encerrado'}
                        </span>
                    </div>
                </div>

                {c.description && (
                    <p className={s.cardMeta} style={{ marginTop: 8 }}>
                        {c.description}
                    </p>
                )}

                <div className={s.stats}>
                    <span className={s.stat}>
                        <b>{activeParticipantCount(c)}</b> ativos
                    </span>
                    <span className={s.stat}>
                        <b>{participantsCount(c)}</b> convidados no total
                    </span>
                    {mode === 'collaborative' && c.collaborative_goal && (
                        <span className={s.stat}>
                            meta de <b>{c.collaborative_goal}</b> dias
                        </span>
                    )}
                </div>

                {/* Roster de personais: só aparece quando existe mais de um,
                    para o desafio single-personal continuar idêntico. */}
                {personals.length > 1 && (
                    <div className={s.personalList}>
                        <div className={s.personalListTitle}>
                            <FiUsers aria-hidden="true" /> Personais no desafio
                        </div>
                        {personals.map((p) => (
                            <div className={s.personalRow} key={p.personal_id}>
                                <div className={s.personalInfo}>
                                    <span className={s.personalName}>
                                        {teamLabel(p)}
                                        {p.is_self && (
                                            <span className={s.selfTag}>
                                                Você
                                            </span>
                                        )}
                                    </span>
                                    <span className={s.personalMeta}>
                                        {p.role === 'owner'
                                            ? 'Organizador'
                                            : 'Participante'}{' '}
                                        · {PERSONAL_STATUS_LABEL[p.status]}
                                    </span>
                                </div>
                                {owner &&
                                    p.role === 'member' &&
                                    (p.status === 'invited' ||
                                        p.status === 'accepted') && (
                                        <button
                                            className={`${s.btnAction} ${s.btnDanger}`}
                                            onClick={() =>
                                                handleRemovePersonal(c, p)
                                            }
                                            disabled={busy}
                                        >
                                            Remover
                                        </button>
                                    )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Transferência de titularidade */}
                {pendingTransferTo && !iAmTransferTarget && (
                    <div className={s.noticeBox}>
                        <span>
                            Transferência pendente para{' '}
                            <strong>{teamLabel(pendingTransferTo)}</strong>.
                            Nada muda enquanto ele não aceitar.
                        </span>
                        {owner && (
                            <button
                                className={s.btnAction}
                                onClick={() =>
                                    run(
                                        c.id,
                                        'Não foi possível cancelar a transferência.',
                                        () => cancelOwnerTransfer(c.id),
                                    )
                                }
                                disabled={busy}
                            >
                                Cancelar transferência
                            </button>
                        )}
                    </div>
                )}

                {iAmTransferTarget && (
                    <div className={s.noticeBoxStrong}>
                        <span>
                            <strong>{ownerNameOf(c)}</strong> quer transferir a
                            titularidade deste desafio para você. Aceitando,
                            você passa a poder encerrar, excluir e convidar
                            outros personais — e{' '}
                            <strong>
                                {ownerNameOf(c)} continua no desafio como
                                participante
                            </strong>
                            , com os alunos dele.
                        </span>
                        <div className={s.cardActions}>
                            <button
                                className={s.btnPrimary}
                                onClick={() =>
                                    run(
                                        c.id,
                                        'Não foi possível aceitar a transferência.',
                                        () => acceptOwnerTransfer(c.id),
                                        true,
                                    )
                                }
                                disabled={busy}
                            >
                                Aceitar titularidade
                            </button>
                            <button
                                className={s.btnAction}
                                onClick={() =>
                                    run(
                                        c.id,
                                        'Não foi possível recusar a transferência.',
                                        () => declineOwnerTransfer(c.id),
                                    )
                                }
                                disabled={busy}
                            >
                                Recusar
                            </button>
                        </div>
                    </div>
                )}

                <div className={s.cardActions}>
                    <button
                        className={s.btnAction}
                        onClick={() => toggleExpand(c)}
                    >
                        {expandedId === c.id ? 'Ocultar mural' : 'Ver mural'}
                    </button>

                    {c.status === 'active' && (
                        <button
                            className={s.btnAction}
                            onClick={() => openInvite(c)}
                        >
                            <FiUserPlus /> Convidar mais alunos
                        </button>
                    )}

                    {/* Só o organizador convida personal, muda modo, encerra,
                        exclui e transfere. Membro sai e renomeia a equipe. */}
                    {owner && c.status === 'active' && (
                        <button
                            className={s.btnAction}
                            onClick={() => setPersonalInviteTarget(c)}
                        >
                            <FiMail /> Convidar outro personal
                        </button>
                    )}

                    {owner && c.status === 'active' && !hasStarted(c) && (
                        <button
                            className={s.btnAction}
                            onClick={() => openModeEditor(c)}
                        >
                            Modalidade
                        </button>
                    )}

                    {personals.length > 1 && (
                        <button
                            className={s.btnAction}
                            onClick={() => openRename(c)}
                            disabled={busy}
                        >
                            Renomear minha equipe
                        </button>
                    )}

                    {owner &&
                        c.status === 'active' &&
                        transferable.length > 0 &&
                        !c.pending_owner_transfer_to && (
                            <span className={s.transferInline}>
                                <select
                                    className={s.select}
                                    aria-label="Personal que receberá a titularidade"
                                    value={transferPick[c.id] ?? ''}
                                    onChange={(e) =>
                                        setTransferPick((prev) => ({
                                            ...prev,
                                            [c.id]: e.target.value,
                                        }))
                                    }
                                >
                                    <option value="">
                                        Transferir titularidade para…
                                    </option>
                                    {transferable.map((p) => (
                                        <option
                                            key={p.personal_id}
                                            value={p.personal_id}
                                        >
                                            {teamLabel(p)}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    className={s.btnAction}
                                    onClick={() => handleOfferTransfer(c)}
                                    disabled={busy || !transferPick[c.id]}
                                >
                                    Oferecer
                                </button>
                            </span>
                        )}

                    {owner && c.status === 'active' && (
                        <button
                            className={s.btnAction}
                            onClick={() => handleEnd(c)}
                            disabled={busy}
                        >
                            Encerrar desafio
                        </button>
                    )}

                    {owner && (
                        <button
                            className={`${s.btnAction} ${s.btnDanger}`}
                            onClick={() => handleDelete(c)}
                            disabled={busy}
                        >
                            Excluir
                        </button>
                    )}

                    {!owner && c.status === 'active' && (
                        <button
                            className={`${s.btnAction} ${s.btnDanger}`}
                            onClick={() => handleLeave(c)}
                            disabled={busy}
                        >
                            Sair do desafio
                        </button>
                    )}
                </div>

                {expandedId === c.id && (
                    <div className={s.participants}>
                        {mode === 'collaborative' && lb?.collaborative && (
                            <StudentChallengeGoalProgress
                                progress={lb.collaborative}
                                teams={lb.teams}
                                entries={lb.entries}
                                loading={leaderboardLoading === c.id}
                                finished={c.status === 'finished'}
                            />
                        )}

                        {mode === 'teams' && lb?.teams && (
                            <>
                                <div className={s.blockTitle}>
                                    Quadro de equipes
                                </div>
                                <StudentChallengeTeamLeaderboard
                                    teams={lb.teams}
                                    loading={leaderboardLoading === c.id}
                                    finished={c.status === 'finished'}
                                />
                            </>
                        )}

                        {mode !== 'individual' && (
                            <div className={s.blockTitle}>
                                Mural de constância
                            </div>
                        )}
                        <StudentChallengeLeaderboard
                            entries={lb?.entries ?? []}
                            loading={leaderboardLoading === c.id}
                        />

                        {myParticipants.length > 0 && (
                            <>
                                <div className={s.blockTitle}>
                                    Meus alunos neste desafio
                                </div>
                                {myParticipants.map((p) => (
                                    <div className={s.pRow} key={p.student_id}>
                                        <div className={s.pInfo}>
                                            <div className={s.pName}>
                                                {p.name}
                                            </div>
                                            <div className={s.pContact}>
                                                {p.status === 'active'
                                                    ? 'Participando'
                                                    : p.status === 'invited'
                                                      ? 'Convite pendente'
                                                      : p.status === 'declined'
                                                        ? 'Recusou'
                                                        : 'Saiu'}
                                            </div>
                                        </div>
                                        {(p.status === 'active' ||
                                            p.status === 'invited') && (
                                            <div className={s.pActions}>
                                                <button
                                                    className={`${s.btnAction} ${s.btnDanger}`}
                                                    onClick={() =>
                                                        handleRemoveStudent(
                                                            c,
                                                            p.student_id,
                                                            p.name,
                                                        )
                                                    }
                                                    disabled={busy}
                                                >
                                                    Remover
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <>
            <div className={s.toolbar} style={{ marginBottom: 16 }}>
                <h2 className={s.cardName}>Desafios entre alunos</h2>
                <button
                    className={s.btnPrimary}
                    onClick={() => setShowForm((v) => !v)}
                >
                    + Novo desafio
                </button>
            </div>

            {actionError && (
                <div className={s.errorMsg} style={{ marginBottom: 16 }}>
                    {actionError}
                </div>
            )}

            {personalInvites.length > 0 && (
                <section style={{ marginBottom: 16 }}>
                    <div className={s.blockTitle}>
                        Convites de outros personais
                    </div>
                    <div className={s.list}>
                        {personalInvites.map((c) => (
                            <div className={s.inviteCard} key={c.id}>
                                <div>
                                    <div className={s.cardName}>{c.name}</div>
                                    <div className={s.cardMeta}>
                                        {ownerNameOf(c)} convidou você ·{' '}
                                        {fmt(c.start_date)} → {fmt(c.end_date)}
                                    </div>
                                    <div className={s.cardMeta}>
                                        Aceitando, você inscreve apenas os seus
                                        alunos. Eles verão — e serão vistos por
                                        — alunos das outras carteiras, e cada um
                                        precisa consentir com isso.
                                    </div>
                                </div>
                                <div className={s.cardActions}>
                                    <button
                                        className={s.btnPrimary}
                                        onClick={() =>
                                            run(
                                                c.id,
                                                'Não foi possível aceitar o convite.',
                                                () => acceptPersonalInvite(c.id),
                                                true,
                                            )
                                        }
                                        disabled={busyId === c.id}
                                    >
                                        Aceitar convite
                                    </button>
                                    <button
                                        className={s.btnAction}
                                        onClick={() =>
                                            run(
                                                c.id,
                                                'Não foi possível recusar o convite.',
                                                () =>
                                                    declinePersonalInvite(c.id),
                                                true,
                                            )
                                        }
                                        disabled={busyId === c.id}
                                    >
                                        Recusar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {showForm && (
                <form
                    className={s.formCard}
                    onSubmit={handleCreate}
                    style={{ marginBottom: 16 }}
                >
                    <div className={s.form}>
                        {formError && (
                            <div className={s.errorMsg}>{formError}</div>
                        )}
                        <div>
                            <label className={s.label}>Nome do desafio</label>
                            <input
                                className={s.input}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex: Desafio de constância — Setembro"
                                required
                            />
                        </div>
                        <div>
                            <label className={s.label}>
                                Descrição (opcional)
                            </label>
                            <textarea
                                className={s.textarea}
                                value={description}
                                onChange={(e) =>
                                    setDescription(e.target.value)
                                }
                                placeholder="Regras, prêmio, o que motivou o desafio…"
                            />
                        </div>
                        <div className={s.formRow}>
                            <div>
                                <label className={s.label}>Início</label>
                                <input
                                    className={s.input}
                                    type="date"
                                    value={startDate}
                                    onChange={(e) =>
                                        setStartDate(e.target.value)
                                    }
                                    required
                                />
                            </div>
                            <div>
                                <label className={s.label}>Fim</label>
                                <input
                                    className={s.input}
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className={s.label}>Modalidade</label>
                            <div className={s.modePick}>
                                {(
                                    [
                                        'individual',
                                        'teams',
                                        'collaborative',
                                    ] as StudentChallengeMode[]
                                ).map((m) => (
                                    <label className={s.modeOption} key={m}>
                                        <input
                                            type="radio"
                                            name="student-challenge-mode"
                                            value={m}
                                            checked={createMode === m}
                                            onChange={() => setCreateMode(m)}
                                        />
                                        <span>
                                            <span className={s.modeName}>
                                                {MODE_LABEL[m]}
                                            </span>
                                            <span className={s.modeHint}>
                                                {MODE_HINT[m]}
                                            </span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                            {createMode !== 'individual' && (
                                <p className={s.cardMeta}>
                                    A modalidade só pode ser alterada enquanto o
                                    desafio não começar.
                                </p>
                            )}
                        </div>

                        {createMode === 'collaborative' && (
                            <div>
                                <label className={s.label}>
                                    Meta do grupo (dias de treino somados)
                                </label>
                                <div className={s.goalRow}>
                                    <input
                                        className={s.input}
                                        type="number"
                                        min={1}
                                        inputMode="numeric"
                                        value={createGoal}
                                        onChange={(e) =>
                                            setCreateGoal(e.target.value)
                                        }
                                        placeholder="Ex: 180"
                                    />
                                    <button
                                        type="button"
                                        className={s.btnAction}
                                        onClick={() =>
                                            setCreateGoal(
                                                String(createGoalSuggestion),
                                            )
                                        }
                                    >
                                        Usar sugestão ({createGoalSuggestion})
                                    </button>
                                </div>
                                <p className={s.cardMeta}>
                                    A sugestão é metade dos dias da janela para
                                    cada participante previsto. É só um ponto de
                                    partida — o número que vale é o que você
                                    escolher, e ele não muda sozinho se entrar
                                    mais aluno depois.
                                </p>
                            </div>
                        )}

                        <div>
                            <label className={s.label}>
                                Convidar já ao criar (opcional)
                            </label>
                            {activeStudents.length === 0 ? (
                                <p className={s.cardMeta}>
                                    Nenhum aluno ativo vinculado ainda.
                                </p>
                            ) : (
                                <div className={s.studentPickList}>
                                    {activeStudents.map((st) => (
                                        <label
                                            key={st.id}
                                            className={s.studentPickItem}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedStudentIds.includes(
                                                    st.id,
                                                )}
                                                onChange={() =>
                                                    toggleStudentSelection(
                                                        st.id,
                                                    )
                                                }
                                            />
                                            {st.name}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className={s.formActions}>
                            <button
                                type="button"
                                className={s.btnGhost}
                                onClick={() => setShowForm(false)}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className={s.btnPrimary}
                                disabled={saving}
                            >
                                {saving ? 'Criando…' : 'Criar desafio'}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {loading ? (
                <div className={s.loading}>Carregando…</div>
            ) : challenges.length === 0 ? (
                <div className={s.empty}>
                    <FiUsers /> Nenhum desafio entre alunos ainda. Crie um para
                    engajar quem já está vinculado a você.
                </div>
            ) : (
                <div className={s.list}>{challenges.map(renderCard)}</div>
            )}

            <Modal
                open={!!inviteTarget}
                onClose={() => setInviteTarget(null)}
                title={
                    inviteTarget
                        ? `Convidar alunos — ${inviteTarget.name}`
                        : ''
                }
                footer={
                    <>
                        <button
                            className={s.btnGhost}
                            onClick={() => setInviteTarget(null)}
                        >
                            Cancelar
                        </button>
                        <button
                            className={s.btnPrimary}
                            onClick={submitInvite}
                            disabled={
                                inviteSaving || inviteSelection.length === 0
                            }
                        >
                            {inviteSaving ? 'Convidando…' : 'Convidar'}
                        </button>
                    </>
                }
            >
                {inviteTarget &&
                    (activeStudents.filter(
                        (st) => !invitedIdsFor(inviteTarget).has(st.id),
                    ).length === 0 ? (
                        <p className={s.cardMeta}>
                            Todos os alunos ativos já foram convidados para
                            este desafio.
                        </p>
                    ) : (
                        <div className={s.studentPickList}>
                            {activeStudents
                                .filter(
                                    (st) =>
                                        !invitedIdsFor(inviteTarget).has(
                                            st.id,
                                        ),
                                )
                                .map((st) => (
                                    <label
                                        key={st.id}
                                        className={s.studentPickItem}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={inviteSelection.includes(
                                                st.id,
                                            )}
                                            onChange={() =>
                                                toggleInviteSelection(st.id)
                                            }
                                        />
                                        {st.name}
                                    </label>
                                ))}
                        </div>
                    ))}
            </Modal>

            <PersonalInviteModal
                open={!!personalInviteTarget}
                challenge={personalInviteTarget}
                onClose={() => setPersonalInviteTarget(null)}
                onInvited={(updated) => {
                    setPersonalInviteTarget(null);
                    replaceChallenge(updated);
                }}
            />

            <Modal
                open={!!renameTarget}
                onClose={() => setRenameTarget(null)}
                title="Renomear minha equipe"
                footer={
                    <>
                        <button
                            className={s.btnGhost}
                            onClick={() => setRenameTarget(null)}
                        >
                            Cancelar
                        </button>
                        <button
                            className={s.btnPrimary}
                            onClick={submitRename}
                        >
                            Salvar
                        </button>
                    </>
                }
            >
                <p className={s.cardMeta} style={{ marginBottom: 12 }}>
                    O apelido aparece no quadro de equipes para todo mundo.
                    Deixando em branco, usamos o seu nome.
                </p>
                <label className={s.label} htmlFor="team-name-input">
                    Apelido da equipe
                </label>
                <input
                    id="team-name-input"
                    className={s.input}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    placeholder="Ex: Time do Léo"
                    maxLength={40}
                />
            </Modal>

            <Modal
                open={!!modeTarget}
                onClose={() => setModeTarget(null)}
                title="Modalidade do desafio"
                footer={
                    <>
                        <button
                            className={s.btnGhost}
                            onClick={() => setModeTarget(null)}
                        >
                            Cancelar
                        </button>
                        <button className={s.btnPrimary} onClick={submitMode}>
                            Salvar
                        </button>
                    </>
                }
            >
                <p className={s.cardMeta} style={{ marginBottom: 12 }}>
                    Depois que o desafio começar, a modalidade e a meta ficam
                    travadas — mudar a regra no meio do jogo não é justo com
                    quem já está pontuando.
                </p>
                <div className={s.modePick}>
                    {(
                        [
                            'individual',
                            'teams',
                            'collaborative',
                        ] as StudentChallengeMode[]
                    ).map((m) => (
                        <label className={s.modeOption} key={m}>
                            <input
                                type="radio"
                                name="student-challenge-mode-edit"
                                value={m}
                                checked={modeValue === m}
                                onChange={() => setModeValue(m)}
                            />
                            <span>
                                <span className={s.modeName}>
                                    {MODE_LABEL[m]}
                                </span>
                                <span className={s.modeHint}>
                                    {MODE_HINT[m]}
                                </span>
                            </span>
                        </label>
                    ))}
                </div>

                {modeValue === 'collaborative' && modeTarget && (
                    <div style={{ marginTop: 12 }}>
                        <label className={s.label} htmlFor="mode-goal-input">
                            Meta do grupo (dias de treino somados)
                        </label>
                        <div className={s.goalRow}>
                            <input
                                id="mode-goal-input"
                                className={s.input}
                                type="number"
                                min={1}
                                inputMode="numeric"
                                value={modeGoal}
                                onChange={(e) => setModeGoal(e.target.value)}
                                placeholder="Ex: 180"
                            />
                            <button
                                type="button"
                                className={s.btnAction}
                                onClick={() =>
                                    setModeGoal(
                                        String(
                                            suggestCollaborativeGoal(
                                                activeParticipantCount(
                                                    modeTarget,
                                                ) ||
                                                    participantsCount(
                                                        modeTarget,
                                                    ) ||
                                                    1,
                                                windowDaysBetween(
                                                    modeTarget.start_date,
                                                    modeTarget.end_date,
                                                ),
                                            ),
                                        ),
                                    )
                                }
                            >
                                Usar sugestão
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
}
