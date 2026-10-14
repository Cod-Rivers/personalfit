/**
 * Roteiro de execução de um bloco agrupado (bi-set, tri-set, superssérie…)
 * como circuito: rodada 1 = uma série de cada exercício, em sequência e sem
 * descanso entre eles; só no fim da rodada vem o descanso; depois a rodada 2,
 * e assim por diante até a última série.
 *
 * Nº de rodadas = maior nº de séries do bloco. Exercício com menos séries
 * sai das últimas rodadas. O descanso é o do ÚLTIMO exercício do bloco — a
 * mesma convenção da tela, que só mostra timer de descanso nele.
 *
 * Modo tabata: com `recoverySeconds` > 0, cada exercício da rodada (menos o
 * último, que já é seguido pelo descanso) ganha uma recuperação curta antes
 * do próximo — 20 s de trabalho + 10 s de recuperação é o clássico.
 *
 * Série por tempo vira passo cronometrado; série por repetições (ou texto
 * livre) vira passo manual — o aluno toca em "Feito" ao terminar.
 */

export interface CircuitExercise {
    name: string;
    /** Reps ou segundos por série (ou só a contagem, no texto livre). */
    series: number[];
    timed?: boolean;
    /** Texto livre de séries (pirâmide 12-10-8…); com ele, `series` é só a
     * contagem de séries. */
    series_label?: string;
    /** Descanso prescrito em segundos. Só o do último exercício conta. */
    rest?: number;
}

export type CircuitStep =
    | {
          kind: 'work';
          round: number;
          /** Posição do exercício na rodada (0-based) e total da rodada. */
          position: number;
          roundSize: number;
          name: string;
          /** Segundos da série; null = série por repetições (passo manual). */
          seconds: number | null;
          /** Rótulo da série manual ("12 reps", texto livre). */
          target?: string;
      }
    | { kind: 'rest'; round: number; seconds: number }
    /** Recuperação curta ENTRE exercícios da mesma rodada (modo tabata). */
    | { kind: 'recover'; round: number; seconds: number; next: string };

export interface CircuitOptions {
    /** Segundos de recuperação entre os exercícios da rodada; 0 = sem. */
    recoverySeconds?: number;
}

export interface CircuitPlan {
    rounds: number;
    steps: CircuitStep[];
}

export function buildCircuitPlan(
    exercises: CircuitExercise[],
    options: CircuitOptions = {},
): CircuitPlan {
    const recovery = Math.max(0, Math.floor(options.recoverySeconds ?? 0));
    const rounds = exercises.reduce(
        (max, e) => Math.max(max, e.series?.length ?? 0),
        0,
    );
    const rest = exercises[exercises.length - 1]?.rest ?? 0;
    const steps: CircuitStep[] = [];

    for (let r = 0; r < rounds; r++) {
        const inRound = exercises.filter((e) => (e.series?.length ?? 0) > r);
        inRound.forEach((e, position) => {
            const value = e.series[r];
            const isTimed = !!e.timed && !e.series_label && value > 0;
            steps.push({
                kind: 'work',
                round: r + 1,
                position,
                roundSize: inRound.length,
                name: e.name,
                seconds: isTimed ? value : null,
                target: isTimed
                    ? undefined
                    : e.series_label
                      ? e.series_label
                      : value > 0
                        ? `${value} reps`
                        : undefined,
            });
            const following = inRound[position + 1];
            if (following && recovery > 0) {
                steps.push({
                    kind: 'recover',
                    round: r + 1,
                    seconds: recovery,
                    next: following.name,
                });
            }
        });
        if (r < rounds - 1 && rest > 0) {
            steps.push({ kind: 'rest', round: r + 1, seconds: rest });
        }
    }
    return { rounds, steps };
}

/** O guia de rodadas aparece num bloco de 2+ exercícios quando há algo para
 * cronometrar: série por tempo, ou descanso entre as rodadas (2+ rodadas e
 * descanso no último exercício). Antes só a série por tempo abria o guia, e
 * um circuito só de repetições (a Escada, um bi-set 3×12) ficava sem descanso
 * entre as rodadas: cada exercício mostrava "siga direto" e só o último tinha
 * cronômetro. Num passo de repetições o aluno toca em "Feito" para seguir. */
export function circuitGuides(exercises: CircuitExercise[]): boolean {
    if (exercises.length < 2) return false;
    const timedWork = exercises.some(
        (e) => e.timed && !e.series_label && e.series?.some((v) => v > 0),
    );
    if (timedWork) return true;
    const rounds = exercises.reduce(
        (max, e) => Math.max(max, e.series?.length ?? 0),
        0,
    );
    const rest = exercises[exercises.length - 1]?.rest ?? 0;
    return rounds >= 2 && rest > 0;
}

/** Descanso entre as rodadas do bloco: o do último exercício (ver
 * buildCircuitPlan). */
export function blockRoundRestSeconds(exercises: CircuitExercise[]): number {
    return exercises[exercises.length - 1]?.rest ?? 0;
}

/** Teto da recuperação entre exercícios: acima disso já é descanso, que tem
 * campo próprio. Espelha training.MaxGroupRecoverySeconds no backend. */
export const MAX_GROUP_RECOVERY_SECONDS = 120;

/** Atalhos do seletor do personal; o tabata clássico é 10 s. */
export const GROUP_RECOVERY_PRESETS = [
    { seconds: 0, label: 'Sem recuperação' },
    { seconds: 10, label: 'Tabata · 10 s' },
    { seconds: 15, label: 'Recuperação 15 s' },
    { seconds: 20, label: 'Recuperação 20 s' },
    { seconds: 30, label: 'Recuperação 30 s' },
    { seconds: 45, label: 'Recuperação 45 s' },
    { seconds: 60, label: 'Recuperação 60 s' },
] as const;

/** Recuperação prescrita para o bloco: a de qualquer exercício dele (o
 * personal grava a mesma em todos; um exercício recém-juntado ao bloco pode
 * ainda não tê-la). */
export function blockRecoverySeconds(
    block: { group_recovery_seconds?: number }[],
): number {
    return block.reduce(
        (max, e) => Math.max(max, e.group_recovery_seconds ?? 0),
        0,
    );
}

/** Texto do selo do bloco: a pausa entre os exercícios e o descanso entre as
 * rodadas. Só "sem descanso entre os exercícios" fazia o aluno achar que o
 * circuito não tinha descanso nenhum, quando ele vem entre as rodadas. */
export function blockRestLabel(
    exercises: CircuitExercise[],
    recoverySeconds: number,
): string {
    const between =
        recoverySeconds > 0
            ? `${recoverySeconds} s de recuperação entre os exercícios`
            : 'sem pausa entre os exercícios';
    const rounds = exercises.reduce(
        (max, e) => Math.max(max, e.series?.length ?? 0),
        0,
    );
    const rest = blockRoundRestSeconds(exercises);
    return rounds >= 2 && rest > 0
        ? `${between} · ${rest} s de descanso entre as rodadas`
        : between;
}
