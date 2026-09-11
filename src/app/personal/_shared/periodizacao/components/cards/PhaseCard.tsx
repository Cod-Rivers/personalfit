'use client';

import { FiStar, FiAlertTriangle } from 'react-icons/fi';
import type {
    FieldErrors,
    UseFormRegister,
    UseFormSetValue,
} from 'react-hook-form';
import HelpTooltip from '@/components/atoms/HelpTooltip';
import {
    PHASES_MATVEYEV,
    PHASES_FORCE,
    METHODOLOGIES,
    type MesoPhaseFormData,
} from '../../lib/mesocycleTransforms';
import NavRow from './NavRow';
import s from '../../builder.module.css';

const DURATION_PRESETS = [3, 4, 5, 6];

/**
 * Card raiz do editor no modo periodizado: a identidade da fase e nada mais.
 *
 * Treinos e ajustes semanais, que antes vinham empilhados logo abaixo destes
 * quatro campos, agora são duas linhas de navegação com resumo.
 */
export default function PhaseCard({
    register,
    errors,
    setValue,
    durationWeeks,
    trainingsSummary,
    weeksSummary,
    deloadWarning,
    onOpenTrainings,
    onOpenWeeks,
}: {
    register: UseFormRegister<MesoPhaseFormData>;
    errors: FieldErrors<MesoPhaseFormData>;
    setValue: UseFormSetValue<MesoPhaseFormData>;
    durationWeeks: number;
    trainingsSummary: string;
    weeksSummary: string;
    /** Fase longa sem nenhuma semana de deload — aviso, nunca bloqueio. */
    deloadWarning: boolean;
    onOpenTrainings: () => void;
    onOpenWeeks: () => void;
}) {
    return (
        <>
            <div className={s.formGroup}>
                <label className={s.formLabel}>Nome *</label>
                <input
                    {...register('name')}
                    placeholder="Ex: Fase de Hipertrofia"
                    className={s.formInput}
                />
                {errors.name && (
                    <small className="text-danger">{errors.name.message}</small>
                )}
            </div>

            <div className={s.formRow}>
                <div className={s.formGroup}>
                    <label className={s.formLabel}>
                        Fase *{' '}
                        <HelpTooltip
                            text="Modelo clássico usado para organizar a fase: Matveyev (Introdução, Base, Preparação, Pré-competição, Competição) ou Força/Bloco (Bompa — Acumulação, Transmutação, Realização e outras)."
                            href="/ajuda#autorregulacao-rpe-rir"
                            label="Ajuda sobre a fase do mesociclo"
                        />
                    </label>
                    <select {...register('phase')} className={s.formSelect}>
                        <option value="">Selecione</option>
                        <optgroup label="Clássica (Matveyev)">
                            {PHASES_MATVEYEV.map((p) => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </optgroup>
                        <optgroup label="Força / Bloco (Bompa)">
                            {PHASES_FORCE.map((p) => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </optgroup>
                    </select>
                    {errors.phase && (
                        <small className="text-danger">
                            {errors.phase.message}
                        </small>
                    )}
                </div>

                <div className={s.formGroup}>
                    <label className={s.formLabel}>
                        Duração{' '}
                        <span style={{ fontWeight: 400 }}>
                            (semanas = microciclos)
                        </span>{' '}
                        *
                    </label>
                    <div className={s.presetChipRow}>
                        {DURATION_PRESETS.map((w) => (
                            <button
                                key={w}
                                type="button"
                                onClick={() =>
                                    setValue('duration_weeks', w, {
                                        shouldValidate: true,
                                    })
                                }
                                className={
                                    durationWeeks === w
                                        ? s.presetChipActive
                                        : s.presetChip
                                }
                            >
                                {w} sem
                                {w === 4 && (
                                    <FiStar style={{ fill: 'currentColor' }} />
                                )}
                            </button>
                        ))}
                    </div>
                    <input
                        {...register('duration_weeks', { valueAsNumber: true })}
                        type="number"
                        min={1}
                        max={52}
                        className={s.formInput}
                        placeholder="Outra duração..."
                    />
                    <small
                        style={{
                            color: 'var(--text-muted)',
                            fontSize: '0.72rem',
                        }}
                    >
                        Recomendado: 3–6 semanas por fase
                    </small>
                    {errors.duration_weeks && (
                        <small className="text-danger d-block">
                            {errors.duration_weeks.message}
                        </small>
                    )}
                </div>
            </div>

            <div className={s.formGroup}>
                <label className={s.formLabel}>
                    Metodologia *{' '}
                    <HelpTooltip
                        text="Como a intensidade/volume progride nas semanas desta fase: Linear, Ondulada Diária (DUP), Ondulada Semanal, Conjugada ou Bloco."
                        href="/ajuda#autorregulacao-rpe-rir"
                        label="Ajuda sobre a metodologia de progressão"
                    />
                </label>
                <select {...register('methodology')} className={s.formSelect}>
                    <option value="">Selecione</option>
                    {METHODOLOGIES.map((m) => (
                        <option key={m} value={m}>
                            {m}
                        </option>
                    ))}
                </select>
                {errors.methodology && (
                    <small className="text-danger">
                        {errors.methodology.message}
                    </small>
                )}
            </div>

            <div className={s.navRowGroup}>
                <NavRow
                    title="Treinos"
                    summary={trainingsSummary}
                    onClick={onOpenTrainings}
                />
                <NavRow
                    title="Ajustes semanais"
                    summary={weeksSummary}
                    onClick={onOpenWeeks}
                    tone={deloadWarning ? 'warning' : 'default'}
                />
            </div>

            {deloadWarning && (
                <p className={s.inlineWarning}>
                    <FiAlertTriangle /> Fase com {durationWeeks} semanas e
                    nenhuma marcada como deload. Blocos longos sem semana de
                    descarga aumentam o risco de overtraining.
                </p>
            )}
        </>
    );
}
