'use client';

import { useState } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import { MUSCLE_GROUPS, muscleGroupLabel } from '@/libs/planningService';
import {
    TECHNIQUE_CATALOG,
    TECHNIQUE_CATEGORIES,
    formatTechniqueSummary,
    type TechniqueParamKey,
    type TechniqueParamsValue,
} from '@/libs/trainingTechniques';
import HelpTooltip from '@/components/atoms/HelpTooltip';
import TechniqueHelpTooltip from '@/components/molecules/TechniqueHelpTooltip';
import { getGlossaryTerm } from '@/libs/glossaryContent';
import {
    weekdayLabel,
    type LocalExercise,
    type LocalTraining,
} from '../../lib/mesocycleTransforms';
import s from '../../builder.module.css';

/**
 * Campos de prescrição compartilhados pelos cards do editor.
 *
 * Vieram sem reescrita do antigo TrainingsEditor (1.992 linhas num arquivo só),
 * que foi quebrado em cards de uma tela cada. Ficam aqui porque os mesmos
 * campos aparecem no card de UM exercício e no card de prescrição geral do
 * treino — duplicar significaria, de novo, lembrar de dois lugares a cada campo
 * novo.
 */

/** Mapeia a chave genérica do catálogo (rounds/round_reduction_pct/...) para
 * o campo string correspondente em LocalExercise. */
export const TECHNIQUE_FIELD_MAP: Record<
    TechniqueParamKey,
    keyof Omit<LocalExercise, '_id'>
> = {
    rounds: 'technique_rounds',
    round_reduction_pct: 'technique_reduction_pct',
    pause_seconds: 'technique_pause_seconds',
    extra_reps: 'technique_extra_reps',
    hold_seconds: 'technique_hold_seconds',
};

/** Campo numérico do bloco de prescrição. Todos seguem o mesmo formato
 * (rótulo + input estreito + unidade), então vale extrair em vez de repetir. */
export function PrescriptionNumber({
    label,
    unit,
    value,
    onChange,
    min,
    max,
    step,
    helpId,
}: {
    label: string;
    unit: string;
    value: string;
    onChange: (value: string) => void;
    min?: string;
    max?: string;
    step?: string;
    /** id do termo no glossário (glossaryContent.ts) — exibe um HelpTooltip ao lado do rótulo. */
    helpId?: string;
}) {
    return (
        <div className={s.prescriptionField}>
            <label className={s.formLabel}>
                {label}
                {helpId && (
                    <>
                        {' '}
                        <HelpTooltip
                            text={getGlossaryTerm(helpId).short}
                            href={`/ajuda#glossario-${helpId}`}
                            label={`Ajuda sobre ${label.toLowerCase()}`}
                        />
                    </>
                )}
            </label>
            <div className={s.prescriptionInputRow}>
                <input
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={s.smallNumInput}
                />
                <span className={s.seriesUnitLabel}>{unit}</span>
            </div>
        </div>
    );
}

/** Aviso de carga em kg e % de 1RM preenchidas juntas. O app não guarda o
 * 1RM do aluno, então uma não é calculada a partir da outra: as duas chegam ao
 * aluno como estão, e podem se contradizer (80% de 1RM e 20 kg). */
export function LoadPercentageWarning({
    loadKg,
    loadPercentage,
}: {
    loadKg: string;
    loadPercentage: string;
}) {
    if (!(Number(loadKg) > 0) || !(Number(loadPercentage) > 0)) return null;
    return (
        <p className={s.inlineWarning} role="note">
            <FiAlertTriangle aria-hidden /> Carga ({loadKg} kg) e % de 1RM (
            {loadPercentage}%) preenchidas juntas. O app não conhece o 1RM do
            aluno, então a % não vira kg: o aluno vê as duas. Confira se batem
            ou deixe só uma.
        </p>
    );
}

/** Select de grupo muscular — usado tanto na prescrição por exercício quanto
 * na prescrição geral do treino, daí extraído em vez de duplicado. */
export function MuscleGroupSelect({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className={s.prescriptionFieldWide}>
            <label className={s.formLabel}>
                Grupo muscular{' '}
                <HelpTooltip
                    text={getGlossaryTerm('grupo-muscular').short}
                    href="/ajuda#glossario-grupo-muscular"
                    label="Ajuda sobre grupo muscular"
                />
            </label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={s.formSelect}
            >
                <option value="">Não definido</option>
                {MUSCLE_GROUPS.map((g) => (
                    <option key={g} value={g}>
                        {muscleGroupLabel(g)}
                    </option>
                ))}
            </select>
        </div>
    );
}

