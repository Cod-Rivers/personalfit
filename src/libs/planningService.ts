import axios from 'axios';
import { Api } from '@/libs/api';
import { GanttPhase } from '@/components/features/GanttPlanning';

/* ── Response types ── */

export interface ExerciseResponse {
    id: string;
    name: string;
    series: number[];
    variations: string;
    comments?: string;
    series_label?: string; // Texto livre de séries (modo livre)
    video_url: string;
    video_thumb: string;
    timed: boolean;
    /** Vínculo com exercise_library, resolvido no seed/picker. Não é editável
     * na UI, mas precisa sobreviver ao round-trip de edição do plano. */
    exercise_library_id?: string;
    load_percentage?: number;
    load_kg?: number;
    rest_seconds?: number;
    tempo_seconds?: number;
    rpe_target?: number;
    muscle_group?: string;
    /** Agrupa exercícios executados em sequência, sem descanso entre si
     * (bissérie/trissérie/superssérie). Exercícios com o mesmo group_id dentro
     * do mesmo treino formam um bloco — a ordem de execução é a ordem em `exercises`. */
    group_id?: string;
    /** Variante do bloco de group_id (biset/superset/triset/giant_set/
     * pre_exhaustion/post_exhaustion) — ver GROUP_TECHNIQUE_CATALOG. */
    group_technique?: string;
    /** Técnica de treinamento aplicada a este exercício (dropset, isometria
     * etc) — ver TECHNIQUE_CATALOG em trainingTechniques.ts. */
    technique?: string;
    technique_params?: TechniqueParamsResponse;
}

export interface TechniqueParamsResponse {
    rounds?: number;
    round_reduction_pct?: number;
    pause_seconds?: number;
    extra_reps?: number;
    hold_seconds?: number;
}

export interface TrainingResponse {
    id: string;
    reference: string;
    exercises: ExerciseResponse[];
    /** Dia da semana (0=domingo..6=sábado), usado no modo simples. */
    weekday?: number;
}

export interface MicrocycleResponse {
    id: string;
    week_number: number;
    status: string;
    focus?: string;
    target_rpe?: number;
    volume_adjust_pct?: number;
    intensity_adjust_pct?: number;
    is_deload?: boolean;
    notes?: string;
}

export interface MicrocycleRequest {
    /** ID do microciclo já existente (preservar para não invalidar workout logs
     * registrados contra ele). Omitir/undefined para um microciclo novo. */
    id?: string;
    week_number: number;
    status: string;
    focus?: string;
    target_rpe?: number;
    volume_adjust_pct?: number;
    intensity_adjust_pct?: number;
    is_deload?: boolean;
    notes?: string;
}

export interface MesocycleResponse {
    id: string;
    order: number;
    name: string;
    phase: string;
    duration_weeks: number;
    methodology: string;
    start_date?: string;
    end_date?: string;
    trainings: TrainingResponse[];
    microcycles: MicrocycleResponse[];
}

export interface MacrocycleResponse {
    id: string;
    personal_id: string;
    student_id: string;
    name: string;
    goal: string;
    start_date?: string;
    end_date?: string;
    status: string;
    /** Origem do macrociclo: "anamnesis" (gerado pela anamnese), "celebrity"
     * (aluno aplicou da biblioteca estilo-famosos), ou vazio (montado pelo
     * personal). Só planos "celebrity" podem ser removidos pelo aluno. */
    category?: string;
    /** "periodized" (padrão) ou "simple" — definido só na criação do macrociclo. */
    planning_mode?: 'periodized' | 'simple';
    /** "weekday" (padrão) ou "number" — só relevante quando planning_mode=simple. */
    simple_day_label?: 'weekday' | 'number';
    is_template?: boolean;
    is_public?: boolean;
    /** Status de revisão da equipe Venafit — só relevante quando is_public=true.
     * "pending": aguardando revisão; "approved": liberado na biblioteca pública;
     * "rejected": recusado (ver rejection_reason). */
    approval_status?: 'pending' | 'approved' | 'rejected' | '';
    rejection_reason?: string;
    /** Quantas vezes o template foi aplicado a um aluno (o próprio ou de
     * outros personals via biblioteca pública). Vem pronto do backend. */
    usage_count?: number;
    featured?: boolean;
    mesocycles: MesocycleResponse[];
    created_at: string;
    updated_at: string;
}

