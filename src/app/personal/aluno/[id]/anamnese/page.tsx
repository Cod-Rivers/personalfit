'use client';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Api } from '@/libs/api';
import Modal from '@/components/system/Modal';
import QuestionsRenderer from '@/components/organism/QuestionsRenderer';
import { IQuestionProps } from '@/components/organism/QuestionsRenderer/types';
import { useToast } from '@/components/system/Toast';
// Reaproveita o módulo de estilos já usado pelas telas irmãs deste aluno
// (periodização, plano alimentar) — mesmo padrão de header/card/form em todo
// `personal/aluno/[id]/*`.
import s from '../periodizacao/periodizacao.module.css';

const DOR_LABELS: Record<string, string> = {
    tornozelo: 'Tornozelo',
    lombar: 'Lombar',
    joelho: 'Joelho',
    quadril: 'Quadril',
    ombro: 'Ombro',
};

// Versão do texto de declaração de responsabilidade aceito pelo personal ao
// preencher a anamnese em nome do aluno. Incremente ao mudar o texto do
// checkbox abaixo.
const DECLARATION_VERSION = '2026-08-01';

type ApiErrorResponse = { error?: string; code?: string };

function friendlyError(error: unknown): string {
    const response = (error as { response?: { data?: ApiErrorResponse } })
        ?.response?.data;
    return response?.error ?? 'Não foi possível concluir a ação. Tente novamente.';
}

const getQuestions = async (): Promise<IQuestionProps[]> => {
    try {
        const { data } = await Api.get('/questions');
        return data.questions ?? [];
    } catch {
        return [];
    }
};

const getDoresOptions = async (): Promise<string[]> => {
    try {
        const { data } = await Api.get('/exercicios-recomendados');
        return (data ?? []).map((item: { dor: string }) => item.dor);
    } catch {
        return [];
    }
};

// Máscara simples de CPF (000.000.000-00) aplicada enquanto o personal
// digita. Não há componente de máscara de CPF reutilizável no app — o
// formulário de cadastro (SignUp) valida com zod mas não formata visualmente
// — então esta função local fica restrita a este arquivo.
function formatCpfInput(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    if (digits.length > 9) {
        return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    }
    if (digits.length > 6) {
        return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    }
    if (digits.length > 3) {
        return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    }
    return digits;
}

type ModalStep = 'dores' | 'questions' | 'attest';