/** Select tri-estado de substituibilidade — só existe na prescrição por
 * exercício (não faz sentido no bloco de preenchimento geral, já que é uma
 * decisão pontual por exercício, não algo que se aplica em massa). */
export function NonSubstitutableSelect({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className={s.prescriptionFieldWide}>
            <label className={s.formLabel}>
                Substituição{' '}
                <HelpTooltip
                    text={getGlossaryTerm('nao-substituivel').short}
                    href="/ajuda#glossario-nao-substituivel"
                    label="Ajuda sobre não-substituível"
                />
            </label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={s.formSelect}
            >
                <option value="">Sem restrição (padrão)</option>
                <option value="true">Nunca substituível</option>
                <option value="false">Sempre substituível</option>
            </select>
        </div>
    );
}

/** Select de técnica avançada + campos de parâmetro dela — mesmo motivo do
 * MuscleGroupSelect acima: idêntico na prescrição por exercício e na geral,
 * só muda de onde vem/vai o valor. */
export function TechniqueBlock({
    technique,
    onChangeTechnique,
    getParamValue,
    onChangeParam,
}: {
    technique: string;
    onChangeTechnique: (value: string) => void;
    getParamValue: (key: TechniqueParamKey) => string;
    onChangeParam: (key: TechniqueParamKey, value: string) => void;
}) {
    // Parâmetros já digitados, para o passo a passo do "?" citar os números
    // deste exercício. Campo vazio fica de fora e o passo usa a faixa usual.
    const params: TechniqueParamsValue = {};
    for (const f of TECHNIQUE_CATALOG[technique]?.fields ?? []) {
        const raw = getParamValue(f.key);
        if (raw !== '' && Number.isFinite(Number(raw))) params[f.key] = Number(raw);
    }

    return (
        <>
            <div className={s.prescriptionFieldWide}>
                <label className={s.formLabel}>
                    Técnica avançada{' '}
                    <TechniqueHelpTooltip
                        technique={technique}
                        params={params}
                    />
                </label>
                <select
                    value={technique}
                    onChange={(e) => onChangeTechnique(e.target.value)}
                    className={s.formSelect}
                >
                    <option value="">Nenhuma</option>
                    {TECHNIQUE_CATEGORIES.map((category) => (
                        <optgroup key={category} label={category}>
                            {Object.entries(TECHNIQUE_CATALOG)
                                .filter(([, def]) => def.category === category)
                                .map(([value, def]) => (
                                    <option key={value} value={value}>
                                        {def.label}
                                    </option>
                                ))}
                        </optgroup>
                    ))}
                </select>
            </div>
            {technique &&
                TECHNIQUE_CATALOG[technique]?.fields.map((f) => (
                    <PrescriptionNumber
                        key={f.key}
                        label={f.label}
                        unit={f.unit}
                        min={String(f.min)}
                        max={String(f.max)}
                        value={getParamValue(f.key)}
                        onChange={(v) => onChangeParam(f.key, v)}
                    />
                ))}
        </>
    );
}

/** Campos de prescrição preenchíveis em bloco (não pertencem a nenhum
 * exercício até serem aplicados). */
export interface BulkPrescriptionFields {
    /** Séries (vale para qualquer modo de série) e repetições por série (só
     * nos exercícios em modo reps) — ver applyBulkPrescription. */
    series_sets: string;
    /** '' = manter o modo de cada exercício. 'reps'/'time' = trocar TODOS. */
    series_mode: '' | 'reps' | 'time';
    /** Repetições por série — ou SEGUNDOS por série quando o modo é tempo. */
    series_reps: string;
    /** Descanso entre séries, em segundos. */
    rest_seconds: string;
    load_kg: string;
    load_percentage: string;
    tempo_seconds: string;
    rpe_target: string;
    muscle_group: string;
    technique: string;
    technique_rounds: string;
    technique_reduction_pct: string;
    technique_pause_seconds: string;
    technique_extra_reps: string;
    technique_hold_seconds: string;
}

