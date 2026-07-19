import type {
    MacrocycleResponse,
    MesocycleResponse,
    MesocycleRequest,
    TrainingResponse,
} from '@/libs/planningService';

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
    timed: boolean;
    video_url: string;
    video_thumb: string;
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
                name: ex.name,
                series_mode: mode,
                series_sets: sets,
                series_value: value,
                series_free: free,
                observations: ex.comments ?? '',
                variations: ex.variations ?? '',
                timed,
                video_url: ex.video_url ?? '',
                video_thumb: ex.video_thumb ?? '',
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
): MesocycleRequest {
    return {
        order,
        name: data.name,
        phase: data.phase,
        duration_weeks: data.duration_weeks,
        methodology: data.methodology,
        microcycles: syncMicrocyclesByDuration(
            microcycles,
            data.duration_weeks,
        ).map((m) => ({
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
                    name: ex.name,
                    series,
                    variations: ex.variations,
                    comments: ex.observations,
                    series_label: seriesLabel,
                    video_url: ex.video_url,
                    video_thumb: ex.video_thumb,
                    timed,
                };
            }),
        })),
    };
}

export function mesoToRequest(meso: MesocycleResponse): MesocycleRequest {
    return {
        order: meso.order,
        name: meso.name,
        phase: meso.phase,
        duration_weeks: meso.duration_weeks,
        methodology: meso.methodology,
        microcycles: (meso.microcycles ?? []).map((micro) => ({
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
            })),
        })),
    };
}

export type { MacrocycleResponse, MesocycleResponse, MesocycleRequest };
