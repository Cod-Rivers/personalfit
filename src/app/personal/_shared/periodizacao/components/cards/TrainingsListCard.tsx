'use client';

import { useState } from 'react';
import { FiCopy, FiX } from 'react-icons/fi';
import {
    labelPartsPreview,
    type TrainingLabelPart,
} from '@/libs/trainingLabel';
import TrainingLabelPartsPicker from '../TrainingLabelPartsPicker';
import type { LocalTraining } from '../../lib/mesocycleTransforms';
import { trainingFullLabel } from '../fields/PrescriptionFields';
import NavRow from '@/components/molecules/NavRow';
import { SortableItem, SortableList } from '@/components/system/SortableList';
import s from '../../builder.module.css';

/**
 * Card com a lista de treinos da fase.
 *
 * Substitui as abas de dia que existiam no editor antigo: com 7 dias da semana
 * as abas ficavam ilegíveis em celular, e não cabia mostrar quantos exercícios
 * cada treino tinha. Cada linha carrega o resumo e leva ao card do treino.
 */
export default function TrainingsListCard({
    trainings,
    simpleMode,
    labelParts,
    onChangeLabelParts,
    onOpenTraining,
    onAddTraining,
    onDuplicateTraining,
    onRemoveTraining,
    onReorderTrainings,
}: {
    trainings: LocalTraining[];
    simpleMode?: boolean;
    labelParts: TrainingLabelPart[];
    /** Grava as partes no plano. Sem ele, só se vê o formato atual. */
    onChangeLabelParts?: (parts: TrainingLabelPart[]) => Promise<void>;
    onOpenTraining: (trainingId: string) => void;
    onAddTraining: () => void;
    onDuplicateTraining: (trainingId: string) => void;
    onRemoveTraining: (trainingId: string) => void;
    onReorderTrainings?: (order: string[]) => void;
}) {
    const [editingParts, setEditingParts] = useState(false);
    const [savingParts, setSavingParts] = useState(false);
    const [partsError, setPartsError] = useState(false);

    const changeParts = async (parts: TrainingLabelPart[]) => {
        if (!onChangeLabelParts) return;
        setSavingParts(true);
        setPartsError(false);
        try {
            await onChangeLabelParts(parts);
        } catch {
            setPartsError(true);
        } finally {
            setSavingParts(false);
        }
    };

    return (
        <>
            {/* O formato vale para o plano inteiro, não só para esta fase —
                por isso fica recolhido: é uma escolha rara, e a lista de
                treinos é o que se usa todo dia. */}
            <div className={s.labelPartsSummary}>
                <span>
                    Nome dos treinos:{' '}
                    <strong>{labelPartsPreview(labelParts)}</strong>
                </span>
                {onChangeLabelParts && (
                    <button
                        type="button"
                        className={s.linkBtn}
                        aria-expanded={editingParts}
                        onClick={() => setEditingParts((v) => !v)}
                    >
                        {editingParts ? 'Pronto' : 'Alterar'}
                    </button>
                )}
            </div>
            {editingParts && onChangeLabelParts && (
                <TrainingLabelPartsPicker
                    value={labelParts}
                    onChange={changeParts}
                    disabled={savingParts}
                    title="Mostrar no nome de cada treino"
                />
            )}
            {partsError && (
                <p className={s.fieldError} role="alert">
                    Não foi possível alterar o nome dos treinos. Tente de novo.
                </p>
            )}

            <div className={s.sectionHeaderRow}>
                <p>
                    {trainings.length} treino
                    {trainings.length === 1 ? '' : 's'}{' '}
                    {simpleMode ? 'na semana' : 'nesta fase'}
                </p>
            </div>

            {/* A orientação de "o que fazer agora" fica no guia de etapas do
                editor, que sabe se quem monta é o aluno ou o personal. */}
            {trainings.length === 0 ? (
                <p className={s.emptyHint}>Nenhum treino ainda.</p>
            ) : (
                <SortableList
                    ids={trainings.map((t) => t._id)}
                    onReorder={(ids) => onReorderTrainings?.(ids)}
                    className={s.sortableGroup}
                >
                    {trainings.map((t, i) => {
                        const label = trainingFullLabel(t, i, labelParts);
                        return (
                            <SortableItem
                                key={t._id}
                                id={t._id}
                                label={label}
                                disabled={
                                    !onReorderTrainings || trainings.length < 2
                                }
                            >
                                <div className={s.rowWithActions}>
                                    <NavRow
                                        title={label}
                                        summary={
                                            t.exercises.length === 0
                                                ? 'Nenhum exercício ainda'
                                                : `${t.exercises.length} exercício${t.exercises.length === 1 ? '' : 's'}`
                                        }
                                        tone={
                                            t.exercises.length === 0
                                                ? 'warning'
                                                : 'default'
                                        }
                                        onClick={() => onOpenTraining(t._id)}
                                    />
                                    <button
                                        type="button"
                                        className={s.btnTiny}
                                        title="Duplicar treino"
                                        aria-label={`Duplicar ${label}`}
                                        onClick={() =>
                                            onDuplicateTraining(t._id)
                                        }
                                    >
                                        <FiCopy />
                                    </button>
                                    <button
                                        type="button"
                                        className={s.btnTiny}
                                        style={{
                                            color: 'var(--coral, #e74c3c)',
                                        }}
                                        title="Remover treino"
                                        aria-label={`Remover ${label}`}
                                        onClick={() => {
                                            if (
                                                !confirm(
                                                    `Remover o treino "${label}" e todos os seus exercícios? Essa ação não pode ser desfeita.`,
                                                )
                                            )
                                                return;
                                            onRemoveTraining(t._id);
                                        }}
                                    >
                                        <FiX />
                                    </button>
                                </div>
                            </SortableItem>
                        );
                    })}
                </SortableList>
            )}

            <button
                type="button"
                className={s.btnBlock}
                onClick={onAddTraining}
            >
                + Adicionar treino
            </button>
        </>
    );
}
