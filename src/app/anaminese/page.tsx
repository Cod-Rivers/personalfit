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
            const payload = Object.entries(awnsers).map(([key, value]) => ({
                question_id: key,
                answer_id: value,
            }));
            const user_token = localStorage.getItem('token');
            const { data } = await Api.post('/user/anamnesis', payload, {
                headers: {
                    Authorization: `${user_token}`,
                },
            });
            alert(data.message);
            router.push('/app');
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
