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
    load_percentage?: number;
    load_kg?: number;
    rest_seconds?: number;
    tempo_seconds?: number;
    rpe_target?: number;
    muscle_group?: string;
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

interface MacroToGanttOptions {
    preferDuration?: boolean;
}



/** Converte mesociclos da API para o formato GanttPhase do componente. */
export function toGanttPhases(mesocycles: MesocycleResponse[]): GanttPhase[] {
    return mesocycles
        .filter((m) => m.start_date && m.end_date)
        .map((m) => ({
            id: m.id,
            name: m.name,
            start: m.start_date!,
            end: m.end_date!,
        }));
}

/**
 * Converte um macrociclo completo para GanttPhases.
 * Se os mesociclos não tiverem datas próprias, calcula a partir da
 * data de início do macrociclo + duration_weeks de cada fase em sequência.
 */
export function macroToGanttPhases(
    macro: MacrocycleResponse,
    options?: MacroToGanttOptions,
): GanttPhase[] {
    const mesos = [...(macro.mesocycles ?? [])].sort((a, b) => a.order - b.order);
    if (mesos.length === 0) return [];

    const preferDuration = options?.preferDuration ?? false;

    // Se todos os mesociclos já têm datas, usa as datas deles diretamente
    const allHaveDates = mesos.every((m) => m.start_date && m.end_date);
    if (allHaveDates && !preferDuration) {
        return mesos.map((m) => ({
            id: m.id,
            name: m.name,
            start: m.start_date!,
            end: m.end_date!,
        }));
    }

    // Calcula datas a partir do start_date do macrociclo + duration_weeks
    const macroStart = macro.start_date;
    if (!macroStart) return [];

    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const addWeeks = (d: Date, weeks: number) => {
        const r = new Date(d);
        r.setDate(r.getDate() + weeks * 7);
        return r;
    };

    const phases: GanttPhase[] = [];
    let cursor = new Date(macroStart);

    for (const m of mesos) {
        if (m.duration_weeks <= 0) {
            // duration_weeks inválido (0) — não inventa uma duração fictícia
            // para não esconder dado corrompido; melhor pular a fase no Gantt
            // do que desenhar um bloco de tamanho arbitrário e enganoso.
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

export const MUSCLE_GROUPS = [
    'Quadríceps',
    'Glúteos',
    'Posteriores',
    'Panturrilha',
    'Costas',
    'Peito',
    'Ombros',
    'Tríceps',
    'Bíceps',
    'Core',
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
 * GET /my-planning/celebrity-templates — biblioteca de planos estilo-famosos,
 * exclusiva para alunos do plano PRO (backend responde 403 caso contrário).
 */
export async function getCelebrityTemplates(): Promise<MacrocycleResponse[]> {
    const { data } = await Api.get<MacrocycleResponse[]>(
        '/my-planning/celebrity-templates',
    );
    return data ?? [];
}

/**
 * POST /my-planning/celebrity-templates/:templateId/apply — autoaplica um
 * plano estilo-famosos como o novo macrociclo ativo do aluno logado.
 */
export async function applyCelebrityTemplate(
    templateId: string,
): Promise<MacrocycleResponse> {
    const { data } = await Api.post<MacrocycleResponse>(
        `/my-planning/celebrity-templates/${templateId}/apply`,
    );
    return data;
}
