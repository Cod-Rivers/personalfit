import axios from "axios";

export const Api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

/**
 * Salva anotações de um exercício específico
 * @param trainingId - ID do treino (UserTrainingProgress)
 * @param exerciseId - ID do exercício dentro do treino
 * @param notes - Anotações do usuário
 * @returns Promise com o resultado da operação
 */
export async function saveExerciseNotes(
    trainingId: string,
    exerciseId: string,
    notes: string
): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            return {
                success: false,
                error: 'Token de autenticação não encontrado'
            };
        }

        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/user/training/${trainingId}/exercise/${exerciseId}/notes`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ notes })
            }
        );

        if (response.ok) {
            const result = await response.json();
            return {
                success: true,
                message: result.message || 'Anotações atualizadas com sucesso'
            };
        } else {
            const error = await response.json();
            return {
                success: false,
                error: error.error || 'Erro ao salvar anotações'
            };
        }
    } catch (error) {
        console.error('Erro ao salvar anotações:', error);
        return {
            success: false,
            error: 'Erro de conexão ao salvar anotações'
        };
    }
}
