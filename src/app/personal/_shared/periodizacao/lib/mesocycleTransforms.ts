import type {
    MacrocycleResponse,
    MesocycleResponse,
    MesocycleRequest,
    TrainingResponse,
} from '@/libs/planningService';
import { groupTechniqueLabel } from '@/libs/trainingTechniques';

export const STATUS_LABEL: Record<string, string> = {
    draft: 'Rascunho',
    active: 'Ativo',
    completed: 'Concluído',
};

// Classificação de Matveyev (clássica)
export const PHASES_MATVEYEV = [
    'Introdução',
    'Base',
    'Preparação e Controle',
    'Pré-competição',
    'Competição',
];
// Periodização de força/bloco (Bompa/Fleck)
export const PHASES_FORCE = [
    'Acumulação',
    'Transmutação',
    'Realização',
    'Hipertrofia',
    'Força',
    'Potência',
    'Manutenção',
    'Deload',
];
export const METHODOLOGIES = [
    'Linear',
    'Ondulada Diária (DUP)',
    'Ondulada Semanal',
    'Conjugada',
    'Bloco',
    'Outra',
];
export const NEXT_REF = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// Dia da semana: mesma convenção usada em AppointmentRecurrence (0=domingo..6=sábado).
// Ordem de exibição começa na segunda, como é comum no Brasil.
export const WEEKDAYS = [
    { value: 1, label: 'Segunda' },
    { value: 2, label: 'Terça' },
    { value: 3, label: 'Quarta' },
    { value: 4, label: 'Quinta' },
    { value: 5, label: 'Sexta' },
    { value: 6, label: 'Sábado' },
    { value: 0, label: 'Domingo' },
] as const;

export function weekdayLabel(weekday?: number): string | undefined {
    if (weekday === undefined || weekday === null) return undefined;
    return WEEKDAYS.find((w) => w.value === weekday)?.label;
}

/**
 * Próximo dia da semana ainda livre, na ordem de exibição (segunda → domingo).
 * É o equivalente de NEXT_REF (A, B, C…) para o modo por dia da semana: cada
 * treino novo já nasce com um rótulo próprio em vez de todos ficarem sem dia.
 * Retorna undefined quando os 7 dias já estão ocupados.
 */
export function nextFreeWeekday(
    used: (number | undefined)[],
): number | undefined {
    return WEEKDAYS.find((w) => !used.includes(w.value))?.value;
}

// Valores fixos usados para o mesociclo único e oculto do modo simples —
// o personal não vê/edita esses campos nesse modo.
export const SIMPLE_MODE_DEFAULTS: MesoPhaseFormData = {
    name: 'Treinos da Semana',
    phase: 'Manutenção',
    duration_weeks: 1,
    methodology: 'Linear',
};

export function formatDate(iso?: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR');
}

export type SeriesMode = 'reps' | 'time' | 'free';

export interface LocalExercise {
    _id: string;
    /** ID real do exercício no backend, presente só quando carregado da API
     * (undefined para exercícios novos criados no cliente). Precisa ser
     * reenviado no save, senão o backend gera um ObjectID novo e órfãa o
     * histórico de séries e as anotações do aluno. */
    id?: string;
    /** Vínculo com exercise_library — passthrough, não editável na UI. */
    exercise_library_id?: string;
    name: string;
    // Mode selector
    series_mode: SeriesMode;
    // Reps mode: N séries × M reps  (ex: sets=3, value="10" → [10,10,10])
    series_sets: string; // quantidade de séries
    series_value: string; // reps/set (reps) ou segundos/set (time)
    // Free mode: texto livre armazenado em series_label
    series_free: string;
    // Observações do personal (campo comments no backend)
    observations: string;
    variations: string;
    // Prescrição (opcionais). Guardados como string para casar direto com os
    // inputs do form; '' = não preenchido e vira undefined no request, para o
    // backend gravar omitempty em vez de zero.
    rest_seconds: string;
    load_kg: string;
    load_percentage: string;
    tempo_seconds: string;
    rpe_target: string;
    muscle_group: string;
    timed: boolean;
    video_url: string;
    video_thumb: string;
    /** Agrupa exercícios executados em sequência, sem descanso entre si
     * (bissérie/trissérie/superssérie). Exercícios consecutivos com o mesmo
     * group_id dentro do mesmo treino formam um bloco. undefined = avulso. */
    group_id?: string;
    /** Variante do bloco de group_id — ver GROUP_TECHNIQUE_CATALOG. */
    group_technique?: string;
    /** Técnica de treinamento avançada (dropset, isometria etc). '' = nenhuma. */
    technique: string;
    // Parâmetros da técnica selecionada (mesmo padrão string-para-input dos
    // outros campos de prescrição). Só os relevantes para `technique` (ver
    // TECHNIQUE_CATALOG) são exibidos/enviados.
    technique_rounds: string;
    technique_reduction_pct: string;
    technique_pause_seconds: string;
    technique_extra_reps: string;
    technique_hold_seconds: string;
}

