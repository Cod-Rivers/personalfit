'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiCheck, FiInfo, FiX } from 'react-icons/fi';
import HelpTooltip from '@/components/atoms/HelpTooltip';
import type {
    FlowStep,
    FlowStepId,
    GuideHint,
} from '../lib/flowGuide';
import s from '../builder.module.css';

/** Preferência do aparelho, não do plano: quem já sabe montar treino não
 * precisa ver a dica de novo em cada plano que abrir. */
const HIDDEN_KEY = 'venafit:flowGuideHidden';

function readHidden(): boolean {
    try {
        return localStorage.getItem(HIDDEN_KEY) === '1';
    } catch {
        return false;
    }
}

function writeHidden(hidden: boolean) {
    try {
        if (hidden) localStorage.setItem(HIDDEN_KEY, '1');
        else localStorage.removeItem(HIDDEN_KEY);
    } catch {
        /* sem armazenamento (aba privada, WebView restrito): vale só na sessão */
    }
}

/** Indicador de etapas: onde a pessoa está no fluxo e o que já foi feito.
 * Só indica — não navega: pular para "Treinos" de dentro de um exercício
 * passaria por cima do salvamento por card. */
export function FlowSteps({
    steps,
    current,
    done,
}: {
    steps: FlowStep[];
    current: FlowStepId;
    done: Set<FlowStepId>;
}) {
    return (
        <ol className={s.flowSteps} aria-label="Etapas para montar o treino">
            {steps.map((st, i) => {
                const isCurrent = st.id === current;
                const isDone = done.has(st.id) && !isCurrent;
                return (
                    <li
                        key={st.id}
                        className={
                            isCurrent
                                ? s.flowStepCurrent
                                : isDone
                                  ? s.flowStepDone
                                  : s.flowStep
                        }
                        aria-current={isCurrent ? 'step' : undefined}
                    >
                        <span className={s.flowStepDot} aria-hidden>
                            {isDone ? <FiCheck strokeWidth={3} /> : i + 1}
                        </span>
                        <span className={s.flowStepLabel}>
                            {st.label}
                            {isDone && (
                                <span className="visually-hidden">
                                    {' '}
                                    (feito)
                                </span>
                            )}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}

/**
 * Etapas + a dica da próxima ação. A dica pode ser ocultada (fica lembrado no
 * aparelho) e volta pelo botão "Dicas" ao lado das etapas.
 */
export default function FlowGuide({
    steps,
    current,
    done,
    hint,
    helpHref,
}: {
    steps: FlowStep[];
    current: FlowStepId;
    done: Set<FlowStepId>;
    hint: GuideHint | null;
    helpHref: string;
}) {
    // Começa visível e lê a preferência depois de montar: o localStorage não
    // existe na renderização do servidor.
    const [hidden, setHidden] = useState(false);
    useEffect(() => setHidden(readHidden()), []);

    const toggle = useCallback((next: boolean) => {
        setHidden(next);
        writeHidden(next);
    }, []);

    return (
        <div className={s.flowGuide}>
            <div className={s.flowGuideTop}>
                <FlowSteps steps={steps} current={current} done={done} />
                {hidden && hint && (
                    <button
                        type="button"
                        className={s.flowGuideShow}
                        onClick={() => toggle(false)}
                        aria-label="Mostrar dicas de como montar o treino"
                    >
                        <FiInfo /> Dicas
                    </button>
                )}
            </div>

            {!hidden && hint && (
                <div className={s.flowHint} role="status" key={hint.key}>
                    <FiInfo className={s.flowHintIcon} aria-hidden />
                    <p className={s.flowHintText}>{hint.text}</p>
                    <HelpTooltip
                        text="Passo a passo completo de como montar o treino, com o que cada botão faz."
                        href={helpHref}
                        linkLabel="Abrir o passo a passo"
                        label="Ajuda sobre montar o treino"
                    />
                    <button
                        type="button"
                        className={s.flowHintClose}
                        onClick={() => toggle(true)}
                        aria-label="Ocultar dicas"
                        title="Ocultar dicas"
                    >
                        <FiX />
                    </button>
                </div>
            )}
        </div>
    );
}
