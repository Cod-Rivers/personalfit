'use client';
import { useCallback, useEffect, useState } from 'react';
import {
    getCurrentMealPlan,
    getMealPlanHistory,
    createMealPlanVersion,
    setMealPlanPermission,
    uploadMealPlanPdf,
    deleteMealPlanVersion,
    MAX_MEAL_PLAN_PDF_MB,
    MAX_MEAL_PLAN_PDFS,
    type MealItem,
    type MealPlanResponse,
    type MealPlanVersion,
} from '@/libs/mealPlanService';
import s from './MealPlanEditor.module.css';

interface Props {
    /** Presente = view do personal para um aluno específico; ausente = view do próprio aluno logado. */
    studentId?: string;
}

const emptyMeal: MealItem = { name: '', time: '', description: '' };

function extractErrorMessage(err: unknown, fallback: string): string {
    const data = (
        err as { response?: { data?: { error?: string; message?: string } } }
    )?.response?.data;
    return data?.error || data?.message || fallback;
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function MealPlanEditor({ studentId }: Props) {
    const isPersonalView = !!studentId;

    const [plan, setPlan] = useState<MealPlanResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [proBlocked, setProBlocked] = useState(false);

    const [meals, setMeals] = useState<MealItem[]>([{ ...emptyMeal }]);
    const [notes, setNotes] = useState('');
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    const [history, setHistory] = useState<MealPlanVersion[] | null>(null);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        setProBlocked(false);
        try {
            const data = await getCurrentMealPlan(studentId);
            setPlan(data);
        } catch (err) {
            const status = (err as { response?: { status?: number } })
                ?.response?.status;
            if (status === 403) {
                setProBlocked(true);
            } else {
                setError(
                    extractErrorMessage(err, 'Erro ao carregar plano alimentar.'),
                );
            }
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    useEffect(() => {
        load();
    }, [load]);

    const toggleHistory = useCallback(async () => {
        if (history !== null) {
            setHistory(null);
            return;
        }
        setLoadingHistory(true);
        try {
            const data = await getMealPlanHistory(studentId);
            setHistory(data);
        } catch {
            setError('Erro ao carregar histórico do plano.');
        } finally {
            setLoadingHistory(false);
        }
    }, [studentId, history]);

    const updateMeal = (index: number, field: keyof MealItem, value: string) => {
        setMeals((prev) =>
            prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
        );
    };

    const removeMeal = (index: number) => {
        setMeals((prev) => prev.filter((_, i) => i !== index));
    };

    const addMeal = () => setMeals((prev) => [...prev, { ...emptyMeal }]);

    const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        if (file && file.size > MAX_MEAL_PLAN_PDF_MB * 1024 * 1024) {
            setError(
                `O PDF excede o limite de ${MAX_MEAL_PLAN_PDF_MB}MB. Escolha um arquivo menor.`,
            );
            setPdfFile(null);
            e.target.value = '';
            return;
        }
        setError('');
        setPdfFile(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const filledMeals = meals.filter((m) => m.name.trim() !== '');
        if (filledMeals.length === 0 && !pdfFile) {
            setError('Adicione ao menos uma refeição ou anexe um PDF.');
            return;
        }

        setSaving(true);
        try {
            let pdfKey: string | undefined;
            let pdfFileName: string | undefined;
            if (pdfFile) {
                const uploaded = await uploadMealPlanPdf(pdfFile, studentId);
                pdfKey = uploaded.pdf_key;
                pdfFileName = uploaded.pdf_file_name;
            }

            await createMealPlanVersion(
                {
                    meals: filledMeals,
                    pdf_key: pdfKey,
                    pdf_file_name: pdfFileName,
                    notes,
                },
                studentId,
            );

            setMeals([{ ...emptyMeal }]);
            setNotes('');
            setPdfFile(null);
            setHistory(null);
            await load();
        } catch (err) {
            setError(extractErrorMessage(err, 'Erro ao salvar plano alimentar.'));
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteVersion = async (versionId: string) => {
        if (
            !window.confirm(
                'Apagar esta versão do histórico? Essa ação não pode ser desfeita.',
            )
        ) {
            return;
        }
        setError('');
        try {
            await deleteMealPlanVersion(versionId, studentId);
            setHistory((prev) =>
                prev ? prev.filter((v) => v.id !== versionId) : prev,
            );
        } catch (err) {
            setError(extractErrorMessage(err, 'Erro ao apagar versão do plano.'));
        }
    };

    const handleTogglePermission = async (checked: boolean) => {
        if (!studentId) return;
        setError('');
        try {
            await setMealPlanPermission(studentId, checked);
            setPlan((prev) =>
                prev ? { ...prev, student_can_edit: checked } : prev,
            );
        } catch {
            setError('Erro ao atualizar permissão do aluno.');
        }
    };

    if (proBlocked) {
        return (
            <div className={s.proBanner}>
                <p>
                    <strong>Plano alimentar e evolução</strong> são
                    funcionalidades exclusivas do Plano Pro.
                </p>
                <p>Assine o Plano Pro para liberar o acesso.</p>
            </div>
        );
    }

    if (loading) {
        return <p className={s.loading}>Carregando plano alimentar...</p>;
    }

    const canEdit = plan?.can_edit ?? false;

    return (
        <div className={s.section}>
            {error && <div className={s.errorMsg}>{error}</div>}

            <div className={s.card}>
                <h2 className={s.cardTitle}>Plano atual</h2>
                {plan?.current ? (
                    <>
                        {plan.current.meals.map((m, i) => (
                            <div key={i} className={s.historyItem}>
                                <strong>{m.name}</strong>
                                {m.time ? ` · ${m.time}` : ''}
                                {m.description ? (
                                    <p style={{ margin: '4px 0 0' }}>
                                        {m.description}
                                    </p>
                                ) : null}
                                {typeof m.calories === 'number' ? (
                                    <p
                                        className={s.historyMeta}
                                        style={{ margin: '2px 0 0' }}
                                    >
                                        {m.calories} kcal
                                    </p>
                                ) : null}
                            </div>
                        ))}
                        {plan.current.pdf_url && (
                            <p className={s.pdfRow}>
                                📄{' '}
                                <a
                                    className={s.pdfLink}
                                    href={plan.current.pdf_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {plan.current.pdf_file_name || 'plano.pdf'}
                                </a>
                            </p>
                        )}
                        {plan.current.notes && <p>{plan.current.notes}</p>}
                        <p className={s.historyMeta}>
                            Atualizado por{' '}
                            {plan.current.created_by_role === 'personal'
                                ? 'personal'
                                : 'aluno'}{' '}
                            em {formatDate(plan.current.created_at)}
                        </p>
                        <button
                            type="button"
                            className={s.historyToggle}
                            onClick={toggleHistory}
                        >
                            {history !== null
                                ? 'Ocultar histórico'
                                : 'Ver histórico de versões'}
                        </button>
                        {loadingHistory && (
                            <p className={s.historyMeta}>Carregando...</p>
                        )}
                        {history && history.length > 1 && (
                            <div style={{ marginTop: 10 }}>
                                {history.slice(1).map((v) => (
                                    <div key={v.id} className={s.historyItem}>
                                        <p className={s.historyMeta}>
                                            {v.created_by_role === 'personal'
                                                ? 'Personal'
                                                : 'Aluno'}{' '}
                                            · {formatDate(v.created_at)}
                                        </p>
                                        {v.meals.map((m, i) => (
                                            <p key={i} style={{ margin: '2px 0' }}>
                                                {m.name}
                                                {m.time ? ` (${m.time})` : ''}
                                            </p>
                                        ))}
                                        {v.pdf_url && (
                                            <a
                                                className={s.pdfLink}
                                                href={v.pdf_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {v.pdf_file_name || 'plano.pdf'}
                                            </a>
                                        )}
                                        {canEdit && (
                                            <button
                                                type="button"
                                                className={s.btnDeleteVersion}
                                                onClick={() => handleDeleteVersion(v.id)}
                                                title="Apagar esta versão do histórico"
                                            >
                                                Apagar versão
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <p className={s.historyMeta}>
                        Nenhum plano registrado ainda.
                    </p>
                )}
            </div>

            {isPersonalView && (
                <div className={s.card}>
                    <label className={s.toggleRow}>
                        <input
                            type="checkbox"
                            checked={plan?.student_can_edit ?? false}
                            onChange={(e) =>
                                handleTogglePermission(e.target.checked)
                            }
                        />
                        Permitir que o aluno também edite o plano
                    </label>
                </div>
            )}

            {canEdit ? (
                <form className={s.card} onSubmit={handleSubmit}>
                    <h2 className={s.cardTitle}>Nova versão do plano</h2>

                    {meals.map((meal, i) => (
                        <div key={i} className={s.mealRow}>
                            <input
                                className={s.formInput}
                                placeholder="Refeição (ex: Café da manhã)"
                                value={meal.name}
                                onChange={(e) =>
                                    updateMeal(i, 'name', e.target.value)
                                }
                            />
                            <input
                                className={s.formInput}
                                placeholder="Horário"
                                value={meal.time ?? ''}
                                onChange={(e) =>
                                    updateMeal(i, 'time', e.target.value)
                                }
                                style={{ maxWidth: 110 }}
                            />
                            <input
                                className={s.formInput}
                                placeholder="Alimentos / descrição"
                                value={meal.description ?? ''}
                                onChange={(e) =>
                                    updateMeal(i, 'description', e.target.value)
                                }
                            />
                            {meals.length > 1 && (
                                <button
                                    type="button"
                                    className={s.btnRemove}
                                    onClick={() => removeMeal(i)}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}
                    <button type="button" className={s.btnAdd} onClick={addMeal}>
                        + Adicionar refeição
                    </button>

                    <div className={s.formGroup}>
                        <label className={s.formLabel}>
                            Ou anexar PDF do plano (máx. {MAX_MEAL_PLAN_PDF_MB}MB,
                            limite de {MAX_MEAL_PLAN_PDFS} PDFs no histórico)
                        </label>
                        <input
                            type="file"
                            accept="application/pdf"
                            onChange={handlePdfChange}
                        />
                    </div>

                    <div className={s.formGroup}>
                        <label className={s.formLabel}>Observações</label>
                        <textarea
                            className={s.formTextarea}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        className={s.btnSubmit}
                        disabled={saving}
                    >
                        {saving ? 'Salvando...' : 'Salvar nova versão'}
                    </button>
                </form>
            ) : (
                <p className={s.readOnlyNote}>
                    Você não tem permissão para editar o plano alimentar. Fale
                    com seu personal trainer.
                </p>
            )}
        </div>
    );
}
