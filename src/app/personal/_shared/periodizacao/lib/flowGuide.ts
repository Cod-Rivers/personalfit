import type { EditorCard } from './editorNavigation';

/**
 * Guia do fluxo de montar treino: em que etapa a pessoa está, o que já foi
 * feito e qual é a próxima ação.
 *
 * Tudo aqui é derivado do estado que o editor já tem — nenhum campo novo no
 * plano, nenhuma chamada de API. É o mesmo princípio do PlanningNextStep, só
 * que DENTRO do editor, card a card.
 */

export type GuideAudience = 'personal' | 'student';

export type FlowStepId =
    | 'criar'
    | 'fase'
    | 'treinos'
    | 'exercicios'
    | 'series'
    | 'treinar';

export interface FlowStep {
    id: FlowStepId;
    label: string;
}

const STEP_LABEL: Record<FlowStepId, string> = {
    criar: 'Criar',
    fase: 'Fase',
    treinos: 'Treinos',
    exercicios: 'Exercícios',
    series: 'Séries e carga',
    treinar: 'Treinar',
};

const step = (id: FlowStepId): FlowStep => ({ id, label: STEP_LABEL[id] });

/** Etapas do editor. No modo simples não existe identidade de fase. */
export function editorSteps(simpleMode: boolean | undefined): FlowStep[] {
    return simpleMode
        ? [step('treinos'), step('exercicios'), step('series')]
        : [step('fase'), step('treinos'), step('exercicios'), step('series')];
}

/** Etapas da tela em que o aluno monta o próprio treino: o editor fica entre
 * criar o plano e executá-lo em Meus Treinos. */
export const SELF_MADE_STEPS: FlowStep[] = [
    step('criar'),
    step('treinos'),
    step('exercicios'),
    step('treinar'),
];

/** Etapa a que cada card do editor pertence. Semanas são ajuste da fase. */
export function editorStepOf(card: EditorCard['card']): FlowStepId {
    switch (card) {
        case 'phase':
        case 'weeks':
        case 'week':
            return 'fase';
        case 'trainings':
            return 'treinos';
        case 'training':
        case 'picker':
            return 'exercicios';
        case 'exercise':
        case 'bulkPrescription':
            return 'series';
    }
}

/** Resumo mínimo de um treino para o guia: rótulo e quantos exercícios. */
export interface GuideTraining {
    label: string;
    exerciseCount: number;
}

/** Etapas já cumpridas. "Séries e carga" nunca é marcada: todo exercício
 * nasce com 3×10, então não há como saber se alguém já prescreveu de fato. */
export function completedSteps(
    trainings: GuideTraining[],
    phaseValid: boolean,
): Set<FlowStepId> {
    const done = new Set<FlowStepId>();
    if (phaseValid) done.add('fase');
    if (trainings.length > 0) done.add('treinos');
    if (trainings.length > 0 && trainings.every((t) => t.exerciseCount > 0))
        done.add('exercicios');
    return done;
}

/** Etapa atual da tela do aluno, pelo que o plano dele já tem. */
export function selfMadeStep(
    hasPlan: boolean,
    trainings: GuideTraining[],
): { current: FlowStepId; done: Set<FlowStepId> } {
    const done = new Set<FlowStepId>();
    if (!hasPlan) return { current: 'criar', done };
    done.add('criar');
    if (trainings.length === 0) return { current: 'treinos', done };
    done.add('treinos');
    if (trainings.some((t) => t.exerciseCount === 0))
        return { current: 'exercicios', done };
    done.add('exercicios');
    return { current: 'treinar', done };
}

export interface GuideContext {
    card: EditorCard['card'];
    audience: GuideAudience;
    trainings: GuideTraining[];
    /** Exercícios do treino aberto (cards training/picker/exercise). */
    activeExerciseCount: number;
    /** Picker aberto para TROCAR um exercício, não para adicionar. */
    replacing: boolean;
    phaseValid: boolean;
}

