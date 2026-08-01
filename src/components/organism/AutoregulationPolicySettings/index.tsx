'use client';
import React, { useEffect, useMemo, useState } from 'react';
import {
    AUTOREGULATION_POLICY_RANGES,
    AutoregulationPolicy,
    PartialAutoregulationPolicy,
    clampAutoregulationPolicyField,
    resolveAutoregulationPolicy,
} from '@/libs/autoregulationPolicy';
import {
    getMyAutoregulationPolicy,
    updateMyAutoregulationPolicy,
} from '@/libs/autoregulationPolicyService';
import { computeAutoregulationDecision } from '@/libs/microcycleAutoregulation';
import styles from './AutoregulationPolicySettings.module.css';

type Key = keyof AutoregulationPolicy;

const BASIC_FIELDS: Key[] = [
    'progressUpBigPct',
    'progressUpSmallPct',
    'progressDownPct',
    'maxDeviationFromPrescribedPct',
    'abovePrescribedTolerancePct',
];

/** Progressão temporal (ver /ajuda#progressao-carga para as fontes
 * científicas completas): regra "2-for-2" (ACSM/NSCA) e teto de progressão
 * por semana. */
const TEMPORAL_FIELDS: Key[] = [
    'minConsecutiveSessionsBeforeIncrease',
    'weeklyProgressionCapPct',
];

const ADVANCED_FIELDS: Key[] = [
    'superBalanceThreshold',
    'fatigueBalanceThreshold',
    'superVolumePct',
    'superIntensityPct',
    'superIntraSessionPct',
    'fatigueVolumePct',
    'fatigueIntensityPct',
    'fatigueIntraSessionPct',
    'deloadConsecutiveDays',
    'deloadRpeTrigger',
];

function FieldRow({
    fieldKey,
    value,
    onChange,
    onReset,
}: {
    fieldKey: Key;
    value: number | undefined;
    onChange: (v: number | undefined) => void;
    onReset: () => void;
}) {
    const range = AUTOREGULATION_POLICY_RANGES[fieldKey];
    const [text, setText] = useState(value != null ? String(value) : '');

    useEffect(() => {
        setText(value != null ? String(value) : '');
    }, [value]);

    const commit = () => {
        if (text.trim() === '') {
            onChange(undefined);
            return;
        }
        const parsed = parseFloat(text);
        if (Number.isNaN(parsed)) {
            setText(value != null ? String(value) : '');
            return;
        }
        onChange(clampAutoregulationPolicyField(fieldKey, parsed));
    };

    return (
        <div className={styles.fieldRow}>
            <label className={styles.fieldLabel}>
                {range.label}
                <span className={styles.fieldRange}>
                    ({range.min} a {range.max})
                </span>
            </label>
            <div className={styles.fieldInputWrapper}>
                <input
                    type="number"
                    className={styles.fieldInput}
                    value={text}
                    placeholder="padrão Venafit"
                    onChange={(e) => setText(e.target.value)}
                    onBlur={commit}
                />
                {value != null && (
                    <button
                        type="button"
                        className={styles.resetBtn}
                        onClick={onReset}
                        title="Voltar ao padrão Venafit"
                    >
                        Restaurar padrão
                    </button>
                )}
            </div>
        </div>
    );
}