/* ── Request types ── */

export interface ExerciseRequest {
    /** ID do exercício já existente. Reenviar é obrigatório para não órfãar o
     * histórico de séries (ExercisePerformance) nem as anotações do aluno
     * (ExerciseAnnotation), que referenciam o exercício por este ID.
     * Omitir apenas para exercícios novos. */
    id?: string;
    /** Vínculo com exercise_library — passthrough, não editável na UI. */
    exercise_library_id?: string;
    name: string;
    series: number[];
    variations: string;
    comments: string;
    series_label?: string; // Texto livre de séries (modo livre)
    video_url: string;
    video_thumb: string;
    timed: boolean;
    load_percentage?: number;
    load_kg?: number;
    rest_seconds?: number;
    tempo_seconds?: number;
    rpe_target?: number;
    muscle_group?: string;
    group_id?: string;
    group_technique?: string;
    technique?: string;
    technique_params?: TechniqueParamsResponse;
}

export interface TrainingRequest {
    reference: string;
    exercises: ExerciseRequest[];
    weekday?: number;
}

export interface MesocycleRequest {
    /** ID do mesociclo já existente (preservar para não perder as datas do
     * Gantt nem o vínculo com PeriodizedWorkoutLogs). Omitir para uma fase nova. */
    id?: string;
    order: number;
    name: string;
    phase: string;
    duration_weeks: number;
    methodology: string;
    trainings: TrainingRequest[];
    microcycles?: MicrocycleRequest[];
}

export interface CreateMacrocycleRequest {
    name: string;
    goal: string;
    start_date?: string;
    end_date?: string;
    planning_mode?: 'periodized' | 'simple';
    simple_day_label?: 'weekday' | 'number';
    mesocycles: MesocycleRequest[];
}

export interface UpdateMacrocycleRequest {
    name?: string;
    goal?: string;
    status?: string;
    start_date?: string | null;
    end_date?: string | null;
    mesocycles?: MesocycleRequest[];
}

/** Seleciona o microciclo "atual" de um mesociclo: em andamento, senão o
 * próximo pendente, senão o último cadastrado (fase já concluída). */
export function pickActiveMicrocycle(
    microcycles: MicrocycleResponse[] = [],
): MicrocycleResponse | null {
    return (
        microcycles.find((m) => m.status === 'in_progress') ??
        microcycles.find((m) => m.status === 'pending') ??
        microcycles[microcycles.length - 1] ??
        null
    );
}

/**
 * Converte um macrociclo completo para GanttPhases.
 * Cada mesociclo usa sua própria data (start_date/end_date) quando definida —
 * seja porque veio assim do backend, seja porque o personal ajustou via drag
 * no Gantt (ver UpdatePhase/PUT .../phase/:phaseId). Para os que ainda não
 * têm data própria, calcula a partir de duration_weeks, encadeando a partir
 * de onde a fase anterior (com ou sem data própria) terminou — começando do
 * start_date do macrociclo, se houver.
 */
/** Fração (0–1) de microciclos concluídos de um mesociclo; undefined sem microciclos. */
function computeMesoProgress(m: MesocycleResponse): number | undefined {
    const micros = m.microcycles ?? [];
    if (micros.length === 0) return undefined;
    const completed = micros.filter((mc) => mc.status === 'completed').length;
    return completed / micros.length;
}

