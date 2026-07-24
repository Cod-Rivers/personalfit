import { Api } from '@/libs/api';

export interface FeedbackSummary {
    avg_stars: number;
    ratings_count: number;
    avg_rpe: number;
    rpe_sample_count: number;
    last_rating_at?: string;
}

export interface RatingItem {
    id: string;
    user_id: string;
    target_id: string;
    target_type: string; // macrocycle | mesocycle | microcycle
    stars: number;
    comment: string;
    created_at: string;
}

export interface SessionFeedback {
    log_id: string;
    training_ref: string;
    date: string;
    avg_rpe: number;
    notes?: string;
}

export interface StudentFeedback {
    summary: FeedbackSummary;
    ratings: RatingItem[];
    session_feedback: SessionFeedback[];
}

/** Retorno do aluno (avaliações + RPE/notas) para o personal ver. */
export async function getStudentFeedback(
    studentId: string,
): Promise<StudentFeedback> {
    const { data } = await Api.get<StudentFeedback>(
        `/students/${studentId}/feedback`,
    );
    return data;
}