export interface LocalTraining {
    _id: string;
    reference: string;
    exercises: LocalExercise[];
    /** Dia da semana (0=domingo..6=sábado) — usado no modo simples. */
    weekday?: number;
}

export interface LocalMicrocycle {
    _id: string;
    /** ID real do microciclo no backend, presente só quando carregado de uma
     * resposta da API (undefined para linhas novas criadas no cliente). */
    id?: string;
    week_number: number;
    status: string;
    focus: string;
    target_rpe: string;
    volume_adjust_pct: string;
    intensity_adjust_pct: string;
    is_deload: boolean;
    notes: string;
}

export function genId() {
    return Math.random().toString(36).slice(2);
}

/** Número vindo da API → valor de input. Preserva o 0 (ex: descanso zerado é
 * uma prescrição válida); só ausente/nulo vira campo vazio. */
function numToField(value: number | null | undefined): string {
    return value === null || value === undefined ? '' : String(value);
}

/** Valor de input → número para o request. Campo vazio vira undefined (e não 0)
 * para o backend gravar omitempty em vez de sobrescrever com zero. */
function fieldToNum(
    raw: string,
    { min, max, decimal }: { min: number; max: number; decimal?: boolean },
): number | undefined {
    const trimmed = raw.trim();
    if (trimmed === '') return undefined;
    const parsed = decimal
        ? parseFloat(trimmed.replace(',', '.'))
        : parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) return undefined;
    return Math.max(min, Math.min(max, parsed));
}

/**
 * Particiona os exercícios de um treino em blocos: cada bloco é uma sequência
 * consecutiva de exercícios com o mesmo group_id (bissérie/trissérie/
 * superssérie), ou um único exercício avulso. A ordem de execução dentro de
 * um bloco é a ordem em `exercises` — não há campo de ordem separado.
 */
export function partitionExerciseGroups(
    exercises: LocalExercise[],
): LocalExercise[][] {
    const groups: LocalExercise[][] = [];
    for (const ex of exercises) {
        const last = groups[groups.length - 1];
        if (
            ex.group_id &&
            last &&
            last[last.length - 1].group_id === ex.group_id
        ) {
            last.push(ex);
        } else {
            groups.push([ex]);
        }
    }
    return groups;
}

/** Rótulo do bloco combinado: usa a variante explícita (group_technique)
 * quando marcada, senão cai no heurístico por número de exercícios. */
export function comboGroupLabel(size: number, groupTechnique?: string): string {
    const explicit = groupTechniqueLabel(groupTechnique);
    if (explicit) return explicit;
    if (size <= 2) return 'Bissérie';
    if (size === 3) return 'Trissérie';
    return 'Superssérie';
}

export function makeDefaultMicrocycles(durationWeeks: number): LocalMicrocycle[] {
    const total = Math.max(1, durationWeeks || 1);
    return Array.from({ length: total }, (_, i) => ({
        _id: genId(),
        week_number: i + 1,
        status: 'pending',
        focus: '',
        target_rpe: '',
        volume_adjust_pct: '0',
        intensity_adjust_pct: '0',
        is_deload: false,
        notes: '',
    }));
}

export function syncMicrocyclesByDuration(
    list: LocalMicrocycle[],
    durationWeeks: number,
): LocalMicrocycle[] {
    const total = Math.max(1, durationWeeks || 1);
    const next = [...list].slice(0, total);
    while (next.length < total) {
        next.push({
            _id: genId(),
            week_number: next.length + 1,
            status: 'pending',
            focus: '',
            target_rpe: '',
            volume_adjust_pct: '0',
            intensity_adjust_pct: '0',
            is_deload: false,
            notes: '',
        });
    }
    return next.map((m, i) => ({ ...m, week_number: i + 1 }));
}

export function responseMicroToLocal(
    microcycles: MesocycleResponse['microcycles'] | undefined,
    durationWeeks: number,
): LocalMicrocycle[] {
    if (!microcycles || microcycles.length === 0) {
        return makeDefaultMicrocycles(durationWeeks);
    }
    const mapped: LocalMicrocycle[] = microcycles.map((m, i) => ({
        _id: genId(),
        id: m.id,
        week_number: m.week_number || i + 1,
        status: m.status || 'pending',
        focus: m.focus ?? '',
        target_rpe:
            typeof m.target_rpe === 'number' ? String(m.target_rpe) : '',
        volume_adjust_pct: String(m.volume_adjust_pct ?? 0),
        intensity_adjust_pct: String(m.intensity_adjust_pct ?? 0),
        is_deload: m.is_deload ?? false,
        notes: m.notes ?? '',
    }));
    return syncMicrocyclesByDuration(mapped, durationWeeks);
}

