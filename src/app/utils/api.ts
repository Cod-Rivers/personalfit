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

        console.log('[saveExerciseNotes] Enviando requisição:', {
            trainingId,
            exerciseId,
            notesLength: notes.length,
            hasToken: !!token
        });

        const url = `${process.env.NEXT_PUBLIC_API_URL}/user/training/${trainingId}/exercise/${exerciseId}/notes`;
        
        // Primeira tentativa: com Bearer (padrão)
        let response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ notes })
        });

        // Se falhar com 401, tentar sem Bearer (quirk do backend)
        if (response.status === 401) {
            console.log('[saveExerciseNotes] Tentativa com Bearer falhou, tentando sem Bearer...');
            response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ notes })
            });
        }

        if (response.ok) {
            const result = await response.json();
            console.log('[saveExerciseNotes] Sucesso:', result);
            return {
                success: true,
                message: result.message || 'Anotações atualizadas com sucesso'
            };
        } else {
            const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
            console.error('[saveExerciseNotes] Erro na resposta:', {
                status: response.status,
                statusText: response.statusText,
                error
            });
            return {
                success: false,
                error: error.error || error.message || `Erro ${response.status}: ${response.statusText}`
            };
        }
    } catch (error: any) {
        console.error('[saveExerciseNotes] Erro na requisição:', error);
        return {
            success: false,
            error: error.message || 'Erro de conexão ao salvar anotações'
        };
    }
}

/**
 * Salva o peso (carga) de um exercício específico
 * @param trainingId - ID do treino (UserTrainingProgress)
 * @param exerciseId - ID do exercício dentro do treino
 * @param weight - Peso/carga do exercício em kg
 * @returns Promise com o resultado da operação
 */
export async function saveExerciseWeight(
    trainingId: string,
    exerciseId: string,
    weight: number
): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            return {
                success: false,
                error: 'Token de autenticação não encontrado'
            };
        }

        console.log('[saveExerciseWeight] Enviando requisição:', {
            trainingId,
            exerciseId,
            weight,
            hasToken: !!token
        });

        const url = `${process.env.NEXT_PUBLIC_API_URL}/user/training/${trainingId}/exercise/${exerciseId}/weight`;
        
        // Primeira tentativa: com Bearer (padrão)
        let response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ weight })
        });

        // Se falhar com 401, tentar sem Bearer (quirk do backend)
        if (response.status === 401) {
            console.log('[saveExerciseWeight] Tentativa com Bearer falhou, tentando sem Bearer...');
            response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ weight })
            });
        }

        if (response.ok) {
            const result = await response.json();
            console.log('[saveExerciseWeight] Sucesso:', result);
            return {
                success: true,
                message: result.message || 'Peso atualizado com sucesso'
            };
        } else {
            const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
            console.error('[saveExerciseWeight] Erro na resposta:', {
                status: response.status,
                statusText: response.statusText,
                error
            });
            return {
                success: false,
                error: error.error || error.message || `Erro ${response.status}: ${response.statusText}`
            };
        }
    } catch (error: any) {
        console.error('[saveExerciseWeight] Erro na requisição:', error);
        return {
            success: false,
            error: error.message || 'Erro de conexão ao salvar peso'
        };
    }
}
