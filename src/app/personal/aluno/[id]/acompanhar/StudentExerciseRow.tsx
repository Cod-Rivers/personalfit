'use client';

import { useCallback } from 'react';
import { FiRepeat, FiX } from 'react-icons/fi';
import ExerciseThumbnail from '@/components/features/ExerciseThumbnail';
import RestTimer from '@/components/molecules/RestTimer';
import { formatSeriesCompact } from '@/libs/seriesPrescription';
import type { ExerciseResponse } from '@/libs/planningService';
import s from './acompanhar.module.css';

/**
 * O que o aluno registrou deste exercício no microciclo corrente.
 *
 * - `load`: carga do último treino concluído (casada por id ou nome).
 * - `done-no-load`: o treino foi concluído, mas sem carga neste exercício
 *   (peso corporal, tempo, ou o aluno não preencheu).
 * - `not-done`: o treino ainda não foi concluído nesta semana.
 * - `unknown`: os registros não carregaram (sem rede, erro) — melhor não
 *   dizer nada do que afirmar "não fez" sem saber.
 */
export type WeekRecord =
    | { kind: 'load'; kg: number }
    | { kind: 'done-no-load' }
    | { kind: 'not-done' }
    | { kind: 'unknown' };

const RECORD_TEXT: Record<Exclude<WeekRecord['kind'], 'load' | 'unknown'>, string> = {
    'done-no-load': 'Concluído, sem carga',
    'not-done': 'Carga pendente',
};

/**
 * Linha de um exercício na tela de acompanhar.
 *
 * Layout: miniatura grande à esquerda; nome no topo com a largura toda;
 * abaixo, a prescrição em pares rótulo/valor. No rodapé (mais fino), o que
 * o aluno registrou na semana à esquerda e o cronômetro de descanso à
 * direita, quando houver.
 *
 * A miniatura (float: left) e trocar/excluir (float: right) são FLOATS, não
 * itens de flex ao lado do texto — um item de flex reserva a própria
 * largura ao longo de TODA a altura do bloco, mesmo nas linhas onde ele não
 * está (nome curto sobra vazio ao lado dos botões; série em texto livre
 * longo fica espremida nas linhas de baixo, onde a miniatura já acabou).
 * Só o float estreita exatamente as linhas de texto que cruzam a altura
 * dele — nome e série usam a largura toda acima/abaixo disso. Por isso
 * `exerciseOpen` é `display: flow-root` (não `flex`: um float só é
 * respeitado dentro do MESMO formatting context do texto) e o clique
 * deixou de ser um `<button>` em volta de tudo — teria botão dentro de
 * botão com trocar/excluir. É uma div com papel de botão; os dois botões
 * reais cancelam a propagação do clique para não abrir o card junto.
 *
 * A marcação de "aplicado" (checkbox) não mora aqui — mora na coluna da
 * alça de arrastar (ver `topSlot` em SortableList, usado por page.tsx), pra
 * não abrir uma faixa nova que aumentasse o card. Este componente só recebe
 * `completed` para mudar a aparência do card quando marcado.
 */
export default function StudentExerciseRow({
    exercise: ex,
    record,
    showRestTimer,
    showActions,
    busy,
    completed,
    onOpen,
    onReplace,
    onDelete,
}: {
    exercise: ExerciseResponse;
    record: WeekRecord;
    /** Falso nos exercícios que não fecham um bi-set/tri-set: entre eles
     * não há descanso, então não há o que cronometrar. */
    showRestTimer: boolean;
    showActions: boolean;
    busy: boolean;
    /** Marcado pelo personal nesta sessão presencial, via o checkbox na
     * coluna da alça (ver doc do componente). */
    completed: boolean;
    onOpen: () => void;
    onReplace: () => void;
    onDelete: () => void;
}) {
    const rest = ex.rest_seconds ?? 0;
    const hasTimer = showRestTimer && rest > 0;

    // Impede que o clique nos botões borbulhe para o onOpen da div (ver nota
    // acima: não dá para aninhar <button> dentro de <button>, então o clique
    // precisa ser contido explicitamente).
    const stopAnd = useCallback(
        (fn: () => void) => (e: React.MouseEvent) => {
            e.stopPropagation();
            fn();
        },
        [],
    );
    const openOnKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen();
        }
    };

    return (
        <div className={s.exerciseRow} data-completed={completed || undefined}>
            <div
                className={s.exerciseOpen}
                role="button"
                tabIndex={0}
                onClick={onOpen}
                onKeyDown={openOnKey}
                aria-label={`Abrir ${ex.name}`}
            >
                <ExerciseThumbnail
                    name={ex.name}
                    videoThumb={ex.video_thumb}
                    videoUrl={ex.video_url}
                    width={84}
                    height={84}
                    borderRadius={10}
                    lazyCapture
                    captureFrame={false}
                    className={s.thumbFloat}
                />

                <p className={s.exerciseName}>{ex.name}</p>

                {showActions && (
                    <div className={s.actionsInline}>
                        <button
                            type="button"
                            className={s.iconBtn}
                            onClick={stopAnd(onReplace)}
                            disabled={busy}
                            aria-label={`Trocar ${ex.name}`}
                            title="Trocar exercício"
                        >
                            <FiRepeat />
                        </button>
                        <button
                            type="button"
                            className={`${s.iconBtn} ${s.iconBtnDanger}`}
                            onClick={stopAnd(onDelete)}
                            disabled={busy}
                            aria-label={`Excluir ${ex.name}`}
                            title="Excluir do treino"
                        >
                            <FiX />
                        </button>
                    </div>
                )}

                <dl className={s.prescription}>
                    <div className={s.prescriptionItem}>
                        <dt>Séries</dt>
                        <dd>{formatSeriesCompact(ex)}</dd>
                    </div>
                    {ex.load_kg ? (
                        <div className={s.prescriptionItem}>
                            <dt>Carga</dt>
                            <dd>{ex.load_kg} kg</dd>
                        </div>
                    ) : null}
                    {rest > 0 && !hasTimer ? (
                        <div className={s.prescriptionItem}>
                            <dt>Descanso</dt>
                            <dd>{rest}s</dd>
                        </div>
                    ) : null}
                    {ex.rpe_target ? (
                        <div className={s.prescriptionItem}>
                            <dt>RPE</dt>
                            <dd>{ex.rpe_target}</dd>
                        </div>
                    ) : null}
                </dl>
            </div>

            {(record.kind !== 'unknown' || hasTimer) && (
                <div className={s.rowFooter}>
                    {record.kind !== 'unknown' ? (
                        <div className={s.weekRecord}>
                            <span className={s.weekRecordLabel}>
                                Esta semana
                            </span>
                            <span
                                className={
                                    record.kind === 'load'
                                        ? s.weekRecordValue
                                        : s.weekRecordEmpty
                                }
                            >
                                {record.kind === 'load'
                                    ? `${record.kg} kg`
                                    : RECORD_TEXT[record.kind]}
                            </span>
                        </div>
                    ) : (
                        <span />
                    )}
                    {hasTimer && (
                        <RestTimer seconds={rest} exerciseName={ex.name} />
                    )}
                </div>
            )}
        </div>
    );
}
