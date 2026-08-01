// Glossário central da Central de Ajuda (/ajuda#glossario).
// Alimentado por dois lados:
//  - Termos do Controle de Microciclo vêm de microcycleHelpContent.ts (não duplicados aqui).
//  - Termos de periodização/produto têm definição própria, com `seeAlso` apontando para a
//    seção completa em /ajuda quando ela já existe, em vez de reescrever o conteúdo.
import { microcycleHelpTopics } from './microcycleHelpContent';

export interface GlossaryTerm {
    /** id usado na âncora /ajuda#glossario-<id> */
    id: string;
    term: string;
    /** Definição de uma linha (reservado para usos futuros, ex. busca) */
    short: string;
    /** Definição completa exibida no cartão do glossário */
    long: string;
    /** Aponta para a seção que já explica o termo em detalhe, quando existir */
    seeAlso?: {
        /** id da seção/tópico (âncora) */
        id: string;
        label: string;
        /** público em que a âncora existe de fato no DOM */
        audience: 'student' | 'personal';
    };
}

const trainingScienceTerms: GlossaryTerm[] = [
    {
        id: 'rpe',
        term: 'RPE (Esforço Percebido)',
        short: 'Escala de 1 a 10 que mede o quão puxada foi uma série ou treino.',
        long: 'RPE (Rate of Perceived Exertion, ou Esforço Percebido) é uma escala de 1 a 10 usada para medir o quão puxada foi uma série ou um treino inteiro. É a base da autorregulação: o aluno registra o RPE de cada série e o app compara com o RPE alvo definido pelo personal para decidir se a carga deve subir, se manter ou cair.',
        seeAlso: {
            id: 'autorregulacao-rpe-rir',
            label: 'Periodização + Autorregulação por RPE/RIR',
            audience: 'personal',
        },
    },
    {
        id: 'rir',
        term: 'RIR (Repetições em Reserva)',
        short: 'Quantas repetições ainda dariam para fazer antes de falhar numa série.',
        long: 'RIR (Reps in Reserve, ou Repetições em Reserva) é a leitura inversa do RPE: em vez de medir o esforço de 1 a 10, conta quantas repetições ainda sobrariam antes da falha. A conversão é direta — RIR = 10 − RPE. RIR 0 é falha total; RIR 3, por exemplo, significa que sobrariam 3 repetições.',
        seeAlso: {
            id: 'autorregulacao-rpe-rir',
            label: 'Periodização + Autorregulação por RPE/RIR',
            audience: 'personal',
        },
    },
    {
        id: '1rm',
        term: '1RM (Uma Repetição Máxima)',
        short: 'A carga máxima que você consegue levantar em uma única repetição de um exercício.',
        long: 'O 1RM (Uma Repetição Máxima) é o peso mais alto que uma pessoa consegue mover em uma única repetição completa de um exercício, com técnica correta. Serve de referência para calcular cargas de treino em percentual (por exemplo, "70% de 1RM") e para acompanhar a evolução de força ao longo do tempo.',
    },
    {
        id: 'macrociclo',
        term: 'Macrociclo',
        short: 'O plano de treino inteiro, do início ao fim — semanas ou meses.',
        long: 'O macrociclo é o nível mais alto da periodização: o plano de treino completo, com objetivo, datas de início/fim e status (Rascunho, Ativo ou Concluído). Dentro dele ficam os mesociclos (fases) e, dentro de cada um, os microciclos (semanas).',
        seeAlso: {
            id: 'periodizacao-aluno',
            label: 'Periodização do aluno',
            audience: 'personal',
        },
    },
    {
        id: 'mesociclo',
        term: 'Mesociclo (Fase)',
        short: 'Um bloco de 3 a 6 semanas dentro do macrociclo, com uma fase e metodologia definidas.',
        long: 'O mesociclo, também chamado de fase, é um bloco de 3 a 6 semanas dentro do macrociclo. Cada mesociclo tem uma fase (por exemplo, Acumulação, Hipertrofia, Pico) e uma metodologia de progressão (Linear, Ondulada, Conjugada, Bloco). É o nível intermediário da periodização, entre o macrociclo e as semanas (microciclos).',
        seeAlso: {
            id: 'autorregulacao-rpe-rir',
            label: 'Periodização + Autorregulação por RPE/RIR',
            audience: 'personal',
        },
    },
    {
        id: 'microciclo-periodo',
        term: 'Microciclo (semana de treino)',
        short: 'Cada semana dentro de um mesociclo — onde RPE alvo, ajustes de carga e deload são definidos.',
        long: 'O microciclo é cada semana individual dentro de um mesociclo (fase). É o nível onde a autorregulação é configurada na prática: RPE alvo, ajustes de volume e intensidade, e se a semana é um deload. Não confundir com o "Controle do Microciclo", o painel diário que o aluno preenche antes de treinar (prontidão, sono, estresse etc.) — este último é uma funcionalidade, não o período de tempo.',
        seeAlso: {
            id: 'autorregulacao-rpe-rir',
            label: 'Periodização + Autorregulação por RPE/RIR',
            audience: 'personal',
        },
    },
    {
        id: 'deload',
        term: 'Deload',
        short: 'Semana de recuperação com volume e intensidade reduzidos, para dissipar fadiga acumulada.',
        long: 'Deload é uma semana (microciclo) planejada com volume e/ou intensidade bem menores que o normal, usada para dissipar a fadiga acumulada antes que ela prejudique o desempenho. Pode ser programado com antecedência (por exemplo, ao fim de um mesociclo) ou sugerido quando o app detecta fadiga persistente.',
        seeAlso: {
            id: 'autorregulacao-rpe-rir',
            label: 'Periodização + Autorregulação por RPE/RIR',
            audience: 'personal',
        },
    },
    {
        id: 'supercompensacao',
        term: 'Supercompensação',
        short: 'Estado de boa recuperação em que o corpo está pronto para progredir a carga.',
        long: 'Supercompensação é a zona de autorregulação em que o aluno está bem recuperado (prontidão boa, RPE abaixo do alvo) e o app sugere progredir levemente a carga ou o volume. É uma das três zonas usadas pelo Controle do Microciclo, junto com Manutenção e Fadiga.',
        seeAlso: {
            id: 'autorregulacao-rpe-rir',
            label: 'Periodização + Autorregulação por RPE/RIR',
            audience: 'personal',
        },
    },
    {
        id: 'periodizacao',
        term: 'Periodização',
        short: 'A organização do treino em blocos de tempo (macro, meso, microciclos) com progressão planejada.',
        long: 'Periodização é a organização do treino ao longo do tempo em blocos — macrociclo, mesociclos e microciclos — com progressão planejada de volume e intensidade, em vez de uma planilha fixa repetida toda semana. No Venafit, a periodização é combinada com a autorregulação por RPE/RIR, que ajusta a carga real ao estado de recuperação do aluno.',
        seeAlso: {
            id: 'autorregulacao-rpe-rir',
            label: 'Periodização + Autorregulação por RPE/RIR',
            audience: 'personal',
        },
    },
    {
        id: 'dup',
        term: 'DUP (Ondulada Diária)',
        short: 'Metodologia em que o esforço/volume muda de treino para treino dentro da mesma semana.',
        long: 'DUP (Daily Undulating Periodization, ou Periodização Ondulada Diária) é uma metodologia de progressão em que o esforço, volume ou intensidade variam de treino para treino dentro da mesma semana (por exemplo, um dia mais pesado e outro mais leve), em vez de manter a mesma carga em todos os treinos da semana.',
        seeAlso: {
            id: 'autorregulacao-rpe-rir',
            label: 'Periodização + Autorregulação por RPE/RIR',
            audience: 'personal',
        },
    },
    {
        id: 'regra-2-for-2',
        term: 'Regra "2-for-2"',
        short: 'Só aumenta a carga depois de 2 sessões consecutivas dentro da meta de RPE/reps.',
        long: 'A regra "2-for-2" (ACSM, "Progression Models in Resistance Training for Healthy Adults", 2009; NSCA, "Essentials of Strength Training and Conditioning") só libera um aumento de carga depois que o aluno bate a meta de RPE — e, quando há uma faixa de reps definida, também as reps — em 2 sessões consecutivas do mesmo exercício. Reduções de carga continuam imediatas, por segurança. No Venafit isso é configurável em Autorregulação → Progressão temporal.',
        seeAlso: {
            id: 'progressao-carga',
            label: 'Sugestão de carga e progressão temporal',
            audience: 'personal',
        },
    },
    {
        id: 'dupla-progressao',
        term: 'Dupla Progressão',
        short: 'Primeiro progride as repetições até o topo da faixa prescrita, só depois sobe a carga.',
        long: 'Dupla progressão é o princípio de, dentro de uma faixa de repetições prescrita (ex.: 8-12), primeiro aumentar as repetições executadas até o topo da faixa em todas as séries, para só então aumentar a carga e voltar ao piso da faixa. No Venafit, a sugestão de carga só considera uma sessão "qualificada" para progressão se as reps executadas também bateram o alvo, não só o RPE.',
        seeAlso: {
            id: 'progressao-carga',
            label: 'Sugestão de carga e progressão temporal',
            audience: 'personal',
        },
    },
    {
        id: 'intrassessao-intersessao',
        term: 'Intrassessão / Intersessão',
        short: 'Ajustes feitos durante o próprio treino (intrassessão) ou para os próximos dias (intersessão).',
        long: 'Intrassessão é o ajuste feito durante o próprio treino — por exemplo, reduzir a carga de uma série se o RPE já estourou o alvo antes do fim do treino. Intersessão é o ajuste para os próximos dias ou semanas — por exemplo, cortar volume geral enquanto a fadiga persistir. São os dois horizontes de tempo em que a autorregulação atua.',
        seeAlso: {
            id: 'autorregulacao-rpe-rir',
            label: 'Periodização + Autorregulação por RPE/RIR',
            audience: 'personal',
        },
    },
];