export interface GuideHint {
    /** Identifica a situação — útil para teste e para a key do React. */
    key: string;
    text: string;
}

/**
 * A próxima ação, em uma frase, para o card e o estado atuais. null quando o
 * próprio card já se explica (prescrição geral, semanas).
 */
export function editorHint(ctx: GuideContext): GuideHint | null {
    const student = ctx.audience === 'student';

    switch (ctx.card) {
        case 'phase':
            if (!ctx.phaseValid)
                return {
                    key: 'phase-incomplete',
                    text: 'Preencha nome, fase, duração e metodologia: sem eles a fase não é salva. Depois abra “Treinos” para montar os dias.',
                };
            if (ctx.trainings.length === 0)
                return {
                    key: 'phase-no-trainings',
                    text: 'Fase pronta. Agora abra “Treinos” para montar os dias de academia.',
                };
            return null;

        case 'trainings': {
            if (ctx.trainings.length === 0)
                return {
                    key: 'trainings-empty',
                    text: student
                        ? 'Comece em “+ Adicionar treino”. Cada treino é um dia da sua ficha, por exemplo Segunda: peito e tríceps.'
                        : 'Comece em “+ Adicionar treino”. Cada treino é um dia de academia do aluno.',
                };
            const empty = ctx.trainings.filter((t) => t.exerciseCount === 0);
            if (empty.length === 1)
                return {
                    key: 'trainings-one-empty',
                    text: `“${empty[0].label}” ainda está sem exercícios. Toque nele para adicionar.`,
                };
            if (empty.length > 1)
                return {
                    key: 'trainings-some-empty',
                    text: `${empty.length} treinos ainda estão sem exercícios. Toque em cada um para adicionar.`,
                };
            return {
                key: 'trainings-ready',
                text: student
                    ? 'Tudo certo e salvo. Toque em “Fechar” e comece a treinar por Meus Treinos. Para mudar a ordem, arraste pela alça ⠿.'
                    : 'Tudo certo e salvo. Arraste pela alça ⠿ para mudar a ordem, ou duplique um treino parecido para ganhar tempo.',
            };
        }

        case 'training':
            if (ctx.activeExerciseCount === 0)
                return {
                    key: 'training-empty',
                    text: 'Toque em “+ Exercício da biblioteca”: dá para marcar vários de uma vez, e eles já vêm com vídeo. Não achou? Use “+ Manual”.',
                };
            return {
                key: 'training-has-exercises',
                text: student
                    ? 'Toque num exercício para colocar séries, repetições e carga como estão na sua ficha. Se forem iguais para todos, use “Prescrição geral”.'
                    : 'Toque num exercício para prescrever séries, repetições e carga. Valores iguais para todos? Use “Prescrição geral”.',
            };

        case 'picker':
            return ctx.replacing
                ? {
                      key: 'picker-replace',
                      text: 'Escolha o exercício novo. Séries, carga e a posição no treino continuam as mesmas.',
                  }
                : {
                      key: 'picker-add',
                      text: 'Marque um ou mais exercícios e toque em “Adicionar”. Com 2 ou mais marcados, dá para juntá-los num bi-set em “Adicionar como”.',
                  };

        case 'exercise':
            return {
                key: 'exercise',
                text: student
                    ? 'Na aba Prescrição, copie da sua ficha as séries × repetições e o descanso. O resto é opcional. “Concluir” salva e volta ao treino.'
                    : 'Na aba Prescrição, o essencial são séries × repetições e descanso; carga, % de 1RM, cadência e RPE refinam a intensidade. Técnica e Mídia são ajuste fino. “Concluir” salva e volta ao treino.',
            };

        case 'bulkPrescription':
        case 'weeks':
        case 'week':
            return null;
    }
}

/** Seção da Central de Ajuda que explica o fluxo para cada público. */
export function guideHelpHref(audience: GuideAudience): string {
    return audience === 'student'
        ? '/ajuda#montar-meu-treino'
        : '/ajuda#montar-treino';
}
