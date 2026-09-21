'use client';

import { FiCopy, FiX } from 'react-icons/fi';
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
    return (
        <>
            <div className={s.sectionHeaderRow}>
                <p>
                    {trainings.length} treino
                    {trainings.length === 1 ? '' : 's'} nesta fase
                </p>
            </div>

            {trainings.length === 0 ? (
                <p className={s.emptyHint}>
                    Nenhum treino ainda. Use &quot;+ Adicionar treino&quot; para
                    começar — cada treino é um dia de academia do aluno.
                </p>
            ) : (
                <SortableList
                    ids={trainings.map((t) => t._id)}
                    onReorder={(ids) => onReorderTrainings?.(ids)}
                    className={s.sortableGroup}
                >
                    {trainings.map((t, i) => {
                        const label = trainingFullLabel(
                            t,
                            i,
                            simpleMode,
                            isNumbered,
                        );
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
