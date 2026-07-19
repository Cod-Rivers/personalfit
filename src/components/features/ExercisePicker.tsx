'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    searchExercises,
    createMyExercise,
    MUSCLE_GROUPS,
    type ExerciseLibraryItem,
} from '@/libs/planningService';
import VideoUploadModal from '@/components/features/VideoUploadModal';

interface ExercisePickerProps {
    onSelect: (exercise: ExerciseLibraryItem) => void;
    onClose: () => void;
    /** Plano do treinador — somente 'pro' habilita upload de arquivo */
    planType?: 'free' | 'pro';
}

export default function ExercisePicker({
    onSelect,
    onClose,
    planType = 'free',
}: ExercisePickerProps) {
    const [search, setSearch] = useState('');
    const [muscleGroup, setMuscleGroup] = useState('');
    const [exercises, setExercises] = useState<ExerciseLibraryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [newName, setNewName] = useState('');
    const [newMuscle, setNewMuscle] = useState('');
    const [newVideoUrl, setNewVideoUrl] = useState('');
    const [saving, setSaving] = useState(false);
    const [videoModalExercise, setVideoModalExercise] =
        useState<ExerciseLibraryItem | null>(null);

    const fetchExercises = useCallback(
        async (searchVal: string, mgVal: string) => {
            setLoading(true);
            try {
                const result = await searchExercises(
                    searchVal || undefined,
                    mgVal || undefined,
                );
                setExercises(result);
            } catch {
                setExercises([]);
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    useEffect(() => {
        fetchExercises('', '');
    }, [fetchExercises]);

    const handleSearchChange = (val: string) => {
        setSearch(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(
            () => fetchExercises(val, muscleGroup),
            300,
        );
    };

    const handleMuscleGroupChange = (val: string) => {
        setMuscleGroup(val);
        fetchExercises(search, val);
    };

    const handleQuickAdd = async () => {
        if (!newName.trim() || !newMuscle) return;
        setSaving(true);
        try {
            await createMyExercise({
                name: newName.trim(),
                muscle_group: newMuscle,
                video_url: newVideoUrl.trim() || undefined,
            });
            setNewName('');
            setNewMuscle('');
            setNewVideoUrl('');
            setShowQuickAdd(false);
            fetchExercises(search, muscleGroup);
        } catch {
            alert('Erro ao criar exercício');
        } finally {
            setSaving(false);
        }
    };

    // Agrupa os exercícios por muscle_group para exibição
    const grouped = exercises.reduce<Record<string, ExerciseLibraryItem[]>>(
        (acc, ex) => {
            const g = ex.muscle_group || 'Outros';
            if (!acc[g]) acc[g] = [];
            acc[g].push(ex);
            return acc;
        },
        {},
    );

    return (
        <>
            {videoModalExercise && (
                <VideoUploadModal
                    exerciseId={videoModalExercise.id}
                    mode="personal"
                    planType={planType}
                    onSuccess={() => {
                        setVideoModalExercise(null);
                        fetchExercises(search, muscleGroup);
                    }}
                    onClose={() => setVideoModalExercise(null)}
                />
            )}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.6)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
                onClick={onClose}
            >
                <div
                    style={{
                        background: '#1e1e2f',
                        borderRadius: 12,
                        width: '95%',
                        maxWidth: 600,
                        maxHeight: '80vh',
                        display: 'flex',
                        flexDirection: 'column',
                        color: '#fff',
                        overflow: 'hidden',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div
                        style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid #333',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <h3 style={{ margin: 0, fontSize: 18 }}>
                            Catálogo de Exercícios
                        </h3>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#aaa',
                                fontSize: 22,
                                cursor: 'pointer',
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Filters */}
                    <div
                        style={{
                            padding: '12px 20px',
                            display: 'flex',
                            gap: 10,
                            flexWrap: 'wrap',
                        }}
                    >
                        <input
                            type="text"
                            placeholder="Buscar exercício..."
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            style={{
                                flex: 1,
                                minWidth: 180,
                                padding: '8px 12px',
                                borderRadius: 8,
                                border: '1px solid #444',
                                background: '#2a2a3d',
                                color: '#fff',
                                outline: 'none',
                                fontSize: 14,
                            }}
                        />
                        <select
                            value={muscleGroup}
                            onChange={(e) =>
                                handleMuscleGroupChange(e.target.value)
                            }
                            style={{
                                padding: '8px 12px',
                                borderRadius: 8,
                                border: '1px solid #444',
                                background: '#2a2a3d',
                                color: '#fff',
                                outline: 'none',
                                fontSize: 14,
                            }}
                        >
                            <option value="">Todos os grupos</option>
                            {MUSCLE_GROUPS.map((mg) => (
                                <option key={mg} value={mg}>
                                    {mg}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Quick-add */}
                    <div style={{ padding: '0 20px 8px' }}>
                        {!showQuickAdd ? (
                            <button
                                onClick={() => setShowQuickAdd(true)}
                                style={{
                                    background: 'none',
                                    border: '1px dashed #7c5cfc',
                                    color: '#7c5cfc',
                                    borderRadius: 8,
                                    padding: '8px 14px',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                    width: '100%',
                                }}
                            >
                                ➕ Novo exercício personalizado
                            </button>
                        ) : (
                            <div
                                style={{
                                    background: '#252538',
                                    border: '1px solid #7c5cfc',
                                    borderRadius: 8,
                                    padding: 12,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 8,
                                }}
                            >
                                <input
                                    placeholder="Nome do exercício *"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    style={{
                                        padding: '8px 10px',
                                        borderRadius: 6,
                                        border: '1px solid #444',
                                        background: '#2a2a3d',
                                        color: '#fff',
                                        fontSize: 13,
                                        outline: 'none',
                                    }}
                                />
                                <select
                                    value={newMuscle}
                                    onChange={(e) =>
                                        setNewMuscle(e.target.value)
                                    }
                                    style={{
                                        padding: '8px 10px',
                                        borderRadius: 6,
                                        border: '1px solid #444',
                                        background: '#2a2a3d',
                                        color: '#fff',
                                        fontSize: 13,
                                        outline: 'none',
                                    }}
                                >
                                    <option value="">Grupo muscular *</option>
                                    {MUSCLE_GROUPS.map((mg) => (
                                        <option key={mg} value={mg}>
                                            {mg}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    placeholder="URL do vídeo (opcional)"
                                    value={newVideoUrl}
                                    onChange={(e) =>
                                        setNewVideoUrl(e.target.value)
                                    }
                                    style={{
                                        padding: '8px 10px',
                                        borderRadius: 6,
                                        border: '1px solid #444',
                                        background: '#2a2a3d',
                                        color: '#fff',
                                        fontSize: 13,
                                        outline: 'none',
                                    }}
                                />
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        onClick={handleQuickAdd}
                                        disabled={
                                            saving ||
                                            !newName.trim() ||
                                            !newMuscle
                                        }
                                        style={{
                                            flex: 1,
                                            padding: '8px 0',
                                            borderRadius: 6,
                                            border: 'none',
                                            background: '#7c5cfc',
                                            color: '#fff',
                                            cursor: 'pointer',
                                            fontSize: 13,
                                            opacity:
                                                saving ||
                                                !newName.trim() ||
                                                !newMuscle
                                                    ? 0.5
                                                    : 1,
                                        }}
                                    >
                                        {saving ? 'Salvando...' : 'Criar'}
                                    </button>
                                    <button
                                        onClick={() => setShowQuickAdd(false)}
                                        style={{
                                            padding: '8px 14px',
                                            borderRadius: 6,
                                            border: '1px solid #444',
                                            background: 'none',
                                            color: '#aaa',
                                            cursor: 'pointer',
                                            fontSize: 13,
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Exercise list */}
                    <div
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '0 20px 16px',
                        }}
                    >
                        {loading ? (
                            <p
                                style={{
                                    textAlign: 'center',
                                    color: '#888',
                                    padding: 20,
                                }}
                            >
                                Carregando...
                            </p>
                        ) : exercises.length === 0 ? (
                            <p
                                style={{
                                    textAlign: 'center',
                                    color: '#888',
                                    padding: 20,
                                }}
                            >
                                Nenhum exercício encontrado
                            </p>
                        ) : (
                            Object.entries(grouped).map(([group, items]) => (
                                <div key={group} style={{ marginBottom: 16 }}>
                                    <h4
                                        style={{
                                            margin: '0 0 8px',
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: '#7c5cfc',
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.5,
                                        }}
                                    >
                                        {group}
                                    </h4>
                                    {items.map((ex) => (
                                        <button
                                            key={ex.id}
                                            onClick={() => onSelect(ex)}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                padding: '10px 12px',
                                                borderRadius: 8,
                                                border: '1px solid #333',
                                                background: '#252538',
                                                cursor: 'pointer',
                                                marginBottom: 6,
                                                textAlign: 'left',
                                                color: '#fff',
                                                transition: 'background 0.15s',
                                            }}
                                            onMouseOver={(e) =>
                                                (e.currentTarget.style.background =
                                                    '#2f2f4a')
                                            }
                                            onMouseOut={(e) =>
                                                (e.currentTarget.style.background =
                                                    '#252538')
                                            }
                                        >
                                            {ex.video_thumb && (
                                                <img
                                                    src={ex.video_thumb}
                                                    alt={ex.name}
                                                    style={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: 6,
                                                        objectFit: 'cover',
                                                        flexShrink: 0,
                                                    }}
                                                    onError={(e) => {
                                                        (
                                                            e.target as HTMLImageElement
                                                        ).style.display =
                                                            'none';
                                                    }}
                                                />
                                            )}
                                            <div
                                                style={{ flex: 1, minWidth: 0 }}
                                            >
                                                <div
                                                    style={{
                                                        fontWeight: 500,
                                                        fontSize: 14,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                    }}
                                                >
                                                    {ex.name}
                                                    {ex.is_custom && (
                                                        <span
                                                            style={{
                                                                fontSize: 10,
                                                                background:
                                                                    '#7c5cfc',
                                                                color: '#fff',
                                                                padding:
                                                                    '1px 6px',
                                                                borderRadius: 4,
                                                                fontWeight: 600,
                                                                whiteSpace:
                                                                    'nowrap',
                                                            }}
                                                        >
                                                            Personalizado
                                                        </span>
                                                    )}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: 12,
                                                        color: '#999',
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    {ex.category} ·{' '}
                                                    {ex.muscle_group}
                                                </div>
                                            </div>
                                            {ex.is_custom && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setVideoModalExercise(
                                                            ex,
                                                        );
                                                    }}
                                                    title="Definir vídeo/mídia"
                                                    style={{
                                                        background: 'none',
                                                        border: '1px solid #555',
                                                        color: '#aaa',
                                                        borderRadius: 6,
                                                        padding: '4px 8px',
                                                        cursor: 'pointer',
                                                        fontSize: 14,
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    🎥
                                                </button>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
