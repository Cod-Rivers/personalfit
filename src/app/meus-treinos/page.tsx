// src/app/meus-treinos/page.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import TrainingCard from '../../components/features/TrainingCard';
import { useRouter } from 'next/navigation';
import { useAds } from '@/context/AdContext';
import { useBranding } from '@/context/BrandingContext';
import AdBanner from '@/components/molecules/AdBanner';
import GoogleAdSlot from '@/components/molecules/GoogleAdSlot';
import PersonalTrainerCard from '@/components/molecules/PersonalTrainerCard';
import { TrainingCardProps } from '../../components/features/types';

// Dia da semana (0=domingo..6=sábado), mesma convenção usada no modo simples de periodização.
const WEEKDAY_LABELS: Record<number, string> = {
    0: 'Domingo',
    1: 'Segunda',
    2: 'Terça',
    3: 'Quarta',
    4: 'Quinta',
    5: 'Sexta',
    6: 'Sábado',
};

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
    pickActiveMicrocycle,
    MacrocycleResponse,
} from '@/libs/planningService';
import DownloadOfflineButton from '../../components/features/DownloadOfflineButton';
import GamificationBanner from '../../components/features/GamificationBanner';
import {
    getAllOfflineMacrocycles,
    getOfflineMacrocycle,
} from '@/libs/offline/downloadManager';
import SyncPendingBadge from '../../components/features/SyncPendingBadge';
import ScrollHint from '@/components/atoms/ScrollHint';
import GanttPlanning, {
    GanttPhase,
} from '../../components/features/GanttPlanningResponsive';
import { useGanttToggle } from '@/hooks/useGanttToggle';
import {
    FiChevronDown,
    FiStar,
    FiEdit2,
    FiTrash2,
    FiWifiOff,
    FiFileText,
} from 'react-icons/fi';
import styles from '../../components/features/TrainingProtocolList.module.css';
import { summarizeTraining } from '@/libs/trainingSummary';
import TrainingPdfUploadModal from '@/components/features/TrainingPdfUploadModal';
import {
    getNewWorkoutLogs,
    NewWorkoutLogResponse,
} from '@/libs/workoutLogService';

/**
 * Monta os grupos de treino e enriquece cada card com o status do microciclo
 * ativo de cada mesociclo (busca best-effort — sem log, o card fica sem badge).
 * `studentId` vazio (ex.: dados offline) pula a busca de status.
 */
