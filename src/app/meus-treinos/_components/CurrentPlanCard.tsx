'use client';

import React, { useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import {
    FiCheck,
    FiChevronDown,
    FiGift,
    FiLayers,
    FiRepeat,
    FiTrash2,
} from 'react-icons/fi';
import Modal from '@/components/system/Modal';
import { upgradeStorePlan } from '@/libs/storeService';
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
        case 'celebrity': {
            // Comprado na loja: "por Fulano · CREF 012345-G/SP".
            const byline = plan.store_byline;
            if (byline?.author_name) {
                return byline.cref
                    ? `Programa por ${byline.author_name} · ${byline.cref}`
                    : `Programa por ${byline.author_name}`;
            }
            return byline?.venafit_collection
                ? 'Coleção Venafit'
                : 'Comprado na loja';
        }
        case 'imported_pdf':
            return 'Importado de PDF';
        case 'self_made':
            return 'Criado por você';
        case 'kept':
            return 'Plano mantido';
        case 'anamnesis':
            return 'Plano automático';
        default:
            return personalName
                ? `Montado por ${personalName}`
                : 'Montado pelo seu personal';
    }
}

/** Só o que o próprio aluno trouxe (ou pagou para manter) pode ser removido
 * por ele. */
function isRemovable(plan: MacrocycleResponse): boolean {
    return (
        plan.category === 'celebrity' ||
        plan.category === 'imported_pdf' ||
        plan.category === 'kept'
    );
}

interface CurrentPlanCardProps {
    plans: MacrocycleResponse[];
    selected: MacrocycleResponse | null;
    personalName?: string | null;
    deletingId: string | null;
    onSelect: (plan: MacrocycleResponse) => void;
    onDelete: (plan: MacrocycleResponse) => void;
    /** Depois de passar o plano comprado para a versão nova do programa (o
     *  plano novo, para a tela recarregar e selecionar). */
    onStoreUpdated?: (fresh: MacrocycleResponse) => void;
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
    onStoreUpdated,
}: CurrentPlanCardProps) {
    const [open, setOpen] = useState(false);
    const [confirmUpdate, setConfirmUpdate] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [updateError, setUpdateError] = useState('');
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
    // Versão nova do programa comprado (fase 3 do plano da loja): o aluno
    // passa para ela sem pagar de novo.
    const update = selected.store_byline?.update_available
        ? selected.store_byline
        : null;

    const applyUpdate = async () => {
        setUpdating(true);
        setUpdateError('');
        try {
            const fresh = await upgradeStorePlan(selected.id);
            setConfirmUpdate(false);
            onStoreUpdated?.(fresh);
        } catch (err) {
            setUpdateError(
                (isAxiosError(err) &&
                    (err.response?.data as { error?: string })?.error) ||
                    'Não foi possível passar para a versão nova. Tente de novo.',
            );
        } finally {
            setUpdating(false);
        }
    };

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
                    {/* Observações da rotina que o personal escreveu ao
                        montá-la (valem para todos os treinos). */}
                    {selected.notes && (
                        <p
                            className={s.planOrigin}
                            style={{
                                whiteSpace: 'pre-line',
                                overflowWrap: 'anywhere',
                                marginTop: 6,
                            }}
                        >
                            {selected.notes}
                        </p>
                    )}
                </div>
                <div className={s.planTools}>
                    {selected.status === 'active' && (
                        <DownloadOfflineButton macrocycle={selected} />
                    )}
                    <SyncPendingBadge />
                </div>
            </div>

            {update && (
                <div className={s.updateBox} role="status">
                    <FiGift size={18} aria-hidden="true" />
                    <div>
                        <p className={s.updateTitle}>
                            Versão nova deste programa
                        </p>
                        <p className={s.planOrigin}>
                            O autor atualizou o programa (versão{' '}
                            {update.latest_version}; o seu plano é a versão{' '}
                            {update.plan_version}). Você pode passar para ela
                            sem pagar de novo.
                        </p>
                        <button
                            type="button"
                            className={s.switchButton}
                            onClick={() => {
                                setUpdateError('');
                                setConfirmUpdate(true);
                            }}
                        >
                            Usar a versão nova
                        </button>
                    </div>
                </div>
            )}

            <Modal
                open={confirmUpdate}
                onClose={() => setConfirmUpdate(false)}
                title="Usar a versão nova"
                footer={
                    <>
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => setConfirmUpdate(false)}
                            disabled={updating}
                        >
                            Agora não
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => void applyUpdate()}
                            disabled={updating}
                        >
                            {updating ? 'Atualizando…' : 'Usar a versão nova'}
                        </button>
                    </>
                }
            >
                {updateError && (
                    <div className="alert alert-danger py-2">{updateError}</div>
                )}
                <p>
                    A versão nova entra como o seu plano atual. O plano de
                    agora fica no histórico, com os treinos e as cargas que você
                    registrou. Não há cobrança.
                </p>
            </Modal>

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
