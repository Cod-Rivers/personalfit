'use client';

import React, { useId, useState } from 'react';
import { FiCheck, FiChevronDown, FiX } from 'react-icons/fi';

import s from './personalPlanLadder.module.css';

/**
 * Escada de planos do personal (Gratuito → Plus → PRO), para quem está
 * escolhendo o que assinar.
 *
 * Dois blocos:
 * - Cartões do Plus e do PRO, que SÃO a escolha (radio): tocar escolhe.
 *   Antes a escolha era um botão "Quero o PRO" embaixo de uma tabela; na
 *   página do PRO ele navegava para a mesma URL e não fazia nada.
 * - Comparação dos três planos, recurso por recurso. O Plus só faz sentido ao
 *   lado do que ele NÃO tem: sem a coluna do PRO, quem precisa de IA ou agenda
 *   assina o Plus e descobre a falta depois, e isso gera pedido de reembolso,
 *   não upgrade. A tabela cabe na largura do celular (colunas estreitas de
 *   ícone). A anterior tinha largura mínima de 32rem e rolava de lado sem
 *   nada indicar que havia mais planos à direita.
 *
 * Os preços vêm do backend (GET /plans): o servidor é a fonte do valor, e
 * eles podem mudar por variável de ambiente sem deploy do front.
 */

export type LadderPlan = 'free' | 'plus' | 'pro';

interface PersonalPlanLadderProps {
    /** Preço mensal do Plus (de GET /plans). */
    plusPrice?: number;
    /** Preço mensal do PRO (de GET /plans). */
    proPrice?: number;
    /** Menor preço por mês do PRO entre os ciclos (semestral/anual), para o
     *  "ou a partir de". Omitido quando não é menor que o mensal. */
    proFromMonthly?: number;
    /** Plano escolhido agora: recebe o destaque. */
    selected?: LadderPlan;
    /** Plano que a conta JÁ tem, para marcar "seu plano atual". */
    currentPlan?: LadderPlan;
    /** Chamado ao tocar num cartão. Ausente = só leitura. */
    onSelect?: (plan: LadderPlan) => void;
}

/** Uma linha da tabela: o que cada plano inclui. `true` = incluído,
 *  `false` = não incluído, string = incluído com ressalva. */
const FEATURES: { label: string; free: boolean | string; plus: boolean | string; pro: boolean | string }[] = [
    { label: 'Alunos', free: 'Até 3', plus: '∞', pro: '∞' },
    { label: 'Prescrição de treinos', free: true, plus: true, pro: true },
    { label: 'Registro e histórico do aluno', free: true, plus: true, pro: true },
    { label: 'Vídeo por link (YouTube e Vimeo)', free: true, plus: true, pro: true },
    { label: 'Financeiro: mensalidade, lembretes e bloqueio', free: false, plus: true, pro: true },
    { label: 'Painel de retenção completo', free: false, plus: true, pro: true },
    { label: 'Sua marca e vitrine no app do aluno', free: false, plus: true, pro: true },
    { label: 'App sem anúncios (você e seus alunos)', free: false, plus: true, pro: true },
    { label: 'Upload dos seus próprios vídeos', free: false, plus: false, pro: true },
    { label: 'Substituição de exercícios por IA', free: false, plus: false, pro: true },
    { label: 'Importar treino de PDF com IA', free: false, plus: false, pro: true },
    { label: 'Relatórios de acompanhamento com IA', free: false, plus: false, pro: true },
    { label: 'Agenda de aulas e presença', free: false, plus: false, pro: true },
    { label: 'Plano alimentar do aluno', free: false, plus: false, pro: true },
    { label: 'Fotos na avaliação e evolução de carga', free: false, plus: false, pro: true },
];

/** O essencial de cada plano pago, no cartão. A lista completa fica na
 *  comparação logo abaixo. */
const CARDS: { plan: 'plus' | 'pro'; name: string; tagline: string; highlights: string[] }[] = [
    {
        plan: 'plus',
        name: 'Plus',
        tagline: 'Para crescer a carteira de alunos',
        highlights: [
            'Alunos ilimitados',
            'Financeiro com cobrança automática',
            'Sua marca e vitrine no app do aluno',
            'Sem anúncios para você e seus alunos',
        ],
    },
    {
        plan: 'pro',
        name: 'PRO',
        tagline: 'Tudo do Plus, e mais:',
        highlights: [
            'IA: troca de exercício, treino de PDF e relatórios',
            'Agenda de aulas e presença',
            'Plano alimentar do aluno',
            'Upload dos seus vídeos e fotos na avaliação',
        ],
    },
];

