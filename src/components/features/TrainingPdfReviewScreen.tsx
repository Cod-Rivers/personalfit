'use client';

import { useState } from 'react';
import { FiCheckCircle, FiHelpCircle, FiPlus, FiTrash2, FiX } from 'react-icons/fi';
import {
    type ExtractedExercise,
    type ExtractedTraining,
    type TrainingPdfImport,
    updateTrainingPdfImport,
    confirmMyTrainingPdfImport,
} from '@/libs/trainingPdfImportService';
import { createMacrocycle, type ExerciseRequest, type TrainingRequest } from '@/libs/planningService';
import ExercisePicker from '@/app/personal/_shared/periodizacao/components/ExercisePicker';
import { TECHNIQUE_CATALOG } from '@/libs/trainingTechniques';
import styles from './TrainingPdfReviewScreen.module.css';

interface Props {
    data: TrainingPdfImport;
    role: 'personal' | 'student';
    studentId?: string;
    onApplied: (result: { macrocycleId: string }) => void;
    onCancel: () => void;
}

/** Converte os dias/exercícios extraídos e revisados para o payload que
 * POST /students/:id/planning já aceita (mesmo endpoint usado pelo editor de
 * periodização normal) — o fluxo do personal não cria macrociclo por uma via
 * própria, só pré-preenche esse payload a partir do PDF. */
function toMacrocycleRequest(trainings: ExtractedTraining[]) {
    const mapped: TrainingRequest[] = trainings.map((t) => ({
        reference: t.reference || 'Treino',
        exercises: t.exercises.map((e): ExerciseRequest => ({
            exercise_library_id: e.exercise_library_id,
            name: e.raw_name,
            series: [],
            variations: '',
            comments: e.notes ?? '',
            series_label: e.series_label,
            video_url: '',
            video_thumb: '',
            timed: false,
            load_kg: e.load_kg,
            rest_seconds: e.rest_seconds,
            technique: e.technique,
            technique_params: e.technique_params,
        })),
    }));

    return {
        name: 'Treino importado de PDF',
        goal: 'Importado de PDF',
        planning_mode: 'simple' as const,
        simple_day_label: 'number' as const,
        mesocycles: [
            {
                order: 1,
                name: 'Importado de PDF',
                phase: 'Hipertrofia',
                duration_weeks: 4,
                methodology: '',
                trainings: mapped,
            },
        ],
    };
}

