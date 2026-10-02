export interface ExerciseLog {
    id: string;
    name: string;
    series: number[];
    series_label?: string; // Texto livre de séries (modo livre do personal)
    variations: string;
    video_url: string;
    video_thumb: string;
    timed?: boolean;
    weight: number;
    notes?: string;        // Anotações do próprio aluno (campo notes do ExerciseLog)
    comments?: string;     // Instruções do personal trainer (campo comments do Exercise)
    restTime?: number;
    /** Carga planejada pelo personal (ExerciseResponse.load_kg), usada como
     * base para a sugestão de carga do painel de autorregulação do
     * microciclo. */
    plannedWeight?: number;
    /** ISO da última vez que plannedWeight mudou (ExerciseResponse.
     * load_prescribed_at) — ver libs/loadSuggestion.ts. */
    loadPrescribedAt?: string;
    /** Intensidade prescrita pelo personal, mostrada ao aluno no card. Só
     * informativos: o app não guarda o 1RM do aluno, então a % não vira kg. */
    loadPercentage?: number;
    /** Cadência: segundos por repetição. */
    tempoSeconds?: number;
    /** RPE alvo (1–10). */
    rpeTarget?: number;
    /** Técnica de treinamento avançada (dropset, isometria etc) — ver
     * TECHNIQUE_CATALOG em @/libs/trainingTechniques. */
    technique?: string;
    technique_params?: {
        rounds?: number;
        round_reduction_pct?: number;
        pause_seconds?: number;
        extra_reps?: number;
        hold_seconds?: number;
    };
    /** Variante do bloco de bi-set/superset (ver GROUP_TECHNIQUE_CATALOG). */
    group_technique?: string;
    /** Recuperação (s) entre os exercícios do bloco no circuito (tabata). */
    group_recovery_seconds?: number;
    /** Agrupa exercícios executados em sequência, sem descanso entre si.
     * Exercícios consecutivos com o mesmo group_id formam um bloco. */
    group_id?: string;
    /** Grupo muscular alvo (ExerciseResponse.muscle_group). Necessário para a
     * substituição por equipamento indisponível. */
    muscle_group?: string;
    /** Vínculo com a biblioteca (ExerciseResponse.exercise_library_id) — é o
     * que dá ao card a chave estável do histórico de carga (exerciseKeyFor). */
    exercise_library_id?: string;
    /** Preenchido só em sessão, quando o aluno troca o exercício por um
     * substituto sugerido pela IA. Não é persistido — recarregar a página
     * restaura a prescrição original do personal. */
    substitutedFrom?: string;
    /** Override do personal sobre a substituibilidade (ExerciseResponse.non_substitutable).
     * null/ausente = sem restrição; true = nunca substituível; false = sempre
     * substituível. Alimenta o selo do card e o gate do modal de substituição. */
    non_substitutable?: boolean | null;
    /** Origem da trava na tela do aluno (ver applySubstitutability em
     * libs/exerciseLog.ts): "personal" marcou, ou "derivado" da dor relatada. */
    non_substitutable_source?: 'personal' | 'derivado';
    /** Motivo da trava derivada ("dor em joelho"). */
    non_substitutable_reason?: string;
    // Adicione outros campos se existirem
}

// Props para o card de treino individual
export interface TrainingCardProps {
    id: string; // ID do treino (ex: "t1", "t2")
    label: string; // Rótulo do treino (ex: "Treino A", "Treino 1", "Segunda")
    /** Grupos musculares dominantes, ex. "Peito, Ombros e Tríceps". */
    focusLabel?: string;
    accent?: 'push' | 'pull' | 'legs' | 'core' | 'mixed';
    exerciseCount?: number;
    seriesCount?: number;
    estimatedMinutes?: number;
    /** Status do último registro deste treino no microciclo atual. */
    status?: 'pending' | 'in_progress' | 'completed' | 'skipped';
    completedDate?: string;
    /** Só é preenchido em planos "simple" com dia da semana fixo. */
    scheduledToday?: boolean;
}
