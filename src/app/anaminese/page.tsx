'use client';
import React, { FC, useEffect, useState } from 'react';
import ExerciciosRecomendados from '@/components/features/ExerciciosRecomendados';
import { Api } from '../utils/api';
import BackButton from '@/components/molecules/BackButton';
import QuestionsRenderer from '@/components/organism/QuestionsRenderer';
import { useRouter } from 'next/navigation';
import { useAnamnesisStatus } from '@/hooks/useAnamnesisStatus';
import styles from '../app/treinamento/[id]/TrainingPage.module.css';
import Header from '@/components/organism/Header';

const DORES_LIST = [
    'Lombar',
    'Joelho',
    'Ombro',
    //'Cervical',
    'Tornozelo',
    'Quadril',
    //'Punho',
    //'Cotovelo',
    //'Outro',
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

    // Hook para verificar status da anamnese
    const {
        status: anamnesisStatus,
        loading: statusLoading,
        error: statusError,
    } = useAnamnesisStatus();

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
        <div className={`${styles.exerciseListContainer}`}>
            <Header />
            <div
                className="d-flex justify-content-center background-color: #ffffff align-items-center"
                style={{ minHeight: '90vh', paddingBottom: '80px' }}
            >
                {(loading || statusLoading) && (
                    <span className="text-center spinner-border" />
                )}

                {/* Aviso de Bloqueio - Anamnese só pode ser feita de 2 em 2 meses */}
                {!statusLoading &&
                    !loading &&
                    anamnesisStatus &&
                    !anamnesisStatus.can_register && (
                        <div className=" background-color: #ffffff;">
                            <div
                                className="alert alert-warning p-4 background-color: #ffffff"
                                role="alert"
                                style={{ backgroundColor: '#d8d8d7ff' }}
                            >
                                <h4 className="alert-heading text-black">
                                    ⏰ Anamnese Temporariamente Indisponível
                                </h4>
                                <hr />
                                <p className="mb-3 text-black">
                                    A anamnese só pode ser realizada a cada{' '}
                                    <strong>2 meses</strong> para garantir um
                                    acompanhamento adequado da sua evolução.
                                </p>

                                {anamnesisStatus.last_anamnesis_date && (
                                    <p className="mb-2 text-black">
                                        <strong>Última anamnese:</strong>{' '}
                                        {new Date(
                                            anamnesisStatus.last_anamnesis_date,
                                        ).toLocaleDateString('pt-BR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                        })}
                                    </p>
                                )}

                                {anamnesisStatus.next_available_date && (
                                    <p className="mb-2 text-black">
                                        <strong>
                                            Próxima anamnese disponível em:
                                        </strong>{' '}
                                        {new Date(
                                            anamnesisStatus.next_available_date,
                                        ).toLocaleDateString('pt-BR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                        })}
                                    </p>
                                )}

                                {anamnesisStatus.days_remaining !==
                                    undefined && (
                                    <div className="mt-3">
                                        <div className="badge bg-light text-secondary border fs-5 p-3">
                                            📅 {anamnesisStatus.days_remaining}{' '}
                                            {anamnesisStatus.days_remaining ===
                                            1
                                                ? 'dia'
                                                : 'dias'}{' '}
                                            restantes
                                        </div>
                                    </div>
                                )}

                                <div className="mt-4">
                                    <button
                                        className="btn btn-outline-dark btn-lg"
                                        onClick={() => router.push('/app')}
                                    >
                                        🏠 Voltar ao Início
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                {/* Formulário de anamnese quando permitido */}
                {!loading &&
                    !statusLoading &&
                    questions.length > 0 &&
                    anamnesisStatus?.can_register && (
                        <div className="w-100">
                            {/* Aviso quando tem liberação antecipada */}
                            {anamnesisStatus.has_early_release && (
                                <div
                                    className="alert alert-info mb-4"
                                    role="alert"
                                >
                                    ⭐{' '}
                                    <strong>Liberação Antecipada Ativa:</strong>{' '}
                                    Você está usando sua liberação antecipada
                                    para fazer esta anamnese.
                                </div>
                            )}

                            <div className="mb-4">
                                <h1>Selecione as regiões onde sente dor:</h1>
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