export function responseToLocal(trainings: TrainingResponse[]): LocalTraining[] {
    return trainings.map((t) => ({
        _id: genId(),
        reference: t.reference,
        weekday: t.weekday,
        exercises: t.exercises.map((ex) => {
            const timed = ex.timed ?? false;
            const seriesLabel = ex.series_label;
            let mode: SeriesMode = 'reps';
            let sets = String(ex.series.length || 3);
            let value = String(ex.series[0] ?? 10);
            let free = '';

            if (seriesLabel) {
                mode = 'free';
                free = seriesLabel;
            } else if (timed) {
                mode = 'time';
                sets = String(ex.series.length || 3);
                value = String(ex.series[0] ?? 30);
            } else {
                mode = 'reps';
                // se as séries forem não-uniformes, usa texto livre
                const uniform = ex.series.every((v) => v === ex.series[0]);
                if (!uniform && ex.series.length > 0) {
                    mode = 'free';
                    free = ex.series.join(' × ');
                } else {
                    sets = String(ex.series.length || 3);
                    value = String(ex.series[0] ?? 10);
                }
            }

            return {
                _id: genId(),
                id: ex.id,
                exercise_library_id: ex.exercise_library_id,
                name: ex.name,
                series_mode: mode,
                series_sets: sets,
                series_value: value,
                series_free: free,
                observations: ex.comments ?? '',
                variations: ex.variations ?? '',
                rest_seconds: numToField(ex.rest_seconds),
                load_kg: numToField(ex.load_kg),
                load_percentage: numToField(ex.load_percentage),
                tempo_seconds: numToField(ex.tempo_seconds),
                rpe_target: numToField(ex.rpe_target),
                muscle_group: ex.muscle_group ?? '',
                timed,
                video_url: ex.video_url ?? '',
                video_thumb: ex.video_thumb ?? '',
                group_id: ex.group_id,
                group_technique: ex.group_technique,
                technique: ex.technique ?? '',
                technique_rounds: numToField(ex.technique_params?.rounds),
                technique_reduction_pct: numToField(
                    ex.technique_params?.round_reduction_pct,
                ),
                technique_pause_seconds: numToField(
                    ex.technique_params?.pause_seconds,
                ),
                technique_extra_reps: numToField(
                    ex.technique_params?.extra_reps,
                ),
                technique_hold_seconds: numToField(
                    ex.technique_params?.hold_seconds,
                ),
            };
        }),
    }));
}

export interface MesoPhaseFormData {
    name: string;
    phase: string;
    duration_weeks: number;
    methodology: string;
}

export function localToMesoRequest(
    data: MesoPhaseFormData,
    trainings: LocalTraining[],
    microcycles: LocalMicrocycle[],
    order: number,
    mesoId?: string,
): MesocycleRequest {
    return {
        id: mesoId,
        order,
        name: data.name,
        phase: data.phase,
        duration_weeks: data.duration_weeks,
        methodology: data.methodology,
        microcycles: syncMicrocyclesByDuration(
            microcycles,
            data.duration_weeks,
        ).map((m) => ({
            id: m.id,
            week_number: m.week_number,
            status: m.status,
            focus: m.focus || undefined,
            target_rpe:
                m.target_rpe.trim() === ''
                    ? undefined
                    : Math.max(
                          1,
                          Math.min(10, parseInt(m.target_rpe, 10) || 1),
                      ),
            volume_adjust_pct: Math.max(
                -100,
                Math.min(100, parseInt(m.volume_adjust_pct, 10) || 0),
            ),
            intensity_adjust_pct: Math.max(
                -100,
                Math.min(100, parseInt(m.intensity_adjust_pct, 10) || 0),
            ),
            is_deload: m.is_deload,
            notes: m.notes || undefined,
        })),
        trainings: trainings.map((t) => ({
            reference: t.reference,
            weekday: t.weekday,
            exercises: t.exercises.map((ex) => {
                const sets = Math.max(1, parseInt(ex.series_sets, 10) || 1);
                const val = Math.max(0, parseInt(ex.series_value, 10) || 0);
                let series: number[] = [];
                let timed = false;
                let seriesLabel: string | undefined = undefined;

                if (ex.series_mode === 'reps') {
                    series = Array(sets).fill(val);
                    timed = false;
                } else if (ex.series_mode === 'time') {
                    series = Array(sets).fill(val);
                    timed = true;
                } else {
                    // free mode: envia séries vazias e guarda no series_label
                    series = [];
                    timed = false;
                    seriesLabel = ex.series_free || undefined;
                }

                return {
                    id: ex.id,
                    exercise_library_id: ex.exercise_library_id,
                    name: ex.name,
                    series,
                    variations: ex.variations,
                    comments: ex.observations,
                    series_label: seriesLabel,
                    video_url: ex.video_url,
                    video_thumb: ex.video_thumb,
                    timed,
                    // Limites espelham os tipos do domínio Go (uint16/uint8/float64)
                    // — ver training.Exercise em protocol.go.
                    rest_seconds: fieldToNum(ex.rest_seconds, {
                        min: 0,
                        max: 65535,
                    }),
                    load_kg: fieldToNum(ex.load_kg, {
                        min: 0,
                        max: 999,
                        decimal: true,
                    }),
                    load_percentage: fieldToNum(ex.load_percentage, {
                        min: 0,
                        max: 100,
                    }),
                    tempo_seconds: fieldToNum(ex.tempo_seconds, {
                        min: 0,
                        max: 65535,
                    }),
                    rpe_target: fieldToNum(ex.rpe_target, { min: 1, max: 10 }),
                    muscle_group: ex.muscle_group || undefined,
                    group_id: ex.group_id,
                    group_technique: ex.group_technique,
                    technique: ex.technique || undefined,
                    technique_params: ex.technique
                        ? {
                              rounds: fieldToNum(ex.technique_rounds, {
                                  min: 0,
                                  max: 255,
                              }),
                              round_reduction_pct: fieldToNum(
                                  ex.technique_reduction_pct,
                                  { min: 0, max: 100 },
                              ),
                              pause_seconds: fieldToNum(
                                  ex.technique_pause_seconds,
                                  { min: 0, max: 65535 },
                              ),
                              extra_reps: fieldToNum(ex.technique_extra_reps, {
                                  min: 0,
                                  max: 255,
                              }),
                              hold_seconds: fieldToNum(
                                  ex.technique_hold_seconds,
                                  { min: 0, max: 65535 },
                              ),
                          }
                        : undefined,
                };
            }),
        })),
    };
}

