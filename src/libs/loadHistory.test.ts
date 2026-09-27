import { describe, expect, it } from 'vitest';
import {
    computeSessionMetrics,
    detectNewRecords,
    exerciseKeyFor,
    formatSets,
    isOutlierLoad,
    normalizeExerciseName,
    normalizedProgress,
    pctChange,
    pendingSessionsFor,
    periodStats,
    resolveExerciseKey,
    testedOneRepMaxMeasurement,
    weeksSinceImprovement,
    type ExerciseLoadHistory,
    type LoadHistoryResponse,
    type LoadHistorySession,
} from './loadHistory';

// Os mesmos casos de TestExerciseKeyFor (training/exercise-identity_test.go):
// se um lado mudar a normalização, o card deixa de achar o próprio histórico.
describe('chave estável do exercício (paridade com o backend)', () => {
    it('normaliza como NormalizeExerciseName', () => {
        expect(normalizeExerciseName('  Supino   Reto ')).toBe('supino reto');
        expect(normalizeExerciseName('ELEVAÇÃO Lateral')).toBe('elevacao lateral');
        expect(normalizeExerciseName('Crucifixo Máquina')).toBe('crucifixo maquina');
    });

    it('vínculo com a biblioteca vence o nome; sem nenhum dos dois, sem chave', () => {
        expect(exerciseKeyFor({ exercise_library_id: 'abc', name: 'Qualquer' })).toBe('lib:abc');
        expect(exerciseKeyFor({ name: 'Remada Serrote' })).toBe('name:remada serrote');
        expect(exerciseKeyFor({ name: '   ' })).toBe('');
    });

    it('resolve o apelido da chave por nome', () => {
        expect(resolveExerciseKey('name:supino reto', { 'name:supino reto': 'lib:x' })).toBe('lib:x');
        expect(resolveExerciseKey('name:remada', { 'name:supino reto': 'lib:x' })).toBe('name:remada');
    });
});

describe('computeSessionMetrics (paridade com TestBuildLoadHistory_MetricasDaSessao)', () => {
    it('ignora série sem reps e tira do 1RM a série longa', () => {
        const m = computeSessionMetrics([
            { reps: 10, loadKg: 40 },
            { reps: 8, loadKg: 42.5 },
            { reps: 0, loadKg: 50 },
            { reps: 15, loadKg: 30 },
        ]);
        expect(m.topLoadKg).toBe(42.5);
        expect(m.topReps).toBe(8);
        expect(Math.round(m.e1rm * 10) / 10).toBe(53.8);
        expect(m.volumeKg).toBe(1190);
        expect(m.maxReps).toBe(15);
    });
});

function history(ex: Partial<ExerciseLoadHistory> & { exercise_key: string }, aliases?: Record<string, string>): LoadHistoryResponse {
    return {
        exercises: [
            {
                name: 'Supino',
                metric: 'load',
                summary: { sessions_count: 3, first: { date: '2026-08-01', top_load_kg: 40, top_reps: 10, e1rm: 53.3, max_reps: 10 } },
                ...ex,
            } as ExerciseLoadHistory,
        ],
        mesocycles: [],
        aliases,
    };
}

describe('detectNewRecords', () => {
    const base = history({
        exercise_key: 'name:supino',
        summary: {
            sessions_count: 3,
            first: { date: '2026-08-01', top_load_kg: 40, top_reps: 10, e1rm: 53.3, max_reps: 10 },
            record_e1rm: { date: '2026-08-15', top_load_kg: 40, top_reps: 12, e1rm: 56, max_reps: 12 },
            record_load: { date: '2026-08-22', top_load_kg: 45, top_reps: 5, e1rm: 52.5, max_reps: 5 },
        },
        recent: [
            { date: '2026-08-01', value: 40 },
            { date: '2026-08-15', value: 40 },
            { date: '2026-08-22', value: 45 },
        ],
    });

    it('carga maior que a melhor é recorde de carga', () => {
        const r = detectNewRecords([{ exerciseId: 'x', name: 'Supino', sets: [{ reps: 6, loadKg: 46 }] }], base);
        expect(r).toHaveLength(1);
        expect(r[0]).toMatchObject({ kind: 'load', previous: 45, current: 46 });
    });

    it('mais reps com a mesma carga é recorde de 1RM estimado', () => {
        const r = detectNewRecords([{ exerciseId: 'x', name: 'Supino', sets: [{ reps: 12, loadKg: 45 }] }], base);
        expect(r[0]).toMatchObject({ kind: 'e1rm', previous: 56, current: 63 });
    });

    it('igualar o recorde não é recorde', () => {
        expect(detectNewRecords([{ exerciseId: 'x', name: 'Supino', sets: [{ reps: 12, loadKg: 40 }] }], base)).toEqual([]);
    });

    it('valor fora do padrão (400 no lugar de 40) nunca é recorde', () => {
        expect(detectNewRecords([{ exerciseId: 'x', name: 'Supino', sets: [{ reps: 10, loadKg: 400 }] }], base)).toEqual([]);
    });

    it('primeira vez no exercício e série por tempo ficam de fora', () => {
        expect(detectNewRecords([{ exerciseId: 'x', name: 'Remada', sets: [{ reps: 10, loadKg: 90 }] }], base)).toEqual([]);
        expect(detectNewRecords([{ exerciseId: 'x', name: 'Supino', timed: true, sets: [{ reps: 60, loadKg: 90 }] }], base)).toEqual([]);
    });

    it('acha o histórico emendado na biblioteca pelo apelido', () => {
        const h = history(
            { ...base.exercises[0], exercise_key: 'lib:abc' },
            { 'name:supino reto': 'lib:abc' },
        );
        const r = detectNewRecords([{ exerciseId: 'x', name: 'Supino Reto', sets: [{ reps: 6, loadKg: 50 }] }], h);
        expect(r[0]?.key).toBe('lib:abc');
    });

    it('peso do corpo: recorde é mais repetições', () => {
        const h = history({
            exercise_key: 'name:barra fixa',
            name: 'Barra fixa',
            metric: 'reps',
            summary: {
                sessions_count: 4,
                first: { date: '2026-08-01', top_load_kg: 0, top_reps: 0, max_reps: 6 },
                record_reps: { date: '2026-08-20', top_load_kg: 0, top_reps: 0, max_reps: 8 },
            },
        });
        const r = detectNewRecords([{ exerciseId: 'x', name: 'Barra Fixa', sets: [{ reps: 9, loadKg: 0 }] }], h);
        expect(r[0]).toMatchObject({ kind: 'reps', previous: 8, current: 9 });
    });

    it('sem histórico carregado não inventa recorde', () => {
        expect(detectNewRecords([{ exerciseId: 'x', name: 'Supino', sets: [{ reps: 6, loadKg: 99 }] }], null)).toEqual([]);
    });
});

