/**
 * Catálogo de técnicas de treinamento avançadas, aplicáveis a um exercício
 * dentro de um treino. Fonte única usada pelo editor do personal
 * (cards do editor) e pela exibição ao aluno (ExerciseDetailCard) — evita
 * duplicar labels/regras nos dois lugares.
 *
 * Os 5 campos genéricos (rounds/round_reduction_pct/pause_seconds/extra_reps/
 * hold_seconds) espelham training.TechniqueParams no backend e são
 * reaproveitados com significado diferente por técnica — por isso cada
 * technique declara só os campos que faz sentido exibir, com seu próprio
 * label/unidade/limites.
 *
 * Técnicas com fields: [] (negativas, superlento, GVT) não precisam de
 * parâmetro extra: já são bem representadas pelos campos de prescrição
 * existentes (Cadência, Séries, % de 1RM, Descanso) — a técnica funciona só
 * como rótulo/instrução para o aluno.
 *
 * Escopo desta feature (decisão consciente, não pendência — ver
 * Todo/TAREFAS_PENDENTES.md > Concluídas > "Técnicas de treinamento
 * avançadas", 2026-08-01):
 * - Só o sistema de macrociclo/periodização usa este catálogo. O sistema
 *   legado `trainingprotocol` (templates admin/anamnese) não recebeu
 *   Technique/TechniqueParams/GroupTechnique.
 * - WorkoutLogger não registra sub-série estruturada (ex: cada "queda" de um
 *   dropset) — o aluno só vê a técnica como badge/instrução aqui e em
 *   ExerciseDetailCard; o registro de série continua 1 linha por série.
 * - Progressão de carga por série em pirâmide/onda não é um array
 *   estruturado — continua em texto livre (SeriesLabel/Comments).
 */

export type TechniqueParamKey =
    | 'rounds'
    | 'round_reduction_pct'
    | 'pause_seconds'
    | 'extra_reps'
    | 'hold_seconds';

export interface TechniqueParamField {
    key: TechniqueParamKey;
    /** Label do input no editor do personal. */
    label: string;
    /** Rótulo curto usado no resumo/badge (ex: "3 reduções"). */
    shortLabel: string;
    unit: string;
    min: number;
    max: number;
}

export interface TechniqueDefinition {
    label: string;
    category: string;
    fields: TechniqueParamField[];
}

export const TECHNIQUE_CATEGORIES = [
    'Alta intensidade & falha muscular',
    'Fases da contração & tempo',
    'Pirâmide & organização de carga',
    'Métodos específicos',
] as const;

