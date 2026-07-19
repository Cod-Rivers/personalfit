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

const getQuestions = async () => {
    try {
        const { data } = await Api.get('/questions');
        return data.questions;
    } catch (error) {
        console.log(error);
        return [];
    }
};

const getDoresOptions = async (): Promise<string[]> => {
    try {
        const { data } = await Api.get('/exercicios-recomendados');
        return (data ?? []).map((item: { dor: string }) => item.dor);
    } catch (error) {
        console.log(error);
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

    const fetchInitialData = async () => {
        const [fetchedQuestions, fetchedDores] = await Promise.all([
            getQuestions(),
            getDoresOptions(),
        ]);
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
                {!loading && step === 'dores' && (
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
                        <button
                            className="btn btn-gold"
                            onClick={() => setStep('questions')}
                        >
                            Continuar
                        </button>
                    </div>
                )}
                {!loading && step === 'questions' && questions.length > 0 && (
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