describe('isOutlierLoad', () => {
    it('exige ao menos duas sessões de comparação', () => {
        expect(isOutlierLoad(32, [10])).toBe(false);
        expect(isOutlierLoad(400, [40, 42])).toBe(true);
    });
});

describe('pendingSessionsFor', () => {
    it('agrupa as séries da fila pela chave, passando pelos apelidos', () => {
        const sessions = pendingSessionsFor(
            'lib:abc',
            [
                {
                    completedAt: '2026-09-04T22:30:00-03:00',
                    exercises: [
                        { exercise_id: 'e1', name: 'Supino Reto', series: 2, reps: 8, load_kg: 45, rpe: 9 },
                        { exercise_id: 'e1', name: 'Supino Reto', series: 1, reps: 10, load_kg: 40, rpe: 8 },
                        { exercise_id: 'e2', name: 'Remada', series: 1, reps: 10, load_kg: 30, rpe: 8 },
                    ],
                },
            ],
            { 'name:supino reto': 'lib:abc' },
        );
        expect(sessions).toHaveLength(1);
        expect(sessions[0]).toMatchObject({ date: '2026-09-04', pending: true, top_load_kg: 45, top_reps: 8 });
        expect(sessions[0].sets.map((s) => s.series)).toEqual([1, 2]);
    });
});

function sess(date: string, top: number, reps = 10, extra: Partial<LoadHistorySession> = {}): LoadHistorySession {
    return {
        date,
        log_id: date,
        sets: [{ series: 1, reps, load_kg: top, rpe: 8 }],
        top_load_kg: top,
        top_reps: reps,
        e1rm: top > 0 && reps <= 12 ? Math.round(top * (1 + reps / 30) * 10) / 10 : undefined,
        volume_kg: top * reps,
        max_reps: reps,
        ...extra,
    };
}

describe('comparações', () => {
    const sessions = [
        sess('2026-07-01', 40),
        sess('2026-07-08', 42),
        sess('2026-07-15', 400, 10, { outlier: true }),
        sess('2026-08-05', 44),
        sess('2026-08-12', 46),
    ];

    it('periodStats ignora fora do padrão e calcula frequência', () => {
        const a = periodStats(sessions, 'load', '2026-07-01', '2026-07-31');
        expect(a.count).toBe(2);
        expect(a.bestTopLoadKg).toBe(42);
        const b = periodStats(sessions, 'load', '2026-08-01', '2026-08-31');
        expect(b.bestTopLoadKg).toBe(46);
        expect(pctChange(a.bestTopLoadKg, b.bestTopLoadKg)).toBe(9.5);
        expect(b.perWeek).toBeCloseTo(0.5, 1);
    });

    it('normalizedProgress começa em 100', () => {
        const n = normalizedProgress(sessions, 'load');
        expect(n[0].pct).toBe(100);
        expect(n).toHaveLength(4);
        expect(n[n.length - 1].pct).toBe(115);
    });

    it('semanas desde a última melhora', () => {
        expect(
            weeksSinceImprovement({ sessions_count: 5, first: { date: '2026-07-01', top_load_kg: 40, top_reps: 10, max_reps: 10 }, last_record_date: '2026-08-12' }, '2026-09-10'),
        ).toBe(4);
        expect(weeksSinceImprovement({ sessions_count: 0 }, '2026-09-10')).toBeNull();
    });
});

describe('formatSets', () => {
    it('agrupa séries iguais', () => {
        expect(
            formatSets(
                [
                    { series: 1, reps: 10, load_kg: 40, rpe: 8 },
                    { series: 2, reps: 10, load_kg: 40, rpe: 8 },
                    { series: 3, reps: 8, load_kg: 42.5, rpe: 9 },
                ],
                'load',
            ),
        ).toBe('2×10 · 40 kg, 8 · 42,5 kg');
        expect(formatSets([{ series: 1, reps: 8, load_kg: 0, rpe: 8 }, { series: 2, reps: 7, load_kg: 0, rpe: 9 }], 'reps')).toBe('8, 7 reps');
    });
});

describe('1RM testado na avaliação', () => {
    it('casa só os exercícios equivalentes ao teste', () => {
        expect(testedOneRepMaxMeasurement('Supino Reto com Barra')).toBe('rm_supino');
        expect(testedOneRepMaxMeasurement('Supino inclinado')).toBeNull();
        expect(testedOneRepMaxMeasurement('Levantamento Terra')).toBe('rm_terra');
        expect(testedOneRepMaxMeasurement('Agachamento Búlgaro')).toBeNull();
        expect(testedOneRepMaxMeasurement('Agachamento Livre')).toBe('rm_agachamento');
    });
});
