export interface ExerciseLog {
    id: string;
    name: string;
    series: number[];
    variations: string;
    video_url: string;
    video_thumb: string;
    timed: boolean;
    weight: number;
    notes?: string;
    restTime: number;
    // Adicione outros campos se existirem
}

export interface ApiTrainingProgress {
    id: string; // ID do registro de progresso (ex: "tp1")
    user_id: string;
    training_id: string; // ID do modelo de treino (ex: "t1")
    reference: string; // "A", "B", "C" - para o label do card
    exercise_logs: ExerciseLog[];
    // Outros campos relevantes para o progresso do treino, se houver
}

export interface UserTrainingDataResponse {
    user: User;
    trainings_progress: TrainingProgress[];
}

// Props para a lista de cards
export interface TrainingProtocolListProps {
    protocolId: string; // ID do protocolo vindo da URL
    protocolNumber: number;
    trainings: TrainingCardProps[]; // Lista simplificada para os cards
    // Se quiser passar todos os dados de 'trainings_progress' para evitar refetch,
    // pode mudar 'trainings' para ser do tipo TrainingProgress[]
    // allTrainingProgress: TrainingProgress[];
}

export interface TrainingProtocolProps {
    protocolId: string; // ID do protocolo vindo da URL
    protocolNumber: number;
    trainings: TrainingCardProps[]; // Lista simplificada para os cards
    // Se quiser passar todos os dados de 'trainings_progress' para evitar refetch,
    // pode mudar 'trainings' para ser do tipo TrainingProgress[]
    // allTrainingProgress: TrainingProgress[];
}

// Props para a página de detalhes do exercício
export interface ExerciseDetailPageProps {
    params: {
        id: string; // ID do Protocolo
        trainingId: string; // ID do Treino (training_id da API)
    };
}
export interface ProtocolListPageParams {
    id: string;
}
export interface ProtocolPageParams {
    id: string;
}

export interface PageProps {
    params: {
        protocolId: string;
        trainingId: string;
    };
}
export interface LocalApiResponse {
    user: { id: string; name: string }; // Ou importe UserType de types.ts
    trainings_progress: ActualApiTrainingProgress[];
}
// src/components/types.ts

// Log de Exercício (usado em ApiTrainingProgress e na página de exercícios)
// Props para o card de treino individual
export interface TrainingCardProps {
    id: string; // ID do treino (ex: "t1", "t2")
    label: string; // Rótulo do treino (ex: "A", "B")
}

// Parâmetros da página de listagem de protocolos (para a rota /treinamento/[id])
export interface ProtocolListPageParams {
    id: string; // Representa o protocolId da URL
}

// Progresso de Treino da API (mock)
export interface ApiTrainingProgress {
    id: string; // ID do registro de progresso (ex: "tp1")
    user_id: string;
    training_id: string; // ID do modelo de treino (ex: "t1") que corresponde a TrainingCardProps.id
    reference: string; // "A", "B", "C" - para o label do card (TrainingCardProps.label)
    exercise_logs: ExerciseLog[]; // Logs detalhados dos exercícios, se aplicável aqui
}

// Usuário da API (mock)
export interface User {
    id: string;
    name: string;
}

// Resposta da API (mock para a página de protocolo)
export interface ApiResponse {
    user: User;
    trainings_progress: ApiTrainingProgress[];
}

export interface ProtocolListItem {
    id: string; // Este deve ser o ID real do protocolo (ex: "1", "outroProtocolo")
    label: string;
}

// Props para o componente TrainingProtocolList
