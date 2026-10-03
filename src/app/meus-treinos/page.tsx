// src/app/meus-treinos/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import TrainingCard from '../../components/features/TrainingCard';
import { useRouter } from 'next/navigation';
import { useAds } from '@/context/AdContext';
import { useBranding } from '@/context/BrandingContext';
import AdBanner from '@/components/molecules/AdBanner';
import GoogleAdSlot from '@/components/molecules/GoogleAdSlot';
import PersonalTrainerCard from '@/components/molecules/PersonalTrainerCard';
import PlanRatingCard from '@/components/features/PlanRatingCard';
import { getUser } from '@/libs/session';
import { TrainingCardProps } from '../../components/features/types';
import {
    labelPartsOf,
    showsWeekday,
    trainingDisplayLabel,
} from '@/libs/trainingLabel';

interface MesoGroup {
    mesoId: string;
    mesoName: string;
    phase: string;
    durationWeeks: number;
    trainings: TrainingCardProps[];
}
import {
    getMyPlannings,
    getMyMacrocycle,
    deleteMyPlanning,
    macroToGanttPhases,
    MacrocycleResponse,
} from '@/libs/planningService';
import {
    currentCycle,
    currentMicrocycleOf,
    logsOfWeek,
    performedAt,
    weeklyProgress,
    weeklyTargetDays,
    type WeeklyProgress,
} from '@/libs/currentWeek';
import OverdueBlockNotice from '@/components/features/OverdueBlockNotice';
import { isOverdueBlockError } from '@/libs/overdueBlock';
import GamificationBanner from '../../components/features/GamificationBanner';
import {
    cacheMacrocycleForOffline,
    getAllOfflineMacrocycles,
    getOfflineMacrocycle,
    pruneOfflineMacrocycles,
} from '@/libs/offline/downloadManager';
import PersonalAnamnesisPendingBanner from '@/components/features/PersonalAnamnesisPendingBanner';
import ScrollHint from '@/components/atoms/ScrollHint';
import GanttPlanning, {
    GanttPhase,
} from '../../components/features/GanttPlanningResponsive';
import { useGanttToggle } from '@/hooks/useGanttToggle';
import {
    FiCalendar,
    FiCheckCircle,
    FiClipboard,
    FiEdit2,
    FiWifiOff,
} from 'react-icons/fi';
import styles from '../../components/features/TrainingProtocolList.module.css';
import { summarizeTraining } from '@/libs/trainingSummary';
import TrainingPdfUploadModal from '@/components/features/TrainingPdfUploadModal';
import { getPlans } from '@/libs/paymentService';
import { usePlanStoreHidden } from '@/hooks/usePlanStoreHidden';
import CurrentPlanCard from './_components/CurrentPlanCard';
import PlanShortcuts from './_components/PlanShortcuts';
import StudentOverflowNotice from './_components/StudentOverflowNotice';
import ownStyles from './_components/meusTreinos.module.css';
import {
    getNewWorkoutLogs,
    NewWorkoutLogResponse,
} from '@/libs/workoutLogService';

/**
 * Monta os grupos de treino e enriquece cada card com o status da SEMANA
 * ATUAL de cada mesociclo (busca best-effort — sem log, o card fica sem
 * badge). `studentId` vazio (ex.: dados offline) pula a busca de status.
 *
 * Só contam registros desta semana (logsOfWeek): no plano simples toda
 * semana cai no mesmo microciclo, e sem o filtro o "Concluído" de semanas
 * atrás nunca saía do card.
 */
