import { Api } from '@/libs/api';

/**
 * Avaliação do plano de treino pelo próprio aluno (1 a 5 estrelas +
 * comentário). Uma nota por plano: avaliar de novo substitui a anterior.
 * A nota aparece para o personal em "Feedback do aluno" e, quando o plano
 * veio de um modelo da biblioteca, entra no ranking de modelos do admin.
 */
export interface MyRating {
    id: string;
    target_id: string;
    target_type: string;
    stars: number;
    comment: string;
    created_at: string;
}

export async function submitRating(body: {
    target_id: string;
    target_type: 'macrocycle' | 'mesocycle' | 'microcycle';
    stars: number;
    comment?: string;
}): Promise<void> {
    await Api.post('/ratings', body);
}

/** A nota que o aluno já deu ao alvo, ou null. */
export async function getMyRating(targetId: string): Promise<MyRating | null> {
    const { data } = await Api.get<MyRating | null>('/ratings/mine', {
        params: { target_id: targetId },
    });
    return data ?? null;
}
