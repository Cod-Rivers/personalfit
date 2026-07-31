export type GanttColorKey = 'mint' | 'violet' | 'amber' | 'coral' | 'deload';

/** Cor por fase — reaproveita a paleta fixa do app (mint/violet/amber/coral).
 * Compartilhado entre o Gantt de desktop (dhtmlx) e a timeline vertical de
 * mobile, para as duas visões pintarem a mesma fase com a mesma cor.
 *
 * Agrupamento semântico: mint = construção (base/acumulação/hipertrofia),
 * violet = preparação/transição/manutenção, amber = intensificação,
 * coral = pico/competição/potência. Deload ganha tratamento à parte
 * (tracejado, sem preenchimento) para saltar aos olhos como recuperação. */
const PHASE_COLOR_KEY: Record<string, GanttColorKey> = {
    Introdução: 'violet',
    Base: 'mint',
    'Preparação e Controle': 'violet',
    'Pré-competição': 'amber',
    Competição: 'coral',
    Acumulação: 'mint',
    Transmutação: 'violet',
    Realização: 'amber',
    Hipertrofia: 'mint',
    Força: 'amber',
    Potência: 'coral',
    Manutenção: 'violet',
    Deload: 'deload',
};
const DEFAULT_COLOR_KEY: GanttColorKey = 'mint';

export function phaseColorKey(phase?: string): GanttColorKey {
    return (phase && PHASE_COLOR_KEY[phase]) || DEFAULT_COLOR_KEY;
}
