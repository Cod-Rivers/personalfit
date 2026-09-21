'use client';

/**
 * Lista com arrastar e soltar por alça FIXA.
 *
 * Todo lugar do app onde o personal reordena treinos ou exercícios passa por
 * aqui: o editor de fase (TrainingsListCard/TrainingCard), a periodização
 * (MesocycleSection) e o treino do aluno (/personal/aluno/[id]/acompanhar).
 * Antes cada card montava o seu próprio DndContext e escondia o arrasto atrás
 * de um botão "Ordenar" — o personal só descobria a funcionalidade se
 * apertasse o botão, e as duas telas de visualização não reordenavam nada.
 *
 * A alça é um <button> sempre visível, e o arrasto sai SÓ dela. Sem isso, no
 * celular, o mesmo gesto que arrasta é o que rola a página e o que abre o
 * exercício — a linha inteira arrastável rouba os dois. Por ser botão, o
 * teclado também reordena (espaço para pegar, setas para mover, espaço para
 * soltar), via KeyboardSensor.
 */

import React from 'react';
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    rectSortingStrategy,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import s from './SortableList.module.css';

export function SortableList({
    ids,
    onReorder,
    layout = 'list',
    className,
    children,
}: {
    /** Ordem atual. Cada `SortableItem` filho usa um destes ids. */
    ids: string[];
    /** Recebe a ordem NOVA inteira — o chamador grava e/ou aplica na tela. */
    onReorder: (ids: string[]) => void;
    /** "grid" para chips que quebram linha (seletor de treino). */
    layout?: 'list' | 'grid';
    className?: string;
    children: React.ReactNode;
}) {
    const sensors = useSensors(
        // 5px de folga: um toque para abrir o item não vira arrasto.
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = ids.indexOf(String(active.id));
        const newIndex = ids.indexOf(String(over.id));
        if (oldIndex === -1 || newIndex === -1) return;
        onReorder(arrayMove(ids, oldIndex, newIndex));
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={ids}
                strategy={
                    layout === 'grid'
                        ? rectSortingStrategy
                        : verticalListSortingStrategy
                }
            >
                <div
                    className={`${layout === 'grid' ? s.grid : s.list}${className ? ` ${className}` : ''}`}
                >
                    {children}
                </div>
            </SortableContext>
        </DndContext>
    );
}

export function SortableItem({
    id,
    label,
    disabled,
    className,
    children,
}: {
    id: string;
    /** Nome do item, usado no aria-label da alça ("Arrastar Supino reto"). */
    label: string;
    /** Sem gravação possível (offline, tela só de leitura): sem alça. */
    disabled?: boolean;
    className?: string;
    children: React.ReactNode;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, disabled });

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                // Enquanto arrasta, o item precisa passar POR CIMA dos vizinhos
                // — cards do app têm fundo opaco e sombra própria.
                zIndex: isDragging ? 2 : undefined,
                position: isDragging ? 'relative' : undefined,
            }}
            className={`${s.item}${isDragging ? ` ${s.itemDragging}` : ''}${className ? ` ${className}` : ''}`}
        >
            {!disabled && (
                <button
                    type="button"
                    className={s.handle}
                    aria-label={`Arrastar ${label} para reordenar`}
                    title="Arrastar para reordenar"
                    {...attributes}
                    {...listeners}
                >
                    <span aria-hidden>⠿</span>
                </button>
            )}
            <div className={s.body}>{children}</div>
        </div>
    );
}
