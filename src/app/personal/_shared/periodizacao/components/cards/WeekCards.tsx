'use client';

import { FiAlertTriangle } from 'react-icons/fi';
import HelpTooltip from '@/components/atoms/HelpTooltip';
import { getGlossaryTerm } from '@/libs/glossaryContent';
import type { LocalMicrocycle } from '../../lib/mesocycleTransforms';
import NavRow, { NavRowGroup } from '@/components/molecules/NavRow';
import s from '../../builder.module.css';

const MICRO_STATUS_LABEL: Record<string, string> = {
    pending: 'Pendente',
    in_progress: 'Em progresso',
    completed: 'Concluído',
};

/** Resumo de uma linha da semana — o que permite decidir se vale abrir. */
export function weekSummary(micro: LocalMicrocycle): string {
    const parts: string[] = [];
    if (micro.is_deload) parts.push('Deload');
    if (micro.target_rpe) parts.push(`RPE ${micro.target_rpe}`);
    if (micro.volume_adjust_pct && micro.volume_adjust_pct !== '0')
        parts.push(`Volume ${micro.volume_adjust_pct}%`);
    if (micro.intensity_adjust_pct && micro.intensity_adjust_pct !== '0')
        parts.push(`Intensidade ${micro.intensity_adjust_pct}%`);
    if (micro.focus) parts.push(micro.focus);
    return parts.length > 0 ? parts.join(' · ') : 'Sem ajustes — segue o padrão';
}

/**
 * Lista de semanas da fase. Antes eram N cards de 6 campos empilhados dentro
 * de um bloco recolhível: uma fase de 6 semanas rendia 36 campos num scroll.
 */
export function WeeksListCard({
    microcycles,
    simpleMode,
    deloadWarning,
    onOpenWeek,
}: {
    microcycles: LocalMicrocycle[];
    simpleMode?: boolean;
    deloadWarning: boolean;
    onOpenWeek: (microId: string) => void;
}) {
    return (
        <>
            {deloadWarning && (
                <p className={s.inlineWarning}>
                    <FiAlertTriangle /> Nenhuma semana marcada como deload.
                    Blocos longos sem semana de descarga aumentam o risco de
                    overtraining — considere marcar uma.
                </p>
            )}

            <p className={s.cardIntro}>
                Ajustes opcionais. Uma semana sem nada preenchido roda no padrão
                da fase.
            </p>

            <NavRowGroup>
                {microcycles.map((micro) => (
                    <NavRow
                        key={micro._id}
                        title={
                            simpleMode
                                ? 'Semana de treino'
                                : `Semana ${micro.week_number}`
                        }
                        summary={weekSummary(micro)}
                        leading={
                            simpleMode ? undefined : (
                                <span className={s.weekNumberBadge}>
                                    {micro.week_number}
                                </span>
                            )
                        }
                        tone={micro.is_deload ? 'warning' : 'default'}
                        onClick={() => onOpenWeek(micro._id)}
                    />
                ))}
            </NavRowGroup>
        </>
    );
}

/** Card de UMA semana: os seis ajustes dela, numa tela. */
export function WeekCard({
    micro,
    simpleMode,
    onUpdate,
}: {
    micro: LocalMicrocycle;
    simpleMode?: boolean;
    onUpdate: (
        field: keyof Omit<LocalMicrocycle, '_id' | 'week_number'>,
        value: string | boolean,
    ) => void;
}) {
    return (
        <>
            {!simpleMode && (
                <>
                    <label className={s.deloadToggle}>
                        <input
                            type="checkbox"
                            checked={micro.is_deload}
                            onChange={(e) =>
                                onUpdate('is_deload', e.target.checked)
                            }
                        />
                        Semana de deload{' '}
                        <HelpTooltip
                            text={getGlossaryTerm('deload').short}
                            href="/ajuda#glossario-deload"
                            label="Ajuda sobre deload"
                        />
                    </label>

                    <div className={s.formGroup}>
                        <label className={s.formLabel}>Status</label>
                        {micro.id ? (
                            // Semana já existente: status é calculado a partir
                            // dos treinos registrados pelo aluno, não editável.
                            <div
                                className={s.microStatusReadonly}
                                title="Definido automaticamente pelos treinos registrados nesta semana"
                            >
                                {MICRO_STATUS_LABEL[micro.status] ??
                                    micro.status}
                            </div>
                        ) : (
                            <select
                                className={s.formSelect}
                                value={micro.status}
                                onChange={(e) =>
                                    onUpdate('status', e.target.value)
                                }
                            >
                                <option value="pending">Pendente</option>
                                <option value="in_progress">
                                    Em progresso
                                </option>
                                <option value="completed">Concluído</option>
                            </select>
                        )}
                    </div>
                </>
            )}

            <div className={s.formRow}>
                <div className={s.formGroup}>
                    <label className={s.formLabel}>
                        RPE alvo{' '}
                        <HelpTooltip
                            text="O esforço esperado nesta semana (1-10). Ex.: semana de acúmulo ~7, semana de pico ~9. O app compara com o RPE registrado pelo aluno para ajustar a carga."
                            href="/ajuda#autorregulacao-rpe-rir"
                            label="Ajuda sobre RPE alvo da semana"
                        />
                    </label>
                    <input
                        type="number"
                        min={1}
                        max={10}
                        className={s.formInput}
                        value={micro.target_rpe}
                        onChange={(e) => onUpdate('target_rpe', e.target.value)}
                        placeholder="ex: 7"
                    />
                </div>
                <div className={s.formGroup}>
                    <label className={s.formLabel}>
                        Ajuste volume %{' '}
                        <HelpTooltip
                            text="Aumenta ou reduz o volume previsto da semana em relação ao padrão — ex.: +10% num acúmulo, −40% num deload."
                            href="/ajuda#autorregulacao-rpe-rir"
                            label="Ajuda sobre ajuste de volume"
                        />
                    </label>
                    <input
                        type="number"
                        min={-100}
                        max={100}
                        className={s.formInput}
                        value={micro.volume_adjust_pct}
                        onChange={(e) =>
                            onUpdate('volume_adjust_pct', e.target.value)
                        }
                    />
                </div>
                <div className={s.formGroup}>
                    <label className={s.formLabel}>
                        Ajuste intensidade %{' '}
                        <HelpTooltip
                            text="Mesma ideia do ajuste de volume, mas para a carga/intensidade da semana."
                            href="/ajuda#autorregulacao-rpe-rir"
                            label="Ajuda sobre ajuste de intensidade"
                        />
                    </label>
                    <input
                        type="number"
                        min={-100}
                        max={100}
                        className={s.formInput}
                        value={micro.intensity_adjust_pct}
                        onChange={(e) =>
                            onUpdate('intensity_adjust_pct', e.target.value)
                        }
                    />
                </div>
            </div>

            <div className={s.formGroup}>
                <label className={s.formLabel}>Foco da semana</label>
                <input
                    type="text"
                    className={s.formInput}
                    value={micro.focus}
                    onChange={(e) => onUpdate('focus', e.target.value)}
                    placeholder="Ex: Acúmulo técnico de quadríceps"
                />
            </div>

            <div className={s.formGroup} style={{ marginBottom: 0 }}>
                <label className={s.formLabel}>Notas</label>
                <textarea
                    rows={3}
                    className={s.formInput}
                    style={{ resize: 'vertical' }}
                    value={micro.notes}
                    onChange={(e) => onUpdate('notes', e.target.value)}
                    placeholder="Estratégia desta semana (autorregulação, técnica, deload, etc.)"
                />
            </div>
        </>
    );
}
