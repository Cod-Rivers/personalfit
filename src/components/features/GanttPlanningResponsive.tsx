'use client';

import dynamic from 'next/dynamic';
import { useIsMobile } from '@/hooks/useIsMobile';
import GanttPhasesTimeline from './GanttPhasesTimeline';
import type { GanttPlanningProps } from './GanttPlanning';
import styles from './GanttPlanning.module.css';

export type { GanttPhase, GanttAssessment } from './GanttPlanning';

/**
 * dhtmlx-gantt pesa ~600KB e só é necessário quando a linha do tempo
 * realmente é exibida — carregado sob demanda (client-only, sem SSR) para
 * não entrar no bundle inicial de páginas como /meus-treinos.
 */
const GanttPlanningDesktop = dynamic(() => import('./GanttPlanning'), {
    ssr: false,
    loading: () => (
        <div className={styles.wrapper}>
            <div className={styles.placeholder}>Carregando linha do tempo…</div>
        </div>
    ),
});

const MOBILE_BREAKPOINT_PX = 600;

/**
 * Abaixo de 600px, troca o dhtmlx-gantt (denso, feito pra arraste de
 * precisão em tela larga) por uma timeline vertical em CSS puro — muito
 * mais legível num celular e sem os ~600KB do dhtmlx nesse caminho.
 * `onPhaseUpdate`/`readOnly` são ignorados no mobile: ajuste fino de data
 * (arrastar uma fase no Gantt) é tarefa de tela larga, não de toque.
 *
 * Palpite inicial (antes do matchMedia rodar no client) é "mobile" — errar
 * a favor de não buscar o chunk pesado à toa é mais barato do que o inverso.
 */
export default function GanttPlanningResponsive(props: GanttPlanningProps) {
    const isMobile = useIsMobile(MOBILE_BREAKPOINT_PX, true);

    if (isMobile) {
        return (
            <GanttPhasesTimeline
                phases={props.phases}
                enabled={props.enabled}
                onToggle={props.onToggle}
                assessments={props.assessments}
                printTitle={props.printTitle}
            />
        );
    }

    return <GanttPlanningDesktop {...props} />;
}
