import { ExerciseResponse } from '@/libs/planningService';
import { ExerciseLog } from '@/components/features/types';

/** Converte o exercício prescrito (vindo da API) para o formato usado pelos
 * cards clicáveis e pelo ExerciseDetailCard. Compartilhado entre a tela do
 * aluno (meus-treinos) e a visão somente-leitura do personal (ver treino). */
export function toExerciseLog(ex: ExerciseResponse): ExerciseLog {
    return {
        id: ex.id,
        name: ex.name,
        series: ex.series ?? [],
        series_label: ex.series_label,
        variations: ex.variations ?? '',
        video_url: ex.video_url ?? '',
        // Só usa video_thumb se for URL http (não caminho GCS privado)
        video_thumb: ex.video_thumb?.startsWith('http') ? ex.video_thumb : '',
        weight: 0,
        // notes é a anotação do próprio aluno (começa vazia); comments são as
        // instruções do personal e vão no campo certo, não sobrescrevem notes.
        notes: '',
        comments: ex.comments,
        restTime: ex.rest_seconds ?? 60,
        plannedWeight: ex.load_kg,
        technique: ex.technique,
        technique_params: ex.technique_params,
        group_technique: ex.group_technique,
        group_id: ex.group_id,
        muscle_group: ex.muscle_group,
    };
}