/** Início/fim real de uma fase — min/max de completed_date entre os logs
 * concluídos desse mesociclo. undefined (campos ausentes) sem nenhum log
 * concluído ainda: comparativo "plano vs. realizado" só faz sentido depois
 * que o aluno de fato treinou algo na fase. */
function computeActualSpan(
    mesoId: string,
    logs: PeriodizedWorkoutLogResponse[],
): { actualStart?: string; actualEnd?: string } {
    const completedDates = logs
        .filter((l) => l.mesocycle_id === mesoId && l.status === 'completed' && l.completed_date)
        .map((l) => (l.completed_date as string).split(' ')[0]); // "YYYY-MM-DD HH:MM:SS" → "YYYY-MM-DD"
    if (completedDates.length === 0) return {};
    return {
        actualStart: completedDates.reduce((a, b) => (a < b ? a : b)),
        actualEnd: completedDates.reduce((a, b) => (a > b ? a : b)),
    };
}

/** Campos exibidos no Gantt (cor por fase, progresso, tooltip, comparativo
 * plano×realizado) — comuns aos dois ramos (data própria ou calculada) de
 * macroToGanttPhases. */
function mesoGanttMeta(m: MesocycleResponse, logs: PeriodizedWorkoutLogResponse[]) {
    return {
        phase: m.phase,
        methodology: m.methodology,
        progress: computeMesoProgress(m),
        activeFocus: pickActiveMicrocycle(m.microcycles)?.focus,
        ...computeActualSpan(m.id, logs),
    };
}

export function macroToGanttPhases(
    macro: MacrocycleResponse,
    logs: PeriodizedWorkoutLogResponse[] = [],
): GanttPhase[] {
    const mesos = [...(macro.mesocycles ?? [])].sort((a, b) => a.order - b.order);
    if (mesos.length === 0) return [];

    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const addWeeks = (d: Date, weeks: number) => {
        const r = new Date(d);
        r.setDate(r.getDate() + weeks * 7);
        return r;
    };

    const phases: GanttPhase[] = [];
    let cursor = macro.start_date ? new Date(macro.start_date) : null;

    for (const m of mesos) {
        if (m.start_date && m.end_date) {
            phases.push({
                id: m.id,
                name: m.name,
                start: m.start_date,
                end: m.end_date,
                ...mesoGanttMeta(m, logs),
            });
            cursor = new Date(m.end_date);
            continue;
        }

        // Sem data própria e sem base anterior para calcular — pula a fase
        // em vez de desenhar um bloco de posição arbitrária e enganosa.
        if (!cursor) continue;

        if (m.duration_weeks <= 0) {
            // duration_weeks inválido (0) — mesma lógica: pula em vez de
            // inventar uma duração fictícia para esconder dado corrompido.
            console.warn(
                `Mesociclo "${m.name}" (${m.id}) tem duration_weeks=0 — ignorado no Gantt.`,
            );
            continue;
        }
        const start = new Date(cursor);
        const end = addWeeks(start, m.duration_weeks);
        phases.push({
            id: m.id,
            name: m.name,
            start: fmt(start),
            end: fmt(end),
            ...mesoGanttMeta(m, logs),
        });
        cursor = end;
    }

    return phases;
}

/* ── API calls ── */

/* ── Exercise Library (catálogo de exercícios) ── */

export interface ExerciseLibraryItem {
    id: string;
    name: string;
    muscle_group: string;
    category: string;
    video_url: string;
    video_thumb: string;
    description: string;
    tags: string[];
    is_custom?: boolean;
    owner_id?: string;
    created_at: string;
    updated_at: string;
}

export interface CreatePersonalExerciseRequest {
    name: string;
    muscle_group: string;
    category?: string;
    video_url?: string;
    video_thumb?: string;
    description?: string;
    tags?: string[];
}

