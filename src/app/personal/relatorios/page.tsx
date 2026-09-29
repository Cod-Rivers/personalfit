'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiAlertTriangle, FiFileText, FiLoader, FiLock, FiMessageCircle } from 'react-icons/fi';
import FollowUpPage from '@/components/templates/FollowUpPage';
import ReportStudentRow from '@/components/molecules/ReportStudentRow';
import ChoiceChip from '@/components/atoms/ChoiceChip';
import { useToast } from '@/components/system/Toast';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { REPORT_FREQUENCIES, type ReportFrequency, type ReportPanel } from '@/libs/workoutReport';
import {
    getReportPanel,
    getReportPreview,
    getReportSettings,
    processMyReports,
    setReportFrequency,
    type ReportPreview,
    type ReportSettings,
} from '@/libs/workoutReportService';
import s from './relatorios.module.css';

const MAX_PROCESS_ROUNDS = 6;

function ReportsPanel() {
    const router = useRouter();
    const params = useSearchParams();
    const { checking } = useAuthGuard({ allowedRoles: ['personal'] });
    const { showError, showSuccess, ToastSlot } = useToast();

    const [period, setPeriod] = useState(params.get('period') ?? '');
    const [panel, setPanel] = useState<ReportPanel | null>(null);
    const [settings, setSettings] = useState<ReportSettings | null>(null);
    const [preview, setPreview] = useState<ReportPreview | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const processedOnce = useRef(false);

    const loadPanel = useCallback(async (key: string) => {
        const p = await getReportPanel(key || undefined);
        setPanel(p);
        return p;
    }, []);

    useEffect(() => {
        if (checking) return;
        let alive = true;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const [st] = await Promise.all([getReportSettings(), loadPanel(period)]);
                if (!alive) return;
                setSettings(st);
                if (!st.is_pro) {
                    setPreview(await getReportPreview().catch(() => null));
                }
                // Rede de segurança do agendador: gera, dentro desta própria
                // tela, o que estiver pendente para este personal.
                if (st.is_pro && !processedOnce.current) {
                    processedOnce.current = true;
                    setGenerating(true);
                    let processed = 0;
                    for (let round = 0; round < MAX_PROCESS_ROUNDS; round++) {
                        const res = await processMyReports();
                        processed += res.processed;
                        if (!alive || res.remaining === 0 || res.processed === 0) break;
                    }
                    if (alive && processed > 0) await loadPanel(period);
                }
            } catch {
                if (alive) setError('Não foi possível carregar os relatórios.');
            } finally {
                if (alive) {
                    setLoading(false);
                    setGenerating(false);
                }
            }
        })();
        return () => {
            alive = false;
        };
    }, [checking, period, loadPanel]);

    const changeFrequency = async (frequency: ReportFrequency) => {
        try {
            setSettings(await setReportFrequency(frequency));
            showSuccess('Frequência salva. Vale a partir do próximo fechamento.');
        } catch {
            showError('Não foi possível salvar a frequência.');
        }
    };

    if (checking) return null;
    const isPro = !!settings?.is_pro;
    const items = panel?.items ?? [];

    return (
        <FollowUpPage
            title="Relatórios"
            icon={<FiFileText aria-hidden />}
            subtitle="Relatório de acompanhamento de cada aluno: números do período, leitura por IA dos comentários e as suas decisões."
            help={{
                text: 'Todo mês (ou a cada dois meses) o app junta os números e os comentários de cada aluno. A IA lê os comentários e aponta o que merece atenção, sempre com a evidência. Você registra o que decidiu.',
                href: '/ajuda#relatorio-acompanhamento',
            }}
            backHref="/personal"
            actions={
                <Link href="/personal/comentarios" className={s.headerLink}>
                    <FiMessageCircle aria-hidden /> Comentários
                </Link>
            }
        >
            {settings && (
                <section className={s.settings} aria-labelledby="report-settings-title">
                    <h2 id="report-settings-title" className={s.settingsTitle}>
                        Frequência do relatório
                    </h2>
                    <div className={s.freqs} role="radiogroup" aria-labelledby="report-settings-title">
                        {REPORT_FREQUENCIES.map((f) => (
                            <ChoiceChip
                                key={f.value}
                                selected={settings.frequency === f.value}
                                onToggle={() => void changeFrequency(f.value)}
                            >
                                {f.label}
                            </ChoiceChip>
                        ))}
                    </div>
                    <p className={s.hint}>
                        {REPORT_FREQUENCIES.find((f) => f.value === settings.frequency)?.hint}{' '}
                        {isPro &&
                            settings.on_demand_limit > 0 &&
                            `Sob demanda: ${settings.on_demand_used} de ${settings.on_demand_limit} usados neste mês (na ficha do aluno).`}
                    </p>
                </section>
            )}

            {!isPro && settings && (
                <section className={s.teaser}>
                    <FiLock aria-hidden className={s.teaserIcon} />
                    <div>
                        <h2 className={s.teaserTitle}>O relatório de acompanhamento é do PRO</h2>
                        {preview && preview.comments > 0 ? (
                            <p>
                                Em {preview.period_label}, seus alunos deixaram <strong>{preview.comments}</strong>{' '}
                                comentário(s)
                                {preview.pain_students > 0 && (
                                    <>
                                        {' '}
                                        e <strong>{preview.pain_students}</strong> relataram dor
                                    </>
                                )}
                                . O PRO lê tudo isso por você, ordena a carteira por atenção e guarda as suas decisões.
                            </p>
                        ) : (
                            <p>
                                O PRO lê os comentários do mês, ordena a carteira por quem pede atenção e guarda as suas
                                decisões na ficha de cada aluno.
                            </p>
                        )}
                        <Link href="/pagamento?produto=pro" className={s.teaserCta}>
                            Conhecer o PRO (14 dias grátis)
                        </Link>
                    </div>
                </section>
            )}

            {panel && panel.periods.length > 0 && (
                <div className={s.periodBar}>
                    <label className={s.periodSelect}>
                        <span>Período</span>
                        <select
                            value={panel.period_key}
                            onChange={(e) => {
                                setPeriod(e.target.value);
                                router.replace(`/personal/relatorios?period=${e.target.value}`);
                            }}
                        >
                            {panel.periods.map((p) => (
                                <option key={p.key} value={p.key}>
                                    {p.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <ul className={s.counters}>
                        <li>
                            <strong>{panel.total}</strong> aluno(s)
                        </li>
                        <li className={panel.attention > 0 ? s.attention : undefined}>
                            {panel.attention > 0 && <FiAlertTriangle aria-hidden />} <strong>{panel.attention}</strong> pedem
                            atenção
                        </li>
                        <li>
                            <strong>
                                {panel.decided} de {panel.total - panel.pending}
                            </strong>{' '}
                            decididos
                        </li>
                        {panel.pending > 0 && (
                            <li>
                                <strong>{panel.pending}</strong> gerando
                            </li>
                        )}
                    </ul>
                </div>
            )}

            {generating && (
                <p className={s.status} role="status">
                    <FiLoader aria-hidden className={s.spin} /> Gerando os relatórios pendentes…
                </p>
            )}
            {error && <p className={s.empty}>{error}</p>}
            {!loading && !error && items.length === 0 && (isPro || (panel?.periods.length ?? 0) > 0) && (
                <p className={s.empty}>
                    Ainda não há relatório. O do mês sai a partir do dia 3 do mês seguinte, com os comentários e os treinos
                    de cada aluno. Para ver agora, use “Gerar relatório agora” na ficha do aluno (Feedback).
                </p>
            )}

            <div className={s.list}>
                {items.map((r) => (
                    <ReportStudentRow key={r.id} report={r} onOpen={() => router.push(`/personal/relatorios/${r.id}`)} />
                ))}
            </div>
            {ToastSlot}
        </FollowUpPage>
    );
}

export default function PersonalReportsPage() {
    return (
        <Suspense fallback={null}>
            <ReportsPanel />
        </Suspense>
    );
}
