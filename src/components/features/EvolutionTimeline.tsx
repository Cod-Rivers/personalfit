'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { FiX, FiBarChart2, FiTrendingUp, FiChevronRight } from 'react-icons/fi';
import {
    listEvolutionEntries,
    createEvolutionEntry,
    updateEvolutionEntry,
    uploadEvolutionPhotos,
    deleteEvolutionEntry,
    type EvolutionEntry,
    type BodyFatMethod,
} from '@/libs/evolutionService';
import Modal from '@/components/system/Modal';
import { isOverdueBlockError } from '@/libs/overdueBlock';
import { usePersonalProPlan } from '@/hooks/usePersonalProPlan';
import Link from 'next/link';
import OverdueBlockNotice from './OverdueBlockNotice';
import s from './EvolutionTimeline.module.css';

const EvolutionChart = dynamic(
    () => import('./EvolutionChart'),
    { ssr: false },
);

const EvolutionCompareChart = dynamic(
    () => import('./EvolutionCompareChart'),
    { ssr: false },
);

interface Props {
    /** Presente = view do personal para um aluno específico; ausente = view do próprio aluno logado. */
    studentId?: string;
}

type MeasurementGroup = 'circ' | 'neuro' | 'cardio';

interface MeasurementField {
    key: string;
    name: string;
    unit: string;
    group: MeasurementGroup;
}

// Cada medida carrega a própria unidade — antes o detalhe mostrava tudo em
// "cm" (1RM em kg e FC em bpm apareciam como centímetros).
const MEASUREMENT_FIELDS: MeasurementField[] = [
    { key: 'cintura', name: 'Cintura', unit: 'cm', group: 'circ' },
    { key: 'quadril', name: 'Quadril', unit: 'cm', group: 'circ' },
    { key: 'peito', name: 'Peito', unit: 'cm', group: 'circ' },
    { key: 'braco_direito', name: 'Braço direito', unit: 'cm', group: 'circ' },
    { key: 'braco_esquerdo', name: 'Braço esquerdo', unit: 'cm', group: 'circ' },
    { key: 'coxa_direita', name: 'Coxa direita', unit: 'cm', group: 'circ' },
    { key: 'coxa_esquerda', name: 'Coxa esquerda', unit: 'cm', group: 'circ' },
    { key: 'panturrilha', name: 'Panturrilha', unit: 'cm', group: 'circ' },
    { key: 'abdomen', name: 'Abdômen', unit: 'cm', group: 'circ' },
    { key: 'rm_supino', name: '1RM supino', unit: 'kg', group: 'neuro' },
    { key: 'rm_agachamento', name: '1RM agachamento', unit: 'kg', group: 'neuro' },
    { key: 'rm_terra', name: '1RM terra', unit: 'kg', group: 'neuro' },
    { key: 'wells', name: 'Flexibilidade (Wells)', unit: 'cm', group: 'neuro' },
    { key: 'salto_vertical', name: 'Salto vertical', unit: 'cm', group: 'neuro' },
    { key: 'abdominais_1min', name: 'Abdominais em 1 min', unit: 'rep.', group: 'neuro' },
    // Alimentam o cálculo de zonas de FC (TrainingZonesCalculator).
    { key: 'fc_repouso', name: 'FC de repouso', unit: 'bpm', group: 'cardio' },
    { key: 'fc_maxima', name: 'FC máxima', unit: 'bpm', group: 'cardio' },
    { key: 'vo2max', name: 'VO₂máx', unit: 'ml/kg/min', group: 'cardio' },
];

const MEASUREMENT_GROUPS: { id: MeasurementGroup; title: string }[] = [
    { id: 'circ', title: 'Circunferências' },
    { id: 'neuro', title: 'Força, flexibilidade e potência' },
    { id: 'cardio', title: 'Cardio' },
];

const fieldLabel = (f: MeasurementField) => `${f.name} (${f.unit})`;