export default function AutoregulationPolicySettings() {
    const [overrides, setOverrides] = useState<PartialAutoregulationPolicy>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        getMyAutoregulationPolicy()
            .then((policy) => setOverrides(policy ?? {}))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const setField = (key: Key, value: number | undefined) => {
        setOverrides((prev) => {
            const next = { ...prev };
            if (value == null) {
                delete next[key];
            } else {
                next[key] = value;
            }
            return next;
        });
    };

    const { policy, sources } = useMemo(
        () => resolveAutoregulationPolicy({ personal: overrides }),
        [overrides],
    );

    const preview = useMemo(() => {
        const decision = computeAutoregulationDecision({
            readinessScore: 6,
            sleepHours: 7,
            stressScore: 4,
            sorenessScore: 4,
            previousRPE: 6,
            targetRPE: 8,
            policy,
        });
        return decision;
    }, [policy]);

    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSuccess(false);
        try {
            const saved = await updateMyAutoregulationPolicy(overrides);
            setOverrides(saved ?? {});
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })
                ?.response?.data?.error;
            setError(msg || 'Erro ao salvar. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p className={styles.loading}>Carregando...</p>;

    return (
        <div className={styles.wrapper}>
            <section className={styles.section}>
                <h3 className={styles.sectionTitle}>
                    Controle do Microciclo (Autorregulação)
                </h3>
                <p className={styles.sectionDesc}>
                    Defina os limiares de progressão de carga que o app usa
                    para sugerir peso aos seus alunos com base no histórico e
                    na prontidão de cada dia. Deixe um campo em branco para
                    usar o padrão Venafit — ele continua valendo mesmo que o
                    padrão mude no futuro. Estes valores valem para todos os
                    seus alunos.
                </p>
                {BASIC_FIELDS.map((key) => (
                    <FieldRow
                        key={key}
                        fieldKey={key}
                        value={overrides[key]}
                        onChange={(v) => setField(key, v)}
                        onReset={() => setField(key, undefined)}
                    />
                ))}
            </section>

            <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Progressão temporal</h3>
                <p className={styles.sectionDesc}>
                    Controla a velocidade da progressão ao longo do tempo,
                    não só a reação de cada sessão — baseado na regra
                    &quot;2-for-2&quot; do ACSM/NSCA e num teto de
                    progressão por semana.{' '}
                    <a
                        href="/ajuda#progressao-carga"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Ver fontes científicas
                    </a>
                    .
                </p>
                {TEMPORAL_FIELDS.map((key) => (
                    <FieldRow
                        key={key}
                        fieldKey={key}
                        value={overrides[key]}
                        onChange={(v) => setField(key, v)}
                        onReset={() => setField(key, undefined)}
                    />
                ))}
            </section>

            <section className={styles.section}>
                <button
                    type="button"
                    className={styles.advancedToggle}
                    onClick={() => setShowAdvanced((v) => !v)}
                >
                    {showAdvanced ? '▾' : '▸'} Avançado: zonas e gatilho de
                    deload
                </button>
                {showAdvanced && (
                    <div className={styles.advancedBody}>
                        <p className={styles.sectionDesc}>
                            Controla quando o app classifica o dia como
                            supercompensação, manutenção ou fadiga, e quando
                            sugere uma semana de deload.
                        </p>
                        {ADVANCED_FIELDS.map((key) => (
                            <FieldRow
                                key={key}
                                fieldKey={key}
                                value={overrides[key]}
                                onChange={(v) => setField(key, v)}
                                onReset={() => setField(key, undefined)}
                            />
                        ))}
                    </div>
                )}
            </section>

            <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Prévia</h3>
                <p className={styles.sectionDesc}>
                    Exemplo com um aluno em condição neutra (prontidão 6,
                    sono 7h, RPE anterior 6, alvo do microciclo RPE 8):
                </p>
                <div className={styles.preview}>
                    <span className={styles.previewZone} data-zone={preview.zone}>
                        {preview.zone === 'supercompensacao'
                            ? 'Supercompensação'
                            : preview.zone === 'fadiga'
                              ? 'Fadiga'
                              : 'Manutenção'}
                    </span>
                    <span className={styles.previewDetail}>
                        ajuste intrassessão de carga:{' '}
                        {preview.intraSessionLoadAdjustPct >= 0 ? '+' : ''}
                        {preview.intraSessionLoadAdjustPct}%
                    </span>
                </div>
            </section>

            {error && <p className={styles.error}>{error}</p>}
            {success && (
                <p className={styles.successMsg}>
                    ✓ Parâmetros de autorregulação salvos com sucesso!
                </p>
            )}
            <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={saving}
            >
                {saving ? 'Salvando...' : 'Salvar autorregulação'}
            </button>
            <p className={styles.sourcesHint}>
                {Object.values(sources).some((s) => s === 'personal')
                    ? 'Campos com valor preenchido acima usam sua configuração; os demais seguem o padrão Venafit.'
                    : 'Nenhum campo customizado ainda — todos os valores usam o padrão Venafit.'}
            </p>
        </div>
    );
}
