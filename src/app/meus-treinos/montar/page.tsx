'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiAlertTriangle } from 'react-icons/fi';
import {
    getMyPlannings,
    getMyMacrocycle,
    createMySelfMadePlan,
    createMyMesocycle,
    updateMyMesocycle,
    deleteMyPlanning,
    resolveMyVideoLink,
    type MacrocycleResponse,
    type MesocycleRequest,
} from '@/libs/planningService';
import MesocycleSection from '@/app/personal/_shared/periodizacao/components/MesocycleSection';
import MesocycleFormModal from '@/app/personal/_shared/periodizacao/components/MesocycleFormModal';
import { pickSavedMesocycle } from '@/app/personal/_shared/periodizacao/lib/mesocycleTransforms';
import GoogleAdSlot from '@/components/molecules/GoogleAdSlot';
import { useToast } from '@/components/system/Toast';
import s from '@/app/personal/_shared/periodizacao/builder.module.css';

/** Regra de plano do link de vídeo, exibida sob o campo. Quem a aplica é o
 * servidor (ver ResolveMyVideoLink no backend); aqui é só explicação. */
const VIDEO_PLAN_HINT =
    'No plano gratuito valem YouTube e Vimeo — Instagram e TikTok requerem plano Pro.';

type DayLabelStyle = 'weekday' | 'number';

const DAY_LABEL_OPTIONS: { style: DayLabelStyle; title: string; desc: string }[] =
    [
        {
            style: 'weekday',
            title: 'Dias da semana',
            desc: 'Ex: Segunda, Quarta, Sexta.',
        },
        {
            style: 'number',
            title: 'Números',
            desc: 'Ex: Treino 1, Treino 2 — pela ordem que você adicionar.',
        },
    ];

/**
 * Montagem do treino pelo PRÓPRIO aluno.
 *
 * Para quem não tem personal e já treina por conta própria (ficha da academia,
 * treino de outra fonte) e quer usar o app para executar e registrar. É sempre
 * o modo simples — treinos por dia, sem fase nem periodização.
 *
 * Reaproveita o editor do personal (MesocycleFormModal/MesocycleSection), que
 * é todo orientado a props. A única diferença de contrato está nos endpoints:
 * o aluno grava em /my-planning/..., nunca em /students/:id/..., que exige
 * papel de personal.
 */