export const TECHNIQUE_CATALOG: Record<string, TechniqueDefinition> = {
    dropset: {
        label: 'Dropset',
        category: 'Alta intensidade & falha muscular',
        fields: [
            {
                key: 'rounds',
                label: 'Nº de reduções',
                shortLabel: 'reduções',
                unit: '',
                min: 1,
                max: 10,
            },
            {
                key: 'round_reduction_pct',
                label: '% de redução por queda',
                shortLabel: 'de redução por queda',
                unit: '%',
                min: 1,
                max: 90,
            },
        ],
    },
    rest_pause: {
        label: 'Rest-pause',
        category: 'Alta intensidade & falha muscular',
        fields: [
            {
                key: 'pause_seconds',
                label: 'Pausa entre mini-séries',
                shortLabel: 'de pausa',
                unit: 'seg',
                min: 1,
                max: 60,
            },
            {
                key: 'extra_reps',
                label: 'Meta de reps extras',
                shortLabel: 'reps extras',
                unit: 'reps',
                min: 1,
                max: 50,
            },
        ],
    },
    forced_reps: {
        label: 'Repetições forçadas',
        category: 'Alta intensidade & falha muscular',
        fields: [
            {
                key: 'extra_reps',
                label: 'Reps assistidas extras',
                shortLabel: 'reps assistidas',
                unit: 'reps',
                min: 1,
                max: 20,
            },
        ],
    },
    partial_reps: {
        label: 'Repetições parciais',
        category: 'Alta intensidade & falha muscular',
        fields: [
            {
                key: 'extra_reps',
                label: 'Reps parciais extras',
                shortLabel: 'reps parciais',
                unit: 'reps',
                min: 1,
                max: 30,
            },
        ],
    },
    eccentric: {
        label: 'Negativas (excêntrico)',
        category: 'Fases da contração & tempo',
        fields: [],
    },
    isometric: {
        label: 'Isometria / ponto de tensão',
        category: 'Fases da contração & tempo',
        fields: [
            {
                key: 'hold_seconds',
                label: 'Tempo de contração',
                shortLabel: 'de contração estática',
                unit: 'seg',
                min: 1,
                max: 120,
            },
        ],
    },
    peak_contraction: {
        label: 'Pico de contração',
        category: 'Fases da contração & tempo',
        fields: [
            {
                key: 'hold_seconds',
                label: 'Tempo de pico de contração',
                shortLabel: 'de pico de contração',
                unit: 'seg',
                min: 1,
                max: 10,
            },
        ],
    },
    super_slow: {
        label: 'Superlento (super slow)',
        category: 'Fases da contração & tempo',
        fields: [],
    },
    pyramid_ascending: {
        label: 'Pirâmide crescente',
        category: 'Pirâmide & organização de carga',
        fields: [
            {
                key: 'rounds',
                label: 'Nº de degraus',
                shortLabel: 'degraus crescentes',
                unit: '',
                min: 2,
                max: 8,
            },
        ],
    },
    pyramid_descending: {
        label: 'Pirâmide decrescente',
        category: 'Pirâmide & organização de carga',
        fields: [
            {
                key: 'rounds',
                label: 'Nº de degraus',
                shortLabel: 'degraus decrescentes',
                unit: '',
                min: 2,
                max: 8,
            },
        ],
    },
    pyramid_truncated: {
        label: 'Pirâmide truncada',
        category: 'Pirâmide & organização de carga',
        fields: [
            {
                key: 'rounds',
                label: 'Nº de degraus',
                shortLabel: 'degraus',
                unit: '',
                min: 2,
                max: 8,
            },
        ],
    },
    wave_loading: {
        label: 'Onda (wave loading)',
        category: 'Pirâmide & organização de carga',
        fields: [
            {
                key: 'rounds',
                label: 'Nº de ondas',
                shortLabel: 'ondas',
                unit: '',
                min: 2,
                max: 6,
            },
        ],
    },
    method_21: {
        label: 'Método 21',
        category: 'Métodos específicos',
        fields: [
            {
                key: 'rounds',
                label: 'Nº de blocos',
                shortLabel: 'blocos',
                unit: '',
                min: 2,
                max: 4,
            },
            {
                key: 'extra_reps',
                label: 'Reps por bloco',
                shortLabel: 'reps por bloco',
                unit: 'reps',
                min: 1,
                max: 15,
            },
        ],
    },
    cluster_set: {
        label: 'Cluster set',
        category: 'Métodos específicos',
        fields: [
            {
                key: 'rounds',
                label: 'Nº de blocos',
                shortLabel: 'blocos',
                unit: '',
                min: 2,
                max: 10,
            },
            {
                key: 'extra_reps',
                label: 'Reps por bloco',
                shortLabel: 'reps por bloco',
                unit: 'reps',
                min: 1,
                max: 10,
            },
            {
                key: 'pause_seconds',
                label: 'Pausa entre blocos',
                shortLabel: 'de pausa entre blocos',
                unit: 'seg',
                min: 5,
                max: 60,
            },
        ],
    },
    fst7: {
        label: 'FST-7',
        category: 'Métodos específicos',
        fields: [
            {
                key: 'pause_seconds',
                label: 'Descanso entre séries',
                shortLabel: 'de descanso',
                unit: 'seg',
                min: 15,
                max: 60,
            },
        ],
    },
    gvt: {
        label: 'GVT (German Volume Training)',
        category: 'Métodos específicos',
        fields: [],
    },
};

export interface GroupTechniqueDefinition {
    value: string;
    label: string;
}

export const GROUP_TECHNIQUE_CATALOG: GroupTechniqueDefinition[] = [
    { value: 'biset', label: 'Bi-set (mesmo grupo muscular)' },
    { value: 'superset', label: 'Superset (grupos antagonistas)' },
    { value: 'triset', label: 'Tri-set (3 exercícios)' },
    { value: 'giant_set', label: 'Série gigante (4+ exercícios)' },
    { value: 'pre_exhaustion', label: 'Pré-exaustão (isolado → composto)' },
    { value: 'post_exhaustion', label: 'Pós-exaustão (composto → isolado)' },
];

