'use client';

import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    createMacrocycle,
    type MacrocycleResponse,
} from '@/libs/planningService';
import Modal from '@/components/system/Modal';
import { useCardStack } from '@/hooks/useCardStack';
import s from '../builder.module.css';

const schema = z
    .object({
        name: z.string().min(1, 'Nome obrigatório'),
        goal: z.string().min(1, 'Objetivo obrigatório'),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
    })
    .refine(
        (data) =>
            !data.start_date ||
            !data.end_date ||
            data.end_date > data.start_date,
        {
            message: 'Data de término deve ser depois da data de início',
            path: ['end_date'],
        },
    );
type FormValues = z.infer<typeof schema>;

type PlanningMode = 'periodized' | 'simple';
type DayLabelStyle = 'weekday' | 'number';
type Step = 'mode' | 'details';

const MODE_OPTIONS = [
    {
        mode: 'periodized' as const,
        title: 'Periodização completa',
        desc: 'Fases (mesociclos), semanas com RPE/ajustes/deload e treinos A/B/C/D. Ideal para quem planeja blocos de treino.',
    },
    {
        mode: 'simple' as const,
        title: 'Treino semanal simples',
        desc: 'Só define o treino de cada dia da semana (ex: segunda = Treino A). Sem fase, metodologia ou RPE obrigatórios.',
    },
];

const DAY_LABEL_OPTIONS = [
    {
        style: 'weekday' as const,
        title: 'Dias da semana',
        desc: 'Ex: Segunda, Quarta, Sexta.',
    },
    {
        style: 'number' as const,
        title: 'Números',
        desc: 'Ex: Treino 1, Treino 2, Treino 3 — pela ordem que você adicionar os treinos.',
    },
];

/**
 * Criação de macrociclo em dois cards: primeiro a decisão de COMO planejar,
 * depois os dados do plano.
 *
 * Era uma página própria com quatro campos e dois blocos de escolha grandes
 * empilhados — no celular, rolava. Separar em dois cards também deixa a
 * escolha do modo (a decisão que muda todo o resto) sozinha na tela.
 */
export default function NewMacrocycleModal({
    studentId,
    onClose,
    onCreated,
}: {
    studentId: string;
    onClose: () => void;
    /** Recebe o macrociclo recém-criado — quem navega é o chamador. */
    onCreated: (macro: MacrocycleResponse) => void;
}) {
    const stack = useCardStack<Step>('mode');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [planningMode, setPlanningMode] =
        useState<PlanningMode>('periodized');
    const [dayLabelStyle, setDayLabelStyle] =
        useState<DayLabelStyle>('weekday');

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormValues>({ resolver: zodResolver(schema) });

    const onSubmit = useCallback(
        async (values: FormValues) => {
            setSubmitting(true);
            setError('');
            try {
                const macro = await createMacrocycle(studentId, {
                    name: values.name,
                    goal: values.goal,
                    start_date: values.start_date || undefined,
                    end_date: values.end_date || undefined,
                    planning_mode: planningMode,
                    simple_day_label:
                        planningMode === 'simple' ? dayLabelStyle : undefined,
                    mesocycles: [],
                });
                onCreated(macro);
            } catch (e: unknown) {
                setError((e as Error).message ?? 'Erro ao criar macrociclo');
            } finally {
                setSubmitting(false);
            }
        },
        [studentId, planningMode, dayLabelStyle, onCreated],
    );

    const isMode = stack.current === 'mode';

    return (
        <Modal
            open
            onClose={onClose}
            onBack={isMode ? undefined : () => stack.pop()}
            title={isMode ? 'Como você quer planejar?' : 'Dados do plano'}
            footer={
                isMode ? (
                    <button
                        type="button"
                        className={s.btnEdit}
                        style={{ padding: '8px 24px', fontSize: '0.9rem' }}
                        onClick={() => stack.push('details')}
                    >
                        Continuar
                    </button>
                ) : (
                    <button
                        type="submit"
                        form="new-macrocycle-form"
                        className={s.btnEdit}
                        style={{ padding: '8px 24px', fontSize: '0.9rem' }}
                        disabled={submitting}
                    >
                        {submitting ? 'Criando...' : 'Criar plano'}
                    </button>
                )
            }
        >
            {isMode ? (
                <>
                    <div className={s.choiceGrid}>
                        {MODE_OPTIONS.map((opt) => (
                            <button
                                key={opt.mode}
                                type="button"
                                onClick={() => setPlanningMode(opt.mode)}
                                className={
                                    planningMode === opt.mode
                                        ? s.choiceCardActive
                                        : s.choiceCard
                                }
                            >
                                <p className={s.choiceTitle}>{opt.title}</p>
                                <p className={s.choiceDesc}>{opt.desc}</p>
                            </button>
                        ))}
                    </div>

                    {planningMode === 'simple' && (
                        <>
                            <p className={s.cardIntro} style={{ marginTop: 18 }}>
                                Como identificar os dias?
                            </p>
                            <div className={s.choiceGrid}>
                                {DAY_LABEL_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.style}
                                        type="button"
                                        onClick={() =>
                                            setDayLabelStyle(opt.style)
                                        }
                                        className={
                                            dayLabelStyle === opt.style
                                                ? s.choiceCardActive
                                                : s.choiceCard
                                        }
                                    >
                                        <p className={s.choiceTitle}>
                                            {opt.title}
                                        </p>
                                        <p className={s.choiceDesc}>
                                            {opt.desc}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </>
            ) : (
                <form
                    id="new-macrocycle-form"
                    onSubmit={handleSubmit(onSubmit)}
                >
                    {error && (
                        <div className="alert alert-danger mb-3">{error}</div>
                    )}

                    <div className={s.formGroup}>
                        <label className={s.formLabel}>
                            Nome do plano *
                        </label>
                        <input
                            {...register('name')}
                            className={s.formInput}
                            placeholder="Ex: Hipertrofia 2025/1"
                        />
                        {errors.name && (
                            <small className="text-danger">
                                {errors.name.message}
                            </small>
                        )}
                    </div>

                    <div className={s.formGroup}>
                        <label className={s.formLabel}>Objetivo *</label>
                        <input
                            {...register('goal')}
                            className={s.formInput}
                            placeholder="Ex: Ganho de massa muscular"
                        />
                        {errors.goal && (
                            <small className="text-danger">
                                {errors.goal.message}
                            </small>
                        )}
                    </div>

                    <div className={s.formRow}>
                        <div className={s.formGroup}>
                            <label className={s.formLabel}>
                                Data de início
                            </label>
                            <input
                                type="date"
                                {...register('start_date')}
                                className={s.formInput}
                            />
                        </div>
                        <div className={s.formGroup}>
                            <label className={s.formLabel}>
                                Data de término
                            </label>
                            <input
                                type="date"
                                {...register('end_date')}
                                className={s.formInput}
                            />
                            {errors.end_date && (
                                <small className="text-danger">
                                    {errors.end_date.message}
                                </small>
                            )}
                        </div>
                    </div>
                </form>
            )}
        </Modal>
    );
}
