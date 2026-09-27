'use client';

import { useEffect, useState } from 'react';
import { FiActivity, FiClipboard } from 'react-icons/fi';
import EvolutionTimeline from './EvolutionTimeline';
import TrainingZonesCalculator from './TrainingZonesCalculator';
import LoadHistoryPanel from './load-history/LoadHistoryPanel';
import s from './EvolutionTabs.module.css';

type Tab = 'avaliacoes' | 'cargas';

const STORAGE_KEY = 'vf_evolution_tab';

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'avaliacoes', label: 'Avaliações', icon: <FiClipboard aria-hidden="true" /> },
    { id: 'cargas', label: 'Cargas', icon: <FiActivity aria-hidden="true" /> },
];

function isTab(v: unknown): v is Tab {
    return v === 'avaliacoes' || v === 'cargas';
}

/**
 * As duas metades da Evolução: a avaliação física (medidas, fotos, zonas de
 * FC) e o histórico de carga dos exercícios. `studentId` presente = visão do
 * personal; ausente = o próprio aluno.
 *
 * A aba só monta na primeira visita e depois fica montada (escondida): trocar
 * de aba não refaz as buscas nem perde o que o usuário filtrou. A escolha fica
 * lembrada no aparelho; `?aba=cargas` na URL abre direto nela.
 */
export default function EvolutionTabs({ studentId }: { studentId?: string }) {
    const [tab, setTab] = useState<Tab>('avaliacoes');
    const [visited, setVisited] = useState<Set<Tab>>(() => new Set(['avaliacoes']));

    useEffect(() => {
        let initial: Tab | null = null;
        try {
            const fromUrl = new URLSearchParams(window.location.search).get('aba');
            if (isTab(fromUrl)) initial = fromUrl;
            else {
                const stored = window.localStorage.getItem(STORAGE_KEY);
                if (isTab(stored)) initial = stored;
            }
        } catch {
            /* armazenamento bloqueado: fica na aba padrão */
        }
        if (initial) {
            setTab(initial);
            setVisited((prev) => new Set(prev).add(initial as Tab));
        }
    }, []);

    const select = (next: Tab) => {
        setTab(next);
        setVisited((prev) => new Set(prev).add(next));
        try {
            window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
            /* melhor-esforço */
        }
    };

    return (
        <>
            <div className={s.tabs} role="tablist" aria-label="Evolução">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        role="tab"
                        id={`evolution-tab-${t.id}`}
                        aria-selected={tab === t.id}
                        aria-controls={`evolution-panel-${t.id}`}
                        className={s.tab}
                        onClick={() => select(t.id)}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            <div
                role="tabpanel"
                id="evolution-panel-avaliacoes"
                aria-labelledby="evolution-tab-avaliacoes"
                hidden={tab !== 'avaliacoes'}
            >
                {visited.has('avaliacoes') && (
                    <>
                        <TrainingZonesCalculator studentId={studentId} />
                        <EvolutionTimeline studentId={studentId} />
                    </>
                )}
            </div>
            <div
                role="tabpanel"
                id="evolution-panel-cargas"
                aria-labelledby="evolution-tab-cargas"
                hidden={tab !== 'cargas'}
            >
                {visited.has('cargas') && <LoadHistoryPanel studentId={studentId} />}
            </div>
        </>
    );
}