export default function MontarTreinoPage() {
    const router = useRouter();
    const { showSuccess, showError, ToastSlot } = useToast();

    const [macro, setMacro] = useState<MacrocycleResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState('');
    const [editorOpen, setEditorOpen] = useState(false);

    /* Formulário de criação */
    const [name, setName] = useState('');
    const [goal, setGoal] = useState('');
    const [dayLabelStyle, setDayLabelStyle] = useState<DayLabelStyle>('weekday');
    const [waiverAccepted, setWaiverAccepted] = useState(false);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (!localStorage.getItem('token')) {
            router.replace('/');
            return;
        }

        (async () => {
            try {
                const plans = await getMyPlannings();
                const mine = plans.find((p) => p.category === 'self_made');
                if (mine) {
                    // A lista não traz os treinos; o detalhe sim.
                    setMacro(await getMyMacrocycle(mine.id));
                }
            } catch (e) {
                setPageError(
                    (e as Error).message ??
                        'Não foi possível carregar seu treino.',
                );
            } finally {
                setLoading(false);
            }
        })();
    }, [router]);

    const handleCreate = useCallback(async () => {
        if (!name.trim()) {
            showError('Dê um nome ao seu treino.');
            return;
        }
        if (!waiverAccepted) {
            showError(
                'É preciso aceitar o termo de responsabilidade para continuar.',
            );
            return;
        }

        setCreating(true);
        try {
            const created = await createMySelfMadePlan({
                name: name.trim(),
                goal: goal.trim() || undefined,
                simple_day_label: dayLabelStyle,
                waiver_accepted: true,
            });
            setMacro(created);
            showSuccess('Treino criado! Agora adicione os exercícios.');
            setEditorOpen(true);
        } catch (e) {
            const msg = (e as { response?: { data?: { message?: string } } })
                ?.response?.data?.message;
            showError(msg || 'Não foi possível criar o treino.');
        } finally {
            setCreating(false);
        }
    }, [name, goal, dayLabelStyle, waiverAccepted, showSuccess, showError]);

    /** Salvamento por card do editor: grava UMA fase e devolve o macrociclo já
     * atualizado, para o modal adotar os IDs que o servidor atribuiu (sem
     * isso, cada card recriaria treinos e exercícios, órfãando o histórico de
     * séries que o aluno registrar depois). */
    const onPersistMeso = useCallback(
        async (req: MesocycleRequest) => {
            if (!macro) return null;
            const updated = req.id
                ? await updateMyMesocycle(macro.id, req.id, req)
                : await createMyMesocycle(macro.id, req);
            setMacro(updated);
            return pickSavedMesocycle(updated, req.id);
        },
        [macro],
    );

    const handleDeletePlan = useCallback(async () => {
        if (!macro) return;
        if (
            !window.confirm(
                `Excluir "${macro.name}" e todos os treinos dele? Essa ação não pode ser desfeita. Seu histórico de treinos já registrados não é apagado.`,
            )
        ) {
            return;
        }
        try {
            await deleteMyPlanning(macro.id);
            setMacro(null);
            setName('');
            setGoal('');
            setWaiverAccepted(false);
            showSuccess('Treino excluído.');
        } catch (e) {
            const msg = (e as { response?: { data?: { message?: string } } })
                ?.response?.data?.message;
            showError(msg || 'Não foi possível excluir o treino.');
        }
    }, [macro, showSuccess, showError]);

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border" role="status">
                    <span className="visually-hidden">Carregando...</span>
                </div>
            </div>
        );
    }

    const simpleMeso = (macro?.mesocycles ?? [])[0];
    const macroDayLabel: DayLabelStyle =
        macro?.simple_day_label === 'number' ? 'number' : 'weekday';

    return (
        <div className={s.page}>
            {ToastSlot}
            <div className={s.container}>
                <div className={s.header}>
                    <div>
                        <h1 className={s.headerTitle}>
                            {macro ? macro.name : 'Montar meu treino'}
                        </h1>
                        <p className={s.headerSub}>
                            {macro
                                ? macro.goal || 'Treino montado por você'
                                : 'Já tem um treino da academia ou de outra fonte? Monte aqui para executar e registrar pelo app.'}
                        </p>
                    </div>
                    <Link href="/meus-treinos" className={s.btnBack}>
                        <FiArrowLeft /> Voltar
                    </Link>
                </div>

                {pageError && (
                    <div className="alert alert-danger">{pageError}</div>
                )}

                {!macro ? (
                    <>
                        <div className={s.formGroup}>
                            <label className={s.formLabel}>
                                Nome do treino *
                            </label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={s.formInput}
                                placeholder="Ex: Treino da academia"
                            />
                        </div>

                        <div className={s.formGroup}>
                            <label className={s.formLabel}>Objetivo</label>
                            <input
                                value={goal}
                                onChange={(e) => setGoal(e.target.value)}
                                className={s.formInput}
                                placeholder="Opcional. Ex: Ganho de massa"
                            />
                        </div>

                        <p className={s.cardIntro} style={{ marginTop: 18 }}>
                            Como identificar os dias?
                        </p>
                        <div className={s.choiceGrid}>
                            {DAY_LABEL_OPTIONS.map((opt) => (
                                <button
                                    key={opt.style}
                                    type="button"
                                    onClick={() => setDayLabelStyle(opt.style)}
                                    className={
                                        dayLabelStyle === opt.style
                                            ? s.choiceCardActive
                                            : s.choiceCard
                                    }
                                >
                                    <p className={s.choiceTitle}>{opt.title}</p>
                                    <p className={s.choiceDesc}>{opt.desc}</p>
                                </button>
                            ))}
                        </div>

                        {/* Termo de responsabilidade: o app hospeda e registra
                            um treino que ele não prescreveu nem revisou. O
                            backend recusa a criação sem o aceite. */}
                        <div
                            className="alert alert-warning"
                            style={{ marginTop: 22 }}
                        >
                            <p
                                className="d-flex align-items-center gap-2"
                                style={{ fontWeight: 600, marginBottom: 8 }}
                            >
                                <FiAlertTriangle aria-hidden /> Antes de
                                continuar
                            </p>
                            <p style={{ marginBottom: 12 }}>
                                Este treino é montado por você. O Venafit não
                                prescreve, não revisa e não se responsabiliza
                                pelo conteúdo dele, nem por lesões ou resultados
                                decorrentes da sua execução. O app serve para
                                você organizar, executar e registrar o que já
                                escolheu treinar. Em caso de dúvida, procure um
                                profissional de educação física.
                            </p>
                            <label className="d-flex align-items-start gap-2">
                                <input
                                    type="checkbox"
                                    checked={waiverAccepted}
                                    onChange={(e) =>
                                        setWaiverAccepted(e.target.checked)
                                    }
                                    style={{ marginTop: 4, flexShrink: 0 }}
                                />
                                <span>
                                    Li e concordo: o treino é de minha
                                    responsabilidade.
                                </span>
                            </label>
                        </div>

                        <button
                            type="button"
                            className={s.btnEdit}
                            style={{ padding: '8px 24px', fontSize: '0.9rem' }}
                            onClick={handleCreate}
                            disabled={creating}
                        >
                            {creating ? 'Criando...' : 'Criar meu treino'}
                        </button>
                    </>
                ) : (
                    <>
                        {!simpleMeso ? (
                            <>
                                <p style={{ color: 'var(--text-muted)' }}>
                                    Nenhum treino configurado ainda.
                                </p>
                                <button
                                    className={s.btnEdit}
                                    onClick={() => setEditorOpen(true)}
                                >
                                    + Adicionar treinos
                                </button>
                            </>
                        ) : (
                            // Sem onPersistMeso de propósito: aquele callback
                            // habilita a edição rápida pelo card do exercício,
                            // cuja fila offline grava em /students/:id/... —
                            // rota do personal, que devolveria 403 ao aluno.
                            // Toda edição daqui passa pelo editor.
                            <MesocycleSection
                                meso={simpleMeso}
                                onEdit={() => setEditorOpen(true)}
                                onDelete={handleDeletePlan}
                                simpleMode
                                dayLabelStyle={macroDayLabel}
                            />
                        )}

                        <p
                            className="small"
                            style={{
                                color: 'var(--text-muted)',
                                marginTop: 18,
                            }}
                        >
                            Treino montado por você — o Venafit não se
                            responsabiliza pelo conteúdo.
                        </p>
                    </>
                )}

                <div className="py-3">
                    <GoogleAdSlot />
                </div>
            </div>

            {editorOpen && macro && (
                <MesocycleFormModal
                    mode={simpleMeso ? 'edit' : 'add'}
                    meso={simpleMeso ?? null}
                    order={1}
                    onClose={() => setEditorOpen(false)}
                    onPersist={onPersistMeso}
                    simpleMode
                    dayLabelStyle={macroDayLabel}
                    resolveVideoLink={resolveMyVideoLink}
                    videoPlanHint={VIDEO_PLAN_HINT}
                />
            )}
        </div>
    );
}
