'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createNewTemplate } from '@/libs/planningService';
import s from './novo.module.css';

const schema = z.object({
    name: z.string().min(1, 'Nome obrigatório'),
    goal: z.string().min(1, 'Objetivo obrigatório'),
});
type FormValues = z.infer<typeof schema>;

type PlanningMode = 'periodized' | 'simple';
type DayLabelStyle = 'weekday' | 'number';

export default function NovoTemplatePage() {
    const router = useRouter();

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [planningMode, setPlanningMode] = useState<PlanningMode>('periodized');
    const [dayLabelStyle, setDayLabelStyle] = useState<DayLabelStyle>('weekday');

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormValues>({ resolver: zodResolver(schema) });

    async function onSubmit(values: FormValues) {
        setSubmitting(true);
        setError('');
        try {
            const created = await createNewTemplate({
                name: values.name,
                goal: values.goal,
                is_public: false,
                planning_mode: planningMode,
                simple_day_label:
                    planningMode === 'simple' ? dayLabelStyle : undefined,
            });
            router.push(`/personal/templates/${created.id}`);
        } catch (e: unknown) {
            setError((e as Error).message ?? 'Erro ao criar ciclo');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className={s.page}>
            <div className={s.container}>
                <div className={s.header}>
                    <h1 className={s.headerTitle}>Novo Ciclo de Treino</h1>
                    <button
                        className={s.btnBack}
                        onClick={() => router.back()}
                    >
                        ← Voltar
                    </button>
                </div>

                {error && (
                    <div className="alert alert-danger mb-3">{error}</div>
                )}

                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className={s.section}>
                        <div className={s.formGroup}>
                            <label className={s.formLabel}>
                                Nome do ciclo *
                            </label>
                            <input
                                {...register('name')}
                                className={s.formInput}
                                placeholder="Ex: Hipertrofia 12 semanas"
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
                    </div>

                    <div className={s.section}>
                        <label className={s.formLabel}>
                            Como você quer planejar os treinos? *
                        </label>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: 12,
                                marginTop: 6,
                            }}
                        >
                            {(
                                [
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
                                ] as const
                            ).map((opt) => {
                                const active = planningMode === opt.mode;
                                return (
                                    <button
                                        key={opt.mode}
                                        type="button"
                                        onClick={() =>
                                            setPlanningMode(opt.mode)
                                        }
                                        style={{
                                            textAlign: 'left',
                                            padding: '12px 14px',
                                            borderRadius: 10,
                                            cursor: 'pointer',
                                            border: active
                                                ? '1.5px solid var(--mint, #2ecc71)'
                                                : '1px solid var(--border-subtle)',
                                            background: active
                                                ? 'var(--surface-2, rgba(46,204,113,0.08))'
                                                : 'transparent',
                                        }}
                                    >
                                        <p
                                            style={{
                                                margin: '0 0 4px',
                                                fontWeight: 700,
                                                fontSize: '0.9rem',
                                            }}
                                        >
                                            {opt.title}
                                        </p>
                                        <p
                                            style={{
                                                margin: 0,
                                                fontSize: '0.78rem',
                                                color: 'var(--text-muted)',
                                            }}
                                        >
                                            {opt.desc}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {planningMode === 'simple' && (
                        <div className={s.section}>
                            <label className={s.formLabel}>
                                Como identificar os dias?
                            </label>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: 12,
                                    marginTop: 6,
                                }}
                            >
                                {(
                                    [
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
                                    ] as const
                                ).map((opt) => {
                                    const active = dayLabelStyle === opt.style;
                                    return (
                                        <button
                                            key={opt.style}
                                            type="button"
                                            onClick={() =>
                                                setDayLabelStyle(opt.style)
                                            }
                                            style={{
                                                textAlign: 'left',
                                                padding: '12px 14px',
                                                borderRadius: 10,
                                                cursor: 'pointer',
                                                border: active
                                                    ? '1.5px solid var(--mint, #2ecc71)'
                                                    : '1px solid var(--border-subtle)',
                                                background: active
                                                    ? 'var(--surface-2, rgba(46,204,113,0.08))'
                                                    : 'transparent',
                                            }}
                                        >
                                            <p
                                                style={{
                                                    margin: '0 0 4px',
                                                    fontWeight: 700,
                                                    fontSize: '0.9rem',
                                                }}
                                            >
                                                {opt.title}
                                            </p>
                                            <p
                                                style={{
                                                    margin: 0,
                                                    fontSize: '0.78rem',
                                                    color: 'var(--text-muted)',
                                                }}
                                            >
                                                {opt.desc}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        className={s.btnAdd}
                        disabled={submitting}
                    >
                        {submitting ? 'Criando...' : 'Criar Ciclo'}
                    </button>
                </form>
            </div>
        </div>
    );
}
