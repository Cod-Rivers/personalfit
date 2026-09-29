'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import FollowUpPage from '@/components/templates/FollowUpPage';
import WorkoutReportView from '@/components/organism/WorkoutReportView';
import { useToast } from '@/components/system/Toast';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { getUser } from '@/libs/session';
import type { WorkoutReport } from '@/libs/workoutReport';
import { getReport, markReportReviewed } from '@/libs/workoutReportService';

export default function WorkoutReportPage() {
    const { id } = useParams<{ id: string }>();
    const { checking } = useAuthGuard({ allowedRoles: ['personal'] });
    const { showError, ToastSlot } = useToast();
    const [report, setReport] = useState<WorkoutReport | null>(null);
    const [error, setError] = useState<string | null>(null);
    const isPro = getUser()?.plan_type === 'pro';

    useEffect(() => {
        if (checking || !id) return;
        let alive = true;
        (async () => {
            try {
                let r = await getReport(id);
                // Abrir é ler: a primeira abertura marca como lido.
                if (r.review_state === 'new' && (r.status === 'generated' || r.status === 'numbers_only')) {
                    r = await markReportReviewed(id).catch(() => r);
                }
                if (alive) setReport(r);
            } catch {
                if (alive) setError('Relatório não encontrado.');
            }
        })();
        return () => {
            alive = false;
        };
    }, [checking, id]);

    if (checking) return null;

    return (
        <FollowUpPage
            title="Relatório de acompanhamento"
            backHref={
                !report
                    ? '/personal/relatorios'
                    : report.period_kind === 'on_demand'
                      ? `/personal/aluno/${report.student_id}/feedback`
                      : `/personal/relatorios?period=${report.period_key}`
            }
        >
            {error && <p>{error}</p>}
            {!report && !error && <p>Carregando…</p>}
            {report && <WorkoutReportView report={report} isPro={isPro} onChange={setReport} onError={showError} />}
            {ToastSlot}
        </FollowUpPage>
    );
}