export default function PersonalStudentAnamnesePage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const studentId = params.id;
    const { showSuccess, showError, ToastSlot } = useToast();

    const [granting, setGranting] = useState(false);

    const [fillModalOpen, setFillModalOpen] = useState(false);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [questions, setQuestions] = useState<IQuestionProps[]>([]);
    const [doresOptions, setDoresOptions] = useState<string[]>([]);
    const [selectedDores, setSelectedDores] = useState<string[]>([]);
    const [modalStep, setModalStep] = useState<ModalStep>('dores');
    const [answers, setAnswers] = useState<{ [key: string]: string }>({});
    const [personalName, setPersonalName] = useState('');
    const [personalCpf, setPersonalCpf] = useState('');
    const [declarationAccepted, setDeclarationAccepted] = useState(false);
    const [fillSubmitting, setFillSubmitting] = useState(false);
    const [fillError, setFillError] = useState<string | null>(null);

    async function handleGrantAccess() {
        if (granting) return;
        setGranting(true);
        try {
            await Api.post(`/students/${studentId}/anamnesis-access`);
            showSuccess('Acesso à anamnese concedido ao aluno.');
        } catch (error) {
            showError(friendlyError(error));
        } finally {
            setGranting(false);
        }
    }

    async function loadQuestionsAndDores() {
        setLoadingQuestions(true);
        try {
            const [fetchedQuestions, fetchedDores] = await Promise.all([
                getQuestions(),
                getDoresOptions(),
            ]);
            setQuestions(fetchedQuestions);
            setDoresOptions(fetchedDores);
        } finally {
            setLoadingQuestions(false);
        }
    }

    function openFillModal() {
        setModalStep('dores');
        setAnswers({});
        setSelectedDores([]);
        setPersonalName('');
        setPersonalCpf('');
        setDeclarationAccepted(false);
        setFillError(null);
        setFillModalOpen(true);
        if (questions.length === 0) {
            void loadQuestionsAndDores();
        }
    }

    function closeFillModal() {
        if (fillSubmitting) return;
        setFillModalOpen(false);
    }

    function toggleDor(dor: string) {
        setSelectedDores((prev) =>
            prev.includes(dor)
                ? prev.filter((d) => d !== dor)
                : [...prev, dor],
        );
    }

    function handleQuestionsAnswered(finalAnswers: { [key: string]: string }) {
        setAnswers(finalAnswers);
        setFillError(null);
        setModalStep('attest');
    }

    const cpfDigits = personalCpf.replace(/\D/g, '');
    const canSubmit =
        personalName.trim().length > 1 &&
        cpfDigits.length === 11 &&
        declarationAccepted &&
        !fillSubmitting;

    async function handleFillSubmit() {
        setFillSubmitting(true);
        setFillError(null);
        try {
            const answersPayload = Object.entries(answers).map(([key, value]) => ({
                question_id: key,
                answer_id: value,
            }));
            await Api.post(`/students/${studentId}/anamnesis-fill`, {
                answers: answersPayload,
                dores: selectedDores,
                personal_name: personalName.trim(),
                personal_cpf: cpfDigits,
                declaration_accepted: declarationAccepted,
                declaration_version: DECLARATION_VERSION,
            });
            setFillModalOpen(false);
            showSuccess('Anamnese registrada com sucesso.');
        } catch (error) {
            setFillError(friendlyError(error));
        } finally {
            setFillSubmitting(false);
        }
    }

    return (
        <div className={s.page}>
            <div className={s.container}>
                <div className={s.header}>
                    <div>
                        <h1 className={s.headerTitle}>🩺 Triagem/Anamnese</h1>
                        <p className={s.headerSub}>
                            Gerencie a triagem de saúde (PAR-Q) e a anamnese
                            deste aluno
                        </p>
                    </div>
                    <button className={s.btnBack} onClick={() => router.back()}>
                        ← Voltar
                    </button>
                </div>

                <div className={s.list}>
                    <div
                        className={s.card}
                        onClick={handleGrantAccess}
                        style={{ cursor: granting ? 'wait' : 'pointer' }}
                    >
                        <div className={s.cardInfo}>
                            <p className={s.cardName}>
                                🔓 Liberar para o aluno preencher
                            </p>
                            <p className={s.cardMeta}>
                                O aluno passa a poder preencher a própria
                                triagem e anamnese pelo app dele (modo apenas
                                registro — o treino continua sendo montado por
                                você).
                            </p>
                        </div>
                        <span className={s.btnAction}>
                            {granting ? 'Concedendo...' : 'Liberar acesso →'}
                        </span>
                    </div>

                    <div className={s.card} onClick={openFillModal}>
                        <div className={s.cardInfo}>
                            <p className={s.cardName}>📝 Preencher agora</p>
                            <p className={s.cardMeta}>
                                Você preenche a triagem e a anamnese em nome
                                do aluno, com uma declaração de
                                responsabilidade.
                            </p>
                        </div>
                        <span className={s.btnAction}>Preencher →</span>
                    </div>
                </div>
            </div>

            <Modal
                open={fillModalOpen}
                onClose={closeFillModal}
                title="Preencher anamnese em nome do aluno"
                closeOnBackdrop={!fillSubmitting}
            >
                {loadingQuestions && (
                    <p className={s.loading}>Carregando perguntas...</p>
                )}

                {!loadingQuestions && modalStep === 'dores' && (
                    <div className="d-flex flex-column">
                        <h2 className="h5">
                            O aluno sente dor em alguma dessas regiões?
                        </h2>
                        <p className="text-muted">
                            Selecione todas que se aplicam, segundo o relato
                            do aluno. Se não houver dores, siga em frente.
                        </p>
                        <div className="d-flex flex-column gap-3 my-3 mb-4">
                            {doresOptions.map((dor) => (
                                <button
                                    key={dor}
                                    type="button"
                                    className="p-3 rounded"
                                    style={{
                                        background: 'var(--surface-1)',
                                        color: 'var(--text-primary)',
                                        border: selectedDores.includes(dor)
                                            ? '3px solid var(--color-gold)'
                                            : '3px solid transparent',
                                    }}
                                    onClick={() => toggleDor(dor)}
                                >
                                    {DOR_LABELS[dor] ?? dor}
                                </button>
                            ))}
                        </div>
                        {fillError && (
                            <div className={s.errorMsg}>{fillError}</div>
                        )}
                        <button
                            className="btn btn-gold"
                            disabled={questions.length === 0}
                            onClick={() => setModalStep('questions')}
                        >
                            Continuar
                        </button>
                    </div>
                )}

                {!loadingQuestions &&
                    modalStep === 'questions' &&
                    questions.length > 0 && (
                        <QuestionsRenderer
                            questions={questions}
                            submitQuestions={handleQuestionsAnswered}
                            initialAnswers={answers}
                            onBackBeforeFirst={() => setModalStep('dores')}
                        />
                    )}

                {!loadingQuestions && modalStep === 'attest' && (
                    <div className="d-flex flex-column">
                        <h2 className="h5">Declaração de responsabilidade</h2>
                        <p className="text-muted">
                            Confirme seus dados antes de enviar. Estas
                            informações identificam quem preencheu a anamnese
                            em nome do aluno.
                        </p>
                        <div className={s.formGroup}>
                            <label className={s.formLabel}>
                                Seu nome completo
                            </label>
                            <input
                                className={s.formInput}
                                value={personalName}
                                onChange={(e) => setPersonalName(e.target.value)}
                                placeholder="Nome completo"
                            />
                        </div>
                        <div className={s.formGroup}>
                            <label className={s.formLabel}>Seu CPF</label>
                            <input
                                className={s.formInput}
                                value={personalCpf}
                                onChange={(e) =>
                                    setPersonalCpf(formatCpfInput(e.target.value))
                                }
                                placeholder="000.000.000-00"
                                inputMode="numeric"
                                maxLength={14}
                            />
                        </div>
                        <div className="form-check mb-3">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="declaration-accept"
                                checked={declarationAccepted}
                                onChange={(e) =>
                                    setDeclarationAccepted(e.target.checked)
                                }
                            />
                            <label
                                className="form-check-label"
                                htmlFor="declaration-accept"
                            >
                                Declaro que preenchi este formulário em nome
                                do aluno e assumo a responsabilidade pelas
                                informações prestadas.
                            </label>
                        </div>
                        {fillError && (
                            <div className={s.errorMsg}>{fillError}</div>
                        )}
                        <div className="d-flex justify-content-between">
                            <button
                                className="btn btn-gold"
                                disabled={fillSubmitting}
                                onClick={() => setModalStep('questions')}
                            >
                                Voltar
                            </button>
                            <button
                                className="btn btn-gold"
                                disabled={!canSubmit}
                                onClick={handleFillSubmit}
                            >
                                {fillSubmitting ? 'Enviando...' : 'Enviar'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
            {ToastSlot}
        </div>
    );
}
