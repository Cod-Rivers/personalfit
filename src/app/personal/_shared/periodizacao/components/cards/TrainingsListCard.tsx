'use client';

import React, { useState } from 'react';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    arrayMove,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FiMove, FiCopy, FiX } from 'react-icons/fi';
import type { LocalTraining } from '../../lib/mesocycleTransforms';
import { trainingFullLabel } from '../fields/PrescriptionFields';
import NavRow, { NavRowGroup } from '@/components/molecules/NavRow';
import s from '../../builder.module.css';

/** Uma linha de treino arrastável. A alça só existe em modo de ordenação, para
 * o clique normal (abrir o treino) não brigar com os listeners de drag. */
function SortableTrainingRow({
    id,
    reorderMode,
    children,
}: {
    id: string;
    reorderMode: boolean;
    children: React.ReactNode;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, disabled: !reorderMode });

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.5 : 1,
            }}
        >
            {reorderMode && (
                <div className={s.dragHandleRow} {...attributes} {...listeners}>
                    <span aria-hidden>⠿</span> Arraste para reordenar
                </div>
            )}
            {children}
        </div>
    );
}

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
    isNumbered,
    onOpenTraining,
    onAddTraining,
    onDuplicateTraining,
    onRemoveTraining,
    onReorderTrainings,
}: {
    trainings: LocalTraining[];
    simpleMode?: boolean;
    isNumbered?: boolean;
    onOpenTraining: (trainingId: string) => void;
    onAddTraining: () => void;
    onDuplicateTraining: (trainingId: string) => void;
    onRemoveTraining: (trainingId: string) => void;
    onReorderTrainings?: (order: string[]) => void;
}) {
    const [reorderMode, setReorderMode] = useState(false);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const ids = trainings.map((t) => t._id);
        const oldIndex = ids.indexOf(String(active.id));
        const newIndex = ids.indexOf(String(over.id));
        if (oldIndex === -1 || newIndex === -1) return;
        onReorderTrainings?.(arrayMove(ids, oldIndex, newIndex));
    };

    return (
        <>
            <div className={s.sectionHeaderRow}>
                <p>
                    {trainings.length} treino
                    {trainings.length === 1 ? '' : 's'} nesta fase
                </p>
                {trainings.length > 1 && onReorderTrainings && (
                    <button
                        type="button"
                        className={reorderMode ? s.btnSmallActive : s.btnSmall}
                        onClick={() => setReorderMode((v) => !v)}
                    >
                        {reorderMode ? (
                            'Concluir ordenação'
                        ) : (
                            <>
                                <FiMove /> Ordenar
                            </>
                        )}
                    </button>
                )}
            </div>

            {trainings.length === 0 ? (
                <p className={s.emptyHint}>
                    Nenhum treino ainda. Use &quot;+ Adicionar treino&quot; para
                    começar — cada treino é um dia de academia do aluno.
                </p>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={trainings.map((t) => t._id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <NavRowGroup>
                            {trainings.map((t, i) => (
                                <SortableTrainingRow
                                    key={t._id}
                                    id={t._id}
                                    reorderMode={reorderMode}
                                >
                                    <div className={s.rowWithActions}>
                                        <NavRow
                                            title={trainingFullLabel(
                                                t,
                                                i,
                                                simpleMode,
                                                isNumbered,
                                            )}
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
                                            onClick={() =>
                                                onOpenTraining(t._id)
                                            }
                                        />
                                        <button
                                            type="button"
                                            className={s.btnTiny}
                                            title="Duplicar treino"
                                            aria-label={`Duplicar ${trainingFullLabel(t, i, simpleMode, isNumbered)}`}
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
                                            aria-label={`Remover ${trainingFullLabel(t, i, simpleMode, isNumbered)}`}
                                            onClick={() => {
                                                if (
                                                    !confirm(
                                                        `Remover o treino "${trainingFullLabel(t, i, simpleMode, isNumbered)}" e todos os seus exercícios? Essa ação não pode ser desfeita.`,
                                                    )
                                                )
                                                    return;
                                                onRemoveTraining(t._id);
                                            }}
                                        >
                                            <FiX />
                                        </button>
                                    </div>
                                </SortableTrainingRow>
                            ))}
                        </NavRowGroup>
                    </SortableContext>
                </DndContext>
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
