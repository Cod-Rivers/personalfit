'use client';

import React from 'react';
import { FiCheck, FiX } from 'react-icons/fi';

import s from './personalPlanLadder.module.css';

/**
 * Escada de planos do personal (Gratuito → Plus → PRO), para quem está
 * escolhendo o que assinar.
 *
 * Por que comparar os três numa tabela, e não só mostrar o plano que a pessoa
 * clicou: o Plus só faz sentido ao lado do que ele NÃO tem. Sem a coluna do
 * PRO, quem precisa de IA ou agenda assina o Plus e descobre a falta depois —
 * o que gera pedido de reembolso, não upgrade.
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
    /** Plano que está sendo comprado agora — recebe o destaque. */
    selected?: LadderPlan;
    /** Plano que a conta JÁ tem, para marcar "seu plano atual". */
    currentPlan?: LadderPlan;
    /** Chamado ao escolher outra coluna. */
    onSelect?: (plan: LadderPlan) => void;
}

/** Uma linha da tabela: o que cada plano inclui. `true` = incluído,
 *  `false` = não incluído, string = incluído com ressalva. */
const FEATURES: { label: string; free: boolean | string; plus: boolean | string; pro: boolean | string }[] = [
    { label: 'Alunos', free: 'Até 3', plus: 'Ilimitados', pro: 'Ilimitados' },
    { label: 'Prescrição de treinos', free: true, plus: true, pro: true },
    { label: 'Registro e histórico do aluno', free: true, plus: true, pro: true },
    { label: 'Financeiro: mensalidade, lembretes e bloqueio', free: false, plus: true, pro: true },
    { label: 'Painel de retenção completo', free: false, plus: true, pro: true },
    { label: 'Sua marca e vitrine no app do aluno', free: false, plus: true, pro: true },
    { label: 'App sem anúncios (você e seus alunos)', free: false, plus: true, pro: true },
    { label: 'Vídeo por link (YouTube e Vimeo)', free: true, plus: true, pro: true },
    { label: 'Upload dos seus próprios vídeos', free: false, plus: false, pro: true },
    { label: 'Substituição de exercícios por IA', free: false, plus: false, pro: true },
    { label: 'Importar treino de PDF com IA', free: false, plus: false, pro: true },
    { label: 'Relatórios de acompanhamento com IA', free: false, plus: false, pro: true },
    { label: 'Agenda de aulas e presença', free: false, plus: false, pro: true },
    { label: 'Plano alimentar do aluno', free: false, plus: false, pro: true },
    { label: 'Fotos na avaliação e evolução de carga', free: false, plus: false, pro: true },
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
    return <span className={s.note}>{value}</span>;
}

export default function PersonalPlanLadder({
    plusPrice,
    proPrice,
    selected,
    currentPlan,
    onSelect,
}: PersonalPlanLadderProps) {
    const columns: { plan: LadderPlan; name: string; price: string; period: string }[] = [
        { plan: 'free', name: 'Gratuito', price: 'R$ 0', period: 'para sempre' },
        { plan: 'plus', name: 'Plus', price: formatBRL(plusPrice), period: 'por mês' },
        { plan: 'pro', name: 'PRO', price: formatBRL(proPrice), period: 'por mês' },
    ];

    return (
        <section className={s.wrapper} aria-labelledby="ladderTitle">
            <h2 id="ladderTitle" className={s.title}>
                Compare os planos
            </h2>

            <div className={s.scroll}>
                <table className={s.table}>
                    <caption className="visually-hidden">
                        Comparação entre os planos Gratuito, Plus e PRO do personal
                    </caption>
                    <thead>
                        <tr>
                            <th scope="col" className={s.featureHead}>
                                Recurso
                            </th>
                            {columns.map((c) => (
                                <th
                                    key={c.plan}
                                    scope="col"
                                    className={`${s.planHead} ${selected === c.plan ? s.selected : ''}`}
                                >
                                    <span className={s.planName}>{c.name}</span>
                                    <span className={s.planPrice}>{c.price}</span>
                                    <span className={s.planPeriod}>{c.period}</span>
                                    {currentPlan === c.plan && (
                                        <span className={s.currentBadge}>Seu plano atual</span>
                                    )}
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
            </div>

            {onSelect && (
                <div className={s.actions}>
                    {columns
                        .filter((c) => c.plan !== 'free')
                        .map((c) => (
                            <button
                                key={c.plan}
                                type="button"
                                className={`btn ${selected === c.plan ? 'btn-gold' : 'btn-outline-secondary'}`}
                                onClick={() => onSelect(c.plan)}
                                disabled={currentPlan === c.plan}
                            >
                                {currentPlan === c.plan
                                    ? `${c.name}: seu plano`
                                    : `Quero o ${c.name}`}
                            </button>
                        ))}
                </div>
            )}
        </section>
    );
}
