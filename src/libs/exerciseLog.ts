import {
    ExerciseResponse,
    SubstitutabilityResponse,
} from '@/libs/planningService';
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
        // Sem isto o card mostra "30" onde a prescrição é de 30 SEGUNDOS, e o
        // aviso "Controlado por tempo" nunca aparece.
        timed: ex.timed ?? false,
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
        loadPrescribedAt: ex.load_prescribed_at,
        loadPercentage: ex.load_percentage || undefined,
        tempoSeconds: ex.tempo_seconds || undefined,
        rpeTarget: ex.rpe_target || undefined,
        technique: ex.technique,
        technique_params: ex.technique_params,
        group_technique: ex.group_technique,
        group_id: ex.group_id,
        muscle_group: ex.muscle_group,
        non_substitutable: ex.non_substitutable,
    };
}

/** Aplica a trava de substituição que o backend resolveu para o PRÓPRIO
 * aluno (MacrocycleResponse.substitutability, só nas rotas /my-planning).
 * Cobre o que `non_substitutable` sozinho não diz: a trava derivada da dor
 * que o aluno relatou, e o motivo de cada uma. Sem entrada no mapa, o
 * exercício fica como veio. */
export function applySubstitutability(
    log: ExerciseLog,
    info: SubstitutabilityResponse | undefined,
): ExerciseLog {
    if (!info) return log;
    return {
        ...log,
        non_substitutable: true,
        non_substitutable_source: info.source,
        non_substitutable_reason: info.reason,
    };
}