async function buildMesoGroups(
    detail: MacrocycleResponse,
    studentId: string,
): Promise<{ groups: MesoGroup[]; week: WeeklyProgress | null }> {
    // Mesmas partes (dia, letra/número, nome) que o personal escolheu no
    // plano — ver libs/trainingLabel.ts.
    const labelParts = labelPartsOf(detail);
    const withWeekday = showsWeekday(labelParts);
    const now = new Date();
    const todayWeekday = now.getDay();
    const weekLogs: NewWorkoutLogResponse[] = [];
    let logsLoaded = false;

    const groups = await Promise.all(
        (detail.mesocycles ?? []).map(async (meso) => {
            const logsByRef = new Map<string, NewWorkoutLogResponse>();
            const weekMicro = currentMicrocycleOf(detail, meso, now);
            if (studentId && weekMicro) {
                try {
                    const logs = logsOfWeek(
                        await getNewWorkoutLogs(
                            studentId,
                            detail.id,
                            meso.id,
                            weekMicro.id,
                        ),
                        now,
                    );
                    logsLoaded = true;
                    weekLogs.push(...logs);
                    for (const log of logs) {
                        const existing = logsByRef.get(log.training_ref);
                        if (
                            !existing ||
                            new Date(log.updated_at) >
                                new Date(existing.updated_at)
                        ) {
                            logsByRef.set(log.training_ref, log);
                        }
                    }
                } catch {
                    // status é enriquecimento best-effort; não bloqueia a tela
                }
            }

            return {
                mesoId: meso.id,
                mesoName: meso.name,
                phase: meso.phase,
                durationWeeks: meso.duration_weeks,
                trainings: (meso.trainings ?? []).map((tr, i) => {
                    const summary = summarizeTraining(tr.exercises);
                    const log = logsByRef.get(tr.reference);
                    return {
                        id: tr.id,
                        label: trainingDisplayLabel(tr, i, labelParts),
                        focusLabel: summary.focusLabel,
                        accent: summary.accent,
                        exerciseCount: summary.exerciseCount,
                        seriesCount: summary.seriesCount,
                        estimatedMinutes: summary.estimatedMinutes,
                        status: log?.status,
                        completedDate: log
                            ? performedAt(log)?.toISOString()
                            : undefined,
                        scheduledToday:
                            withWeekday && tr.weekday === todayWeekday,
                    };
                }),
            };
        }),
    );

    // Sem registros carregados (offline, falha) não dá para afirmar
    // "0 de 3 dias" — a linha de progresso some em vez de mentir.
    const target = weeklyTargetDays(detail, currentCycle(detail, now)?.meso);
    const week =
        logsLoaded && target > 0 ? weeklyProgress(weekLogs, target, now) : null;
    return { groups, week };
}

/** Planos "simple" não têm fases reais — não faz sentido mostrar o Gantt. */
function computeGanttPhases(detail: MacrocycleResponse): GanttPhase[] {
    if (detail.planning_mode === 'simple') return [];
    return macroToGanttPhases(detail);
}