/** Se a variante de agrupamento cabe num bloco de `size` exercícios: bi-set é
 * par, tri-set é trio, série gigante começa em 4; superset e pré/pós-exaustão
 * aceitam qualquer bloco de 2+. Usado para escolher o tipo já na seleção. */
export function isGroupTechniqueValidForSize(value: string, size: number): boolean {
    if (size < 2) return false;
    switch (value) {
        case 'biset':
            return size === 2;
        case 'triset':
            return size === 3;
        case 'giant_set':
            return size >= 4;
        default:
            return true;
    }
}

export function groupTechniqueLabel(value?: string): string | undefined {
    return GROUP_TECHNIQUE_CATALOG.find((g) => g.value === value)?.label;
}

/** Rótulo do bloco combinado: usa a variante explícita (group_technique)
 * quando marcada, senão cai no heurístico por número de exercícios. Usado
 * tanto no editor do personal quanto na execução do aluno. */
export function comboGroupLabel(size: number, groupTechnique?: string): string {
    const explicit = groupTechniqueLabel(groupTechnique);
    if (explicit) return explicit;
    if (size <= 2) return 'Bissérie';
    if (size === 3) return 'Trissérie';
    return 'Superssérie';
}

type Groupable = { group_id?: string; group_technique?: string };

/** Tira `group_id`/`group_technique` de quem ficou sozinho no bloco (um
 * "bi-set" de um exercício só esconderia o descanso dele) e apaga a variante
 * de quem deixou de caber nela (um tri-set que perdeu um exercício não é mais
 * tri-set — cai no rótulo pelo tamanho, ver comboGroupLabel). Devolve itens
 * novos só onde mudou algo. */
export function tidyExerciseGroups<T extends Groupable>(items: T[]): T[] {
    const sizes = new Map<string, number>();
    for (const e of items) {
        if (e.group_id) sizes.set(e.group_id, (sizes.get(e.group_id) ?? 0) + 1);
    }
    return items.map((e) => {
        if (!e.group_id) return e;
        const size = sizes.get(e.group_id) ?? 0;
        if (size < 2) {
            return { ...e, group_id: undefined, group_technique: undefined };
        }
        if (
            e.group_technique &&
            !isGroupTechniqueValidForSize(e.group_technique, size)
        ) {
            return { ...e, group_technique: undefined };
        }
        return e;
    });
}

/**
 * Junta itens que JÁ estão na lista num bloco só (bi-set, tri-set…). Usado
 * pela tela do treino do aluno e pelo editor da fase, sobre a seleção do ✓.
 *
 * O bloco nasce na posição do PRIMEIRO selecionado e os demais sobem para
 * junto dele, na ordem em que já estavam — partitionExerciseGroups só
 * reconhece bloco consecutivo. Quem estava noutro bloco sai de lá; o bloco
 * antigo que ficar com um só se desfaz (tidyExerciseGroups). Não mexe em
 * ids: é o mesmo exercício, com o mesmo histórico.
 */
export function mergeIntoGroup<T extends Groupable>(
    items: T[],
    isSelected: (item: T) => boolean,
    groupId: string,
    technique?: string,
): T[] {
    const firstIdx = items.findIndex(isSelected);
    if (firstIdx === -1) return items;
    const insertAt = items
        .slice(0, firstIdx)
        .filter((e) => !isSelected(e)).length;
    const rest = items.filter((e) => !isSelected(e));
    const grouped = items.filter(isSelected).map((e) => ({
        ...e,
        group_id: groupId,
        group_technique: technique || undefined,
    }));
    return tidyExerciseGroups([
        ...rest.slice(0, insertAt),
        ...grouped,
        ...rest.slice(insertAt),
    ]);
}

/**
 * Particiona uma lista de itens (exercícios do personal ou logs do aluno) em
 * blocos: cada bloco é uma sequência consecutiva com o mesmo group_id
 * (bissérie/trissérie/superssérie), ou um único item avulso. A ordem de
 * execução dentro de um bloco é a ordem na lista de entrada — não há campo de
 * ordem separado.
 */
