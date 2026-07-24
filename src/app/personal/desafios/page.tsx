'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    listChallenges,
    createChallenge,
    deleteChallenge,
    convertParticipant,
    challengePublicLink,
    type Challenge,
} from '@/libs/challengeService';
import s from './desafios.module.css';

function fmt(d: string) {
    const dt = new Date(d + 'T00:00:00');
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('pt-BR');
}

function todayISO(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
}

export default function DesafiosPage() {
    const router = useRouter();
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);

    // form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState(todayISO());
    const [endDate, setEndDate] = useState(todayISO(21));
    const [maxParticipants, setMaxParticipants] = useState('');
    const [saving, setSaving] = useState(false);

    async function load() {
        try {
            setChallenges(await listChallenges());
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const token = localStorage.getItem('token');
        const stored = localStorage.getItem('user');
        if (!token || !stored) {
            router.replace('/');
            return;
        }
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            await createChallenge({
                name: name.trim(),
                description: description.trim() || undefined,
                start_date: startDate,
                end_date: endDate,
                max_participants: maxParticipants
                    ? Number(maxParticipants)
                    : 0,
            });
            setName('');
            setDescription('');
            setMaxParticipants('');
            setShowForm(false);
            await load();
        } catch {
            alert('Não foi possível criar o desafio. Verifique as datas.');
        } finally {
            setSaving(false);
        }
    }

    async function copyLink(token: string) {
        const link = challengePublicLink(token);
        try {
            await navigator.clipboard.writeText(link);
            alert('Link copiado! Cole no Instagram ou WhatsApp.');
        } catch {
            prompt('Copie o link do desafio:', link);
        }
    }

    async function handleDelete(c: Challenge) {
        if (!confirm(`Excluir o desafio "${c.name}"?`)) return;
        await deleteChallenge(c.id);
        await load();
    }

    async function handleConvert(challengeId: string, participantId: string) {
        const updated = await convertParticipant(challengeId, participantId);
        setChallenges((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c)),
        );
    }

    return (
        <div className={s.page}>
            <div className={s.container}>
                <div className={s.header}>
                    <div>
                        <h1 className={s.headerTitle}>🏆 Grupos de Desafio</h1>
                        <p className={s.headerSub}>
                            Crie um desafio, compartilhe o link no Instagram ou
                            WhatsApp e converta os participantes em alunos.
                        </p>
                    </div>
                    <div className={s.headerActions}>
                        <button
                            className={s.btnBack}
                            onClick={() => router.push('/personal')}
                        >
                            ← Voltar
                        </button>
                        <button
                            className={s.btnPrimary}
                            onClick={() => setShowForm((v) => !v)}
                        >
                            + Novo desafio
                        </button>
                    </div>
                </div>

                {showForm && (
                    <form className={s.formCard} onSubmit={handleCreate}>
                        <div className={s.form}>
                            <div>
                                <label className={s.label}>
                                    Nome do desafio
                                </label>
                                <input
                                    className={s.input}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: Desafio 21 dias de verão"
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
                                    placeholder="O que o participante vai fazer, regras, prêmios…"
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
                                        onChange={(e) =>
                                            setEndDate(e.target.value)
                                        }
                                        required
                                    />
                                </div>
                                <div>
                                    <label className={s.label}>
                                        Vagas (0 = ilimitado)
                                    </label>
                                    <input
                                        className={s.input}
                                        type="number"
                                        min={0}
                                        value={maxParticipants}
                                        onChange={(e) =>
                                            setMaxParticipants(e.target.value)
                                        }
                                        placeholder="0"
                                    />
                                </div>
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
                        Você ainda não criou nenhum desafio. Crie o primeiro e
                        comece a captar leads! 🚀
                    </div>
                ) : (
                    <div className={s.list}>
                        {challenges.map((c) => (
                            <div className={s.card} key={c.id}>
                                <div className={s.cardHead}>
                                    <div>
                                        <div className={s.cardName}>
                                            {c.name}
                                        </div>
                                        <div className={s.cardMeta}>
                                            {fmt(c.start_date)} →{' '}
                                            {fmt(c.end_date)}
                                            {c.max_participants > 0
                                                ? ` · ${c.max_participants} vagas`
                                                : ''}
                                        </div>
                                    </div>
                                    <span className={s.statusBadge}>
                                        {c.status === 'active'
                                            ? 'Ativo'
                                            : c.status === 'finished'
                                              ? 'Encerrado'
                                              : 'Rascunho'}
                                    </span>
                                </div>

                                <div className={s.stats}>
                                    <span className={s.stat}>
                                        <b>{c.participant_count}</b> inscritos
                                    </span>
                                    <span className={s.stat}>
                                        <b>{c.converted_count}</b> convertidos
                                    </span>
                                </div>

                                <div className={s.cardActions}>
                                    <button
                                        className={s.btnAction}
                                        onClick={() => copyLink(c.public_token)}
                                    >
                                        🔗 Copiar link
                                    </button>
                                    <button
                                        className={s.btnAction}
                                        onClick={() =>
                                            setExpanded(
                                                expanded === c.id ? null : c.id,
                                            )
                                        }
                                    >
                                        {expanded === c.id
                                            ? 'Ocultar inscritos'
                                            : `Ver inscritos (${c.participant_count})`}
                                    </button>
                                    <button
                                        className={`${s.btnAction} ${s.btnDanger}`}
                                        onClick={() => handleDelete(c)}
                                    >
                                        Excluir
                                    </button>
                                </div>

                                {expanded === c.id && (
                                    <div className={s.participants}>
                                        {c.participants.length === 0 ? (
                                            <span className={s.pContact}>
                                                Nenhum inscrito ainda.
                                            </span>
                                        ) : (
                                            c.participants.map((p) => (
                                                <div
                                                    className={s.pRow}
                                                    key={p.id}
                                                >
                                                    <div className={s.pInfo}>
                                                        <div
                                                            className={s.pName}
                                                        >
                                                            {p.name}
                                                        </div>
                                                        <div
                                                            className={
                                                                s.pContact
                                                            }
                                                        >
                                                            {p.email}
                                                            {p.phone
                                                                ? ` · ${p.phone}`
                                                                : ''}
                                                        </div>
                                                    </div>
                                                    <div className={s.pActions}>
                                                        {p.phone && (
                                                            <a
                                                                className={
                                                                    s.btnAction
                                                                }
                                                                href={`https://wa.me/${p.phone.replace(/\D/g, '')}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                WhatsApp
                                                            </a>
                                                        )}
                                                        {p.converted ? (
                                                            <span
                                                                className={
                                                                    s.convertedTag
                                                                }
                                                            >
                                                                ✓ Convertido
                                                            </span>
                                                        ) : (
                                                            <button
                                                                className={
                                                                    s.btnAction
                                                                }
                                                                onClick={() =>
                                                                    handleConvert(
                                                                        c.id,
                                                                        p.id,
                                                                    )
                                                                }
                                                            >
                                                                Marcar como aluno
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
