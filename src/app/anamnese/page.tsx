'use client';
import React, { FC, useEffect, useState } from 'react';
import { Api } from '@/libs/api';
import BackButton from '@/components/molecules/BackButton';
import { getStudentHomeRoute } from '@/libs/session';
import QuestionsRenderer from '@/components/organism/QuestionsRenderer';
import { IQuestionProps } from '@/components/organism/QuestionsRenderer/types';
import { useRouter } from 'next/navigation';

const DOR_LABELS: Record<string, string> = {
    tornozelo: 'Tornozelo',
    lombar: 'Lombar',
    joelho: 'Joelho',
    quadril: 'Quadril',
    ombro: 'Ombro',
};

// Versão do termo de consentimento aceito. Incremente ao mudar o texto do termo
// para que o backend registre qual versão o titular aceitou (prova de consentimento).
const CONSENT_VERSION = '2026-07-21';

/** Espelha commands.ProtocolSummary do backend (Personal-fit-Back). */
interface ProtocolSummary {
    assigned: boolean;
    difficulty?: string;
    periodicity?: string;
    muscle_emphasis?: string;
    style?: string;
    objetivo?: string;
    ambiente_aviso?: string;
    duracao_sessao?: string;
    notes?: string;
}

const MUSCLE_EMPHASIS_LABELS: Record<string, string> = {
    Geral: 'Corpo todo',
    'quadríceps': 'Quadríceps',
    'Glúteo': 'Glúteos',
    posteriores: 'Posteriores de coxa',
    superiores: 'Membros superiores',
};

const OBJETIVO_LABELS: Record<string, string> = {
    hipertrofia: 'Hipertrofia (ganho de massa muscular)',
    condicionamento: 'Emagrecimento e condicionamento',
    performance: 'Performance e força',
};

// Mapa de "code" (ver internal/application/shared/error-middleware.go) para
// mensagem amigável — evita mostrar o texto cru do backend quando o código é
// conhecido, sem depender de comparar a string da mensagem.
const ERROR_COPY: Record<string, string> = {
    consent_required:
        'Para continuar, marque a autorização de tratamento dos dados de saúde na etapa anterior.',
    anamnesis_managed_by_personal:
        'Seu personal trainer monta seu treino diretamente — a anamnese automática não se aplica ao seu caso.',
    anamnesis_blocked:
        'Você já fez uma anamnese recentemente. É preciso esperar o intervalo mínimo antes de repetir.',
};

type ApiErrorResponse = { error?: string; code?: string };