function formatBRL(value?: number): string {
    if (value === undefined) return '—';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function Cell({ value }: { value: boolean | string }) {
    if (value === true) {
        return (
            <span className={s.yes}>
                <FiCheck aria-hidden="true" />
                <span className="visually-hidden">Incluído</span>
            </span>
        );
    }
    if (value === false) {
        return (
            <span className={s.no}>
                <FiX aria-hidden="true" />
                <span className="visually-hidden">Não incluído</span>
            </span>
        );
    }
    return (
        <span className={s.note}>
            {value === '∞' ? (
                <>
                    <span aria-hidden="true">∞</span>
                    <span className="visually-hidden">Ilimitados</span>
                </>
            ) : (
                value
            )}
        </span>
    );
}

export default function PersonalPlanLadder({
    plusPrice,
    proPrice,
    proFromMonthly,
    selected,
    currentPlan,
    onSelect,
}: PersonalPlanLadderProps) {
    const [compareOpen, setCompareOpen] = useState(false);
    const compareId = useId();
    const prices: Record<'plus' | 'pro', number | undefined> = { plus: plusPrice, pro: proPrice };

    return (
        <section className={s.wrapper} aria-label="Planos do personal">
            <div className={s.cards} role="radiogroup" aria-label="Escolha o plano">
                {CARDS.map((c) => {
                    const isSelected = selected === c.plan;
                    const isCurrent = currentPlan === c.plan;
                    return (
                        <button
                            key={c.plan}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            className={`${s.card} ${isSelected ? s.cardSelected : ''}`}
                            onClick={() => onSelect?.(c.plan)}
                            disabled={!onSelect}
                        >
                            <span className={s.radio} aria-hidden="true">
                                {isSelected && <FiCheck />}
                            </span>
                            <span className={s.cardMain}>
                                <span className={s.cardTop}>
                                    <span className={s.cardName}>{c.name}</span>
                                    {c.plan === 'pro' && (
                                        <span className={s.badgeBest}>Mais completo</span>
                                    )}
                                    {isCurrent && (
                                        <span className={s.badgeCurrent}>Seu plano atual</span>
                                    )}
                                </span>
                                <span className={s.cardPrice}>
                                    <strong>{formatBRL(prices[c.plan])}</strong>
                                    <span> por mês</span>
                                </span>
                                {c.plan === 'pro' && proFromMonthly !== undefined && (
                                    <span className={s.cardFrom}>
                                        ou a partir de {formatBRL(proFromMonthly)} por mês no
                                        semestral ou no anual
                                    </span>
                                )}
                                <span className={s.cardTagline}>{c.tagline}</span>
                                <span className={s.highlights}>
                                    {c.highlights.map((h) => (
                                        <span key={h} className={s.highlight}>
                                            <FiCheck aria-hidden="true" />
                                            {h}
                                        </span>
                                    ))}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>

            <p className={s.freeNote}>
                No <strong>Gratuito</strong> você atende até 3 alunos, sem prazo para acabar.
            </p>

            <button
                type="button"
                className={s.compareToggle}
                aria-expanded={compareOpen}
                aria-controls={compareId}
                onClick={() => setCompareOpen((v) => !v)}
            >
                <span>Comparar os 3 planos, recurso por recurso</span>
                <FiChevronDown
                    aria-hidden="true"
                    className={compareOpen ? s.chevronOpen : s.chevron}
                />
            </button>

            {compareOpen && (
                <table id={compareId} className={s.table}>
                    <caption className="visually-hidden">
                        Comparação entre os planos Gratuito, Plus e PRO do personal
                    </caption>
                    <colgroup>
                        <col />
                        <col className={s.planCol} />
                        <col className={s.planCol} />
                        <col className={s.planCol} />
                    </colgroup>
                    <thead>
                        <tr>
                            <th scope="col" className={s.featureHead}>
                                Recurso
                            </th>
                            {(['free', 'plus', 'pro'] as const).map((p) => (
                                <th
                                    key={p}
                                    scope="col"
                                    className={`${s.planHead} ${selected === p ? s.selected : ''}`}
                                >
                                    {p === 'free' ? 'Grátis' : p === 'plus' ? 'Plus' : 'PRO'}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {FEATURES.map((f) => (
                            <tr key={f.label}>
                                <th scope="row" className={s.featureCell}>
                                    {f.label}
                                </th>
                                <td className={selected === 'free' ? s.selectedCell : undefined}>
                                    <Cell value={f.free} />
                                </td>
                                <td className={selected === 'plus' ? s.selectedCell : undefined}>
                                    <Cell value={f.plus} />
                                </td>
                                <td className={selected === 'pro' ? s.selectedCell : undefined}>
                                    <Cell value={f.pro} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </section>
    );
}