/** "82 cm", "100 kg", "60 bpm" — chave fora da lista vira o nome cru, sem unidade. */
function formatMeasurement(key: string, value: number) {
    const f = MEASUREMENT_FIELDS.find((m) => m.key === key);
    return f
        ? { name: f.name, value: `${value} ${f.unit}` }
        : { name: key.replace(/_/g, ' '), value: String(value) };
}

function extractErrorMessage(err: unknown, fallback: string): string {
    const data = (
        err as { response?: { data?: { error?: string; message?: string } } }
    )?.response?.data;
    return data?.error || data?.message || fallback;
}

/** Data LOCAL de hoje — toISOString() é UTC e, a partir das 21h no Brasil, já devolvia o dia seguinte. */
function todayISO() {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function errorCode(err: unknown): string | undefined {
    return (err as { response?: { data?: { code?: string } } })?.response
        ?.data?.code;
}

function formatDate(iso: string) {
    return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR');
}

export default function EvolutionTimeline({ studentId }: Props) {
    const [entries, setEntries] = useState<EvolutionEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [overdueBlocked, setOverdueBlocked] = useState(false);
    // Modelo híbrido: medidas/gráficos livres; ENVIAR foto pelo personal
    // exige Pro. O aluno sempre envia. O backend é quem garante — isto só
    // evita o personal free montar o formulário e levar o 403 no fim. Sem a
    // resposta do plano (null), deixa liberado: o backend recusa se for o caso.
    const personalIsPro = usePersonalProPlan(!!studentId);
    const [photosRefused, setPhotosRefused] = useState(false);
    const photosAllowed = !photosRefused && personalIsPro !== false;
    const isStudentView = !studentId;
    // Avaliação lançada pelo personal: o aluno vê, mas só o personal altera.
    const canChange = (entry: EvolutionEntry) =>
        !isStudentView || entry.created_by_role !== 'personal';
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selectedEntry, setSelectedEntry] = useState<EvolutionEntry | null>(
        null,
    );

    const [showForm, setShowForm] = useState(false);
    const [editingEntry, setEditingEntry] = useState<EvolutionEntry | null>(
        null,
    );
    const [date, setDate] = useState(todayISO());
    const [weightKg, setWeightKg] = useState('');
    const [bodyFatPercent, setBodyFatPercent] = useState('');
    const [bodyFatMethod, setBodyFatMethod] =
        useState<BodyFatMethod | ''>('');
    const [measurements, setMeasurements] = useState<Record<string, string>>(
        {},
    );
    const [notes, setNotes] = useState('');
    const [photos, setPhotos] = useState<File[]>([]);
    const [saving, setSaving] = useState(false);

    // Comparação entre duas avaliações (antes × depois) — qualquer par, com
    // ou sem foto, comparando todos os valores registrados.
    const [compareMode, setCompareMode] = useState(false);
    const [compareAId, setCompareAId] = useState('');
    const [compareBId, setCompareBId] = useState('');

    // Medida extra (além de peso/%gordura) plotada no gráfico de linha.
    const [extraMeasurementKey, setExtraMeasurementKey] = useState('');

    // Todas as entradas, ordenadas por data crescente (antigas → recentes).
    const sortedEntries = useMemo(
        () => entries.slice().sort((a, b) => a.date.localeCompare(b.date)),
        [entries],
    );

    // Medidas presentes em ao menos uma entrada — disponíveis para plotar no
    // gráfico de linha além de peso/%gordura.
    const availableMeasurementFields = useMemo(() => {
        const keys = new Set<string>();
        entries.forEach((e) => {
            if (e.measurements) {
                Object.keys(e.measurements).forEach((k) => keys.add(k));
            }
        });
        return MEASUREMENT_FIELDS.filter((f) => keys.has(f.key));
    }, [entries]);

    const entryA = sortedEntries.find((e) => e.id === compareAId);
    const entryB = sortedEntries.find((e) => e.id === compareBId);

    // União das medidas presentes em A e/ou B, na ordem canônica de MEASUREMENT_FIELDS.
    const compareMeasurementFields = useMemo(() => {
        const keys = new Set<string>();
        if (entryA?.measurements) Object.keys(entryA.measurements).forEach((k) => keys.add(k));
        if (entryB?.measurements) Object.keys(entryB.measurements).forEach((k) => keys.add(k));
        return MEASUREMENT_FIELDS.filter((f) => keys.has(f.key));
    }, [entryA, entryB]);

    // Linhas "Antes × Depois" para o gráfico de barras do comparador.
    const compareMeasurementRows = useMemo(
        () =>
            compareMeasurementFields.map((f) => ({
                label: fieldLabel(f),
                antes: entryA?.measurements?.[f.key],
                depois: entryB?.measurements?.[f.key],
            })),
        [compareMeasurementFields, entryA, entryB],
    );

    const toggleCompare = () => {
        if (!compareMode) {
            // Padrão: A = avaliação mais antiga, B = mais recente.
            const first = sortedEntries[0];
            const last = sortedEntries[sortedEntries.length - 1];
            setCompareAId(first?.id ?? '');
            setCompareBId(last?.id ?? '');
        }
        setCompareMode((v) => !v);
    };

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        setOverdueBlocked(false);
        try {
            const data = await listEvolutionEntries(studentId);
            setEntries(data);
        } catch (err) {
            if (isOverdueBlockError(err)) {
                setOverdueBlocked(true);
            } else {
                setError(extractErrorMessage(err, 'Erro ao carregar evolução.'));
            }
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    useEffect(() => {
        load();
    }, [load]);

    const resetForm = () => {
        setEditingEntry(null);
        setDate(todayISO());
        setWeightKg('');
        setBodyFatPercent('');
        setBodyFatMethod('');
        setMeasurements({});
        setNotes('');
        setPhotos([]);
    };

    // "Editar" reabre o formulário pré-preenchido e salva via PATCH: fotos
    // novas são SOMADAS às existentes (a API só expõe URLs assinadas, não as
    // photo_keys originais), por isso o aviso no formulário.
    const startEdit = (entry: EvolutionEntry) => {
        setEditingEntry(entry);
        setDate(entry.date);
        setWeightKg(entry.weight_kg != null ? String(entry.weight_kg) : '');
        setBodyFatPercent(
            entry.body_fat_percent != null
                ? String(entry.body_fat_percent)
                : '',
        );
        setBodyFatMethod(entry.body_fat_method ?? '');
        setMeasurements(
            Object.fromEntries(
                Object.entries(entry.measurements ?? {}).map(([k, v]) => [
                    k,
                    String(v),
                ]),
            ),
        );
        setNotes(entry.notes ?? '');
        setPhotos([]);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const measurementEntries = Object.entries(measurements)
            .filter(([, v]) => v.trim() !== '')
            .map(([k, v]) => [k, Number(v)] as const);
        const hasMeasurements = measurementEntries.length > 0;

        const hasExistingPhotos =
            !!editingEntry?.photo_urls && editingEntry.photo_urls.length > 0;
        if (
            photos.length === 0 &&
            !weightKg &&
            !bodyFatPercent &&
            !hasMeasurements &&
            !hasExistingPhotos
        ) {
            setError(
                'Adicione ao menos uma foto, peso, %gordura ou uma medida.',
            );
            return;
        }

        setSaving(true);
        try {
            const photoKeys = await uploadEvolutionPhotos(photos, studentId);

            const payload = {
                date,
                photo_keys: photoKeys,
                weight_kg: weightKg ? Number(weightKg) : undefined,
                body_fat_percent: bodyFatPercent
                    ? Number(bodyFatPercent)
                    : undefined,
                body_fat_method: bodyFatMethod || undefined,
                measurements: hasMeasurements
                    ? Object.fromEntries(measurementEntries)
                    : undefined,
                notes,
            };

            if (editingEntry) {
                // Fotos novas em photo_keys são somadas às já salvas no
                // backend — as fotos existentes nunca são perdidas aqui.
                await updateEvolutionEntry(editingEntry.id, payload, studentId);
            } else {
                await createEvolutionEntry(payload, studentId);
            }

            resetForm();
            setShowForm(false);
            await load();
        } catch (err) {
            if (errorCode(err) === 'evolution_photos_require_pro') {
                setPhotosRefused(true);
                setPhotos([]);
                setError(
                    'Enviar fotos requer o plano Pro. As fotos foram removidas — salve de novo para registrar só as medidas.',
                );
            } else {
                setError(extractErrorMessage(err, 'Erro ao salvar entrada.'));
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir este registro de evolução?')) return;
        setDeletingId(id);
        try {
            await deleteEvolutionEntry(id, studentId);
            setEntries((prev) => prev.filter((e) => e.id !== id));
            setSelectedEntry((prev) => (prev?.id === id ? null : prev));
        } catch (err) {
            setError(extractErrorMessage(err, 'Erro ao excluir registro.'));
        } finally {
            setDeletingId(null);
        }
    };

    if (overdueBlocked) {
        return <OverdueBlockNotice what="à sua evolução" />;
    }

    if (loading) {
        return <p className={s.loading}>Carregando evolução...</p>;
    }

    return (
        <div className={s.section}>
            {error && <div className={s.errorMsg}>{error}</div>}

            <div className={s.toolbar}>
                <button
                    type="button"
                    className={s.btnAdd}
                    onClick={() => setShowForm((v) => !v)}
                >
                    {showForm ? 'Cancelar' : '+ Nova avaliação'}
                </button>
                {sortedEntries.length >= 2 && (
                    <button
                        type="button"
                        className={compareMode ? s.btnCompareActive : s.btnCompare}
                        onClick={toggleCompare}
                    >
                        {compareMode ? (
                            <>
                                <FiX /> Fechar comparação
                            </>
                        ) : (
                            <>
                                <FiBarChart2 /> Comparar avaliações
                            </>
                        )}
                    </button>
                )}
            </div>

            {sortedEntries.length >= 2 && (
                <div className={s.card}>
                    <div className={s.chartHeader}>
                        <h3 className={s.chartTitle}><FiTrendingUp /> Evolução ao longo do tempo</h3>
                        {availableMeasurementFields.length > 0 && (
                            <select
                                className={s.chartSelect}
                                value={extraMeasurementKey}
                                onChange={(e) =>
                                    setExtraMeasurementKey(e.target.value)
                                }
                            >
                                <option value="">Também exibir…</option>
                                {availableMeasurementFields.map((f) => (
                                    <option key={f.key} value={f.key}>
                                        {fieldLabel(f)}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                    <EvolutionChart
                        entries={sortedEntries}
                        extraMeasurementKey={extraMeasurementKey || undefined}
                        extraMeasurementLabel={(() => {
                            const f = availableMeasurementFields.find(
                                (m) => m.key === extraMeasurementKey,
                            );
                            return f ? fieldLabel(f) : undefined;
                        })()}
                    />
                </div>
            )}

            {compareMode && sortedEntries.length >= 2 && (
                <div className={s.card}>
                    <div className={s.compareSelects}>
                        <div className={s.formGroup}>
                            <label className={s.formLabel}>Antes</label>
                            <select
                                className={s.formSelect}
                                value={compareAId}
                                onChange={(e) => setCompareAId(e.target.value)}
                            >
                                {sortedEntries.map((e) => (
                                    <option key={e.id} value={e.id}>
                                        {formatDate(e.date)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className={s.formGroup}>
                            <label className={s.formLabel}>Depois</label>
                            <select
                                className={s.formSelect}
                                value={compareBId}
                                onChange={(e) => setCompareBId(e.target.value)}
                            >
                                {sortedEntries.map((e) => (
                                    <option key={e.id} value={e.id}>
                                        {formatDate(e.date)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {(entryA?.photo_urls?.length || entryB?.photo_urls?.length) ? (
                        <div className={s.compareGrid}>
                            {[entryA, entryB].map((entry, col) => (
                                <div key={col} className={s.compareCol}>
                                    <div className={s.compareColHeader}>
                                        <strong>{col === 0 ? 'Antes' : 'Depois'}</strong>
                                        {entry && (
                                            <span>{formatDate(entry.date)}</span>
                                        )}
                                    </div>
                                    {entry?.photo_urls?.map((url, i) => (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            key={i}
                                            src={url}
                                            alt={`Comparação ${col === 0 ? 'antes' : 'depois'} ${i + 1}`}
                                            className={s.comparePhoto}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    ) : null}

                    <EvolutionCompareChart
                        weightAntes={entryA?.weight_kg}
                        weightDepois={entryB?.weight_kg}
                        bodyFatAntes={entryA?.body_fat_percent}
                        bodyFatDepois={entryB?.body_fat_percent}
                        measurementRows={compareMeasurementRows}
                    />

                    <table className={s.compareTable}>
                        <thead>
                            <tr>
                                <th></th>
                                <th>{entryA ? formatDate(entryA.date) : 'Antes'}</th>
                                <th>{entryB ? formatDate(entryB.date) : 'Depois'}</th>
                                <th>Δ</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Peso</td>
                                <td>{entryA?.weight_kg != null ? `${entryA.weight_kg} kg` : '—'}</td>
                                <td>{entryB?.weight_kg != null ? `${entryB.weight_kg} kg` : '—'}</td>
                                <td>
                                    {entryA?.weight_kg != null && entryB?.weight_kg != null
                                        ? `${(entryB.weight_kg - entryA.weight_kg > 0 ? '+' : '')}${(entryB.weight_kg - entryA.weight_kg).toFixed(1)} kg`
                                        : '—'}
                                </td>
                            </tr>
                            <tr>
                                <td>% gordura</td>
                                <td>{entryA?.body_fat_percent != null ? `${entryA.body_fat_percent}%` : '—'}</td>
                                <td>{entryB?.body_fat_percent != null ? `${entryB.body_fat_percent}%` : '—'}</td>
                                <td>
                                    {entryA?.body_fat_percent != null && entryB?.body_fat_percent != null
                                        ? `${(entryB.body_fat_percent - entryA.body_fat_percent > 0 ? '+' : '')}${(entryB.body_fat_percent - entryA.body_fat_percent).toFixed(1)}%`
                                        : '—'}
                                </td>
                            </tr>
                            {compareMeasurementFields.map((f) => {
                                const a = entryA?.measurements?.[f.key];
                                const b = entryB?.measurements?.[f.key];
                                return (
                                    <tr key={f.key}>
                                        <td>{fieldLabel(f)}</td>
                                        <td>{a != null ? a : '—'}</td>
                                        <td>{b != null ? b : '—'}</td>
                                        <td>
                                            {a != null && b != null
                                                ? `${(b - a > 0 ? '+' : '')}${(b - a).toFixed(1)}`
                                                : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {showForm && (
                <form className={s.card} onSubmit={handleSubmit}>
                    {editingEntry && (
                        <p className={s.editNotice}>
                            Editando avaliação de {formatDate(editingEntry.date)}.
                            Peso, %gordura, medidas e observações serão
                            substituídos pelos novos valores; fotos enviadas
                            abaixo são adicionadas às já salvas (nenhuma foto
                            existente é removida por aqui).
                        </p>
                    )}
                    {editingEntry?.photo_urls &&
                        editingEntry.photo_urls.length > 0 && (
                            <div className={s.formGroup}>
                                <label className={s.formLabel}>
                                    Fotos já salvas (mantidas)
                                </label>
                                <div className={s.photoGrid}>
                                    {editingEntry.photo_urls.map((url, i) => (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            key={i}
                                            src={url}
                                            alt={`Foto já salva ${i + 1}`}
                                            className={s.photoThumb}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    <div className={s.formRow}>
                        <div className={s.formGroup}>
                            <label className={s.formLabel}>Data</label>
                            <input
                                type="date"
                                className={s.formInput}
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className={s.formGroup}>
                            <label className={s.formLabel}>Peso (kg)</label>
                            <input
                                type="number"
                                step="0.1"
                                className={s.formInput}
                                value={weightKg}
                                onChange={(e) => setWeightKg(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className={s.formRow}>
                        <div className={s.formGroup}>
                            <label className={s.formLabel}>% de gordura</label>
                            <input
                                type="number"
                                step="0.1"
                                className={s.formInput}
                                value={bodyFatPercent}
                                onChange={(e) =>
                                    setBodyFatPercent(e.target.value)
                                }
                            />
                        </div>
                        <div className={s.formGroup}>
                            <label className={s.formLabel}>Método</label>
                            <select
                                className={s.formSelect}
                                value={bodyFatMethod}
                                onChange={(e) =>
                                    setBodyFatMethod(
                                        e.target.value as BodyFatMethod | '',
                                    )
                                }
                            >
                                <option value="">—</option>
                                <option value="caliper">Adipômetro</option>
                                <option value="bioimpedance">
                                    Bioimpedância
                                </option>
                            </select>
                        </div>
                    </div>

                    {MEASUREMENT_GROUPS.map((g) => (
                        <div key={g.id}>
                            <label className={s.formLabel}>{g.title}</label>
                            <div className={s.measurementsInputGrid}>
                                {MEASUREMENT_FIELDS.filter(
                                    (f) => f.group === g.id,
                                ).map((f) => (
                                    <input
                                        key={f.key}
                                        type="number"
                                        step="0.1"
                                        placeholder={fieldLabel(f)}
                                        aria-label={fieldLabel(f)}
                                        className={s.formInput}
                                        value={measurements[f.key] ?? ''}
                                        onChange={(e) =>
                                            setMeasurements((prev) => ({
                                                ...prev,
                                                [f.key]: e.target.value,
                                            }))
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className={s.formGroup}>
                        <label className={s.formLabel}>
                            {editingEntry ? 'Adicionar fotos' : 'Fotos'}
                        </label>
                        {photosAllowed ? (
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                onChange={(e) =>
                                    setPhotos(Array.from(e.target.files ?? []))
                                }
                            />
                        ) : (
                            <p className={s.photoLocked}>
                                Enviar fotos é um recurso do{' '}
                                <Link href="/pagamento?produto=pro">
                                    plano Pro
                                </Link>
                                . Peso, medidas, gráfico e comparação continuam
                                liberados — e as fotos que o próprio aluno envia
                                aparecem aqui normalmente.
                            </p>
                        )}
                    </div>

                    <div className={s.formGroup}>
                        <label className={s.formLabel}>Observações</label>
                        <textarea
                            className={s.formTextarea}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <div className={s.formActions}>
                        <button
                            type="button"
                            className={s.btnCancel}
                            onClick={() => {
                                setShowForm(false);
                                resetForm();
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className={s.btnSubmit}
                            disabled={saving}
                        >
                            {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </form>
            )}

            {entries.length === 0 ? (
                <div className={s.empty}>
                    Nenhum registro de evolução ainda.
                </div>
            ) : (
                entries.map((entry) => {
                    const summaryParts: string[] = [];
                    if (entry.weight_kg) {
                        summaryParts.push(`${entry.weight_kg} kg`);
                    }
                    if (entry.body_fat_percent) {
                        summaryParts.push(`${entry.body_fat_percent}% gordura`);
                    }
                    const measurementsCount = entry.measurements
                        ? Object.keys(entry.measurements).length
                        : 0;
                    if (measurementsCount > 0) {
                        summaryParts.push(
                            `${measurementsCount} medida${measurementsCount > 1 ? 's' : ''}`,
                        );
                    }

                    return (
                        <button
                            type="button"
                            key={entry.id}
                            className={s.entryCard}
                            onClick={() => setSelectedEntry(entry)}
                        >
                            {entry.photo_urls && entry.photo_urls[0] && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={entry.photo_urls[0]}
                                    alt=""
                                    className={s.entryCardThumb}
                                />
                            )}
                            <div className={s.entryCardInfo}>
                                <div className={s.entryHeader}>
                                    <span className={s.entryDate}>
                                        {formatDate(entry.date)}
                                    </span>
                                    <span className={s.entryMeta}>
                                        {entry.created_by_role === 'personal'
                                            ? 'Personal'
                                            : 'Aluno'}
                                    </span>
                                </div>
                                <span className={s.entryCardSummary}>
                                    {summaryParts.length > 0
                                        ? summaryParts.join(' · ')
                                        : 'Ver detalhes'}
                                </span>
                            </div>
                            <FiChevronRight className={s.entryCardChevron} />
                        </button>
                    );
                })
            )}

            <Modal
                open={!!selectedEntry}
                onClose={() => setSelectedEntry(null)}
                title={selectedEntry ? formatDate(selectedEntry.date) : ''}
                footer={
                    selectedEntry &&
                    (!canChange(selectedEntry) ? (
                        <p className={s.ownedNotice}>
                            Avaliação registrada pelo seu personal — só ele
                            pode editar ou excluir.
                        </p>
                    ) : (
                        <div className={s.modalActions}>
                            <button
                                type="button"
                                className={s.btnEdit}
                                onClick={() => {
                                    const entry = selectedEntry;
                                    setSelectedEntry(null);
                                    startEdit(entry);
                                }}
                            >
                                Editar
                            </button>
                            <button
                                type="button"
                                className={s.btnDanger}
                                disabled={deletingId === selectedEntry.id}
                                onClick={() => handleDelete(selectedEntry.id)}
                            >
                                {deletingId === selectedEntry.id
                                    ? 'Excluindo...'
                                    : 'Excluir'}
                            </button>
                        </div>
                    ))
                }
            >
                {selectedEntry && (
                    <>
                        <p className={s.entryMeta} style={{ marginBottom: 12 }}>
                            {selectedEntry.created_by_role === 'personal'
                                ? 'Registrado pelo personal'
                                : 'Registrado pelo aluno'}
                        </p>

                        {selectedEntry.photo_urls &&
                            selectedEntry.photo_urls.length > 0 && (
                                <div className={s.photoGrid}>
                                    {selectedEntry.photo_urls.map((url, i) => (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            key={i}
                                            src={url}
                                            alt={`Foto de evolução ${i + 1}`}
                                            className={s.photoThumb}
                                        />
                                    ))}
                                </div>
                            )}

                        {(selectedEntry.weight_kg ||
                            selectedEntry.body_fat_percent) && (
                            <div className={s.statRow}>
                                {selectedEntry.weight_kg && (
                                    <span>{selectedEntry.weight_kg} kg</span>
                                )}
                                {selectedEntry.body_fat_percent && (
                                    <span>
                                        {selectedEntry.body_fat_percent}%
                                        gordura
                                        {selectedEntry.body_fat_method
                                            ? ` (${selectedEntry.body_fat_method === 'caliper' ? 'adipômetro' : 'bioimpedância'})`
                                            : ''}
                                    </span>
                                )}
                            </div>
                        )}

                        {selectedEntry.measurements &&
                            Object.keys(selectedEntry.measurements).length >
                                0 && (
                                <div className={s.measurementsGrid}>
                                    {Object.entries(selectedEntry.measurements)
                                        .sort(([a], [b]) => {
                                            const ia = MEASUREMENT_FIELDS.findIndex((f) => f.key === a);
                                            const ib = MEASUREMENT_FIELDS.findIndex((f) => f.key === b);
                                            return (ia < 0 ? Infinity : ia) - (ib < 0 ? Infinity : ib);
                                        })
                                        .map(([k, v]) => {
                                            const m = formatMeasurement(k, v);
                                            return (
                                                <span key={k}>
                                                    {m.name}: {m.value}
                                                </span>
                                            );
                                        })}
                                </div>
                            )}

                        {selectedEntry.notes && <p>{selectedEntry.notes}</p>}
                    </>
                )}
            </Modal>
        </div>
    );
}
