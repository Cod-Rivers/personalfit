'use client';
import React, { FC, useEffect, useState } from 'react';
import ExerciciosRecomendados from '@/components/features/ExerciciosRecomendados';
import { Api } from '../utils/api';
import BackButton from '@/components/molecules/BackButton';
import QuestionsRenderer from '@/components/organism/QuestionsRenderer';
import { useRouter } from 'next/navigation';

const DORES_LIST = [
    'Lombar',
    'Joelho',
    'Ombro',
    'Cervical',
    'Tornozelo',
    'Quadril',
    'Punho',
    'Cotovelo',
    'Outro',
];

const getQuestions = async () => {
    try {
        const { data } = await Api.get('/questions');
        return data.questions;
    } catch (error) {
        console.log(error);
        return [];
    }
};

const Questions: FC = () => {
    const router = useRouter();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDores, setSelectedDores] = useState<string[]>([]);
    const [error, setError] = useState<string>('');

    const fetchQuestions = async () => {
        const questions = await getQuestions();
        setQuestions(questions);
        setLoading(false);
    };

    const handleToggleDor = (dor: string) => {
        setSelectedDores((prev) =>
            prev.includes(dor) ? prev.filter((d) => d !== dor) : [...prev, dor],
        );
    };

    const submitQuestions = async (awnsers: { [key: string]: string }) => {
        try {
            setLoading(true);

            // Extrair user_id do localStorage
            const user_data = localStorage.getItem('user');
            let user_id = undefined;
            if (user_data) {
                try {
                    const parsed_user = JSON.parse(user_data);
                    user_id = parsed_user.id || parsed_user._id;
                } catch (e) {}
            }
            if (!user_id) {
                setError('ID do usuário não encontrado. Faça login novamente.');
                setLoading(false);
                return;
            }

            const payload = {
                answers: Object.entries(awnsers).map(([key, value]) => ({
                    question_id: key,
                    answer_id: value,
                })),
                dores: selectedDores.map((d) => d.toLowerCase()),
            };
            console.log('[ANAMNESE] Payload enviado:', payload);
            const user_token = localStorage.getItem('token');
            const { data } = await Api.post('/user/anamnesis', payload, {
                headers: {
                    Authorization: `${user_token}`,
                },
            });

            alert(data.message);

            // Buscar dados atualizados do usuário após enviar anamnese
            try {
                const userResponse = await Api.get('/me', {
                    headers: {
                        Authorization: `Bearer ${user_token}`,
                    },
                });
                console.log(
                    '[ANAMNESE] Resposta atualizada do usuário:',
                    userResponse.data,
                );
                localStorage.setItem('user', JSON.stringify(userResponse.data));
                window.location.href = '/app';
            } catch (err) {
                console.error(
                    '[ANAMNESE] Erro ao buscar dados atualizados:',
                    err,
                );
                window.location.href = '/app';
            }
        } catch (error) {
            setError('Erro ao enviar anamnese. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuestions();
    }, []);

    return (
        <div className="container">
            <header className="d-flex w-100 mt-4">
                <BackButton />
            </header>
            {/* Exercícios recomendados para dores */}
            <div className="my-4">
                {typeof window !== 'undefined' && <ExerciciosRecomendados />}
            </div>
            <div
                className="d-flex justify-content-center align-items-center"
                style={{ height: '90vh' }}
            >
                {loading && <span className="text-center spinner-border" />}
                {questions.length > 0 && (
                    <div className="w-100">
                        <div className="mb-4">
                            <h5>Selecione as regiões onde sente dor:</h5>
                            <div className="d-flex flex-wrap gap-2">
                                {DORES_LIST.map((dor) => (
                                    <label
                                        key={dor}
                                        className="form-check-label"
                                    >
                                        <input
                                            type="checkbox"
                                            className="form-check-input me-1"
                                            checked={selectedDores.includes(
                                                dor,
                                            )}
                                            onChange={() =>
                                                handleToggleDor(dor)
                                            }
                                        />
                                        {dor}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <QuestionsRenderer
                            questions={questions}
                            submitQuestions={submitQuestions}
                        />
                        {error && (
                            <div className="alert alert-danger mt-3">
                                {error}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Questions;