export const EMPTY_BULK_FIELDS: BulkPrescriptionFields = {
    series_sets: '',
    series_mode: '',
    series_reps: '',
    rest_seconds: '',
    load_kg: '',
    load_percentage: '',
    tempo_seconds: '',
    rpe_target: '',
    muscle_group: '',
    technique: '',
    technique_rounds: '',
    technique_reduction_pct: '',
    technique_pause_seconds: '',
    technique_extra_reps: '',
    technique_hold_seconds: '',
};

/** Estado dos campos de preenchimento geral. Fica num hook próprio porque o
 * card que os edita e o botão que os aplica vivem em alturas diferentes da
 * árvore (corpo do card e rodapé do modal). */
export function useBulkPrescriptionFields() {
    const [fields, setFields] =
        useState<BulkPrescriptionFields>(EMPTY_BULK_FIELDS);

    const setField =
        (key: keyof BulkPrescriptionFields): ((value: string) => void) =>
        (value) =>
            setFields((prev) => ({ ...prev, [key]: value }));

    const hasAnyValue = Object.values(fields).some((v) => v !== '');

    return { fields, setFields, setField, hasAnyValue };
}

/** Resumo de 1 linha da prescrição — mostrado na linha do exercício dentro do
 * card do treino, para o personal ler sem abrir. */
export function prescriptionSummary(ex: LocalExercise): string {
    const parts: string[] = [];
    if (ex.technique) {
        parts.push(
            formatTechniqueSummary(ex.technique, {
                rounds: ex.technique_rounds
                    ? Number(ex.technique_rounds)
                    : undefined,
                round_reduction_pct: ex.technique_reduction_pct
                    ? Number(ex.technique_reduction_pct)
                    : undefined,
                pause_seconds: ex.technique_pause_seconds
                    ? Number(ex.technique_pause_seconds)
                    : undefined,
                extra_reps: ex.technique_extra_reps
                    ? Number(ex.technique_extra_reps)
                    : undefined,
                hold_seconds: ex.technique_hold_seconds
                    ? Number(ex.technique_hold_seconds)
                    : undefined,
            }),
        );
    }
    if (ex.load_kg) parts.push(`${ex.load_kg} kg`);
    if (ex.load_percentage) parts.push(`${ex.load_percentage}% 1RM`);
    if (ex.tempo_seconds) parts.push(`Cadência ${ex.tempo_seconds}s`);
    if (ex.rpe_target) parts.push(`RPE ${ex.rpe_target}`);
    if (ex.muscle_group) parts.push(ex.muscle_group);
    if (ex.non_substitutable === 'true') parts.push('Não-substituível');
    else if (ex.non_substitutable === 'false')
        parts.push('Sempre substituível');
    return parts.length > 0
        ? parts.join(' · ')
        : 'Opcional — carga, cadência, RPE e grupo muscular';
}

/** Séries + descanso em uma linha: é o que o personal mais confere de relance
 * ao revisar um treino, e o que substitui o card aberto na lista. */
export function seriesSummary(ex: LocalExercise): string {
    const parts: string[] = [];
    if (ex.series_mode === 'free') {
        if (ex.series_free) parts.push(ex.series_free);
    } else {
        const sets = ex.series_sets || '?';
        const value = ex.series_value || '?';
        parts.push(
            ex.series_mode === 'time'
                ? `${sets} × ${value}s`
                : `${sets} × ${value}`,
        );
    }
    if (ex.rest_seconds) parts.push(`${ex.rest_seconds}s de descanso`);
    return parts.length > 0 ? parts.join(' · ') : 'Séries não definidas';
}

/** Rótulo curto do treino. Os três modos caem no mesmo fallback (`T1`, `T2`…)
 * quando não há rótulo próprio, para que nenhum treino fique sem identidade. */
export function trainingTabLabel(
    t: LocalTraining,
    index: number,
    simpleMode?: boolean,
    isNumbered?: boolean,
): string {
    if (isNumbered) return `T${index + 1}`;
    if (simpleMode)
        return weekdayLabel(t.weekday)?.slice(0, 3) ?? `T${index + 1}`;
    return t.reference || `T${index + 1}`;
}

/** Rótulo por extenso — usado nos títulos de card e no aria-label. */
export function trainingFullLabel(
    t: LocalTraining,
    index: number,
    simpleMode?: boolean,
    isNumbered?: boolean,
): string {
    if (isNumbered) return `Treino ${index + 1}`;
    if (simpleMode)
        return weekdayLabel(t.weekday) ?? `Treino ${index + 1} (sem dia)`;
    return `Treino ${t.reference || index + 1}`;
}
