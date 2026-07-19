export interface IQuestionProps {
    id: string;
    text: string;
    options: Array<{
        question_id: string;
        answer_id: string;
        text: string;
    }>;
}

export interface IquestionsRendererProps {
    questions: Array<IQuestionProps>;
    submitQuestions: (questions: { [key: string]: string }) => void;
}