'use client';
import { useCallback, useEffect, useState } from 'react';
import {
    listEvolutionEntries,
    createEvolutionEntry,
    uploadEvolutionPhotos,
    deleteEvolutionEntry,
    type EvolutionEntry,
    type BodyFatMethod,
} from '@/libs/evolutionService';
import s from './EvolutionTimeline.module.css';

interface Props {
    /** Presente = view do personal para um aluno específico; ausente = view do próprio aluno logado. */
    studentId?: string;
}

const MEASUREMENT_FIELDS: { key: string; label: string }[] = [
    // Circunferências (morfológica)
    { key: 'cintura', label: 'Cintura (cm)' },
    { key: 'quadril', label: 'Quadril (cm)' },
    { key: 'peito', label: 'Peito (cm)' },
    { key: 'braco_direito', label: 'Braço direito (cm)' },
    { key: 'braco_esquerdo', label: 'Braço esquerdo (cm)' },
    { key: 'coxa_direita', label: 'Coxa direita (cm)' },
    { key: 'coxa_esquerda', label: 'Coxa esquerda (cm)' },
    { key: 'panturrilha', label: 'Panturrilha (cm)' },
    { key: 'abdomen', label: 'Abdômen (cm)' },
    // Neuromotores (força/flexibilidade/potência) — opcionais
    { key: 'rm_supino', label: '1RM supino (kg)' },
    { key: 'rm_agachamento', label: '1RM agachamento (kg)' },
    { key: 'rm_terra', label: '1RM terra (kg)' },
    { key: 'wells', label: 'Flexibilidade — Wells (cm)' },
    { key: 'salto_vertical', label: 'Salto vertical (cm)' },
    { key: 'abdominais_1min', label: 'Abdominais (1 min)' },
    // Cardio — opcionais (alimentam o cálculo de zonas de FC)
    { key: 'fc_repouso', label: 'FC repouso (bpm)' },
    { key: 'fc_maxima', label: 'FC máxima (bpm)' },
    { key: 'vo2max', label: 'VO₂máx (ml/kg/min)' },
];

function extractErrorMessage(err: unknown, fallback: string): string {
    const data = (
        err as { response?: { data?: { error?: string; message?: string } } }
    )?.response?.data;
    return data?.error || data?.message || fallback;
}

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string) {
    return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR');
}

export default function EvolutionTimeline({ studentId }: Props) {
    const [entries, setEntries] = useState<EvolutionEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [proBlocked, setProBlocked] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [showForm, setShowForm] = useState(false);
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

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        setProBlocked(false);
        try {
            const data = await listEvolutionEntries(studentId);
            setEntries(data);
        } catch (err) {
            const status = (err as { response?: { status?: number } })
                ?.response?.status;
            if (status === 403) {
                setProBlocked(true);
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
        setDate(todayISO());
        setWeightKg('');
        setBodyFatPercent('');
        setBodyFatMethod('');
        setMeasurements({});
        setNotes('');
        setPhotos([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const measurementEntries = Object.entries(measurements)
            .filter(([, v]) => v.trim() !== '')
            .map(([k, v]) => [k, Number(v)] as const);
        const hasMeasurements = measurementEntries.length > 0;

        if (
            photos.length === 0 &&
            !weightKg &&
            !bodyFatPercent &&
            !hasMeasurements
        ) {
            setError(
                'Adicione ao menos uma foto, peso, %gordura ou uma medida.',
            );
            return;
        }

        setSaving(true);
        try {
            const photoKeys = await uploadEvolutionPhotos(photos, studentId);

            await createEvolutionEntry(
                {
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
                },
                studentId,
            );

            resetForm();
            setShowForm(false);
            await load();
        } catch (err) {
            setError(extractErrorMessage(err, 'Erro ao salvar entrada.'));
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
        } catch {
            setError('Erro ao excluir registro.');
        } finally {
            setDeletingId(null);
        }
    };

    if (proBlocked) {
        return (
            <div className={s.proBanner}>
                <p>
                    <strong>Plano alimentar e evolução</strong> são
                    funcionalidades exclusivas do Plano Pro.
                </p>
                <p>Assine o Plano Pro para liberar o acesso.</p>
            </div>
        );
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
            </div>

            {showForm && (
                <form className={s.card} onSubmit={handleSubmit}>
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

                    <label className={s.formLabel}>Medidas (cm)</label>
                    <div className={s.measurementsInputGrid}>
                        {MEASUREMENT_FIELDS.map((f) => (
                            <input
                                key={f.key}
                                type="number"
                                step="0.1"
                                placeholder={f.label}
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

                    <div className={s.formGroup}>
                        <label className={s.formLabel}>Fotos</label>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            onChange={(e) =>
                                setPhotos(Array.from(e.target.files ?? []))
                            }
                        />
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
                entries.map((entry) => (
                    <div key={entry.id} className={s.card}>
                        <div className={s.entryHeader}>
                            <span className={s.entryDate}>
                                {formatDate(entry.date)}
                            </span>
                            <span className={s.entryMeta}>
                                {entry.created_by_role === 'personal'
                                    ? 'Personal'
                                    : 'Aluno'}
                                <button
                                    type="button"
                                    className={s.btnDanger}
                                    style={{ marginLeft: 10 }}
                                    disabled={deletingId === entry.id}
                                    onClick={() => handleDelete(entry.id)}
                                >
                                    {deletingId === entry.id
                                        ? 'Excluindo...'
                                        : 'Excluir'}
                                </button>
                            </span>
                        </div>

                        {entry.photo_urls && entry.photo_urls.length > 0 && (
                            <div className={s.photoGrid}>
                                {entry.photo_urls.map((url, i) => (
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

                        {(entry.weight_kg || entry.body_fat_percent) && (
                            <div className={s.statRow}>
                                {entry.weight_kg && (
                                    <span>{entry.weight_kg} kg</span>
                                )}
                                {entry.body_fat_percent && (
                                    <span>
                                        {entry.body_fat_percent}% gordura
                                        {entry.body_fat_method
                                            ? ` (${entry.body_fat_method === 'caliper' ? 'adipômetro' : 'bioimpedância'})`
                                            : ''}
                                    </span>
                                )}
                            </div>
                        )}

                        {entry.measurements &&
                            Object.keys(entry.measurements).length > 0 && (
                                <div className={s.measurementsGrid}>
                                    {Object.entries(entry.measurements).map(
                                        ([k, v]) => (
                                            <span key={k}>
                                                {k.replace(/_/g, ' ')}: {v}cm
                                            </span>
                                        ),
                                    )}
                                </div>
                            )}

                        {entry.notes && <p>{entry.notes}</p>}
                    </div>
                ))
            )}
        </div>
    );
}
