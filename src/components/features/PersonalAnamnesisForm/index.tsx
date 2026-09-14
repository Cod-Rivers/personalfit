'use client';

import { ReactNode, useRef, useState } from 'react';
import type {
    PersonalAnamnesisAnswer,
    PersonalAnamnesisQuestion,
    PersonalAnamnesisQuestionnaire,
} from '@/libs/personalAnamnesisService';
import s from './PersonalAnamnesisForm.module.css';

type Draft = Record<string, { values: string[]; text: string }>;

interface Props {
    questionnaire: PersonalAnamnesisQuestionnaire;
    /** Conteúdo da última etapa, antes do botão de envio (consentimento do
     * aluno ou declaração do personal). */
    confirmSlot?: ReactNode;
    /** false desabilita o envio (ex.: consentimento não marcado). */
    canSubmit?: boolean;
    submitting?: boolean;
    submitLabel?: string;
    errorMessage?: string | null;
    onSubmit: (answers: PersonalAnamnesisAnswer[]) => void;
    /** "Voltar" na primeira etapa. Sem ele, o botão fica desabilitado. */
    onBackBeforeFirst?: () => void;
}

const TEXT_MAX_LENGTH = 2000;

/**
 * Formulário da Anamnese do personal: uma etapa por seção do catálogo e uma
 * etapa final de envio. Suporta escolha única, múltipla (com opção exclusiva,
 * ex.: "Nenhuma") e texto livre — o QuestionsRenderer da Triagem automática
 * só faz escolha única.
 *
 * A validação aqui é só de conveniência (obrigatórias por etapa); quem manda
 * é o backend, que confere tudo contra o catálogo.
 */
