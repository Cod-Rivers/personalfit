'use client';

import type { LocalMicrocycle } from '../_lib/mesocycleTransforms';

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
        <div
            style={{
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: 16,
                marginBottom: 18,
            }}
        >
            <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: 600 }}>
                {simpleMode
                    ? 'Ajustes desta semana (opcional)'
                    : 'Microciclos (ajuste livre por semana)'}
            </p>
            <p
                style={{
                    margin: '0 0 10px 0',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                }}
            >
                {simpleMode
                    ? 'Opcional: RPE alvo, ajustes de volume/intensidade e notas para esta semana de treino.'
                    : 'Você pode definir foco, RPE alvo, ajustes de volume/intensidade e deload para cada semana.'}
            </p>

            {microcycles.map((micro) => (
                <div
                    key={micro._id}
                    style={{
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 8,
                        padding: 10,
                        marginBottom: 8,
                        background: 'var(--surface-2, rgba(255,255,255,0.04))',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 8,
                        }}
                    >
                        <strong style={{ fontSize: '0.82rem' }}>
                            {simpleMode
                                ? 'Semana de treino'
                                : `Semana ${micro.week_number}`}
                        </strong>
                        {!simpleMode && (
                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    margin: 0,
                                    fontSize: '0.75rem',
                                    color: 'var(--text-muted)',
                                }}
                            >
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
                                Deload
                            </label>
                        )}
                    </div>

                    <div className="row g-2">
                        {!simpleMode && (
                            <div className="col-md-3">
                                <label className="form-label small mb-1">
                                    Status
                                </label>
                                <select
                                    className="form-control form-control-sm"
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
                                    <option value="completed">Concluído</option>
                                </select>
                            </div>
                        )}
                        <div className="col-md-3">
                            <label className="form-label small mb-1">
                                RPE alvo
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={10}
                                className="form-control form-control-sm"
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
                        <div className="col-md-3">
                            <label className="form-label small mb-1">
                                Ajuste volume %
                            </label>
                            <input
                                type="number"
                                min={-100}
                                max={100}
                                className="form-control form-control-sm"
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
                        <div className="col-md-3">
                            <label className="form-label small mb-1">
                                Ajuste intensidade %
                            </label>
                            <input
                                type="number"
                                min={-100}
                                max={100}
                                className="form-control form-control-sm"
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
                        <div className="col-md-12">
                            <label className="form-label small mb-1">
                                Foco da semana
                            </label>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                value={micro.focus}
                                onChange={(e) =>
                                    onUpdate(
                                        micro._id,
                                        'focus',
                                        e.target.value,
                                    )
                                }
                                placeholder="Ex: Acúmulo técnico de quadríceps"
                            />
                        </div>
                        <div className="col-md-12">
                            <label className="form-label small mb-1">
                                Notas
                            </label>
                            <textarea
                                rows={2}
                                className="form-control form-control-sm"
                                value={micro.notes}
                                onChange={(e) =>
                                    onUpdate(
                                        micro._id,
                                        'notes',
                                        e.target.value,
                                    )
                                }
                                placeholder="Estratégia desta semana (autorregulação, técnica, deload, etc.)"
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