export function mesoToRequest(meso: MesocycleResponse): MesocycleRequest {
    return {
        id: meso.id,
        order: meso.order,
        name: meso.name,
        phase: meso.phase,
        duration_weeks: meso.duration_weeks,
        methodology: meso.methodology,
        microcycles: (meso.microcycles ?? []).map((micro) => ({
            id: micro.id,
            week_number: micro.week_number,
            status: micro.status,
            focus: micro.focus,
            target_rpe: micro.target_rpe,
            volume_adjust_pct: micro.volume_adjust_pct,
            intensity_adjust_pct: micro.intensity_adjust_pct,
            is_deload: micro.is_deload,
            notes: micro.notes,
        })),
        trainings: meso.trainings.map((t) => ({
            reference: t.reference,
            weekday: t.weekday,
            exercises: t.exercises.map((ex) => ({
                id: ex.id,
                exercise_library_id: ex.exercise_library_id,
                name: ex.name,
                series: ex.series,
                variations: ex.variations,
                comments: ex.comments ?? '',
                series_label: ex.series_label,
                video_url: ex.video_url ?? '',
                video_thumb: ex.video_thumb ?? '',
                timed: ex.timed ?? false,
                load_percentage: ex.load_percentage,
                load_kg: ex.load_kg,
                rest_seconds: ex.rest_seconds,
                tempo_seconds: ex.tempo_seconds,
                rpe_target: ex.rpe_target,
                muscle_group: ex.muscle_group,
                group_id: ex.group_id,
                group_technique: ex.group_technique,
                technique: ex.technique,
                technique_params: ex.technique_params,
            })),
        })),
    };
}

/**
 * Constrói o payload para duplicar um mesociclo já salvo como uma nova fase
 * independente. Precisa zerar o id do mesociclo e de cada microciclo — se
 * reaproveitasse os ids originais, UpdatePlanningHandler (que casa por id
 * global no macrociclo, não por mesociclo) faria a "cópia" apontar para os
 * MESMOS microciclos/logs do original em vez de criar novos.
 */
export function duplicateMesoRequest(
    meso: MesocycleResponse,
    order: number,
): MesocycleRequest {
    const req = mesoToRequest(meso);
    return {
        ...req,
        id: undefined,
        order,
        name: `${meso.name} (cópia)`,
        microcycles: (req.microcycles ?? []).map((m) => ({
            ...m,
            id: undefined,
        })),
        // Exercícios seguem a mesma regra dos microciclos: reaproveitar os ids
        // faria a cópia compartilhar histórico de séries e anotações com o
        // original (ambos referenciam o exercício por id).
        trainings: req.trainings.map((t) => ({
            ...t,
            exercises: t.exercises.map((ex) => ({ ...ex, id: undefined })),
        })),
    };
}

export type { MacrocycleResponse, MesocycleResponse, MesocycleRequest };
