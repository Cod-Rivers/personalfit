'use client';

import { useState } from 'react';
import HelpTooltip from '@/components/atoms/HelpTooltip';
import { MAX_WEEKLY_TARGET_DAYS } from '@/libs/currentWeek';
import { getGlossaryTerm } from '@/libs/glossaryContent';
import s from '../builder.module.css';

const DAY_OPTIONS = Array.from(
    { length: MAX_WEEKLY_TARGET_DAYS },
    (_, i) => i + 1,
);

function daysLabel(n: number): string {
    return `${n} ${n === 1 ? 'dia' : 'dias'}`;
}

/**
 * Meta semanal da prescrição: quantos DIAS de treino fecham a semana do
 * aluno. É o que decide o "Semana concluída" na tela do aluno, o chip da
 * semana em "Treino do aluno" e o status das semanas da periodização.
 *
 * "Automático" (0) acompanha o número de treinos da fase — o que valia antes
 * da meta existir. Dois treinos no mesmo dia contam um dia.
 */
export default function WeeklyTargetPicker({
    value,
    automaticDays,
    disabled,
    onChange,
}: {
    /** Meta gravada no plano: 0 = automático, 1–7 = fixa. */
    value: number;
    /** Quanto o automático vale hoje (treinos da fase atual). */
    automaticDays: number;
    disabled?: boolean;
    onChange: (days: number) => Promise<void>;
}) {
    const [saving, setSaving] = useState(false);

    async function choose(days: number) {
        if (days === value || saving) return;
        setSaving(true);
        try {
            await onChange(days);
        } finally {
            setSaving(false);
        }
    }

    const options = [0, ...DAY_OPTIONS];

    return (
        <section className={s.weeklyTarget} aria-labelledby="weekly-target-title">
            <p id="weekly-target-title" className={s.labelPartsTitle}>
                Meta semanal{' '}
                <HelpTooltip
                    text={getGlossaryTerm('meta-semanal').short}
                    href="/ajuda#glossario-meta-semanal"
                    label="Ajuda sobre a meta semanal"
                />
            </p>
            <p className={s.cardIntro}>
                Dias de treino por semana para considerar a semana concluída.
            </p>
            <div
                className={s.labelPartsChips}
                role="radiogroup"
                aria-label="Dias de treino por semana"
            >
                {options.map((days) => {
                    const on = days === value;
                    return (
                        <button
                            key={days}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            className={on ? s.labelPartChipOn : s.labelPartChip}
                            disabled={disabled || saving}
                            onClick={() => void choose(days)}
                        >
                            {days === 0
                                ? `Automático${automaticDays > 0 ? ` (${daysLabel(automaticDays)})` : ''}`
                                : daysLabel(days)}
                        </button>
                    );
                })}
            </div>
            {value === 0 && (
                <span className={s.fieldHint}>
                    Automático: um dia por treino da fase atual.
                </span>
            )}
        </section>
    );
}
