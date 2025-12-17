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
}

export interface ApiTrainingProgress {
    id: string;
    user_id: string;
    training_id: string;
    reference: string;
    exercise_logs: ExerciseLog[];
}

export interface UserTrainingDataResponse {
    user: User;
    trainings_progress: ApiTrainingProgress[];
}

export interface TrainingProtocolListProps {
    protocolId: string;
    protocolNumber: number;
    trainings: TrainingCardProps[];
}

export interface TrainingProtocolProps {
    protocolId: string;
    protocolNumber: number;
    trainings: TrainingCardProps[];
}

export interface ExerciseDetailPageProps {
    params: {
        id: string;
        trainingId: string;
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
    user: { id: string; name: string };
    trainings_progress: ApiTrainingProgress[];
}

export interface TrainingCardProps {
    id: string;
    label: string;
}

export interface ProtocolListPageParams {
    id: string;
}

export interface ApiTrainingProgress {
    id: string;
    user_id: string;
    training_id: string;
    reference: string;
    exercise_logs: ExerciseLog[];
}

export interface User {
    id: string;
    name: string;
}

export interface ApiResponse {
    user: User;
    trainings_progress: ApiTrainingProgress[];
}

export interface ProtocolListItem {
    id: string;
    label: string;
}
