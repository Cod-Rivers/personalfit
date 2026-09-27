'use client';

import { FiCheck } from 'react-icons/fi';
import {
    LABEL_PART_OPTIONS,
    labelPartsPreview,
    toggleLabelPart,
    type TrainingLabelPart,
} from '@/libs/trainingLabel';
import s from '../builder.module.css';

/**
 * Escolha das partes do nome do treino: dia da semana, letra OU número, nome
 * livre — em qualquer combinação. A pré-visualização mostra, com um treino de
 * exemplo, exatamente o que o aluno vai ler.
 *
 * Botões com aria-pressed em vez de <input type="checkbox">: o CSS global já
 * sobrescreveu o :checked dos checkboxes do app uma vez.
 */
export default function TrainingLabelPartsPicker({
    value,
    onChange,
    disabled,
    title = 'Como o aluno vê o nome de cada treino?',
}: {
    value: TrainingLabelPart[];
    onChange: (parts: TrainingLabelPart[]) => void;
    disabled?: boolean;
    title?: string;
}) {
    const toggle = (part: TrainingLabelPart) => {
        const next = toggleLabelPart(value, part);
        // Sem nenhuma parte, todo treino viraria "Treino 1, 2…" sem o
        // personal ter pedido número. A última parte não desliga.
        if (next.length > 0) onChange(next);
    };

    return (
        <div className={s.labelParts}>
            <p className={s.labelPartsTitle}>{title}</p>
            <div
                className={s.labelPartsChips}
                role="group"
                aria-label="Partes do nome do treino"
            >
                {LABEL_PART_OPTIONS.map((opt) => {
                    const on = value.includes(opt.part);
                    return (
                        <button
                            key={opt.part}
                            type="button"
                            aria-pressed={on}
                            disabled={disabled}
                            className={on ? s.labelPartChipOn : s.labelPartChip}
                            onClick={() => toggle(opt.part)}
                        >
                            {on && <FiCheck aria-hidden />}
                            {opt.title}
                        </button>
                    );
                })}
            </div>
            <p className={s.labelPartsPreview}>
                O aluno vê: <strong>{labelPartsPreview(value)}</strong>
            </p>
            <p className={s.fieldHint}>
                Letra e número não se combinam. O dia e o nome você escolhe em
                cada treino.
            </p>
        </div>
    );
}
