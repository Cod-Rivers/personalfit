'use client';
import React, { FC, useEffect, useState } from 'react';
import { Api } from '../utils/api';
import BackButton from '@/components/molecules/BackButton';
import QuestionsRenderer from '@/components/organism/QuestionsRenderer';
import { useRouter } from 'next/navigation';

const getQuestions = async () => {
    try {
        const { data } = await Api.get('/questions');
        return data.questions;
    } catch (error) {
        console.log(error);
    }
};

const Questions: FC = () => {
    const router = useRouter();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchQuestions = async () => {
        const questions = await getQuestions();
        setQuestions(questions);
        setLoading(false);
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
                } catch (e) {
                    // fallback: não faz nada
                }
            }
            if (!user_id) {
                setError('ID do usuário não encontrado. Faça login novamente.');
                setLoading(false);
                return;
            }

            const payload = {
                user_id,
                answers: Object.entries(awnsers).map(([key, value]) => ({
                    question_id: key,
                    answer_id: value,
                })),
            };
            const user_token = localStorage.getItem('token');
            const { data } = await Api.post('/user/anamnesis', payload, {
                headers: {
                    Authorization: `${user_token}`,
                },
            });

            alert(data.message);

            // Buscar dados atualizados do usuário após enviar anamnese
            try {
                const userResponse = await Api.get('/user', {
                    headers: {
                        Authorization: `${user_token}`,
                    },
                });
                console.log('Dados atualizados recebidos:', userResponse.data);
                // Atualizar localStorage com dados atualizados
                localStorage.setItem('user', JSON.stringify(userResponse.data));

                // Forçar reload completo da página para garantir atualização
                window.location.href = '/app';
            } catch (err) {
                console.error(
                    'Erro ao buscar dados atualizados do usuário:',
                    err,
                );
                // Redirecionar mesmo se houver erro na atualização
                window.location.href = '/app';
            }
        } catch (error) {
            console.log(error);
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
            <div
                className="d-flex justify-content-center align-items-center"
                style={{
                    height: '90vh',
                }}
            >
                {loading && <span className="text-center spinner-border" />}
                {questions.length > 0 && (
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
