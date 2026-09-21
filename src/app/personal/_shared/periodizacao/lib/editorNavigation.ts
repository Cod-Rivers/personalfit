import type { MesoPhaseFormData } from './mesocycleTransforms';

/**
 * Os cards do editor de mesociclo. União discriminada, não um punhado de
 * booleans (`isEditingExercise`, `isPickingExercise`…): o editor tem exatamente
 * um card visível por vez, e estados simultâneos aqui seriam sempre um bug.
 */
export type EditorCard =
    | { card: 'phase' }
    | { card: 'trainings' }
    | { card: 'training'; trainingId: string }
    | {
          card: 'exercise';
          trainingId: string;
          exerciseId: string;
          tab: ExerciseTab;
      }
    /** replaceExerciseId (`_id` local): o picker troca esse exercício em vez
     * de adicionar — seleção única, mesma posição e prescrição. */
    | { card: 'picker'; trainingId: string; replaceExerciseId?: string }
    | { card: 'bulkPrescription'; trainingId: string }
    | { card: 'weeks' }
    | { card: 'week'; microId: string };

export type ExerciseTab = 'serie' | 'prescricao' | 'tecnica' | 'midia';

export const EXERCISE_TABS: { id: ExerciseTab; label: string }[] = [
    { id: 'serie', label: 'Série' },
    { id: 'prescricao', label: 'Prescrição' },
    { id: 'tecnica', label: 'Técnica' },
    { id: 'midia', label: 'Mídia e notas' },
];

/**
 * Card dono de cada campo do formulário da fase.
 *
 * O zodResolver valida o schema inteiro no submit, esteja o campo montado ou
 * não. Sem este mapa, salvar com "Nome" vazio a partir do card de Treinos
 * marcaria o erro numa tela que o personal não está vendo, e o botão de salvar
 * pareceria simplesmente morto.
 */
export const CARD_OF_FIELD: Record<keyof MesoPhaseFormData, EditorCard> = {
    name: { card: 'phase' },
    phase: { card: 'phase' },
    duration_weeks: { card: 'phase' },
    methodology: { card: 'phase' },
};

/** Card raiz: no modo simples não existe identidade de fase para editar. */
export function rootCard(simpleMode: boolean | undefined): EditorCard {
    return simpleMode ? { card: 'trainings' } : { card: 'phase' };
}
