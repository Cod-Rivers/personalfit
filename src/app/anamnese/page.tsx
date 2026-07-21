'use client';
import React, { FC, useEffect, useState } from 'react';
import { Api } from '@/libs/api';
import BackButton from '@/components/molecules/BackButton';
import QuestionsRenderer from '@/components/organism/QuestionsRenderer';
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

const getQuestions = async () => {
    try {
        const { data } = await Api.get('/questions');
        return data.questions;
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
    const [questions, setQuestions] = useState([]);
    const [doresOptions, setDoresOptions] = useState<string[]>([]);
    const [selectedDores, setSelectedDores] = useState<string[]>([]);
    const [step, setStep] = useState<'dores' | 'questions'>('dores');
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
        setQuestions(fetchedQuestions ?? []);
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

    const submitQuestions = async (awnsers: { [key: string]: string }) => {
        try {
            setLoading(true);
            setErrorMessage(null);
            const answers = Object.entries(awnsers).map(([key, value]) => ({
                question_id: key,
                answer_id: value,
            }));
            const { data } = await Api.post('/user/anamnesis', {
                answers,
                dores: selectedDores,
                consent: consentGiven,
                consent_version: CONSENT_VERSION,
            });
            alert(data.message);
            router.push('/app');
        } catch (error) {
            const message =
                (error as { response?: { data?: { error?: string } } })
                    ?.response?.data?.error ??
                'Não foi possível enviar a anamnese. Tente novamente.';
            setErrorMessage(message);
            alert(message);
        } finally {
            setLoading(false);
        }
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
                <BackButton />
            </header>
            <div className="d-flex justify-content-center align-items-center" style={{
                height: '90vh',
            }}>
                {loading && <span className="text-center spinner-border" />}
                {!loading && errorMessage && (
                    <p className="text-center" style={{ color: 'var(--color-danger, #c0392b)' }}>
                        {errorMessage}
                    </p>
                )}
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
                            submitQuestions={submitQuestions}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Questions;