async function buildMesoGroups(
    detail: MacrocycleResponse,
    studentId: string,
): Promise<MesoGroup[]> {
    const isSimple = detail.planning_mode === 'simple';
    const isNumbered = detail.simple_day_label === 'number';
    const todayWeekday = new Date().getDay();

    return Promise.all(
        (detail.mesocycles ?? []).map(async (meso) => {
            const logsByRef = new Map<string, NewWorkoutLogResponse>();
            const activeMicro = pickActiveMicrocycle(meso.microcycles);
            if (studentId && activeMicro) {
                try {
                    const logs = await getNewWorkoutLogs(
                        studentId,
                        detail.id,
                        meso.id,
                        activeMicro.id,
                    );
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
                        label: isNumbered
                            ? `Treino ${i + 1}`
                            : isSimple
                              ? (WEEKDAY_LABELS[tr.weekday ?? -1] ??
                                'Sem dia definido')
                              : `Treino ${tr.reference}`,
                        focusLabel: summary.focusLabel,
                        accent: summary.accent,
                        exerciseCount: summary.exerciseCount,
                        seriesCount: summary.seriesCount,
                        estimatedMinutes: summary.estimatedMinutes,
                        status: log?.status,
                        completedDate: log?.completed_date,
                        scheduledToday:
                            isSimple &&
                            !isNumbered &&
                            tr.weekday === todayWeekday,
                    };
                }),
            };
        }),
    );
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
    const [ganttPhases, setGanttPhases] = useState<GanttPhase[]>([]);
    const [userRole, setUserRole] = useState<string>('');
    const [studentId, setStudentId] = useState<string>('');
    const [ganttEnabled, setGanttEnabled] = useGanttToggle(
        'venafit:gantt:meus-treinos',
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isOfflineData, setIsOfflineData] = useState(false);
    const [selectorOpen, setSelectorOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [pdfImportOpen, setPdfImportOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node)
            ) {
                setSelectorOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
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

                if (macros.length === 0) {
                    setLoading(false);
                    return;
                }

                const first = macros[0];
                const detail = await getMyMacrocycle(first.id);
                setSelectedMacro(detail);
                setStudentId(detail.student_id ?? '');
                setMesoGroups(
                    await buildMesoGroups(detail, detail.student_id ?? ''),
                );
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
                        setMesoGroups(await buildMesoGroups(detail, ''));
                        setGanttPhases(computeGanttPhases(detail));
                        setLoading(false);
                        return;
                    }
                    setError(
                        'Sem conexão e nenhum plano foi baixado para uso offline. Conecte-se à internet e use o botão de download para salvar seu treino no aparelho.',
                    );
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
        setSelectorOpen(false);
        setLoading(true);
        try {
            const detail = await getMyMacrocycle(macro.id);
            setIsOfflineData(false);
            setSelectedMacro(detail);
            setStudentId(detail.student_id ?? '');
            setMesoGroups(
                await buildMesoGroups(detail, detail.student_id ?? ''),
            );
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
                    setMesoGroups(await buildMesoGroups(stored.data, ''));
                    setGanttPhases(computeGanttPhases(stored.data));
                    setLoading(false);
                    return;
                }
                setError(
                    'Sem conexão e este plano não foi baixado para uso offline.',
                );
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

    if (error) {
        return (
            <div className="p-6 text-center text-red-600">Erro: {error}</div>
        );
    }

    if (macrocycles.length === 0) {
        return (
            <div
                className="p-6 text-center"
                style={{ color: 'var(--text-secondary)' }}
            >
                <p>Nenhum treino disponível para você no momento.</p>
                <div
                    className="d-flex flex-column align-items-center gap-2 mt-2"
                >
                    <Link
                        href="/meus-treinos/escolher-plano"
                        className="fw-bold text-decoration-none d-inline-flex align-items-center gap-1"
                        style={{ color: 'var(--amber)' }}
                    >
                        <FiStar size={14} />
                        Escolher um plano estilo famosos
                    </Link>
                    <button
                        type="button"
                        onClick={() => setPdfImportOpen(true)}
                        className="fw-bold text-decoration-none d-inline-flex align-items-center gap-1 btn btn-link p-0"
                        style={{ color: 'var(--mint-text, #2ecc71)' }}
                    >
                        <FiFileText size={14} />
                        Importar treino de PDF
                    </button>
                </div>
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
                                        {group.phase} &middot;{' '}
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
                                            />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))
                )}

                {/* Card do Personal Trainer */}
                <PersonalTrainerCard
                    branding={branding}
                    trainerName={personalName ?? undefined}
                />
                {/* Gamificação: streak + conquistas (some se ainda não treinou) */}
                <GamificationBanner />

                {/* Seletor de plano + atalhos rápidos, agrupados num único
                    cartão para não competir em peso visual com o card do
                    personal acima. */}
                <div
                    style={{
                        background: 'var(--surface-1)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 12,
                        padding: '2px 14px',
                        marginBottom: '1.2rem',
                    }}
                >
                    <div
                        className="position-relative d-flex align-items-center gap-2"
                        ref={dropdownRef}
                        style={{
                            padding: '10px 0',
                            borderBottom: '1px solid var(--border-subtle)',
                        }}
                    >
                        <span
                            aria-hidden="true"
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: 2,
                                background: 'var(--amber)',
                                flexShrink: 0,
                            }}
                        />
                        <button
                            onClick={() => setSelectorOpen((o) => !o)}
                            className="btn btn-link d-flex align-items-center gap-1 fw-bold fs-6 text-decoration-none p-0 flex-grow-1"
                            style={{
                                color: 'var(--text-primary)',
                                boxShadow: 'none',
                                textAlign: 'left',
                            }}
                            aria-haspopup="listbox"
                            aria-expanded={selectorOpen}
                        >
                            <span className="flex-grow-1">
                                {selectedMacro?.name || 'Meus Treinos'}
                            </span>
                            {macrocycles.length > 1 && (
                                <FiChevronDown
                                    size={16}
                                    style={{
                                        transition: 'transform 0.2s',
                                        transform: selectorOpen
                                            ? 'rotate(180deg)'
                                            : 'rotate(0deg)',
                                        flexShrink: 0,
                                    }}
                                />
                            )}
                        </button>
                        <div
                            className="d-flex align-items-center gap-2"
                            style={{ flexShrink: 0 }}
                        >
                            {selectedMacro?.status === 'active' && (
                                <DownloadOfflineButton
                                    macrocycle={selectedMacro}
                                />
                            )}
                            <SyncPendingBadge />
                        </div>

                        {selectorOpen && macrocycles.length > 1 && (
                            <ul
                                role="listbox"
                                className="dropdown-menu show position-absolute"
                                style={{
                                    background: 'var(--surface-1)',
                                    border: '1px solid var(--border-mid)',
                                    minWidth: '180px',
                                    top: '100%',
                                    left: 0,
                                    zIndex: 50,
                                }}
                            >
                                {macrocycles.map((m) => (
                                    <li
                                        key={m.id}
                                        className="d-flex align-items-center"
                                    >
                                        <button
                                            role="option"
                                            aria-selected={
                                                m.id === selectedMacro?.id
                                            }
                                            onClick={() => selectMacro(m)}
                                            className="dropdown-item flex-grow-1"
                                            style={{
                                                background: 'transparent',
                                                color:
                                                    m.id === selectedMacro?.id
                                                        ? 'var(--mint)'
                                                        : 'var(--text-primary)',
                                                fontWeight:
                                                    m.id === selectedMacro?.id
                                                        ? 700
                                                        : 400,
                                            }}
                                            onMouseEnter={(e) =>
                                                (e.currentTarget.style.background =
                                                    'var(--surface-2)')
                                            }
                                            onMouseLeave={(e) =>
                                                (e.currentTarget.style.background =
                                                    'transparent')
                                            }
                                        >
                                            {m.name || 'Macrociclo'}
                                        </button>
                                        {(m.category === 'celebrity' ||
                                            m.category === 'imported_pdf') && (
                                            <button
                                                type="button"
                                                aria-label={`Remover plano ${m.name}`}
                                                title="Remover este plano"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteMacro(m);
                                                }}
                                                disabled={deletingId === m.id}
                                                className="btn btn-link p-0 me-2 d-flex align-items-center"
                                                style={{
                                                    color: 'var(--text-muted)',
                                                    lineHeight: 1,
                                                }}
                                            >
                                                {deletingId === m.id ? (
                                                    '…'
                                                ) : (
                                                    <FiTrash2 size={14} />
                                                )}
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <Link
                        href="/meus-treinos/historico"
                        className="d-flex align-items-center gap-2 text-decoration-none"
                        style={{
                            padding: '10px 0',
                            borderBottom: '1px solid var(--border-subtle)',
                        }}
                    >
                        <span
                            aria-hidden="true"
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: 2,
                                background: 'var(--mint)',
                                flexShrink: 0,
                            }}
                        />
                        <span
                            style={{
                                fontSize: '0.87rem',
                                fontWeight: 600,
                                color: 'var(--mint-text)',
                            }}
                        >
                            Ver histórico completo
                        </span>
                    </Link>
                    <Link
                        href="/meus-treinos/escolher-plano"
                        className="d-flex align-items-center gap-2 text-decoration-none"
                        style={{ padding: '10px 0' }}
                    >
                        <span
                            aria-hidden="true"
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: 2,
                                background: 'var(--violet)',
                                flexShrink: 0,
                            }}
                        />
                        <span
                            style={{
                                fontSize: '0.87rem',
                                fontWeight: 600,
                                color: 'var(--amber)',
                            }}
                        >
                            Planos estilo famosos
                        </span>
                    </Link>
                    <button
                        type="button"
                        onClick={() => setPdfImportOpen(true)}
                        className="d-flex align-items-center gap-2 text-decoration-none btn btn-link p-0 w-100"
                        style={{ padding: '10px 0' }}
                    >
                        <span
                            aria-hidden="true"
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: 2,
                                background: 'var(--mint)',
                                flexShrink: 0,
                            }}
                        />
                        <span
                            style={{
                                fontSize: '0.87rem',
                                fontWeight: 600,
                                color: 'var(--mint-text, #2ecc71)',
                            }}
                        >
                            Importar treino de PDF
                        </span>
                    </button>
                    <TrainingPdfUploadModal
                        open={pdfImportOpen}
                        role="student"
                        onClose={() => setPdfImportOpen(false)}
                        onApplied={handlePdfImportApplied}
                    />
                </div>
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
