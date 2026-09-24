'use client';

import { useEffect, useState } from 'react';
import {
    PrescriptionNumber,
    LoadPercentageWarning,
    MuscleGroupSelect,
    TechniqueBlock,
    TECHNIQUE_FIELD_MAP,
    useBulkPrescriptionFields,
    type BulkPrescriptionFields,
} from '../fields/PrescriptionFields';
import s from '../../builder.module.css';

/**
 * Preenchimento geral da prescrição do treino.
 *
 * Só o que for preenchido aqui é aplicado — os demais campos de cada exercício
 * continuam intocados, para o personal ajustar pontualmente depois.
 *
 * `onPendingChange` conta ao modal o que está preenchido e ainda não foi
 * aplicado: o "Concluir" do rodapé só volta de tela, e sair assim descartava
 * a prescrição em silêncio (o personal achava que tinha aplicado).
 */
export default function BulkPrescriptionCard({
    exerciseCount,
    onApply,
    onPendingChange,
}: {
    exerciseCount: number;
    onApply: (fields: BulkPrescriptionFields) => void;
    onPendingChange?: (fields: BulkPrescriptionFields | null) => void;
}) {
    const { fields, setFields, setField, hasAnyValue } =
        useBulkPrescriptionFields();
    // Só existe na tela: o que vai adiante é sempre em SEGUNDOS (é como o
    // exercício por tempo guarda a série).
    const [timeUnit, setTimeUnit] = useState<'seg' | 'min'>('seg');
    const isTime = fields.series_mode === 'time';

    /** Os campos como vão para os exercícios: tempo sempre em segundos. */
    const resolved = (): BulkPrescriptionFields => ({
        ...fields,
        series_reps:
            isTime && timeUnit === 'min' && fields.series_reps !== ''
                ? String(Math.round(Number(fields.series_reps) * 60))
                : fields.series_reps,
    });

    useEffect(() => {
        onPendingChange?.(hasAnyValue ? resolved() : null);
        // resolved() só depende de fields e timeUnit.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fields, timeUnit, hasAnyValue, onPendingChange]);

    const handleApply = () => {
        if (!hasAnyValue) return;
        if (
            !confirm(
                `Aplicar esta prescrição geral aos ${exerciseCount} exercício${exerciseCount === 1 ? '' : 's'} deste treino? Os campos preenchidos aqui substituem os valores individuais já definidos — os demais campos de cada exercício continuam como estão.`,
            )
        )
            return;
        onApply(resolved());
    };

    return (
        <>
            <p className={s.cardIntro}>
                Preenche de uma vez os campos que valem para quase todos os
                exercícios. O que ficar em branco não é alterado.
            </p>

            <div className={s.prescriptionBody}>
                <PrescriptionNumber
                    label="Séries"
                    unit="séries"
                    min="1"
                    value={fields.series_sets}
                    onChange={setField('series_sets')}
                    helpId="series-repeticoes"
                />
                <div className={s.prescriptionField}>
                    <label className={s.formLabel} htmlFor="bulk-series-mode">
                        Tipo de série
                    </label>
                    <select
                        id="bulk-series-mode"
                        value={fields.series_mode}
                        onChange={(e) =>
                            setField('series_mode')(e.target.value)
                        }
                        className={s.formSelect}
                    >
                        <option value="">Manter o de cada exercício</option>
                        <option value="reps">Repetições</option>
                        <option value="time">Tempo</option>
                    </select>
                </div>
                <div className={s.prescriptionField}>
                    <label className={s.formLabel} htmlFor="bulk-series-value">
                        {isTime ? 'Tempo por série' : 'Repetições'}
                    </label>
                    <div className={s.prescriptionInputRow}>
                        <input
                            id="bulk-series-value"
                            type="number"
                            min="1"
                            step={isTime && timeUnit === 'min' ? '0.5' : '1'}
                            value={fields.series_reps}
                            onChange={(e) =>
                                setField('series_reps')(e.target.value)
                            }
                            className={s.smallNumInput}
                        />
                        {isTime ? (
                            <select
                                value={timeUnit}
                                onChange={(e) =>
                                    setTimeUnit(e.target.value as 'seg' | 'min')
                                }
                                className={s.formSelect}
                                style={{ width: 'auto' }}
                                aria-label="Unidade do tempo"
                            >
                                <option value="seg">seg</option>
                                <option value="min">min</option>
                            </select>
                        ) : (
                            <span className={s.seriesUnitLabel}>reps</span>
                        )}
                    </div>
                </div>
                {fields.series_mode === '' && fields.series_reps !== '' && (
                    <p
                        className={s.fieldHint}
                        style={{ gridColumn: '1 / -1', marginTop: 0 }}
                    >
                        Sem escolher o tipo, as repetições valem só para os
                        exercícios de séries × repetições. Os feitos por tempo
                        ou com série em texto livre (ex.: pirâmide 12-10-8)
                        mantêm a série deles.
                    </p>
                )}
                {fields.series_mode !== '' && (
                    <p
                        className={s.fieldHint}
                        style={{ gridColumn: '1 / -1', marginTop: 0 }}
                    >
                        Troca o tipo de série de TODOS os exercícios deste
                        treino, inclusive os com série em texto livre.
                    </p>
                )}
                <PrescriptionNumber
                    label="Descanso entre séries"
                    unit="seg"
                    min="0"
                    step="5"
                    value={fields.rest_seconds}
                    onChange={setField('rest_seconds')}
                    helpId="descanso"
                />
                <PrescriptionNumber
                    label="Carga"
                    unit="kg"
                    min="0"
                    step="0.5"
                    value={fields.load_kg}
                    onChange={setField('load_kg')}
                    helpId="carga"
                />
                <PrescriptionNumber
                    label="% de 1RM"
                    unit="%"
                    min="0"
                    max="100"
                    value={fields.load_percentage}
                    onChange={setField('load_percentage')}
                    helpId="1rm"
                />
                <LoadPercentageWarning
                    loadKg={fields.load_kg}
                    loadPercentage={fields.load_percentage}
                />
                <PrescriptionNumber
                    label="Cadência"
                    unit="seg"
                    min="0"
                    value={fields.tempo_seconds}
                    onChange={setField('tempo_seconds')}
                    helpId="cadencia"
                />
                <PrescriptionNumber
                    label="RPE alvo"
                    unit="1-10"
                    min="1"
                    max="10"
                    value={fields.rpe_target}
                    onChange={setField('rpe_target')}
                    helpId="rpe"
                />
                <MuscleGroupSelect
                    value={fields.muscle_group}
                    onChange={setField('muscle_group')}
                />
                <TechniqueBlock
                    technique={fields.technique}
                    onChangeTechnique={setField('technique')}
                    getParamValue={(key) =>
                        fields[
                            TECHNIQUE_FIELD_MAP[
                                key
                            ] as keyof BulkPrescriptionFields
                        ]
                    }
                    onChangeParam={(key, value) =>
                        setFields((prev) => ({
                            ...prev,
                            [TECHNIQUE_FIELD_MAP[
                                key
                            ] as keyof BulkPrescriptionFields]: value,
                        }))
                    }
                />
            </div>

            <button
                type="button"
                className={s.btnBlock}
                disabled={!hasAnyValue}
                onClick={handleApply}
            >
                Clique aqui para aplicar
            </button>
        </>
    );
}