export default function PersonalAnamnesisForm({
    questionnaire,
    confirmSlot,
    canSubmit = true,
    submitting = false,
    submitLabel = 'Enviar',
    errorMessage,
    onSubmit,
    onBackBeforeFirst,
}: Props) {
    const [draft, setDraft] = useState<Draft>({});
    const [stepIndex, setStepIndex] = useState(0);
    const [stepError, setStepError] = useState<string | null>(null);
    const topRef = useRef<HTMLDivElement>(null);

    const sections = questionnaire.sections.filter((section) =>
        questionnaire.questions.some((q) => q.section === section.key),
    );
    const totalSteps = sections.length + 1;
    const isConfirmStep = stepIndex >= sections.length;
    const section = sections[stepIndex];
    const questions = section
        ? questionnaire.questions.filter((q) => q.section === section.key)
        : [];

    const entry = (key: string) => draft[key] ?? { values: [], text: '' };

    const isAnswered = (q: PersonalAnamnesisQuestion) => {
        const e = entry(q.key);
        return q.type === 'text' ? e.text.trim() !== '' : e.values.length > 0;
    };

    function toggleOption(q: PersonalAnamnesisQuestion, value: string) {
        const isExclusive = (v: string) =>
            q.options?.find((o) => o.value === v)?.exclusive ?? false;

        setDraft((prev) => {
            const current = prev[q.key]?.values ?? [];
            let next: string[];
            if (q.type === 'single') {
                next = current[0] === value ? [] : [value];
            } else if (current.includes(value)) {
                next = current.filter((v) => v !== value);
            } else if (isExclusive(value)) {
                next = [value];
            } else {
                next = [...current.filter((v) => !isExclusive(v)), value];
            }
            return { ...prev, [q.key]: { values: next, text: prev[q.key]?.text ?? '' } };
        });
        setStepError(null);
    }

    function setText(q: PersonalAnamnesisQuestion, text: string) {
        setDraft((prev) => ({
            ...prev,
            [q.key]: { values: prev[q.key]?.values ?? [], text },
        }));
        setStepError(null);
    }

    function goTo(index: number) {
        setStepIndex(index);
        setStepError(null);
        topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function handleNext() {
        const missing = questions.find((q) => q.required && !isAnswered(q));
        if (missing) {
            setStepError(`Responda: “${missing.text}”`);
            return;
        }
        goTo(stepIndex + 1);
    }

    function handleBack() {
        if (stepIndex === 0) {
            onBackBeforeFirst?.();
            return;
        }
        goTo(stepIndex - 1);
    }

    function handleSubmit() {
        const answers: PersonalAnamnesisAnswer[] = [];
        for (const q of questionnaire.questions) {
            const e = draft[q.key];
            if (!e) continue;
            if (q.type === 'text') {
                const text = e.text.trim();
                if (text) answers.push({ question_key: q.key, text });
            } else if (e.values.length > 0) {
                answers.push({ question_key: q.key, values: e.values });
            }
        }
        onSubmit(answers);
    }

    const progressPct = Math.round(((stepIndex + 1) / totalSteps) * 100);
    const visibleError = stepError ?? errorMessage;

    return (
        <div className={s.form} ref={topRef}>
            <div className={s.progress}>
                <span className={s.progressStep}>
                    Etapa {stepIndex + 1} de {totalSteps}
                </span>
                <span className={s.progressTitle}>
                    {isConfirmStep ? 'Enviar' : section?.title}
                </span>
            </div>
            <div
                className={s.progressBar}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPct}
            >
                <div className={s.progressFill} style={{ width: `${progressPct}%` }} />
            </div>

            {!isConfirmStep &&
                questions.map((q) => {
                    const e = entry(q.key);
                    return (
                        <fieldset key={q.key} className={s.question}>
                            <legend className={s.questionText}>
                                {q.text}
                                {q.required && (
                                    <span className={s.required} aria-label="obrigatória">
                                        {' '}*
                                    </span>
                                )}
                            </legend>
                            {q.help && <p className={s.help}>{q.help}</p>}

                            {q.type === 'text' ? (
                                <>
                                    <textarea
                                        className={s.textarea}
                                        value={e.text}
                                        maxLength={TEXT_MAX_LENGTH}
                                        rows={3}
                                        onChange={(ev) => setText(q, ev.target.value)}
                                        aria-label={q.text}
                                    />
                                    {e.text.length > TEXT_MAX_LENGTH - 200 && (
                                        <p className={s.hint}>
                                            {e.text.length}/{TEXT_MAX_LENGTH} caracteres
                                        </p>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div
                                        className={s.options}
                                        role={q.type === 'single' ? 'radiogroup' : 'group'}
                                        aria-label={q.text}
                                    >
                                        {q.options?.map((opt) => {
                                            const selected = e.values.includes(opt.value);
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    role={q.type === 'single' ? 'radio' : 'checkbox'}
                                                    aria-checked={selected}
                                                    className={`${s.option} ${selected ? s.optionSelected : ''}`}
                                                    onClick={() => toggleOption(q, opt.value)}
                                                >
                                                    {opt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {q.type === 'multi' && (
                                        <p className={s.hint}>Pode marcar mais de uma.</p>
                                    )}
                                </>
                            )}
                        </fieldset>
                    );
                })}

            {isConfirmStep && <div className={s.confirm}>{confirmSlot}</div>}

            {visibleError && (
                <div className={s.error} role="alert">
                    {visibleError}
                </div>
            )}

            <div className={s.actions}>
                <button
                    type="button"
                    className={s.btnSecondary}
                    onClick={handleBack}
                    disabled={submitting || (stepIndex === 0 && !onBackBeforeFirst)}
                >
                    Voltar
                </button>
                {isConfirmStep ? (
                    <button
                        type="button"
                        className={s.btnPrimary}
                        onClick={handleSubmit}
                        disabled={submitting || !canSubmit}
                    >
                        {submitting ? 'Enviando…' : submitLabel}
                    </button>
                ) : (
                    <button type="button" className={s.btnPrimary} onClick={handleNext}>
                        Continuar
                    </button>
                )}
            </div>
        </div>
    );
}
