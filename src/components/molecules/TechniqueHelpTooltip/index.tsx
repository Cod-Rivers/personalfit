'use client';

import HelpTooltip from '@/components/atoms/HelpTooltip';
import { getGlossaryTerm } from '@/libs/glossaryContent';
import {
    techniqueExecutionHelp,
    type TechniqueParamsValue,
} from '@/libs/trainingTechniques';

/** "?" do campo de técnica avançada. Sem técnica marcada mostra a ajuda
 * geral do glossário; com técnica, o passo a passo de execução dela com os
 * parâmetros prescritos. Usado no editor do personal (TechniqueBlock) e no
 * card do exercício (ExerciseDetailCard), para os dois dizerem o mesmo. */
export default function TechniqueHelpTooltip({
    technique,
    params,
}: {
    technique?: string;
    params?: TechniqueParamsValue;
}) {
    const help = techniqueExecutionHelp(technique, params);
    return (
        <HelpTooltip
            text={help?.text ?? getGlossaryTerm('tecnica').short}
            title={help?.title}
            steps={help?.steps}
            href="/ajuda#glossario-tecnica"
            label={
                help
                    ? `Como executar ${help.title}`
                    : 'Ajuda sobre técnica de treinamento'
            }
        />
    );
}