export function partitionExerciseGroups<T extends { group_id?: string }>(
    items: T[],
): T[][] {
    const groups: T[][] = [];
    for (const item of items) {
        const last = groups[groups.length - 1];
        if (
            item.group_id &&
            last &&
            last[last.length - 1].group_id === item.group_id
        ) {
            last.push(item);
        } else {
            groups.push([item]);
        }
    }
    return groups;
}

export interface TechniqueParamsValue {
    rounds?: number;
    round_reduction_pct?: number;
    pause_seconds?: number;
    extra_reps?: number;
    hold_seconds?: number;
}

/** Resumo humano de uma técnica + seus parâmetros, ex: "Dropset · 3 reduções,
 * 20% de redução por queda". Usado no resumo do editor e no badge do aluno. */
export function formatTechniqueSummary(
    technique?: string,
    params?: TechniqueParamsValue,
): string {
    if (!technique) return '';
    const entry = TECHNIQUE_CATALOG[technique];
    if (!entry) return '';
    if (!params) return entry.label;

    const parts = entry.fields
        .filter((f) => params[f.key] !== undefined && params[f.key] !== null)
        .map((f) => {
            const value = params[f.key];
            const unit = f.unit ? ` ${f.unit}` : '';
            return `${value}${unit} ${f.shortLabel}`;
        });

    return parts.length > 0 ? `${entry.label} · ${parts.join(', ')}` : entry.label;
}

/** Valor do parâmetro prescrito ou, se o personal não preencheu, a faixa
 * usual da técnica — o passo a passo nunca fica com buraco. */
function paramOr(value: number | undefined, fallback: string): string {
    return value !== undefined && value !== null ? String(value) : fallback;
}

/**
 * Passo a passo de execução de cada técnica, mostrado no balão de ajuda do
 * campo de técnica (editor do personal e card do exercício do aluno). Recebe
 * os parâmetros prescritos para que os passos já digam os números daquele
 * exercício ("reduza 20% da carga") em vez de só a regra genérica.
 */
export const TECHNIQUE_EXECUTION_GUIDE: Record<
    string,
    { summary: string; steps: (p: TechniqueParamsValue) => string[] }
