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
    MacrocycleResponse,
} from '@/libs/planningService';
import DownloadOfflineButton from '../../components/features/DownloadOfflineButton';
import {
    getAllOfflineMacrocycles,
    getOfflineMacrocycle,
} from '@/libs/offline/downloadManager';
import SyncPendingBadge from '../../components/features/SyncPendingBadge';
import GanttPlanning from '../../components/features/GanttPlanning';
import { GanttPhase } from '../../components/features/GanttPlanning';
import { BsClipboardData } from 'react-icons/bs';
import { FiChevronDown } from 'react-icons/fi';
import styles from '../../components/features/TrainingProtocolList.module.css';

function buildMesoGroups(detail: MacrocycleResponse): MesoGroup[] {
    const isSimple = detail.planning_mode === 'simple';
    const isNumbered = detail.simple_day_label === 'number';
    return (detail.mesocycles ?? []).map((meso) => ({
        mesoId: meso.id,
        mesoName: meso.name,
        phase: meso.phase,
        durationWeeks: meso.duration_weeks,
        trainings: (meso.trainings ?? []).map((tr, i) => ({
            id: tr.id,
            label: isNumbered
                ? `Treino ${i + 1}`
                : isSimple
                  ? (WEEKDAY_LABELS[tr.weekday ?? -1] ?? 'Sem dia definido')
                  : `Treino ${tr.reference}`,
            phase: isSimple ? undefined : meso.name,
        })),
    }));
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
    const [ganttEnabled, setGanttEnabled] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isOfflineData, setIsOfflineData] = useState(false);
    const [selectorOpen, setSelectorOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);
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
                setMesoGroups(buildMesoGroups(detail));
                setGanttPhases(
                    macroToGanttPhases(detail, { preferDuration: true }),
                );
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
                        setMesoGroups(buildMesoGroups(detail));
                        setGanttPhases(
                            macroToGanttPhases(detail, {
                                preferDuration: true,
                            }),
                        );
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
            setMesoGroups(buildMesoGroups(detail));
            setGanttPhases(
                macroToGanttPhases(detail, { preferDuration: true }),
            );
        } catch (e) {
            if (axios.isAxiosError(e) && !e.response) {
                const stored = await getOfflineMacrocycle(macro.id).catch(
                    () => undefined,
                );
                if (stored) {
                    setIsOfflineData(true);
                    setSelectedMacro(stored.data);
                    setStudentId(stored.data.student_id ?? '');
                    setMesoGroups(buildMesoGroups(stored.data));
                    setGanttPhases(
                        macroToGanttPhases(stored.data, {
                            preferDuration: true,
                        }),
                    );
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
                <Link
                    href="/meus-treinos/escolher-plano"
                    className="fw-bold text-decoration-none"
                    style={{ color: 'var(--amber)' }}
                >
                    🌟 Escolher um plano estilo famosos
                </Link>
            </div>
        );
    }

    return (
        <>
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
                        className="alert alert-warning py-2 px-3 mb-3"
                        style={{ fontSize: '0.85rem' }}
                    >
                        📴 Exibindo plano salvo offline (sem conexão no
                        momento).
                    </div>
                )}
                {/* Card do Personal Trainer */}
                <PersonalTrainerCard
                    branding={branding}
                    trainerName={personalName ?? undefined}
                />
                {/* Macro selector header */}
                <div className={styles.header}>
                    <BsClipboardData size={20} color="var(--amber)" />
                    <div className="position-relative" ref={dropdownRef}>
                        <button
                            onClick={() => setSelectorOpen((o) => !o)}
                            className="btn btn-link d-flex align-items-center gap-1 fw-bold fs-6 text-decoration-none p-0"
                            style={{
                                color: 'var(--text-primary)',
                                boxShadow: 'none',
                            }}
                            aria-haspopup="listbox"
                            aria-expanded={selectorOpen}
                        >
                            <span>{selectedMacro?.name || 'Meus Treinos'}</span>
                            {macrocycles.length > 1 && (
                                <FiChevronDown
                                    size={16}
                                    style={{
                                        transition: 'transform 0.2s',
                                        transform: selectorOpen
                                            ? 'rotate(180deg)'
                                            : 'rotate(0deg)',
                                    }}
                                />
                            )}
                        </button>

                        {selectorOpen && macrocycles.length > 1 && (
                            <ul
                                role="listbox"
                                className="dropdown-menu show position-absolute"
                                style={{
                                    background: 'var(--surface-1)',
                                    border: '1px solid var(--border-mid)',
                                    minWidth: '180px',
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
                                        {m.category === 'celebrity' && (
                                            <button
                                                type="button"
                                                aria-label={`Remover plano ${m.name}`}
                                                title="Remover este plano"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteMacro(m);
                                                }}
                                                disabled={deletingId === m.id}
                                                className="btn btn-link p-0 me-2"
                                                style={{
                                                    color: 'var(--text-muted)',
                                                    fontSize: '0.9rem',
                                                    lineHeight: 1,
                                                }}
                                            >
                                                {deletingId === m.id
                                                    ? '…'
                                                    : '🗑️'}
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    {selectedMacro?.status === 'active' && (
                        <DownloadOfflineButton macrocycle={selectedMacro} />
                    )}
                    <SyncPendingBadge />
                    <Link
                        href="/meus-treinos/escolher-plano"
                        className="btn btn-link d-flex align-items-center gap-1 fw-bold fs-6 text-decoration-none p-0"
                        style={{ color: 'var(--amber)' }}
                    >
                        🌟 Planos estilo famosos
                    </Link>
                </div>
                {/* Gantt chart (read-only) */}
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
                {/* Trainings list agrupada por mesociclo */}
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
                                        {group.durationWeeks} semana(s) /{' '}
                                        {group.durationWeeks} microciclo(s)
                                    </p>
                                </div>
                                {(userRole === 'personal' ||
                                    userRole === 'admin') && (
                                    <Link
                                        href={`/personal/aluno/${studentId}/periodizacao/${selectedMacro?.id}`}
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
                                        ✏️ Editar fase
                                    </Link>
                                )}
                            </div>
                            {/* Cards de treino */}
                            {group.trainings.map((training) => (
                                <Link
                                    href={`/meus-treinos/${selectedMacro?.id}/${training.id}`}
                                    key={training.id}
                                    passHref
                                >
                                    <div className={styles.protocolButton}>
                                        <TrainingCard
                                            id={training.id}
                                            label={training.label}
                                        />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ))
                )}
                ​
            </div>

            {/* Ad rodapé sticky */}
            {canShowAds && currentBottomAd && (
                <AdBanner ad={currentBottomAd} placement="bottom" />
            )}
        </>
    );
}