/** Vocabulário canônico de grupo muscular — precisa cobrir os 12 grupos da
 * biblioteca de exercícios e ficar em sincronia com CanonicalMuscleGroups()
 * do backend (internal/domain/training/muscle-group.go). Faltavam 'Adutores'
 * e 'Cardio': sem eles o personal não conseguia marcar dois dos 12 grupos, o
 * que garantia muscle_group vazio nesses exercícios — e um muscle_group vazio
 * é o que fazia a Substituição Inteligente sugerir exercício de outro grupo. */
export const MUSCLE_GROUPS = [
    'Quadríceps',
    'Glúteos',
    'Adutores',
    'Posteriores',
    'Panturrilha',
    'Costas',
    'Peito',
    'Ombros',
    'Tríceps',
    'Bíceps',
    'Core',
    'Cardio',
] as const;

/** Rótulo exibido para cada grupo muscular canônico. O valor armazenado
 * continua sendo o de MUSCLE_GROUPS (ex.: "Core") — só o texto mostrado no
 * seletor muda, para usar o termo em português que personal trainers
 * reconhecem ("Abdômen") em vez do anglicismo. Trocar o valor armazenado
 * exigiria migrar os exercícios já cadastrados em produção. */
const MUSCLE_GROUP_LABELS: Partial<Record<string, string>> = {
    Core: 'Abdômen',
    Posteriores: 'Posteriores (Isquiotibiais)',
};

export function muscleGroupLabel(group: string): string {
    return MUSCLE_GROUP_LABELS[group] ?? group;
}

/** Vocabulário canônico de categoria — precisa ficar em sincronia com
 * CanonicalCategories() do backend (internal/domain/training/exercise-category.go). */
export const EXERCISE_CATEGORIES = ['Composto', 'Isolado', 'Aeróbico'] as const;

/** Vocabulário canônico de tags — mesmo vocabulário já usado no seed da
 * biblioteca (exercise-library-seed.go); precisa ficar em sincronia com
 * CanonicalTags() do backend (internal/domain/training/exercise-tags.go). */
export const EXERCISE_TAGS = [
    'abdominal',
    'adutores',
    'aeróbico',
    'antebraço',
    'barra',
    'bike',
    'bíceps',
    'cabo',
    'cardio',
    'composto',
    'core',
    'costas',
    'dinâmico',
    'esteira',
    'glúteos',
    'halter',
    'hiit',
    'isolado',
    'isométrico',
    'livre',
    'máquina',
    'oblíquo',
    'ombros',
    'panturrilha',
    'peito',
    'pernas',
    'peso corporal',
    'pliométrico',
    'posteriores',
    'quadríceps',
    'remo',
    'trapézio',
    'tríceps',
    'unilateral',
    'variação',
] as const;

/** GET /exercises?search=&muscle_group= */
export async function searchExercises(
    search?: string,
    muscleGroup?: string,
): Promise<ExerciseLibraryItem[]> {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (muscleGroup) params.set('muscle_group', muscleGroup);
    const query = params.toString();
    const url = `/exercises${query ? `?${query}` : ''}`;
    const { data } = await Api.get<ExerciseLibraryItem[]>(url);
    return data ?? [];
}

/** GET /my-exercises?search=&muscle_group= */
export async function getMyExercises(
    search?: string,
    muscleGroup?: string,
): Promise<ExerciseLibraryItem[]> {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (muscleGroup) params.set('muscle_group', muscleGroup);
    const query = params.toString();
    const url = `/my-exercises${query ? `?${query}` : ''}`;
    const { data } = await Api.get<ExerciseLibraryItem[]>(url);
    return data ?? [];
}

/** POST /my-exercises */
export async function createMyExercise(
    req: CreatePersonalExerciseRequest,
): Promise<ExerciseLibraryItem> {
    const { data } = await Api.post<ExerciseLibraryItem>('/my-exercises', req);
    return data;
}

/** PUT /my-exercises/:id */
export async function updateMyExercise(
    id: string,
    req: CreatePersonalExerciseRequest,
): Promise<ExerciseLibraryItem> {
    const { data } = await Api.put<ExerciseLibraryItem>(`/my-exercises/${id}`, req);
    return data;
}

