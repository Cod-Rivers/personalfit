'use client';

import {
    PrescriptionNumber,
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
 */
export default function BulkPrescriptionCard({
    exerciseCount,
    onApply,
}: {
    exerciseCount: number;
    onApply: (fields: BulkPrescriptionFields) => void;
}) {
    const { fields, setFields, setField, hasAnyValue } =
        useBulkPrescriptionFields();

    const handleApply = () => {
        if (!hasAnyValue) return;
        if (
            !confirm(
                `Aplicar esta prescrição geral aos ${exerciseCount} exercício${exerciseCount === 1 ? '' : 's'} deste treino? Os campos preenchidos aqui substituem os valores individuais já definidos — os demais campos de cada exercício continuam como estão.`,
            )
        )
            return;
        onApply(fields);
    };

    return (
        <>
            <p className={s.cardIntro}>
                Preenche de uma vez os campos que valem para quase todos os
                exercícios. O que ficar em branco não é alterado.
            </p>

            <div className={s.prescriptionBody}>
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
                Aplicar a todos os {exerciseCount} exercício
                {exerciseCount === 1 ? '' : 's'}
            </button>
        </>
    );
}