const productTerms: GlossaryTerm[] = [
    {
        id: 'plano-pro',
        term: 'PRO',
        short: 'Assinatura do personal trainer: alunos ilimitados, sem anúncios, marca própria e mais.',
        long: 'O PRO é a assinatura do personal trainer no Venafit. Desbloqueia alunos ilimitados, remove anúncios, libera a personalização da marca no app dos alunos, upload de vídeos próprios, ciclos de treino privados, plano alimentar, anúncios e a Agenda com controle de presença.',
        seeAlso: {
            id: 'plano-pro',
            label: 'Plano PRO — o que desbloqueia',
            audience: 'personal',
        },
    },
    {
        id: 'biblioteca-publica',
        term: 'Biblioteca Pública',
        short: 'Ciclos de treino compartilhados por outros personals e aprovados pela equipe Venafit.',
        long: 'A Biblioteca Pública reúne ciclos de treino (macrociclos-modelo) que outros personals escolheram compartilhar e que foram revisados e aprovados pela equipe Venafit. Qualquer personal pode buscar e aplicar um desses ciclos direto a um aluno.',
        seeAlso: {
            id: 'biblioteca-publica',
            label: 'Biblioteca Pública',
            audience: 'personal',
        },
    },
    {
        id: 'template-modelo',
        term: 'Template / Modelo',
        short: 'Um ciclo de treino reutilizável, montado uma vez e aplicado a vários alunos.',
        long: 'Um template (ou modelo) é um macrociclo reutilizável: montado uma vez, na aba Minha Periodização / Treinos do personal, e depois aplicado a diferentes alunos sem precisar recriar tudo do zero. Modelos aprovados podem também entrar na Biblioteca Pública.',
        seeAlso: {
            id: 'periodizacao-biblioteca',
            label: 'Minha Periodização / Treinos',
            audience: 'personal',
        },
    },
    {
        id: 'recorrencia',
        term: 'Recorrência',
        short: 'Um horário fixo de agenda (ex.: toda segunda às 8h) em vez de marcar sessão por sessão.',
        long: 'Uma recorrência é um horário fixo criado na Agenda do personal (por exemplo, segunda/quarta/sexta às 8h), com data-limite opcional, para não precisar marcar cada sessão manualmente. Uma Exceção remaneja um dia específico daquela recorrência.',
        seeAlso: {
            id: 'recorrencias',
            label: 'Recorrências e remarcações',
            audience: 'personal',
        },
    },
    {
        id: 'anamnese',
        term: 'Anamnese',
        short: 'Questionário inicial de saúde e dores usado para montar o treino sem um personal.',
        long: 'A anamnese é o questionário inicial de saúde e dores (tornozelo, lombar, joelho, quadril, ombro etc.) usado para gerar automaticamente um plano de treino quando o aluno não está vinculado a um personal. Quem já tem um personal costuma dispensar essa etapa, pois o plano é montado diretamente por ele.',
        seeAlso: {
            id: 'anamnese',
            label: 'Anamnese',
            audience: 'student',
        },
    },
];

const microcycleDerivedTerms: GlossaryTerm[] = microcycleHelpTopics.map((topic) => ({
    id: topic.id,
    term: topic.label,
    short: topic.short,
    long: topic.long,
    seeAlso: {
        id: topic.id,
        label: topic.label,
        audience: 'student',
    },
}));

export const glossaryTerms: GlossaryTerm[] = [
    ...microcycleDerivedTerms,
    ...trainingScienceTerms,
    ...productTerms,
];

export function getGlossaryTerm(id: string): GlossaryTerm {
    const term = glossaryTerms.find((t) => t.id === id);
    if (!term) {
        throw new Error(`Termo de glossário desconhecido: ${id}`);
    }
    return term;
}

export function getSortedGlossaryTerms(): GlossaryTerm[] {
    return [...glossaryTerms].sort((a, b) => a.term.localeCompare(b.term, 'pt-BR'));
}
