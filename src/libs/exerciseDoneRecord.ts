import { localDateKey } from '@/libs/currentWeek';
import { enqueueExercisePerformance } from '@/libs/offline/syncQueue';
import { LogExerciseSeriesRequest } from '@/libs/workoutLogService';

/**
 * Grava no histórico de carga o exercício marcado "feito" (o círculo ao lado
 * do nome), sem esperar o "Finalizar treino". Passa pela fila offline: sem
 * rede, a carga sobe sozinha quando a conexão voltar.
 *
 * As séries seguem o que o formulário de "Finalizar treino" pré-preenche
 * (WorkoutLogger): uma por série prescrita, com as reps (ou segundos) da
 * prescrição. Assim, quando o aluno finaliza sem mexer em nada, a gravação
 * da finalização coincide com a do "feito" — ela substitui as séries daquele
 * exercício no mesmo registro do dia (mesmo training_ref + planned_date).
 */

export interface DoneExercise {
    id: string;
    name: string;
    series?: number[] | null;
    group_id?: string;
}

export function doneExerciseSeries(
    ex: DoneExercise,
    loadKg: number,
    rpe: number,
): LogExerciseSeriesRequest[] {
    // Prescrição em texto livre (sem séries numéricas): uma série só, com a
    // carga. Inventar o número de séries seria registrar o que ninguém disse.
    const planned = ex.series?.length ? ex.series : [0];
    return planned.map((reps, i) => ({
        series: i + 1,
        reps: reps > 0 ? reps : 0,
        load_kg: loadKg > 0 ? loadKg : 0,
        rpe,
        group_id: ex.group_id || undefined,
    }));
}

/** Carga do "feito" do PRÓPRIO aluno: a que ele registrou no card; sem ela,
 * a sugestão do dia; sem sugestão, a prescrita com o ajuste da
 * autorregulação (mesma conta do WorkoutLogger). */
export function studentDoneLoadKg(args: {
    registeredKg: number | null;
    suggestedKg?: number | null;
    plannedKg?: number | null;
    loadAdjustPct?: number;
}): number {
    if (args.registeredKg != null && args.registeredKg > 0) return args.registeredKg;
    if (args.suggestedKg != null && args.suggestedKg > 0) return args.suggestedKg;
    if (args.plannedKg && args.plannedKg > 0) {
        return roundToHalf(args.plannedKg * (1 + (args.loadAdjustPct ?? 0) / 100));
    }
    return 0;
}

export function roundToHalf(kg: number): number {
    return Math.round(kg * 2) / 2;
}

export function recordExerciseDone(args: {
    studentId: string;
    planningId: string;
    mesocycleId: string;
    microcycleId: string;
    trainingRef: string;
    exercise: DoneExercise;
    /** false = desmarcado: tira as séries do exercício do registro do dia. */
    done: boolean;
    loadKg: number;
    rpe: number;
    asPersonal?: boolean;
}): void {
    enqueueExercisePerformance({
        studentId: args.studentId,
        planningId: args.planningId,
        mesocycleId: args.mesocycleId,
        microcycleId: args.microcycleId,
        exerciseBody: {
            training_ref: args.trainingRef,
            planned_date: localDateKey(),
            exercise_id: args.exercise.id,
            name: args.exercise.name,
            series: args.done
                ? doneExerciseSeries(args.exercise, args.loadKg, args.rpe)
                : [],
        },
        asPersonal: args.asPersonal,
    }).catch(() => {
        // IndexedDB indisponível (aba anônima, cota): a marcação na tela
        // continua valendo e a finalização do treino grava as séries.
    });
}
