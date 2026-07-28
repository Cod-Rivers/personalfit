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
    /** Respostas já dadas (ex.: aluno voltou da tela de revisão) — precarrega
     * as seleções em vez de reiniciar o questionário do zero. */
    initialAnswers?: { [key: string]: string };
    /** Índice da pergunta a exibir primeiro (junto com initialAnswers). */
    initialIndex?: number;
    /** Chamado quando o aluno aperta "Anterior" já na primeira pergunta —
     * permite ao componente pai voltar para uma etapa anterior à lista de
     * perguntas (ex.: a etapa de dores). Se omitido, o botão fica desabilitado
     * na primeira pergunta, como antes. */
    onBackBeforeFirst?: () => void;
}