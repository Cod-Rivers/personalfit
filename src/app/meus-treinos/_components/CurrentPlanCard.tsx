'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
    FiCheck,
    FiChevronDown,
    FiLayers,
    FiRepeat,
    FiTrash2,
} from 'react-icons/fi';
import DownloadOfflineButton from '@/components/features/DownloadOfflineButton';
import SyncPendingBadge from '@/components/features/SyncPendingBadge';
import type { MacrocycleResponse } from '@/libs/planningService';
import s from './meusTreinos.module.css';

/** De onde veio o plano, em linguagem de aluno — ver `category` em
 * MacrocycleResponse. Sem categoria = montado pelo personal. */
export function planOriginLabel(
    plan: MacrocycleResponse,
    personalName?: string | null,
): string {
    switch (plan.category) {
        case 'celebrity':
            return 'Plano dos famosos';
        case 'imported_pdf':
            return 'Importado de PDF';
        case 'self_made':
            return 'Criado por você';
        case 'anamnesis':
            return 'Plano automático';
        default:
            return personalName
                ? `Montado por ${personalName}`
                : 'Montado pelo seu personal';
    }
}

/** Só o que o próprio aluno trouxe pode ser removido por ele. */
function isRemovable(plan: MacrocycleResponse): boolean {
    return plan.category === 'celebrity' || plan.category === 'imported_pdf';
}

interface CurrentPlanCardProps {
    plans: MacrocycleResponse[];
    selected: MacrocycleResponse | null;
    personalName?: string | null;
    deletingId: string | null;
    onSelect: (plan: MacrocycleResponse) => void;
    onDelete: (plan: MacrocycleResponse) => void;
}

/**
 * Topo da tela do aluno: qual plano está em uso e de onde ele veio. Trocar de
 * plano é um botão explícito — antes o nome do plano era o gatilho do menu e,
 * com o mesmo visual dos atalhos, ninguém percebia que dava para tocar.
 */
export default function CurrentPlanCard({
    plans,
    selected,
    personalName,
    deletingId,
    onSelect,
    onDelete,
}: CurrentPlanCardProps) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function handleClickOutside(e: MouseEvent) {
            if (
                rootRef.current &&
                !rootRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    if (!selected) return null;
    const canSwitch = plans.length > 1;

    return (
        <section
            className={s.planCard}
            ref={rootRef}
            aria-labelledby="current-plan-name"
        >
            <div className={s.planRow}>
                <span className={`${s.iconTile} ${s.iconTileMint}`}>
                    <FiLayers size={20} aria-hidden="true" />
                </span>
                <div className={s.planText}>
                    <p className={s.eyebrow}>Plano atual</p>
                    <h2 id="current-plan-name" className={s.planName}>
                        {selected.name || 'Meus treinos'}
                    </h2>
                    <p className={s.planOrigin}>
                        {planOriginLabel(selected, personalName)}
                    </p>
                </div>
                <div className={s.planTools}>
                    {selected.status === 'active' && (
                        <DownloadOfflineButton macrocycle={selected} />
                    )}
                    <SyncPendingBadge />
                </div>
            </div>

            {canSwitch && (
                <button
                    type="button"
                    className={s.switchButton}
                    onClick={() => setOpen((o) => !o)}
                    aria-haspopup="listbox"
                    aria-expanded={open}
                >
                    <FiRepeat size={16} aria-hidden="true" />
                    Trocar plano ({plans.length})
                    <FiChevronDown
                        size={16}
                        aria-hidden="true"
                        className={`${s.switchChevron} ${
                            open ? s.switchChevronOpen : ''
                        }`}
                    />
                </button>
            )}

            {open && canSwitch && (
                <ul
                    role="listbox"
                    aria-label="Seus planos"
                    className={s.planList}
                >
                    {plans.map((plan) => {
                        const isSelected = plan.id === selected.id;
                        return (
                            <li
                                key={plan.id}
                                className={`${s.planOption} ${
                                    isSelected ? s.planOptionSelected : ''
                                }`}
                            >
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    className={s.planOptionButton}
                                    onClick={() => {
                                        setOpen(false);
                                        if (!isSelected) onSelect(plan);
                                    }}
                                >
                                    <span className={s.planOptionText}>
                                        <span className={s.planOptionName}>
                                            {plan.name || 'Plano sem nome'}
                                        </span>
                                        <span className={s.planOptionOrigin}>
                                            {planOriginLabel(
                                                plan,
                                                personalName,
                                            )}
                                        </span>
                                    </span>
                                    {isSelected && (
                                        <FiCheck
                                            size={18}
                                            aria-hidden="true"
                                            className={s.planOptionCheck}
                                        />
                                    )}
                                </button>
                                {isRemovable(plan) && (
                                    <button
                                        type="button"
                                        className={s.deleteButton}
                                        aria-label={`Remover plano ${plan.name}`}
                                        title="Remover este plano"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(plan);
                                        }}
                                        disabled={deletingId === plan.id}
                                    >
                                        {deletingId === plan.id ? (
                                            '…'
                                        ) : (
                                            <FiTrash2
                                                size={16}
                                                aria-hidden="true"
                                            />
                                        )}
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