/** DELETE /my-exercises/:id */
export async function deleteMyExercise(id: string): Promise<void> {
    await Api.delete(`/my-exercises/${id}`);
}

/** GET /students/:studentId/planning */
export async function getStudentPlannings(
    studentId: string,
): Promise<MacrocycleResponse[]> {
    const { data } = await Api.get<MacrocycleResponse[]>(
        `/students/${studentId}/planning`,
    );
    return data ?? [];
}

/** GET /students/:studentId/planning/:planningId */
export async function getMacrocycle(
    studentId: string,
    planningId: string,
): Promise<MacrocycleResponse> {
    const { data } = await Api.get<MacrocycleResponse>(
        `/students/${studentId}/planning/${planningId}`,
    );
    return data;
}

/** POST /students/:studentId/planning */
export async function createMacrocycle(
    studentId: string,
    body: CreateMacrocycleRequest,
): Promise<MacrocycleResponse> {
    const { data } = await Api.post<MacrocycleResponse>(
        `/students/${studentId}/planning`,
        body,
    );
    return data;
}

/** PUT /students/:studentId/planning/:planningId */
export async function updateMacrocycle(
    studentId: string,
    planningId: string,
    body: UpdateMacrocycleRequest,
): Promise<MacrocycleResponse> {
    const { data } = await Api.put<MacrocycleResponse>(
        `/students/${studentId}/planning/${planningId}`,
        body,
    );
    return data;
}

/** PUT /students/:studentId/planning/:planningId/phase/:phaseId */
export async function updatePhaseDate(
    studentId: string,
    planningId: string,
    phaseId: string,
    startDate: string,
    endDate: string,
): Promise<MacrocycleResponse> {
    const { data } = await Api.put<MacrocycleResponse>(
        `/students/${studentId}/planning/${planningId}/phase/${phaseId}`,
        { start_date: startDate, end_date: endDate },
    );
    return data;
}

export interface PeriodizedWorkoutLogResponse {
    id: string;
    macrocycle_id: string;
    mesocycle_id: string;
    microcycle_id: string;
    student_id: string;
    training_ref: string;
    status: 'pending' | 'completed' | 'skipped';
    planned_date: string;
    completed_date?: string;
}

/**
 * GET /students/:studentId/planning/:planningId/workout-logs — todos os
 * logs de treino do aluno dentro deste macrociclo (todos os mesociclos e
 * microciclos de uma vez). Usado pelo comparativo "plano vs. realizado" do
 * Gantt: `completed_date` de cada log dá o início/fim real de cada fase,
 * pra comparar com as datas planejadas (`start`/`end` de GanttPhase).
 * Retorna [] se o macrociclo ainda não tem start_date/end_date definidos.
 */
export async function getPlanWorkoutLogs(
    studentId: string,
    planningId: string,
): Promise<PeriodizedWorkoutLogResponse[]> {
    const { data } = await Api.get<PeriodizedWorkoutLogResponse[]>(
        `/students/${studentId}/planning/${planningId}/workout-logs`,
    );
    return data ?? [];
}

/** DELETE /students/:studentId/planning/:planningId */
export async function deleteMacrocycle(
    studentId: string,
    planningId: string,
): Promise<void> {
    await Api.delete(
        `/students/${studentId}/planning/${planningId}`,
    );
}

/* ── Student self-access (role=student) ── */

/** POST /students/:studentId/planning/:planningId/save-as-template */
export async function saveAsTemplate(
    studentId: string,
    planningId: string,
    name: string,
): Promise<MacrocycleResponse> {
    const { data } = await Api.post<MacrocycleResponse>(
        `/students/${studentId}/planning/${planningId}/save-as-template`,
        { name },
    );
    return data;
}