> = {
    dropset: {
        summary: 'Estende a série além da falha reduzindo a carga sem descanso.',
        steps: (p) => [
            'Faça a série com a carga prescrita até a falha técnica (não consegue mais uma repetição com boa forma).',
            `Sem descansar, reduza a carga em ~${paramOr(p.round_reduction_pct, '20–30')}% (troque anilhas, o pino ou os halteres).`,
            'Continue imediatamente com a carga menor até a falha de novo.',
            `Repita a redução ${paramOr(p.rounds, '2–3')} vez(es) no total.`,
            'Só descanse ao final da última queda. Deixe as cargas separadas antes de começar para a troca levar poucos segundos.',
        ],
    },
    rest_pause: {
        summary: 'Mini-séries com pausas curtas para acumular repetições perto da falha.',
        steps: (p) => [
            'Faça a série com a carga prescrita até a falha ou 1 repetição antes dela.',
            `Solte a carga e descanse apenas ${paramOr(p.pause_seconds, '10–20')} segundos, respirando fundo.`,
            'Retome com a mesma carga e faça o máximo de repetições com boa forma.',
            `Repita pausa + mini-série até somar ~${paramOr(p.extra_reps, '4–6')} repetições extras.`,
            'Só então faça o descanso normal entre séries.',
        ],
    },
    forced_reps: {
        summary: 'Repetições extras após a falha, com ajuda mínima de um parceiro.',
        steps: (p) => [
            'Combine antes com um parceiro/instrutor: ele só ajuda depois da falha.',
            'Faça a série até a falha concêntrica (não consegue subir sozinho).',
            'O parceiro ajuda só o suficiente para vencer o ponto de travamento — você continua fazendo força.',
            `Faça ${paramOr(p.extra_reps, '2–3')} repetições assistidas, sempre descendo devagar e controlado sozinho.`,
            'Nunca use sem ajudante em exercícios com barra sobre o corpo (supino, agachamento).',
        ],
    },
    partial_reps: {
        summary: 'Repetições com amplitude reduzida depois de não conseguir mais a completa.',
        steps: (p) => [
            'Faça a série com amplitude completa até a falha.',
            'Sem soltar a carga, continue com repetições curtas na parte do movimento em que ainda consegue mover o peso (em geral a mais alongada ou a mais fácil).',
            `Faça ${paramOr(p.extra_reps, '4–8')} repetições parciais controladas, sem dar tranco.`,
            'Encerre a série e descanse normalmente.',
        ],
    },
    eccentric: {
        summary: 'Ênfase na fase de descida (excêntrica), feita de forma lenta e controlada.',
        steps: () => [
            'Use a carga prescrita — pode ser maior que a usual se houver ajudante para a subida.',
            'Suba (fase concêntrica) normalmente ou com ajuda.',
            'Desça resistindo ao peso de forma lenta, em ~3–5 segundos (ou a cadência prescrita).',
            'Mantenha tensão até o fim da amplitude, sem "largar" no final.',
            'Pare a série quando não conseguir mais controlar a descida no tempo pedido.',
        ],
    },
    isometric: {
        summary: 'Pausa com contração estática num ponto do movimento.',
        steps: (p) => [
            'Leve a carga até o ponto indicado pelo personal (geralmente o de maior tensão ou meio da amplitude).',
            `Segure parado ${paramOr(p.hold_seconds, '5–30')} segundos, sem prender a respiração — respire curto e contínuo.`,
            'Mantenha a postura e o músculo alvo contraído; não descanse apoiando articulações.',
            'Termine a repetição ou a série conforme prescrito, com controle.',
        ],
    },
    peak_contraction: {
        summary: 'Segurar e espremer o músculo no ponto de contração máxima de cada repetição.',
        steps: (p) => [
            'Execute a fase concêntrica até o ponto de contração máxima (músculo mais encurtado).',
            `Segure ali ${paramOr(p.hold_seconds, '1–3')} segundo(s), contraindo ativamente o músculo alvo.`,
            'Desça de forma controlada.',
            'Repita o pico em todas as repetições da série; se não conseguir segurar, a carga está alta demais.',
        ],
    },
    super_slow: {
        summary: 'Repetições muito lentas para manter o músculo sob tensão constante.',
        steps: () => [
            'Use carga menor que a habitual (em geral 50–70% do que usaria normalmente).',
            'Suba em ~10 segundos, de forma contínua, sem pausa (ou a cadência prescrita).',
            'Desça em ~10 segundos, também contínuo.',
            'Não trave as articulações nem descanse no topo/embaixo: a tensão não pode sair do músculo.',
            'Poucas repetições por série (4–6) já levam à fadiga.',
        ],
    },
    pyramid_ascending: {
        summary: 'A carga sobe e as repetições caem a cada série.',
        steps: (p) => [
            `Divida o exercício em ${paramOr(p.rounds, '3–5')} séries (degraus).`,
            'Comece com a carga mais leve e mais repetições (a 1ª série também serve de aquecimento).',
            'A cada série, aumente a carga e reduza as repetições.',
            'A última série é a mais pesada e com menos repetições, perto da falha.',
            'Descanse o tempo prescrito entre os degraus — maior nos mais pesados.',
        ],
    },
    pyramid_descending: {
        summary: 'Começa pesado e a carga cai a cada série, com mais repetições.',
        steps: (p) => [
            'Aqueça antes com 1–2 séries leves (não contam como degrau).',
            `Faça ${paramOr(p.rounds, '3–5')} séries (degraus), começando pela mais pesada e com menos repetições.`,
            'A cada série, reduza a carga e aumente as repetições.',
            'Mantenha a série perto da falha em todos os degraus.',
            'Descanse o tempo prescrito entre os degraus.',
        ],
    },
    pyramid_truncated: {
        summary: 'Pirâmide sem os extremos: evita as séries muito leves e muito pesadas.',
        steps: (p) => [
            'Aqueça antes com 1–2 séries leves.',
            `Faça ${paramOr(p.rounds, '3–4')} séries (degraus) em faixa moderada de carga.`,
            'Suba (ou desça) a carga um pouco a cada série, sem chegar ao máximo nem ao mínimo.',
            'As repetições acompanham a carga: mais peso, menos repetições.',
            'Descanse o tempo prescrito entre os degraus.',
        ],
    },
    wave_loading: {
        summary: 'Ondas de carga crescente; cada onda recomeça um pouco mais pesada.',
        steps: (p) => [
            'Uma onda são 3 séries com carga crescente e reps decrescentes (ex.: 7-5-3).',
            'Faça a 1ª onda completa, descansando o prescrito entre as séries.',
            'Recomece a 2ª onda com carga um pouco maior que a 1ª em cada série.',
            `Faça ${paramOr(p.rounds, '2–3')} ondas no total.`,
            'Pare a progressão se a técnica de execução piorar.',
        ],
    },
    method_21: {
        summary: 'Série dividida em blocos de amplitude parcial e completa (ex.: 7+7+7).',
        // Um passo por bloco prescrito (2 a 4): os parciais alternam metade
        // inferior/superior e o último é sempre a amplitude completa — com
        // 3 passos fixos, "São 4 blocos" contradizia a lista.
        steps: (p) => {
            const reps = paramOr(p.extra_reps, '7');
            const repsWord = p.extra_reps === 1 ? 'repetição' : 'repetições';
            const blocks = Math.min(Math.max(Math.round(p.rounds ?? 3), 2), 4);
            const halves = [
                'da metade inferior do movimento (do alongado até o meio)',
                'da metade superior (do meio até a contração)',
            ];
            const blockSteps = Array.from({ length: blocks }, (_, i) => {
                const range =
                    i === blocks - 1
                        ? 'com amplitude completa'
                        : halves[i % 2];
                const verb = i === 0 ? 'faça' : 'sem pausa, faça';
                return `Bloco ${i + 1}: ${verb} ${reps} ${repsWord} ${range}.`;
            });
            const total =
                p.extra_reps !== undefined && p.extra_reps !== null
                    ? ` (${blocks * p.extra_reps} repetições no total)`
                    : '';
            return [
                ...blockSteps,
                `Os ${blocks} blocos formam uma única série${total}; use carga menor que a habitual.`,
                'Descanse só ao final de todos os blocos.',
            ];
        },
    },
    cluster_set: {
        summary: 'Série fracionada em blocos curtos com micro-pausas, para manter carga alta.',
        steps: (p) => [
            'Use a carga prescrita (geralmente alta).',
            `Faça ${paramOr(p.extra_reps, '2–4')} repetições com boa velocidade e técnica.`,
            `Pause ${paramOr(p.pause_seconds, '15–30')} segundos (pode soltar a carga no apoio).`,
            `Repita até completar ${paramOr(p.rounds, '4–5')} blocos — isso conta como 1 série.`,
            'Faça o descanso completo antes da próxima série.',
        ],
    },
    fst7: {
        summary: '7 séries seguidas com descanso curto, geralmente no fim do treino do músculo.',
        steps: (p) => [
            'Deixe para o último exercício do grupo muscular.',
            'Escolha carga para 8–12 repetições com boa forma.',
            `Faça 7 séries, descansando só ${paramOr(p.pause_seconds, '30–45')} segundos entre elas.`,
            'Entre as séries, alongue/contraia o músculo trabalhado e hidrate-se.',
            'Se as repetições caírem muito, reduza um pouco a carga e siga até a 7ª série.',
        ],
    },
    gvt: {
        summary: '10 séries de 10 repetições com a mesma carga (German Volume Training).',
        steps: () => [
            'Use ~60% do seu máximo (uma carga com a qual faria ~20 repetições).',
            'Faça 10 séries de 10 repetições com a mesma carga.',
            'Descanse 60–90 segundos entre séries (ou o descanso prescrito).',
            'Mantenha a cadência controlada em todas as repetições.',
            'Se não completar as 10 em alguma série, mantenha a carga e faça o que conseguir; só aumente a carga no próximo treino quando fechar as 10×10.',
        ],
    },
};

/** Conteúdo do balão de ajuda do campo de técnica: título + resumo + passo a
 * passo quando há técnica conhecida; `null` para o chamador cair na ajuda
 * geral do glossário. */
export function techniqueExecutionHelp(
    technique?: string,
    params?: TechniqueParamsValue,
): { title: string; text: string; steps: string[] } | null {
    if (!technique) return null;
    const entry = TECHNIQUE_CATALOG[technique];
    const guide = TECHNIQUE_EXECUTION_GUIDE[technique];
    if (!entry || !guide) return null;
    return {
        title: entry.label,
        text: guide.summary,
        steps: guide.steps(params ?? {}),
    };
}
