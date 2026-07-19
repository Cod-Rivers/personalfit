// Conteúdo compartilhado entre os balões de ajuda do Controle de Microciclo
// (componente HelpTooltip) e as seções correspondentes em /ajuda.
// Mantido em um único lugar para os dois ficarem sempre consistentes.

export interface MicrocycleHelpTopic {
    /** id usado como âncora em /ajuda (ex: /ajuda#prontidao) */
    id: string;
    label: string;
    /** Texto curto exibido no balão de ajuda (hover/toque) */
    short: string;
    /** Texto mais completo exibido na Central de Ajuda */
    long: string;
}

export const microcycleHelpTopics: MicrocycleHelpTopic[] = [
    {
        id: 'autorregulacao',
        label: 'Controle do Microciclo (Autorregulação)',
        short: 'Este painel ajusta automaticamente a intensidade e o volume do seu treino com base em como seu corpo está se recuperando. Responda aos campos abaixo antes de treinar.',
        long: 'O Controle do Microciclo acompanha, dia a dia, como você está se recuperando dos treinos e usa essas respostas para sugerir pequenos ajustes de carga e volume — sem substituir a orientação do seu personal. Preencha os campos com honestidade antes de cada treino para receber recomendações mais úteis.',
    },
    {
        id: 'prontidao',
        label: 'Prontidão (1-10)',
        short: 'Sua sensação geral ao acordar hoje: energia, disposição e motivação para treinar. 1 = exausto(a), 10 = extremamente disposto(a).',
        long: 'A prontidão mede como você se sente ao acordar, de forma geral: energia, disposição física e motivação para treinar. Não é sobre dor ou sono especificamente — é a sua impressão geral do dia. Valores baixos por vários dias seguidos costumam pesar na decisão do sistema de reduzir a carga.',
    },
    {
        id: 'sono',
        label: 'Sono (h)',
        short: 'Quantas horas você dormiu na última noite. O sono é o principal fator de recuperação muscular e nervosa.',
        long: 'Informe quantas horas você dormiu na noite anterior. O sono é o principal mecanismo de recuperação do corpo — poucas horas de sono reduzem a capacidade de recuperar músculos e sistema nervoso, mesmo quando os outros indicadores estão bons.',
    },
    {
        id: 'estresse',
        label: 'Estresse (1-10)',
        short: 'Nível de estresse mental/emocional nas últimas 24h (trabalho, estudos, vida pessoal). Estresse alto atrapalha a recuperação mesmo com bom sono.',
        long: 'Avalie seu nível de estresse mental e emocional nas últimas 24 horas, considerando trabalho, estudos ou vida pessoal. Estresse elevado eleva o cortisol e prejudica a recuperação, mesmo quando o sono foi suficiente — por isso ele entra separadamente na conta.',
    },
    {
        id: 'dor-muscular',
        label: 'Dor muscular (1-10)',
        short: 'Quão dolorido(a) você está por causa dos treinos anteriores (DOMS). Dor alta pode indicar que o músculo ainda não recuperou totalmente.',
        long: 'Indique o quanto seus músculos estão doloridos por causa de treinos anteriores (a famosa dor tardia, ou DOMS). Dor alta é um sinal de que aquele grupo muscular ainda não recuperou totalmente e pode não estar pronto para o mesmo volume de trabalho.',
    },
    {
        id: 'delta-vfc',
        label: 'Delta VFC (ms)',
        short: 'Variação da sua Variabilidade da Frequência Cardíaca em relação à sua média (se você mede em outro app/relógio/pulseira). Valores muito negativos indicam fadiga do sistema nervoso.',
        long: 'Se você mede sua Variabilidade da Frequência Cardíaca (VFC/HRV) em outro aplicativo, relógio ou pulseira, informe aqui a variação do dia em relação à sua média pessoal, em milissegundos. Esse campo é opcional (deixe 0 se não usa nenhum dispositivo) — quando preenchido, valores bem negativos indicam fadiga do sistema nervoso autônomo e pesam na recomendação.',
    },
    {
        id: 'rpe-previo',
        label: 'RPE prévio',
        short: 'Esforço percebido (RPE) do seu último treino, de 1 a 10. Ajuda o sistema a saber se a carga anterior ficou pesada demais.',
        long: 'O RPE (Rate of Perceived Exertion, ou Esforço Percebido) mede o quão puxado foi o seu último treino, numa escala de 1 a 10. É preenchido automaticamente quando você registra o treino pelo app, mas pode ser ajustado aqui. Ele é comparado com o RPE alvo do microciclo para saber se a carga precisa subir, manter ou cair.',
    },
];

export function getMicrocycleHelpTopic(id: string): MicrocycleHelpTopic {
    const topic = microcycleHelpTopics.find((t) => t.id === id);
    if (!topic) {
        throw new Error(`Tópico de ajuda desconhecido: ${id}`);
    }
    return topic;
}
