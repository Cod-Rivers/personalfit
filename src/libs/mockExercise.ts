// Defina o tipo ExerciseLog atualizado
export interface ExerciseLog {
    exercise_logs: Array<{
        id: string;
        name: string;
        sets: number;
        reps: number;
        rest_time: number; // em segundos
        image_url: string;
        description: string;
    }>;
}

export const getExercisesByTrainingId = async (trainingId: string): Promise<ExerciseLog> => {
    const payload = localStorage.getItem(`user`);
    if (!payload) return { exercise_logs: [] };

    const { trainings_progress } = JSON.parse(payload);
    const protocol = trainings_progress.find((item: any) => item.id === trainingId);
    return protocol ? protocol : { exercise_logs: [] };
};