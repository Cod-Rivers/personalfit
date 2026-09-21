'use client';

import type { ReactNode } from 'react';
import { FiArrowRight, FiCheckCircle } from 'react-icons/fi';
import type { MacrocycleResponse } from '@/libs/planningService';
import s from '../builder.module.css';

interface NextStep {
    message: string;
    action?: string;
    done: boolean;
}

/**
 * Decide o próximo passo a partir do que já está carregado na tela — sem campo
 * novo no plano e sem outra chamada de API.
 */
export function nextPlanningStep(
    macro: MacrocycleResponse,
    isSimpleMode: boolean,
): NextStep {
    const mesocycles = macro.mesocycles ?? [];

    if (mesocycles.length === 0) {
        return {
            message: isSimpleMode
                ? 'Comece configurando os treinos da semana.'
                : 'Comece criando a primeira fase do plano.',
            action: isSimpleMode
                ? 'Configurar treinos da semana'
                : 'Criar primeira fase',
            done: false,
        };
    }

    const withoutTrainings = mesocycles.find(
        (m) => (m.trainings?.length ?? 0) === 0,
    );
    if (withoutTrainings) {
        return {
            message: isSimpleMode
                ? 'Nenhum treino na semana ainda. Abra e adicione os dias.'
                : `A fase "${withoutTrainings.name}" ainda não tem nenhum treino.`,
            action: 'Abrir e adicionar treinos',
            done: false,
        };
    }

    const emptyTraining = mesocycles
        .flatMap((m) =>
            (m.trainings ?? []).map((t) => ({ meso: m, training: t })),
        )
        .find(({ training }) => (training.exercises?.length ?? 0) === 0);
    if (emptyTraining) {
        return {
            // No modo simples não existe fase para o usuário, e a letra
            // interna (A, B…) não é o rótulo que ele vê (dia ou número).
            message: isSimpleMode
                ? 'Há treino da semana ainda sem exercícios. Abra e adicione.'
                : `O treino ${emptyTraining.training.reference || 'sem referência'} da fase "${emptyTraining.meso.name}" está sem exercícios.`,
            action: 'Abrir e adicionar exercícios',
            done: false,
        };
    }

    const totalExercises = mesocycles.reduce(
        (acc, m) =>
            acc +
            (m.trainings ?? []).reduce(
                (sum, t) => sum + (t.exercises?.length ?? 0),
                0,
            ),
        0,
    );
    if (isSimpleMode) {
        const trainingCount = mesocycles.reduce(
            (acc, m) => acc + (m.trainings?.length ?? 0),
            0,
        );
        return {
            message: `Treino montado: ${trainingCount} treino${trainingCount === 1 ? '' : 's'} na semana e ${totalExercises} exercício${totalExercises === 1 ? '' : 's'}.`,
            done: true,
        };
    }
    return {
        message: `Plano montado: ${mesocycles.length} fase${mesocycles.length === 1 ? '' : 's'} e ${totalExercises} exercício${totalExercises === 1 ? '' : 's'} prescritos.`,
        done: true,
    };
}

/**
 * Faixa de "próximo passo" no topo do plano.
 *
 * O fluxo do personal atravessa cinco telas e quatro termos técnicos
 * (macrociclo, mesociclo, microciclo, metodologia) sem em nenhum momento dizer
 * onde ele está nem o que falta. Esta faixa responde essa pergunta com o que a
 * própria tela já sabe.
 */
export default function PlanningNextStep({
    macro,
    isSimpleMode,
    onAction,
    doneAction,
}: {
    macro: MacrocycleResponse;
    isSimpleMode: boolean;
    /** Recebe o id da fase a abrir, ou undefined quando o passo é criar uma. */
    onAction: (mesocycleId?: string) => void;
    /** Próximo passo depois de montado (ex.: o aluno ir treinar). Ausente, o
     * plano pronto vira só a linha de confirmação. */
    doneAction?: ReactNode;
}) {
    const step = nextPlanningStep(macro, isSimpleMode);
    const mesocycles = macro.mesocycles ?? [];

    if (step.done) {
        if (doneAction) {
            return (
                <div className={s.nextStep}>
                    <p className={s.nextStepText}>
                        <FiCheckCircle /> {step.message}
                    </p>
                    {doneAction}
                </div>
            );
        }
        return (
            <p className={s.nextStepDone}>
                <FiCheckCircle /> {step.message}
            </p>
        );
    }

    const targetMeso =
        mesocycles.find((m) => (m.trainings?.length ?? 0) === 0) ??
        mesocycles.find((m) =>
            (m.trainings ?? []).some((t) => (t.exercises?.length ?? 0) === 0),
        );

    return (
        <div className={s.nextStep}>
            <p className={s.nextStepText}>
                <strong>Próximo passo:</strong> {step.message}
            </p>
            {step.action && (
                <button
                    type="button"
                    className={s.btnEdit}
                    onClick={() => onAction(targetMeso?.id)}
                >
                    {step.action} <FiArrowRight />
                </button>
            )}
        </div>
    );
}