/** POST /planning/templates — cria um template diretamente */
export async function createNewTemplate(
    body: {
        name: string;
        goal?: string;
        is_public?: boolean;
        planning_mode?: 'periodized' | 'simple';
        simple_day_label?: 'weekday' | 'number';
    },
): Promise<MacrocycleResponse> {
    const { data } = await Api.post<MacrocycleResponse>(
        '/planning/templates',
        body,
    );
    return data;
}
export async function getMyTemplates(): Promise<MacrocycleResponse[]> {
    const { data } = await Api.get<MacrocycleResponse[]>('/planning/templates');
    return data ?? [];
}

/** GET /planning/templates/:templateId */
export async function getTemplate(
    templateId: string,
): Promise<MacrocycleResponse> {
    const { data } = await Api.get<MacrocycleResponse>(
        `/planning/templates/${templateId}`,
    );
    return data;
}

/** PUT /planning/templates/:templateId */
export async function updateTemplate(
    templateId: string,
    body: UpdateMacrocycleRequest & { is_public?: boolean },
): Promise<MacrocycleResponse> {
    const { data } = await Api.put<MacrocycleResponse>(
        `/planning/templates/${templateId}`,
        body,
    );
    return data;
}

/** DELETE /planning/templates/:templateId — remove um template */
export async function deleteTemplate(templateId: string): Promise<void> {
    await Api.delete(`/planning/templates/${templateId}`);
}

/** POST /planning/templates/:templateId/duplicate — clona um template em um novo */
export async function duplicateTemplate(
    templateId: string,
    name?: string,
): Promise<MacrocycleResponse> {
    const { data } = await Api.post<MacrocycleResponse>(
        `/planning/templates/${templateId}/duplicate`,
        name ? { name } : {},
    );
    return data;
}

/** POST /students/:studentId/planning/from-template/:templateId */
export async function applyTemplate(
    studentId: string,
    templateId: string,
): Promise<MacrocycleResponse> {
    const { data } = await Api.post<MacrocycleResponse>(
        `/students/${studentId}/planning/from-template/${templateId}`,
    );
    return data;
}

/* ── Student self-access (role=student) ── */

/** GET /my-planning — lista macrociclos do aluno logado */
export async function getMyPlannings(): Promise<MacrocycleResponse[]> {
    const { data } = await Api.get<MacrocycleResponse[]>('/my-planning');
    return data ?? [];
}

/** DELETE /my-planning/:planningId — remove um plano que o aluno escolheu
 * (biblioteca estilo-famosos). Backend responde 403 para planos gerados pela
 * anamnese ou montados pelo personal. */
export async function deleteMyPlanning(planningId: string): Promise<void> {
    await Api.delete(`/my-planning/${planningId}`);
}

/** GET /my-planning/:planningId — macrociclo específico do aluno logado */
export async function getMyMacrocycle(
    planningId: string,
): Promise<MacrocycleResponse> {
    const { data } = await Api.get<MacrocycleResponse>(
        `/my-planning/${planningId}`,
    );
    return data;
}

/**
 * GET /my-planning/active — macrociclo ativo do aluno logado, ou null se
 * nenhum estiver ativo no momento. Usado pelo fluxo de download offline.
 */
export async function getMyActiveMacrocycle(): Promise<MacrocycleResponse | null> {
    try {
        const { data } = await Api.get<MacrocycleResponse>('/my-planning/active');
        return data;
    } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
            return null;
        }
        throw err;
    }
}

/**
 * GET /my-planning/celebrity-templates — vitrine da loja de planos
 * estilo-famosos. Qualquer aluno pode navegar; a compra/aplicação de um plano
 * é paga (avulsa) via pagamento?produto=plano&templateId=... .
 */
export async function getCelebrityTemplates(): Promise<MacrocycleResponse[]> {
    const { data } = await Api.get<MacrocycleResponse[]>(
        '/my-planning/celebrity-templates',
    );
    return data ?? [];
}
