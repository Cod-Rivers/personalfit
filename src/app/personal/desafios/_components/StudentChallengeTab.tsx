'use client';

import { useEffect, useState } from 'react';
import { FiUsers } from 'react-icons/fi';
import { usePersonalStudents } from '@/hooks/usePersonalStudents';
import Modal from '@/components/system/Modal';
import StudentChallengeLeaderboard from '@/components/features/StudentChallengeLeaderboard';
import {
    createStudentChallenge,
    listStudentChallenges,
    inviteStudents,
    endStudentChallenge,
    deleteStudentChallenge,
    getLeaderboard,
    type StudentChallenge,
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

/** Aba "Entre Alunos" da tela /personal/desafios — desafio competitivo entre
 * alunos já vinculados, em paralelo à aba de captação de leads (que fica
 * intocada). */
export default function StudentChallengeTab() {
    const { students } = usePersonalStudents(true);
    const activeStudents = students.filter((st) => st.link_status === 'active');

    const [challenges, setChallenges] = useState<StudentChallenge[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [leaderboards, setLeaderboards] = useState<
        Record<string, Leaderboard>
    >({});
    const [leaderboardLoading, setLeaderboardLoading] = useState<string | null>(
        null,
    );

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState(todayISO());
    const [endDate, setEndDate] = useState(todayISO(21));
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const [inviteTarget, setInviteTarget] = useState<StudentChallenge | null>(
        null,
    );
    const [inviteSelection, setInviteSelection] = useState<string[]>([]);
    const [inviteSaving, setInviteSaving] = useState(false);

    async function load() {
        try {
            setChallenges(await listStudentChallenges());
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
    }, []);

    function toggleStudentSelection(id: string) {
        setSelectedStudentIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setFormError('');
        if (!name.trim()) {
            setFormError('Informe o nome do desafio.');
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
            });
            setName('');
            setDescription('');
            setSelectedStudentIds([]);
            setShowForm(false);
            await load();
        } catch {
            setFormError('Não foi possível criar o desafio. Verifique as datas.');
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
        await endStudentChallenge(challenge.id);
        await load();
    }

    async function handleDelete(challenge: StudentChallenge) {
        if (
            !confirm(
                `Excluir o desafio "${challenge.name}"? Essa ação não pode ser desfeita.`,
            )
        )
            return;
        await deleteStudentChallenge(challenge.id);
        await load();
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
            await inviteStudents(inviteTarget.id, inviteSelection);
            setInviteTarget(null);
            setInviteSelection([]);
            await load();
        } catch {
            /* mantém o modal aberto — o personal pode tentar de novo */
        } finally {
            setInviteSaving(false);
        }
    }

    // Alunos já convidados/participantes daquele desafio, pra não oferecer de
    // novo no modal de convite.
    function invitedIdsFor(challenge: StudentChallenge): Set<string> {
        return new Set(challenge.participants.map((p) => p.student_id));
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
                <div className={s.list}>
                    {challenges.map((c) => (
                        <div className={s.card} key={c.id}>
                            <div className={s.cardHead}>
                                <div>
                                    <div className={s.cardName}>{c.name}</div>
                                    <div className={s.cardMeta}>
                                        {fmt(c.start_date)} →{' '}
                                        {fmt(c.end_date)}
                                    </div>
                                </div>
                                <span className={s.statusBadge}>
                                    {c.status === 'active'
                                        ? 'Ativo'
                                        : 'Encerrado'}
                                </span>
                            </div>

                            {c.description && (
                                <p
                                    className={s.cardMeta}
                                    style={{ marginTop: 8 }}
                                >
                                    {c.description}
                                </p>
                            )}

                            <div className={s.stats}>
                                <span className={s.stat}>
                                    <b>{activeParticipantCount(c)}</b> ativos
                                </span>
                                <span className={s.stat}>
                                    <b>{c.participants.length}</b> convidados
                                    no total
                                </span>
                            </div>

                            <div className={s.cardActions}>
                                <button
                                    className={s.btnAction}
                                    onClick={() => toggleExpand(c)}
                                >
                                    {expandedId === c.id
                                        ? 'Ocultar mural'
                                        : 'Ver mural'}
                                </button>
                                {c.status === 'active' && (
                                    <>
                                        <button
                                            className={s.btnAction}
                                            onClick={() => openInvite(c)}
                                        >
                                            Convidar mais alunos
                                        </button>
                                        <button
                                            className={s.btnAction}
                                            onClick={() => handleEnd(c)}
                                        >
                                            Encerrar desafio
                                        </button>
                                    </>
                                )}
                                <button
                                    className={`${s.btnAction} ${s.btnDanger}`}
                                    onClick={() => handleDelete(c)}
                                >
                                    Excluir
                                </button>
                            </div>

                            {expandedId === c.id && (
                                <div className={s.participants}>
                                    <StudentChallengeLeaderboard
                                        entries={
                                            leaderboards[c.id]?.entries ?? []
                                        }
                                        loading={leaderboardLoading === c.id}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
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
        </>
    );
}
