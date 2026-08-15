'use client';

import type { LocalMicrocycle } from '../lib/mesocycleTransforms';
import HelpTooltip from '@/components/atoms/HelpTooltip';
import { getGlossaryTerm } from '@/libs/glossaryContent';
import s from '../builder.module.css';

const MICRO_STATUS_LABEL: Record<string, string> = {
    pending: 'Pendente',
    in_progress: 'Em progresso',
    completed: 'Concluído',
};

interface Props {
    microcycles: LocalMicrocycle[];
    onUpdate: (
        microId: string,
        field: keyof Omit<LocalMicrocycle, '_id' | 'week_number'>,
        value: string | boolean,
    ) => void;
    /** No modo simples esconde status/deload (não fazem sentido numa semana que se repete). */
    simpleMode?: boolean;
}

export default function MicrocycleEditor({ microcycles, onUpdate, simpleMode }: Props) {
    return (
        <div>
            {microcycles.map((micro) => (
                <div key={micro._id} className={s.microCard}>
                    <div className={s.microCardHeader}>
                        <strong>
                            {simpleMode
                                ? 'Semana de treino'
                                : `Semana ${micro.week_number}`}
                        </strong>
                        {!simpleMode && (
                            <label className={s.deloadToggle}>
                                <input
                                    type="checkbox"
                                    checked={micro.is_deload}
                                    onChange={(e) =>
                                        onUpdate(
                                            micro._id,
                                            'is_deload',
                                            e.target.checked,
                                        )
                                    }
                                />
                                Deload{' '}
                                <HelpTooltip
                                    text={getGlossaryTerm('deload').short}
                                    href="/ajuda#glossario-deload"
                                    label="Ajuda sobre deload"
                                />
                            </label>
                        )}
                    </div>

                    {!simpleMode && (
                        <div className={s.formGroup}>
                            <label className={s.formLabel}>Status</label>
                            {micro.id ? (
                                // Semana já existente: status é calculado
                                // automaticamente a partir dos treinos
                                // registrados pelo aluno, não editável aqui.
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
                                        onUpdate(
                                            micro._id,
                                            'status',
                                            e.target.value,
                                        )
                                    }
                                >
                                    <option value="pending">Pendente</option>
                                    <option value="in_progress">
                                        Em progresso
                                    </option>
                                    <option value="completed">
                                        Concluído
                                    </option>
                                </select>
                            )}
                        </div>
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
                                onChange={(e) =>
                                    onUpdate(
                                        micro._id,
                                        'target_rpe',
                                        e.target.value,
                                    )
                                }
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
                                    onUpdate(
                                        micro._id,
                                        'volume_adjust_pct',
                                        e.target.value,
                                    )
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
                                    onUpdate(
                                        micro._id,
                                        'intensity_adjust_pct',
                                        e.target.value,
                                    )
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
                            onChange={(e) =>
                                onUpdate(micro._id, 'focus', e.target.value)
                            }
                            placeholder="Ex: Acúmulo técnico de quadríceps"
                        />
                    </div>
                    <div className={s.formGroup} style={{ marginBottom: 0 }}>
                        <label className={s.formLabel}>Notas</label>
                        <textarea
                            rows={2}
                            className={s.formInput}
                            style={{ resize: 'vertical' }}
                            value={micro.notes}
                            onChange={(e) =>
                                onUpdate(micro._id, 'notes', e.target.value)
                            }
                            placeholder="Estratégia desta semana (autorregulação, técnica, deload, etc.)"
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
