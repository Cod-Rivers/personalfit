'use client';

import { useEffect, useRef, useState } from 'react';
import {
    searchExercises,
    getMyExercises,
    MUSCLE_GROUPS,
    type ExerciseLibraryItem,
} from '@/libs/planningService';

interface Props {
    onPick: (item: ExerciseLibraryItem) => void;
    onClose: () => void;
}

/**
 * Buscador de exercícios (globais ou próprios) usado ao montar um treino
 * dentro do modal de mesociclo. Monta com estado limpo sempre que aberto
 * (o pai só o renderiza enquanto o picker de um treino específico está ativo).
 */
export default function ExercisePicker({ onPick, onClose }: Props) {
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState<'all' | 'mine'>('all');
    const [muscle, setMuscle] = useState('');
    const [results, setResults] = useState<ExerciseLibraryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const data =
                    tab === 'mine'
                        ? await getMyExercises(
                              search || undefined,
                              muscle || undefined,
                          )
                        : await searchExercises(
                              search || undefined,
                              muscle || undefined,
                          );
                setResults(data);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [search, tab, muscle]);

    return (
        <div
            style={{
                marginTop: 10,
                background: 'var(--surface-1)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 10,
                padding: '14px',
            }}
        >
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {(['all', 'mine'] as const).map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => {
                            setTab(t);
                            setSearch('');
                        }}
                        style={{
                            padding: '4px 14px',
                            borderRadius: 20,
                            border: '1px solid var(--border-subtle)',
                            background:
                                tab === t ? 'var(--mint)' : 'transparent',
                            color: tab === t ? '#000' : 'var(--text-muted)',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        {t === 'all' ? '🌐 Globais' : '⭐ Meus exercícios'}
                    </button>
                ))}
                <button
                    type="button"
                    onClick={onClose}
                    style={{
                        marginLeft: 'auto',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        lineHeight: 1,
                    }}
                >
                    ✕
                </button>
            </div>

            {/* Search + Muscle filter */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar exercício..."
                    className="form-control form-control-sm"
                    style={{ flex: 1 }}
                />
                <select
                    value={muscle}
                    onChange={(e) => setMuscle(e.target.value)}
                    className="form-control form-control-sm"
                    style={{ width: 148, flexShrink: 0 }}
                >
                    <option value="">Todos os grupos</option>
                    {MUSCLE_GROUPS.map((g) => (
                        <option key={g} value={g}>
                            {g}
                        </option>
                    ))}
                </select>
            </div>

            {/* Results */}
            {loading && (
                <div className="text-center py-2">
                    <div
                        className="spinner-border spinner-border-sm"
                        role="status"
                    />
                </div>
            )}
            {!loading && results.length === 0 && search.length > 0 && (
                <p
                    style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        textAlign: 'center',
                    }}
                >
                    Nenhum resultado para &quot;{search}&quot;
                </p>
            )}
            {!loading && results.length === 0 && search.length === 0 && (
                <p
                    style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        textAlign: 'center',
                    }}
                >
                    Digite para buscar exercícios
                </p>
            )}
            <div
                style={{
                    maxHeight: 280,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                }}
            >
                {results.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => onPick(item)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            background:
                                'var(--surface-2, rgba(255,255,255,0.04))',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 8,
                            padding: '8px 10px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                            transition: 'border-color 0.15s',
                        }}
                        onMouseEnter={(e) =>
                            (e.currentTarget.style.borderColor =
                                'var(--mint)')
                        }
                        onMouseLeave={(e) =>
                            (e.currentTarget.style.borderColor =
                                'var(--border-subtle)')
                        }
                    >
                        {/* Thumbnail or placeholder */}
                        {item.video_thumb ? (
                            <img
                                src={item.video_thumb}
                                alt={item.name}
                                style={{
                                    width: 52,
                                    height: 38,
                                    objectFit: 'cover',
                                    borderRadius: 5,
                                    flexShrink: 0,
                                    background: '#111',
                                }}
                                onError={(e) => {
                                    (
                                        e.target as HTMLImageElement
                                    ).style.display = 'none';
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: 52,
                                    height: 38,
                                    borderRadius: 5,
                                    background: 'var(--border-subtle)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.2rem',
                                    flexShrink: 0,
                                }}
                            >
                                🏋️
                            </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {item.name}
                            </p>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: '0.72rem',
                                    color: 'var(--text-muted)',
                                }}
                            >
                                {item.muscle_group}
                                {item.category ? ` · ${item.category}` : ''}
                            </p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
