'use client';

import { GROUP_RECOVERY_PRESETS } from '@/libs/circuitPlan';
import { useEffect, useMemo, useState } from 'react';
import { FiCheck, FiLink } from 'react-icons/fi';
import {
    GROUP_TECHNIQUE_CATALOG,
    isGroupTechniqueValidForSize,
} from '@/libs/trainingTechniques';
import s from '../builder.module.css';

/**
 * Agrupar exercícios que JÁ estão no treino (bi-set, tri-set…): o ✓ acima
 * da alça de cada bloco seleciona, e com 2+ marcados aparece a barra
 * "Agrupar como". Usado pelo editor da fase (TrainingCard) e pela lista da
 * periodização (MesocycleSection); a tela do treino do aluno (/acompanhar)
 * tem o mesmo desenho, com o ✓ acumulando o "aplicado" da sessão.
 *
 * Só a seleção mora aqui — gravar é de quem usa (ver mergeIntoGroup e
 * groupExercisesInTraining).
 */
export function useBlockSelection(
    /** Ids na ordem da lista: a seleção sai nessa ordem e ignora quem sumiu. */
    orderedIds: string[],
    /** Trocou de treino: a seleção era do anterior. */
    resetKey: string | null,
) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [technique, setTechnique] = useState('');
    useEffect(() => {
        setSelectedIds(new Set());
        setTechnique('');
    }, [resetKey]);

    const markedIds = useMemo(
        () => orderedIds.filter((id) => selectedIds.has(id)),
        [orderedIds, selectedIds],
    );
    const effectiveTechnique =
        technique && isGroupTechniqueValidForSize(technique, markedIds.length)
            ? technique
            : '';

    /** Marca/desmarca o bloco inteiro; parcialmente marcado → marca tudo. */
    const toggleBlock = (ids: string[]) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            const allOn = ids.every((id) => next.has(id));
            for (const id of ids) {
                if (allOn) next.delete(id);
                else next.add(id);
            }
            return next;
        });
    };

    const clear = () => {
        setSelectedIds(new Set());
        setTechnique('');
    };

    return {
        selectedIds,
        markedIds,
        effectiveTechnique,
        setTechnique,
        toggleBlock,
        clear,
    };
}

/** O ✓ do topSlot do SortableItem: checkbox real porém invisível; o visual
 * é todo do label (htmlFor), clicável no toque e pelo teclado. */
export function BlockMarkToggle({
    inputId,
    label,
    checked,
    onToggle,
}: {
    inputId: string;
    label: string;
    checked: boolean;
    onToggle: () => void;
}) {
    return (
        <>
            <input
                id={inputId}
                type="checkbox"
                className={s.selectCheckbox}
                checked={checked}
                onChange={onToggle}
            />
            <label
                htmlFor={inputId}
                className={s.selectToggle}
                data-checked={checked || undefined}
                title={checked ? 'Desmarcar' : 'Marcar para agrupar'}
            >
                <FiCheck aria-hidden />
                <span className={s.srOnly}>
                    {checked
                        ? `Desmarcar ${label}`
                        : `Marcar ${label} para agrupar`}
                </span>
            </label>
        </>
    );
}

/** Opções de tipo, com as que não cabem em `size` exercícios desativadas. */
export function GroupTechniqueOptions({ size }: { size: number }) {
    return (
        <>
            {GROUP_TECHNIQUE_CATALOG.map((gt) => (
                <option
                    key={gt.value}
                    value={gt.value}
                    disabled={!isGroupTechniqueValidForSize(gt.value, size)}
                >
                    {gt.label}
                </option>
            ))}
        </>
    );
}

/** Recuperação entre os exercícios do bloco no circuito (modo tabata),
 * prescrita pelo personal e seguida pelo aluno. Valor fora dos atalhos (um
 * plano antigo, outra tela) continua aparecendo como opção. */
export function GroupRecoverySelect({
    value,
    onChange,
    disabled,
    className,
}: {
    value?: number;
    onChange: (seconds: number) => void;
    disabled?: boolean;
    className?: string;
}) {
    const current = value ?? 0;
    const known = GROUP_RECOVERY_PRESETS.some((p) => p.seconds === current);
    return (
        <select
            value={current}
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={disabled}
            className={className}
            aria-label="Recuperação entre os exercícios do bloco (tabata)"
            title="Pausa curta entre um exercício e o próximo do bloco, no circuito"
        >
            {GROUP_RECOVERY_PRESETS.map((p) => (
                <option key={p.seconds} value={p.seconds}>
                    {p.label}
                </option>
            ))}
            {!known && <option value={current}>Recuperação {current} s</option>}
        </select>
    );
}

/** Tipo de um bloco que já existe + "Desagrupar", para listas que gravam na
 * hora (periodização). O editor da fase tem os dele no TrainingCard. */
export function GroupBlockControls({
    size,
    technique,
    busy,
    onChange,
    onUngroup,
    recoverySeconds,
    onChangeRecovery,
}: {
    size: number;
    technique?: string;
    busy?: boolean;
    onChange: (value: string) => void;
    onUngroup: () => void;
    recoverySeconds?: number;
    onChangeRecovery?: (seconds: number) => void;
}) {
    return (
        <div className={s.groupBlockControls}>
            <select
                value={technique ?? ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={busy}
                className={s.formInput}
                aria-label="Tipo de agrupamento do bloco"
            >
                <option value="">Tipo de combinação…</option>
                <GroupTechniqueOptions size={size} />
            </select>
            {onChangeRecovery && (
                <GroupRecoverySelect
                    value={recoverySeconds}
                    onChange={onChangeRecovery}
                    disabled={busy}
                    className={s.formInput}
                />
            )}
            <button
                type="button"
                className={s.linkBtn}
                onClick={onUngroup}
                disabled={busy}
                title="Separar os exercícios deste bloco"
            >
                Desagrupar
            </button>
        </div>
    );
}

/** Barra "N marcados — agrupar como", sticky no pé da área rolável. */
export function GroupSelectionBar({
    count,
    technique,
    onTechniqueChange,
    onGroup,
    onClear,
    busy,
}: {
    count: number;
    technique: string;
    onTechniqueChange: (value: string) => void;
    onGroup: () => void;
    onClear: () => void;
    busy?: boolean;
}) {
    if (count < 2) return null;
    return (
        <div
            className={s.groupBar}
            role="region"
            aria-label="Agrupar exercícios marcados"
        >
            <span className={s.groupBarCount}>
                {count} marcados — agrupar como
            </span>
            <select
                value={technique}
                onChange={(e) => onTechniqueChange(e.target.value)}
                className={s.formInput}
                aria-label="Agrupar os marcados como"
            >
                <option value="">Bloco sem tipo definido</option>
                <GroupTechniqueOptions size={count} />
            </select>
            <div className={s.groupBarActions}>
                <button type="button" className={s.btnSmall} onClick={onClear}>
                    Limpar
                </button>
                <button
                    type="button"
                    className={s.btnSmall}
                    onClick={onGroup}
                    disabled={busy}
                >
                    <FiLink /> Agrupar
                </button>
            </div>
        </div>
    );
}
