'use client';
import React, { FC, useEffect, useState } from 'react';
import { IQuestionProps, IquestionsRendererProps } from './interface';
import Timeline from '@/components/molecules/Timeline';


// import { Container } from './styles';

const QuestionsRenderer: FC<IquestionsRendererProps> = ({ questions,  submitQuestions }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
    const [answers, setAnswers] = useState<{ [key: string]: string }>({});

    const currentQuestion: IQuestionProps = questions[currentQuestionIndex ?? 0];
    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    const handleRadioChange = (answer_id: string) => {
        setAnswers({
            ...answers,
            [currentQuestion.id]: answer_id,
        });
    };

    const handlePreviousQuestion = () => {
        setCurrentQuestionIndex(currentQuestionIndex - 1)
    }

    const handleNextQuestion = () => {
        if (!isLastQuestion) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            return;
        }
        submitQuestions(answers);
    };
    return (
        <div className="d-flex flex-column">
            <div className="">
                <h1>{currentQuestion.text}</h1>
            </div>
            <div className="">
                <div className='d-flex flex-column gap-3 my-3 mb-4'>
                    {currentQuestion.options.map((option) => {
                        return (
                            <button key={option.answer_id} className='p-3 bg-white text-black rounded' style={{
                                border: answers[option.question_id] === option.answer_id ? '3px solid var(--color-gold)' : '3px solid transparent'
                            }} onClick={() => handleRadioChange(option.answer_id)}>
                                <label htmlFor={option.question_id} className='fw-fold d-flex align-items-center'>
                                    {option.text}
                                </label>
                            </button>
                        );
                    })}
                </div>
                <div className="d-flex justify-content-between">
                    <button
                        className='btn btn-gold'
                        onClick={handlePreviousQuestion}
                        disabled={currentQuestionIndex === 0}
                    >
                        Anterior
                    </button>
                    <button className='btn btn-gold' onClick={handleNextQuestion}>
                        {isLastQuestion ? 'Finalizar' : 'Próxima'}
                    </button>
                </div>
                <div className="w-100 mt-3">
                    <Timeline currentStep={currentQuestionIndex} totalSteps={questions.length} />
                </div>
            </div>
        </div>
    );
};

export default QuestionsRenderer;