function friendlyError(error: unknown): string {
    const response = (error as { response?: { data?: ApiErrorResponse } })
        ?.response?.data;
    if (response?.code && ERROR_COPY[response.code]) {
        return ERROR_COPY[response.code];
    }
    return response?.error ?? 'Não foi possível enviar a anamnese. Tente novamente.';
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

const Questions: FC = () => {
    const router = useRouter();
    const [questions, setQuestions] = useState<IQuestionProps[]>([]);
    const [doresOptions, setDoresOptions] = useState<string[]>([]);
    const [selectedDores, setSelectedDores] = useState<string[]>([]);
    const [step, setStep] = useState<'dores' | 'questions' | 'review' | 'result'>('dores');
    const [answers, setAnswers] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [protocolSummary, setProtocolSummary] = useState<ProtocolSummary | null>(null);
    const [consentGiven, setConsentGiven] = useState(false);
    // Aluno free bloqueado (menos de 2 meses desde a última anamnese e sem
    // liberação): oferece a compra de uma nova anamnese + treino.
    const [blockedInfo, setBlockedInfo] = useState<{
        nextAvailableDate?: string;
        cost?: number;
    } | null>(null);

    const fetchInitialData = async () => {
        const [fetchedQuestions, fetchedDores] = await Promise.all([
            getQuestions(),
            getDoresOptions(),
        ]);
        try {
            const { data: status } = await Api.get<{
                can_register: boolean;
                can_purchase_release: boolean;
                next_available_date?: string;
                early_release_cost?: number;
            }>('/user/anamnesis/status');
            if (!status.can_register && status.can_purchase_release) {
                setBlockedInfo({
                    nextAvailableDate: status.next_available_date,
                    cost: status.early_release_cost,
                });
            }
        } catch {
            // status indisponível não deve impedir a tela; o backend ainda
            // valida o bloqueio no envio.
        }
        setQuestions(fetchedQuestions);
        setDoresOptions(fetchedDores);
        setLoading(false);
    };

    const toggleDor = (dor: string) => {
        setSelectedDores((prev) =>
            prev.includes(dor)
                ? prev.filter((d) => d !== dor)
                : [...prev, dor],
        );
    };

    /** Chamado pelo QuestionsRenderer ao apertar "Finalizar" na última
     * pergunta — não envia direto, leva para a tela de revisão. */
    const handleQuestionsAnswered = (finalAnswers: { [key: string]: string }) => {
        setAnswers(finalAnswers);
        setErrorMessage(null);
        setStep('review');
    };

    const handleConfirmSubmit = async () => {
        try {
            setSubmitting(true);
            setErrorMessage(null);
            const answersPayload = Object.entries(answers).map(([key, value]) => ({
                question_id: key,
                answer_id: value,
            }));
            const { data } = await Api.post('/user/anamnesis', {
                answers: answersPayload,
                dores: selectedDores,
                consent: consentGiven,
                consent_version: CONSENT_VERSION,
            });
            setProtocolSummary(data.protocol_summary ?? null);
            setStep('result');
        } catch (error) {
            setErrorMessage(friendlyError(error));
        } finally {
            setSubmitting(false);
        }
    };

    const answerLabel = (question: IQuestionProps): string => {
        const answerId = answers[question.id];
        return question.options.find((o) => o.answer_id === answerId)?.text ?? '—';
    };

    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (stored) {
            const parsed = JSON.parse(stored);
            // Aluno vinculado a um personal recebe o treino diretamente dele, não faz anamnese própria
            if (parsed.has_personal) {
                router.replace('/meus-treinos');
                return;
            }
        }
        fetchInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div
        className='container'
        >
            <header className="d-flex w-100 mt-4">
                <BackButton
                    link={getStudentHomeRoute()}
                    label="Voltar para Meus Treinos"
                />
            </header>
            <div className="d-flex justify-content-center align-items-center" style={{
                minHeight: '90vh',
                paddingBottom: '2rem',
            }}>
                {loading && <span className="text-center spinner-border" />}
                {!loading && blockedInfo && (
                    <div className="text-center">
                        <h2 className="h4 mb-3">Nova anamnese ainda não liberada</h2>
                        <p>
                            A anamnese gratuita fica disponível a cada 2 meses
                            {blockedInfo.nextAvailableDate
                                ? ` (próxima em ${new Date(blockedInfo.nextAvailableDate).toLocaleDateString('pt-BR')})`
                                : ''}
                            .
                        </p>
                        <p>
                            Quer atualizar seu treino agora? Libere uma nova
                            anamnese
                            {blockedInfo.cost
                                ? ` por ${blockedInfo.cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                                : ''}
                            .
                        </p>
                        <button
                            className="btn btn-gold mt-2"
                            onClick={() => router.push('/pagamento?produto=anamnese')}
                        >
                            Liberar nova anamnese
                        </button>
                    </div>
                )}
                {!loading && !blockedInfo && step === 'dores' && (
                    <div className="w-100 d-flex flex-column">
                        <h1>Você sente dor em alguma dessas regiões?</h1>
                        <p>Selecione todas que se aplicam. Se não sentir dores, siga em frente.</p>
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
                        <div className="form-check mb-3">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="consent-health"
                                checked={consentGiven}
                                onChange={(e) => setConsentGiven(e.target.checked)}
                            />
                            <label className="form-check-label" htmlFor="consent-health">
                                Autorizo o tratamento dos meus dados de saúde
                                (respostas da anamnese e histórico de dores) para
                                montar e acompanhar meu treino, conforme a{' '}
                                <a href="/politica-privacidade" target="_blank" rel="noopener noreferrer">
                                    Política de Privacidade
                                </a>
                                . Posso revogar este consentimento a qualquer
                                momento na área da minha conta.
                            </label>
                        </div>
                        <button
                            className="btn btn-gold"
                            disabled={!consentGiven}
                            onClick={() => setStep('questions')}
                        >
                            Continuar
                        </button>
                    </div>
                )}
                {!loading && !blockedInfo && step === 'questions' && questions.length > 0 && (
                    <div className="w-100">
                        <QuestionsRenderer
                            questions={questions}
                            submitQuestions={handleQuestionsAnswered}
                            initialAnswers={answers}
                            onBackBeforeFirst={() => setStep('dores')}
                        />
                    </div>
                )}
                {!loading && !blockedInfo && step === 'review' && (
                    <div className="w-100 d-flex flex-column">
                        <h1>Confira suas respostas</h1>
                        <p>Revise antes de enviar — você pode voltar e mudar qualquer resposta.</p>
                        <div className="d-flex flex-column gap-2 my-3 mb-4">
                            <div className="p-3 rounded" style={{ background: 'var(--surface-1)' }}>
                                <strong>Dores relatadas: </strong>
                                {selectedDores.length > 0
                                    ? selectedDores.map((d) => DOR_LABELS[d] ?? d).join(', ')
                                    : 'Nenhuma'}
                            </div>
                            {questions.map((q) => (
                                <div key={q.id} className="p-3 rounded" style={{ background: 'var(--surface-1)' }}>
                                    <strong>{q.text}: </strong>
                                    {answerLabel(q)}
                                </div>
                            ))}
                        </div>
                        {errorMessage && (
                            <p className="text-center mb-3" style={{ color: 'var(--color-danger, #c0392b)' }}>
                                {errorMessage}
                            </p>
                        )}
                        <div className="d-flex justify-content-between">
                            <button
                                className="btn btn-gold"
                                disabled={submitting}
                                onClick={() => setStep('questions')}
                            >
                                Voltar e editar
                            </button>
                            <button
                                className="btn btn-gold"
                                disabled={submitting}
                                onClick={handleConfirmSubmit}
                            >
                                {submitting ? 'Enviando...' : 'Confirmar e enviar'}
                            </button>
                        </div>
                    </div>
                )}
                {!loading && !blockedInfo && step === 'result' && (
                    <div className="w-100 d-flex flex-column text-center">
                        <h1>Treino montado!</h1>
                        {protocolSummary?.assigned ? (
                            <div className="d-flex flex-column gap-2 my-3 mb-4 text-start">
                                <div className="p-3 rounded" style={{ background: 'var(--surface-1)' }}>
                                    <strong>Ênfase: </strong>
                                    {MUSCLE_EMPHASIS_LABELS[protocolSummary.muscle_emphasis ?? ''] ?? protocolSummary.muscle_emphasis}
                                    {' · '}
                                    <strong>Frequência: </strong>
                                    {protocolSummary.periodicity}x na semana
                                </div>
                                <div className="p-3 rounded" style={{ background: 'var(--surface-1)' }}>
                                    <strong>Estilo do ciclo: </strong>
                                    {protocolSummary.style === 'força-máxima'
                                        ? 'Bloco de força máxima (cargas mais altas, menos repetições)'
                                        : 'Progressão de carga (foco em hipertrofia)'}
                                    <br />
                                    <strong>Objetivo considerado: </strong>
                                    {OBJETIVO_LABELS[protocolSummary.objetivo ?? ''] ?? protocolSummary.objetivo}
                                </div>
                                {protocolSummary.duracao_sessao && (
                                    <div className="p-3 rounded" style={{ background: 'var(--surface-1)' }}>
                                        <strong>Duração de sessão informada: </strong>
                                        {protocolSummary.duracao_sessao}
                                    </div>
                                )}
                                {protocolSummary.ambiente_aviso && protocolSummary.ambiente_aviso !== 'academia' && (
                                    <div className="p-3 rounded" style={{ background: 'var(--surface-2, #2a2a2a)' }}>
                                        Seu treino foi montado assumindo acesso a uma academia
                                        completa. Se você só treina em casa ou só com peso
                                        corporal, fale com um personal para adaptar os
                                        exercícios ao seu equipamento disponível.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p>
                                Sua anamnese foi salva, mas ainda não encontramos um
                                treino automático para o seu perfil. Fale com o
                                suporte se isso persistir.
                            </p>
                        )}
                        <button
                            className="btn btn-gold"
                            onClick={() => router.push('/meus-treinos')}
                        >
                            Ver meus treinos
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Questions;
