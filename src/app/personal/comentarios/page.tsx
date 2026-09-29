'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiFileText, FiMessageCircle } from 'react-icons/fi';
import FollowUpPage from '@/components/templates/FollowUpPage';
import WorkoutCommentCard from '@/components/organism/WorkoutCommentCard';
import CountBadge from '@/components/atoms/CountBadge';
import Button from '@/components/atoms/Button';
import { useToast } from '@/components/system/Toast';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import {
    getUnreadCommentCounts,
    listPersonalComments,
    markCommentRead,
    type WorkoutComment,
    type WorkoutCommentStatusFilter,
} from '@/libs/workoutCommentService';
import s from './comentarios.module.css';

const TABS: { value: WorkoutCommentStatusFilter; label: string }[] = [
    { value: 'unread', label: 'Não lidos' },
    { value: 'pain', label: 'Dor' },
    { value: 'all', label: 'Todos (60 dias)' },
];

function CommentsInbox() {
    const params = useSearchParams();
    const highlightId = params.get('c');
    const { checking } = useAuthGuard({ allowedRoles: ['personal'] });
    const { showError, ToastSlot } = useToast();

    // Vindo de uma notificação, abre em "Todos" para o comentário aparecer
    // mesmo que já tenha sido lido em outro aparelho.
    const [tab, setTab] = useState<WorkoutCommentStatusFilter>(highlightId ? 'all' : 'unread');
    const [studentId, setStudentId] = useState<string>(params.get('aluno') ?? '');
    const [items, setItems] = useState<WorkoutComment[]>([]);
    const [cursor, setCursor] = useState<string | undefined>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [unread, setUnread] = useState(0);
    const [students, setStudents] = useState<Map<string, string>>(new Map());

    const load = useCallback(
        async (before?: string) => {
            setLoading(true);
            setError(null);
            try {
                const res = await listPersonalComments({ status: tab, studentId: studentId || undefined, before });
                setItems((prev) => (before ? [...prev, ...res.items] : res.items));
                setCursor(res.next_cursor);
                setStudents((prev) => {
                    const next = new Map(prev);
                    res.items.forEach((c) => c.student_name && next.set(c.student_id, c.student_name));
                    return next;
                });
            } catch {
                setError('Não foi possível carregar os comentários.');
            } finally {
                setLoading(false);
            }
        },
        [tab, studentId],
    );

    const refreshUnread = useCallback(async () => {
        try {
            setUnread((await getUnreadCommentCounts()).total);
        } catch {
            /* selo é conveniência */
        }
    }, []);

    useEffect(() => {
        if (checking) return;
        void load();
        void refreshUnread();
    }, [checking, load, refreshUnread]);

    const onRead = useCallback(
        async (id: string) => {
            setItems((prev) => prev.map((c) => (c.id === id ? { ...c, read_at: new Date().toISOString() } : c)));
            setUnread((n) => Math.max(0, n - 1));
            try {
                await markCommentRead(id);
            } catch {
                /* o próximo carregamento corrige */
            }
        },
        [],
    );

    const studentOptions = useMemo(
        () => [...students.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')),
        [students],
    );

    if (checking) return null;

    return (
        <FollowUpPage
            title="Comentários"
            icon={<FiMessageCircle aria-hidden />}
            subtitle="O que seus alunos disseram no fim do treino. Cada comentário fica guardado por 60 dias."
            help={{ text: 'Comentários que os alunos deixam ao concluir o treino, com o resumo do treino junto. Reaja ou responda: o aluno recebe o aviso.', href: '/ajuda#comentarios-personal' }}
            backHref="/personal"
            actions={
                <Link href="/personal/relatorios" className={s.reportsLink}>
                    <FiFileText aria-hidden /> Relatórios
                </Link>
            }
        >
            <div className={s.toolbar}>
                <div className={s.tabs} role="tablist" aria-label="Filtro">
                    {TABS.map((t) => (
                        <button
                            key={t.value}
                            type="button"
                            role="tab"
                            aria-selected={tab === t.value}
                            className={tab === t.value ? s.tabActive : s.tab}
                            onClick={() => setTab(t.value)}
                        >
                            {t.label}
                            {t.value === 'unread' && <CountBadge count={unread} label={`${unread} não lidos`} />}
                        </button>
                    ))}
                </div>
                {studentOptions.length > 0 && (
                    <label className={s.filter}>
                        <span>Aluno</span>
                        <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                            <option value="">Todos</option>
                            {studentOptions.map(([id, name]) => (
                                <option key={id} value={id}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
            </div>

            {error && <p className={s.empty}>{error}</p>}
            {!error && !loading && items.length === 0 && (
                <p className={s.empty}>
                    {tab === 'unread'
                        ? 'Nenhum comentário novo. Os alunos comentam na tela de concluir o treino.'
                        : tab === 'pain'
                          ? 'Nenhum relato de dor nos últimos 60 dias.'
                          : 'Nenhum comentário nos últimos 60 dias.'}
                </p>
            )}

            <div className={s.list}>
                {items.map((c) => (
                    <WorkoutCommentCard
                        key={c.id}
                        comment={c}
                        highlighted={c.id === highlightId}
                        onRead={onRead}
                        onUpdated={(u) => setItems((prev) => prev.map((x) => (x.id === u.id ? u : x)))}
                        onError={showError}
                    />
                ))}
            </div>

            {cursor && (
                <Button variant="secondary" onClick={() => void load(cursor)} isLoading={loading}>
                    Carregar mais
                </Button>
            )}
            {loading && items.length === 0 && <p className={s.empty}>Carregando…</p>}
            {ToastSlot}
        </FollowUpPage>
    );
}

export default function PersonalCommentsPage() {
    return (
        <Suspense fallback={null}>
            <CommentsInbox />
        </Suspense>
    );
}
