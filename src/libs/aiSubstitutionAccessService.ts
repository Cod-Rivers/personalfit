import { Api } from '@/libs/api';

/**
 * Substituição Inteligente de Exercícios: consulta de acesso (usada pelo
 * aluno antes/durante o fluxo de troca de exercício) e configurações do
 * personal (toggle que decide se oferece a feature aos alunos vinculados).
 *
 * Ver Todo/PLANO_SUBSTITUICAO_EXERCICIOS_IA.md.
 */

export type AISubstitutionAccessReason =
    | 'allowed_by_personal'
    | 'allowed_by_own_pro'
    | 'allowed_by_subscription'
    | 'blocked_by_personal'
    | 'subscription_required';

export interface AISubstitutionAccessResponse {
    allowed: boolean;
    reason: AISubstitutionAccessReason;
    price?: number;
    cycle?: string;
}

export async function getAISubstitutionAccess(): Promise<AISubstitutionAccessResponse> {
    const res = await Api.get<AISubstitutionAccessResponse>(
        '/me/exercise-substitutions/access',
    );
    return res.data;
}

export interface SubstitutionSuggestion {
    nome_exercicio: string;
    grupo_muscular: string;
    equipamento_necessario: string;
    justificativa: string;
    nivel_recomendado: string;
}

export interface ExerciseSubstitutionRequest {
    planning_id: string;
    training_id: string;
    exercise_id: string;
    unavailable_equipment: string;
    available_equipment?: string[];
}

export interface ExerciseSubstitutionResponse {
    exercise_id: string;
    substitutos: SubstitutionSuggestion[];
    source: 'ia' | 'cache' | 'fallback';
}

/** Vocabulário exibido no seletor de equipamento — espelha as constantes
 * Equipamento* do backend (internal/domain/training/exercise-equipment.go). */
export const EQUIPMENT_OPTIONS = [
    'máquina',
    'halter',
    'barra',
    'cabo',
    'elástico',
    'aparelho de cardio',
    'outro',
] as const;

export async function requestExerciseSubstitutions(
    req: ExerciseSubstitutionRequest,
): Promise<ExerciseSubstitutionResponse> {
    const { data } = await Api.post<ExerciseSubstitutionResponse>(
        '/me/exercise-substitutions',
        req,
    );
    return data;
}

/* ── Configurações do personal (toggle) ── */

export interface AISubstitutionSettings {
    enabled: boolean;
    updated_at?: string;
}

export interface GetAISubstitutionSettingsResponse {
    ai_substitution: AISubstitutionSettings | null;
    plan_type: string;
}

export async function getMyAISubstitutionSettings(): Promise<GetAISubstitutionSettingsResponse> {
    const res = await Api.get<GetAISubstitutionSettingsResponse>('/personal/ai-substitution');
    return res.data;
}

export async function updateAISubstitutionSettings(
    enabled: boolean,
): Promise<{ ai_substitution: AISubstitutionSettings }> {
    const res = await Api.put<{ ai_substitution: AISubstitutionSettings }>(
        '/personal/ai-substitution',
        { enabled },
    );
    return res.data;
}
