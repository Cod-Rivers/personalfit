'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiFileText, FiMessageCircle, FiZap } from 'react-icons/fi';
import Button from '@/components/atoms/Button';
import WorkoutCommentCard from '@/components/organism/WorkoutCommentCard';
import ReportStudentRow from '@/components/molecules/ReportStudentRow';
import { useToast } from '@/components/system/Toast';
import { getUser } from '@/libs/session';
import { listStudentComments, markCommentRead, type WorkoutComment } from '@/libs/workoutCommentService';
import { createOnDemandReport, getStudentReports } from '@/libs/workoutReportService';
import type { WorkoutReport } from '@/libs/workoutReport';
import styles from './styles.module.css';

const VISIBLE_COMMENTS = 5;

/**
 * Acompanhamento de um aluno na ficha dele: comentários dos últimos 60 dias,
 * a linha do tempo dos relatórios e o relatório sob demanda (D12).
 */
export default function StudentFollowUpSection({ studentId }: { studentId: string }) {
    const router = useRouter();
    const { showError, ToastSlot } = useToast();
    const [comments, setComments] = useState<WorkoutComment[] | null>(null);
    const [reports, setReports] = useState<WorkoutReport[] | null>(null);
    const [showAll, setShowAll] = useState(false);
    const [generating, setGenerating] = useState(false);
    const isPro = getUser()?.plan_type === 'pro';

    useEffect(() => {
        let alive = true;
        listStudentComments(studentId)
            .then((c) => alive && setComments(c))
            .catch(() => alive && setComments([]));
        getStudentReports(studentId)
            .then((r) => alive && setReports(r))
            .catch(() => alive && setReports([]));
        return () => {
            alive = false;
        };
    }, [studentId]);

    const onRead = useCallback(async (id: string) => {
        setComments((prev) => prev?.map((c) => (c.id === id ? { ...c, read_at: new Date().toISOString() } : c)) ?? prev);
        try {
            await markCommentRead(id);
        } catch {
            /* o próximo carregamento corrige */
        }
    }, []);

    const generate = async () => {
        setGenerating(true);
        try {
            const rep = await createOnDemandReport(studentId);
            router.push(`/personal/relatorios/${rep.id}`);
        } catch (err: unknown) {
            const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
            showError(
                code === 'workout_report_on_demand_limit'
                    ? 'Você já usou os relatórios sob demanda deste mês.'
                    : 'Não foi possível gerar o relatório agora.',
            );
        } finally {
            setGenerating(false);
        }
    };

    const visible = showAll ? comments ?? [] : (comments ?? []).slice(0, VISIBLE_COMMENTS);

    return (
        <>
            <section className={styles.section} aria-labelledby="student-comments-title">
                <div className={styles.head}>
                    <h2 id="student-comments-title" className={styles.title}>
                        <FiMessageCircle aria-hidden /> Comentários (últimos 60 dias)
                    </h2>
                    <Link href={`/personal/comentarios?aluno=${studentId}`} className={styles.link}>
                        Abrir na caixa
                    </Link>
                </div>
                {comments === null && <p className={styles.muted}>Carregando…</p>}
                {comments?.length === 0 && (
                    <p className={styles.empty}>Nenhum comentário nos últimos 60 dias.</p>
                )}
                <div className={styles.list}>
                    {visible.map((c) => (
                        <WorkoutCommentCard
                            key={c.id}
                            comment={c}
                            showStudent={false}
                            onRead={onRead}
                            onUpdated={(u) => setComments((prev) => prev?.map((x) => (x.id === u.id ? u : x)) ?? prev)}
                            onError={showError}
                        />
                    ))}
                </div>
                {!showAll && (comments?.length ?? 0) > VISIBLE_COMMENTS && (
                    <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>
                        Ver todos ({comments?.length})
                    </Button>
                )}
            </section>

            <section className={styles.section} aria-labelledby="student-reports-title">
                <div className={styles.head}>
                    <h2 id="student-reports-title" className={styles.title}>
                        <FiFileText aria-hidden /> Relatórios de acompanhamento
                    </h2>
                    {isPro ? (
                        <Button size="sm" variant="secondary" leftIcon={<FiZap />} isLoading={generating} onClick={() => void generate()}>
                            Gerar relatório agora
                        </Button>
                    ) : (
                        <Link href="/personal/relatorios" className={styles.link}>
                            Recurso PRO
                        </Link>
                    )}
                </div>
                {isPro && (
                    <p className={styles.muted}>
                        “Gerar agora” lê os últimos 30 dias deste aluno, útil antes de uma reavaliação.
                    </p>
                )}
                {reports === null && <p className={styles.muted}>Carregando…</p>}
                {reports?.length === 0 && (
                    <p className={styles.empty}>
                        Nenhum relatório ainda. O do mês sai a partir do dia 3 do mês seguinte.
                    </p>
                )}
                <div className={styles.list}>
                    {reports?.map((r) => (
                        <ReportStudentRow
                            key={r.id}
                            report={{ ...r, student_name: r.period_kind === 'on_demand' ? `Sob demanda · ${r.period_label}` : r.period_label }}
                            onOpen={() => router.push(`/personal/relatorios/${r.id}`)}
                        />
                    ))}
                </div>
            </section>
            {ToastSlot}
        </>
    );
}