export default function TrainingPdfReviewScreen({
    data,
    role,
    studentId,
    onApplied,
    onCancel,
}: Props) {
    const [trainings, setTrainings] = useState<ExtractedTraining[]>(
        () => structuredClone(data.extracted_trainings ?? []),
    );
    const [pickerFor, setPickerFor] = useState<{ t: number; e: number } | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [confirmDiscard, setConfirmDiscard] = useState(false);

    const totalExercises = trainings.reduce((n, t) => n + t.exercises.length, 0);
    const unmatchedCount = trainings.reduce(
        (n, t) => n + t.exercises.filter((e) => e.match_status === 'unmatched').length,
        0,
    );

    function updateExercise(
        ti: number,
        ei: number,
        patch: Partial<ExtractedExercise>,
    ) {
        setTrainings((prev) => {
            const next = structuredClone(prev);
            next[ti].exercises[ei] = { ...next[ti].exercises[ei], ...patch };
            return next;
        });
    }

    function removeExercise(ti: number, ei: number) {
        setTrainings((prev) => {
            const next = structuredClone(prev);
            next[ti].exercises.splice(ei, 1);
            return next;
        });
    }

    function updateReference(ti: number, reference: string) {
        setTrainings((prev) => {
            const next = structuredClone(prev);
            next[ti].reference = reference;
            return next;
        });
    }

    function addTraining() {
        setTrainings((prev) => [
            ...prev,
            { reference: `Treino ${prev.length + 1}`, exercises: [] },
        ]);
    }

    function removeTraining(ti: number) {
        setTrainings((prev) => prev.filter((_, i) => i !== ti));
    }

    function addExercise(ti: number) {
        setTrainings((prev) => {
            const next = structuredClone(prev);
            next[ti].exercises.push({ raw_name: '', match_status: 'unmatched' });
            return next;
        });
    }

    async function handleApply() {
        setError('');
        setSaving(true);
        try {
            await updateTrainingPdfImport(data.id, trainings, studentId);

            if (role === 'personal' && studentId) {
                const macro = await createMacrocycle(
                    studentId,
                    toMacrocycleRequest(trainings),
                );
                onApplied({ macrocycleId: macro.id });
            } else {
                await confirmMyTrainingPdfImport(data.id);
                onApplied({ macrocycleId: data.id });
            }
        } catch (e) {
            setError((e as Error).message ?? 'Erro ao aplicar o treino importado');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className={styles.wrap}>
            <p className={styles.summary}>
                {totalExercises} exercício(s) em {trainings.length} treino(s) extraídos de{' '}
                <strong>{data.file_name}</strong>.
                {unmatchedCount > 0 && (
                    <>
                        {' '}
                        <span className={styles.warnText}>
                            {unmatchedCount} sem correspondência na biblioteca — revise
                            antes de aplicar (não impede a importação).
                        </span>
                    </>
                )}
            </p>

            {error && <div className={styles.errorBox}>{error}</div>}

            {trainings.length === 0 && (
                <div className={styles.emptyBox}>
                    Nenhum exercício foi reconhecido automaticamente neste PDF.
                    Você pode montar o treino manualmente abaixo, ou cancelar e
                    tentar com outro arquivo.
                </div>
            )}

            {trainings.map((training, ti) => (
                <div key={ti} className={styles.trainingBlock}>
                    <div className={styles.trainingHead}>
                        <input
                            value={training.reference}
                            onChange={(e) => updateReference(ti, e.target.value)}
                            className={styles.trainingRefInput}
                            placeholder="Nome do treino (ex: Treino A)"
                        />
                        <button
                            type="button"
                            onClick={() => removeTraining(ti)}
                            className={styles.iconBtnDanger}
                            aria-label="Remover treino"
                        >
                            <FiTrash2 />
                        </button>
                    </div>

                    {training.exercises.map((ex, ei) => (
                        <div key={ei} className={styles.exerciseRow}>
                            <div className={styles.exerciseTop}>
                                <input
                                    value={ex.raw_name}
                                    onChange={(e) =>
                                        updateExercise(ti, ei, { raw_name: e.target.value })
                                    }
                                    className={styles.exerciseNameInput}
                                    placeholder="Nome do exercício"
                                />
                                {ex.match_status === 'matched' && (
                                    <span className={styles.badgeMatched} title="Vinculado à biblioteca">
                                        <FiCheckCircle /> Vinculado
                                    </span>
                                )}
                                {ex.match_status === 'manual' && (
                                    <span className={styles.badgeMatched} title="Vinculado manualmente">
                                        <FiCheckCircle /> Vinculado
                                    </span>
                                )}
                                {ex.match_status === 'unmatched' && (
                                    <button
                                        type="button"
                                        className={styles.badgeUnmatched}
                                        onClick={() => setPickerFor({ t: ti, e: ei })}
                                        title="Buscar na biblioteca de exercícios"
                                    >
                                        <FiHelpCircle /> Sem correspondência — buscar
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => removeExercise(ti, ei)}
                                    className={styles.iconBtnDanger}
                                    aria-label="Remover exercício"
                                >
                                    <FiX />
                                </button>
                            </div>

                            {pickerFor?.t === ti && pickerFor?.e === ei && (
                                <ExercisePicker
                                    onPick={(item) => {
                                        updateExercise(ti, ei, {
                                            exercise_library_id: item.id,
                                            match_status: 'manual',
                                            match_score: 1,
                                        });
                                        setPickerFor(null);
                                    }}
                                    onClose={() => setPickerFor(null)}
                                />
                            )}

                            <div className={styles.exerciseFields}>
                                <label className={styles.fieldLabel}>
                                    Séries/reps
                                    <input
                                        value={ex.series_label ?? ''}
                                        onChange={(e) =>
                                            updateExercise(ti, ei, {
                                                series_label: e.target.value || undefined,
                                            })
                                        }
                                        className={styles.fieldInput}
                                        placeholder="Ex: 3x12"
                                    />
                                </label>
                                <label className={styles.fieldLabel}>
                                    Carga (kg)
                                    <input
                                        type="number"
                                        value={ex.load_kg ?? ''}
                                        onChange={(e) =>
                                            updateExercise(ti, ei, {
                                                load_kg: e.target.value
                                                    ? Number(e.target.value)
                                                    : undefined,
                                            })
                                        }
                                        className={styles.fieldInput}
                                    />
                                </label>
                                <label className={styles.fieldLabel}>
                                    Descanso (seg)
                                    <input
                                        type="number"
                                        value={ex.rest_seconds ?? ''}
                                        onChange={(e) =>
                                            updateExercise(ti, ei, {
                                                rest_seconds: e.target.value
                                                    ? Number(e.target.value)
                                                    : undefined,
                                            })
                                        }
                                        className={styles.fieldInput}
                                    />
                                </label>
                                <label className={styles.fieldLabel}>
                                    Técnica
                                    <select
                                        value={ex.technique ?? ''}
                                        onChange={(e) =>
                                            updateExercise(ti, ei, {
                                                technique: e.target.value || undefined,
                                            })
                                        }
                                        className={styles.fieldInput}
                                    >
                                        <option value="">Nenhuma</option>
                                        {Object.entries(TECHNIQUE_CATALOG).map(
                                            ([key, def]) => (
                                                <option key={key} value={key}>
                                                    {def.label}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </label>
                            </div>
                            {ex.notes && (
                                <p className={styles.exerciseNotes}>{ex.notes}</p>
                            )}
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={() => addExercise(ti)}
                        className={styles.btnAddExercise}
                    >
                        <FiPlus /> Adicionar exercício
                    </button>
                </div>
            ))}

            <button type="button" onClick={addTraining} className={styles.btnAddTraining}>
                <FiPlus /> Adicionar treino
            </button>

            <div className={styles.footerActions}>
                <button type="button" onClick={onCancel} className={styles.btnCancel}>
                    Cancelar
                </button>
                {role === 'student' && !confirmDiscard ? (
                    <button
                        type="button"
                        onClick={() => setConfirmDiscard(true)}
                        disabled={saving || trainings.length === 0}
                        className={styles.btnSubmit}
                    >
                        Importar para Meus Treinos
                    </button>
                ) : role === 'student' ? (
                    <div className={styles.confirmBox}>
                        <span>
                            Isso vai substituir seu plano de treino ativo atual. Confirmar?
                        </span>
                        <button
                            type="button"
                            onClick={() => setConfirmDiscard(false)}
                            className={styles.btnCancel}
                        >
                            Voltar
                        </button>
                        <button
                            type="button"
                            onClick={handleApply}
                            disabled={saving}
                            className={styles.btnSubmit}
                        >
                            {saving ? 'Importando...' : 'Sim, substituir'}
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={handleApply}
                        disabled={saving || trainings.length === 0}
                        className={styles.btnSubmit}
                    >
                        {saving ? 'Aplicando...' : 'Usar no plano do aluno'}
                    </button>
                )}
            </div>
        </div>
    );
}