export default function MeusTreinosPage() {
    const { currentTopAd, currentBottomAd, canShowAds } = useAds();
    const { branding, personalName } = useBranding();
    const [macrocycles, setMacrocycles] = useState<MacrocycleResponse[]>([]);
    const [selectedMacro, setSelectedMacro] =
        useState<MacrocycleResponse | null>(null);
    const [mesoGroups, setMesoGroups] = useState<MesoGroup[]>([]);
    // Dias treinados nesta semana contra a meta do personal (null = sem
    // registros para contar, ex.: offline).
    const [weekProgress, setWeekProgress] = useState<WeeklyProgress | null>(
        null,
    );
    const [ganttPhases, setGanttPhases] = useState<GanttPhase[]>([]);
    const [userRole, setUserRole] = useState<string>('');
    const [studentId, setStudentId] = useState<string>('');
    const [ganttEnabled, setGanttEnabled] = useGanttToggle(
        'venafit:gantt:meus-treinos',
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Personal pausou o acesso por mensalidade vencida (403
    // student_blocked_overdue): tela própria em vez de "Erro: ...".
    const [overdueBlocked, setOverdueBlocked] = useState(false);
    const [isOfflineData, setIsOfflineData] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [pdfImportOpen, setPdfImportOpen] = useState(false);
    // Aluno com personal não monta nem importa treino (quem prescreve é o
    // personal) — os atalhos de "treinar por conta própria" somem.
    const [hasPersonal, setHasPersonal] = useState(false);
    // Preço do plano avulso da loja, exibido no cartão de venda.
    const [storePrice, setStorePrice] = useState<number | null>(null);
    // Loja escondida para aluno de personal PRO; enquanto não se sabe
    // (null), também fica escondida — ver usePlanStoreHidden.
    const showStore = usePlanStoreHidden(hasPersonal) === false;
    const router = useRouter();

    useEffect(() => {
        setIsMounted(true);
        setHasPersonal(!!getUser()?.has_personal);
        // Best-effort: sem o preço, o cartão da loja só omite o valor.
        getPlans()
            .then((catalog) => setStorePrice(catalog.library_plan.value))
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!isMounted) return;

        async function fetchData() {
            setLoading(true);
            setError(null);
            try {
                const userString = localStorage.getItem('user');
                if (!userString || !localStorage.getItem('token')) {
                    router.push('/app');
                    return;
                }
                try {
                    const parsed = JSON.parse(userString);
                    setUserRole(parsed.role || '');
                } catch {}

                const macros = await getMyPlannings();
                setMacrocycles(macros);
                // Planos que não vêm mais do servidor (excluídos, ou o do
                // personal bloqueado no fim da espera do plano gratuito)
                // saem também da cópia offline do aparelho.
                void pruneOfflineMacrocycles(macros.map((m) => m.id));

                if (macros.length === 0) {
                    setLoading(false);
                    return;
                }

                const first = macros[0];
                const detail = await getMyMacrocycle(first.id);
                // Guarda os dados do plano (sem mídia) a cada abertura com
                // rede, para que a lista offline não dependa do aluno ter
                // lembrado de tocar em "Baixar para offline" — ver
                // cacheMacrocycleForOffline.
                void cacheMacrocycleForOffline(detail);
                setSelectedMacro(detail);
                setStudentId(detail.student_id ?? '');
                const built = await buildMesoGroups(
                    detail,
                    detail.student_id ?? '',
                );
                setMesoGroups(built.groups);
                setWeekProgress(built.week);
                setGanttPhases(computeGanttPhases(detail));
            } catch (e) {
                // Sem resposta = sem conexão com a API: tentar os planos
                // baixados para offline (IndexedDB) antes de mostrar erro.
                if (axios.isAxiosError(e) && !e.response) {
                    const stored = await getAllOfflineMacrocycles().catch(
                        () => [],
                    );
                    if (stored.length > 0) {
                        setIsOfflineData(true);
                        setMacrocycles(stored.map((s) => s.data));
                        const detail = stored[0].data;
                        setSelectedMacro(detail);
                        setStudentId(detail.student_id ?? '');
                        // Offline: sem rede, então pula a busca de status (studentId '').
                        const built = await buildMesoGroups(detail, '');
                        setMesoGroups(built.groups);
                        setWeekProgress(built.week);
                        setGanttPhases(computeGanttPhases(detail));
                        setLoading(false);
                        return;
                    }
                    setError(
                        'Sem conexão e nenhum plano foi baixado para uso offline. Conecte-se à internet e use o botão de download para salvar seu treino no aparelho.',
                    );
                } else if (isOverdueBlockError(e)) {
                    setOverdueBlocked(true);
                } else {
                    const err = e as Error;
                    setError(
                        `Não foi possível carregar seus treinos: ${err.message}`,
                    );
                }
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [isMounted, router]);

    async function selectMacro(macro: MacrocycleResponse) {
        setLoading(true);
        try {
            const detail = await getMyMacrocycle(macro.id);
            void cacheMacrocycleForOffline(detail);
            setIsOfflineData(false);
            setSelectedMacro(detail);
            setStudentId(detail.student_id ?? '');
            const built = await buildMesoGroups(
                detail,
                detail.student_id ?? '',
            );
            setMesoGroups(built.groups);
            setWeekProgress(built.week);
            setGanttPhases(computeGanttPhases(detail));
        } catch (e) {
            if (axios.isAxiosError(e) && !e.response) {
                const stored = await getOfflineMacrocycle(macro.id).catch(
                    () => undefined,
                );
                if (stored) {
                    setIsOfflineData(true);
                    setSelectedMacro(stored.data);
                    setStudentId(stored.data.student_id ?? '');
                    // Offline: sem rede, então pula a busca de status (studentId '').
                    const built = await buildMesoGroups(stored.data, '');
                    setMesoGroups(built.groups);
                    setWeekProgress(built.week);
                    setGanttPhases(computeGanttPhases(stored.data));
                    setLoading(false);
                    return;
                }
                setError(
                    'Sem conexão e este plano não foi baixado para uso offline.',
                );
            } else if (isOverdueBlockError(e)) {
                setOverdueBlocked(true);
            } else {
                const err = e as Error;
                setError(`Erro ao carregar macrociclo: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    }

    async function handlePdfImportApplied(result: { macrocycleId: string }) {
        setPdfImportOpen(false);
        setLoading(true);
        try {
            const macro = await getMyMacrocycle(result.macrocycleId);
            setMacrocycles((prev) => [
                macro,
                ...prev.filter((m) => m.id !== macro.id),
            ]);
            await selectMacro(macro);
        } catch (e) {
            const err = e as Error;
            setError(`Treino importado, mas houve um erro ao carregá-lo: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }

    async function handleDeleteMacro(macro: MacrocycleResponse) {
        if (
            !window.confirm(
                `Remover o plano "${macro.name || 'Macrociclo'}"? Essa ação não pode ser desfeita.`,
            )
        ) {
            return;
        }

        setDeletingId(macro.id);
        try {
            await deleteMyPlanning(macro.id);
            const remaining = macrocycles.filter((m) => m.id !== macro.id);
            setMacrocycles(remaining);

            if (selectedMacro?.id === macro.id) {
                if (remaining.length > 0) {
                    await selectMacro(remaining[0]);
                } else {
                    setSelectedMacro(null);
                    setMesoGroups([]);
                    setWeekProgress(null);
                    setGanttPhases([]);
                }
            }
        } catch (e) {
            const err = e as Error;
            setError(`Erro ao remover plano: ${err.message}`);
        } finally {
            setDeletingId(null);
        }
    }

    if (!isMounted || loading) {
        return (
            <div
                className="p-6 text-center"
                style={{ color: 'var(--text-primary)' }}
            >
                Carregando seus treinos...
            </div>
        );
    }

    if (overdueBlocked) {
        return (
            <div className="p-6">
                <OverdueBlockNotice what="ao seu treino" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center text-red-600">Erro: {error}</div>
        );
    }

    if (macrocycles.length === 0) {
        return (
            <div className="container mx-auto p-4">
                {/* Aluno recém-vinculado costuma cair aqui antes do primeiro
                    treino — justamente quando o personal pede a anamnese. */}
                <PersonalAnamnesisPendingBanner />
                <StudentOverflowNotice />
                <div className={ownStyles.emptyNotice} role="status">
                    <span className={ownStyles.iconTile}>
                        <FiClipboard size={20} aria-hidden="true" />
                    </span>
                    <div>
                        <p className={ownStyles.emptyTitle}>
                            {hasPersonal
                                ? 'Seu treino está a caminho'
                                : 'Você ainda não tem um treino'}
                        </p>
                        <p className={ownStyles.emptyText}>
                            {hasPersonal
                                ? 'Seu personal está preparando seu plano. Assim que ficar pronto, ele aparece aqui.'
                                : 'Crie o seu, importe uma ficha em PDF ou comece com um plano pronto da loja.'}
                        </p>
                    </div>
                </div>
                <PlanShortcuts
                    hasPersonal={hasPersonal}
                    storePrice={storePrice}
                    showStore={showStore}
                    onImportPdf={() => setPdfImportOpen(true)}
                    showHistory={false}
                />
                <TrainingPdfUploadModal
                    open={pdfImportOpen}
                    role="student"
                    onClose={() => setPdfImportOpen(false)}
                    onApplied={handlePdfImportApplied}
                />
            </div>
        );
    }

    return (
        <>
            <ScrollHint />

            {/* Ad topo */}
            {canShowAds && currentTopAd && (
                <AdBanner ad={currentTopAd} placement="top" />
            )}

            <div
                className="container mx-auto p-4 min-h-screen relative"
                style={
                    canShowAds && currentBottomAd
                        ? { paddingBottom: 140 }
                        : undefined
                }
            >
                <PersonalAnamnesisPendingBanner />
                <StudentOverflowNotice />
                {isOfflineData && (
                    <div
                        className="alert alert-warning py-2 px-3 mb-3 d-flex align-items-center gap-2"
                        style={{ fontSize: '0.85rem' }}
                    >
                        <FiWifiOff size={14} style={{ flexShrink: 0 }} />
                        Exibindo plano salvo offline (sem conexão no
                        momento).
                    </div>
                )}
                {/* Plano em uso + troca de plano: fica no topo para que plano
                    → fase → treinos da semana leiam como uma hierarquia só. */}
                <CurrentPlanCard
                    plans={macrocycles}
                    selected={selectedMacro}
                    personalName={personalName}
                    deletingId={deletingId}
                    onSelect={selectMacro}
                    onDelete={handleDeleteMacro}
                />
                {/* Dias treinados nesta semana contra a meta que o personal
                    definiu na prescrição (ou o número de treinos da fase).
                    Zera na segunda-feira, junto com os "Concluído" dos cards. */}
                {weekProgress && (
                    <div
                        role="status"
                        className="d-flex align-items-center gap-2"
                        style={{
                            margin: '0 5% 12px',
                            padding: '8px 12px',
                            borderRadius: 10,
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            background: 'var(--surface-1)',
                            border: `1px solid ${
                                weekProgress.completed
                                    ? 'var(--mint)'
                                    : 'var(--border-subtle)'
                            }`,
                            color: weekProgress.completed
                                ? 'var(--mint-text)'
                                : 'var(--text-secondary)',
                        }}
                    >
                        {weekProgress.completed ? (
                            <FiCheckCircle size={16} style={{ flexShrink: 0 }} />
                        ) : (
                            <FiCalendar size={16} style={{ flexShrink: 0 }} />
                        )}
                        {weekProgress.completed
                            ? `Semana concluída · ${weekProgress.done} ${
                                  weekProgress.done === 1 ? 'dia' : 'dias'
                              } de treino`
                            : `Esta semana: ${weekProgress.done} de ${
                                  weekProgress.target
                              } ${
                                  weekProgress.target === 1 ? 'dia' : 'dias'
                              } de treino`}
                    </div>
                )}
                {/* Trainings list agrupada por mesociclo — vem primeiro na
                    página para o aluno ver os treinos sem precisar rolar
                    por cards de contexto (personal, gamificação, seletor). */}
                {mesoGroups.length === 0 ? (
                    <p className={styles.noTrainingsMessage}>
                        Nenhum treino encontrado para este macrociclo.
                    </p>
                ) : (
                    mesoGroups.map((group) => (
                        <div
                            key={group.mesoId}
                            style={{ marginBottom: '1.5rem' }}
                        >
                            {/* Cabeçalho do mesociclo */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 10,
                                    marginBottom: 8,
                                    paddingLeft: '5%',
                                    paddingRight: '5%',
                                }}
                            >
                                <div>
                                    <p
                                        style={{
                                            margin: 0,
                                            fontWeight: 700,
                                            fontSize: '0.95rem',
                                            color: 'var(--text-primary)',
                                        }}
                                    >
                                        {group.mesoName}
                                    </p>
                                    <p
                                        style={{
                                            margin: 0,
                                            fontSize: '0.72rem',
                                            color: 'var(--text-muted)',
                                        }}
                                    >
                                        {group.phase && (
                                            <>Fase {group.phase} &middot; </>
                                        )}
                                        {group.durationWeeks} semana
                                        {group.durationWeeks === 1 ? '' : 's'}
                                        {group.trainings.length > 0 && (
                                            <>
                                                {' '}
                                                &middot; {group.trainings.length}{' '}
                                                treino
                                                {group.trainings.length === 1
                                                    ? ''
                                                    : 's'}
                                            </>
                                        )}
                                    </p>
                                </div>
                                {(userRole === 'personal' ||
                                    userRole === 'admin') && (
                                    <Link
                                        href={`/personal/aluno/${studentId}/periodizacao/${selectedMacro?.id}`}
                                        className="d-inline-flex align-items-center gap-1"
                                        style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--amber, #f0a500)',
                                            border: '1px solid var(--amber, #f0a500)',
                                            borderRadius: 6,
                                            padding: '3px 10px',
                                            textDecoration: 'none',
                                            whiteSpace: 'nowrap',
                                            fontWeight: 600,
                                        }}
                                    >
                                        <FiEdit2 size={12} />
                                        Editar fase
                                    </Link>
                                )}
                            </div>
                            {/* Cards de treino */}
                            <div role="list">
                                {group.trainings.map((training) => (
                                    <Link
                                        href={`/meus-treinos/${selectedMacro?.id}/${training.id}`}
                                        key={training.id}
                                        className={styles.cardLink}
                                    >
                                        <div className={styles.protocolButton}>
                                            <TrainingCard
                                                id={training.id}
                                                label={training.label}
                                                focusLabel={training.focusLabel}
                                                accent={training.accent}
                                                exerciseCount={
                                                    training.exerciseCount
                                                }
                                                seriesCount={
                                                    training.seriesCount
                                                }
                                                estimatedMinutes={
                                                    training.estimatedMinutes
                                                }
                                                // Sem estes três, o enriquecimento
                                                // feito por buildMesoGroups (que
                                                // ainda paga um getNewWorkoutLogs
                                                // por mesociclo) era descartado no
                                                // caminho: o card nunca exibia
                                                // "Hoje"/"Concluído" e o aluno não
                                                // tinha como saber qual treino era
                                                // o da vez sem abrir um por um.
                                                status={training.status}
                                                completedDate={
                                                    training.completedDate
                                                }
                                                scheduledToday={
                                                    training.scheduledToday
                                                }
                                            />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))
                )}

                {/* Avaliação do plano: vai para o feedback do personal e,
                    em plano de modelo da biblioteca, para o ranking do admin. */}
                {selectedMacro && (
                    <PlanRatingCard
                        planId={selectedMacro.id}
                        category={selectedMacro.category}
                        hasPersonal={!!getUser()?.has_personal}
                    />
                )}

                {/* Card do Personal Trainer */}
                <PersonalTrainerCard
                    branding={branding}
                    trainerName={personalName ?? undefined}
                />
                {/* Gamificação: streak + conquistas (some se ainda não treinou) */}
                <GamificationBanner />

                {/* Atalhos por intenção: histórico, treinar por conta
                    própria (só sem personal) e loja de planos. */}
                <PlanShortcuts
                    hasPersonal={hasPersonal}
                    storePrice={storePrice}
                    showStore={showStore}
                    onImportPdf={() => setPdfImportOpen(true)}
                />
                <TrainingPdfUploadModal
                    open={pdfImportOpen}
                    role="student"
                    onClose={() => setPdfImportOpen(false)}
                    onApplied={handlePdfImportApplied}
                />
                {/* Gantt chart (read-only) — só faz sentido mostrar (com o
                    toggle de ocultar) quando o personal já definiu datas */}
                {ganttPhases.length > 0 && (
                    <div
                        className={styles.protocolButton}
                        style={{ marginBottom: '1.2rem' }}
                    >
                        <GanttPlanning
                            phases={ganttPhases}
                            enabled={ganttEnabled}
                            onToggle={setGanttEnabled}
                            readOnly
                        />
                    </div>
                )}

                <div className="py-3">
                    <GoogleAdSlot />
                </div>
            </div>

            {/* Ad rodapé sticky */}
            {canShowAds && currentBottomAd && (
                <AdBanner ad={currentBottomAd} placement="bottom" />
            )}
        </>
    );
}
