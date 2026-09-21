'use client';

import { useEffect, useRef, useState } from 'react';
import { FiCheck, FiGlobe, FiPlus, FiStar, FiX } from 'react-icons/fi';
import {
    searchExercises,
    getMyExercises,
    MUSCLE_GROUPS,
    muscleGroupLabel,
    type ExerciseLibraryItem,
} from '@/libs/planningService';
import ExerciseThumbnail from '@/components/features/ExerciseThumbnail';
import {
    GROUP_TECHNIQUE_CATALOG,
    isGroupTechniqueValidForSize,
} from '@/libs/trainingTechniques';

interface Props {
    onPick?: (item: ExerciseLibraryItem) => void;
    /**
     * Quando presente, o picker vira multi-seleção: cada resultado ganha uma
     * caixa de seleção e um botão "Adicionar N" confirma o lote. A seleção
     * sobrevive a trocas de busca, grupo muscular e aba — dá para marcar
     * peito, trocar para tríceps e marcar mais, sem sair do picker.
     *
     * `groupTechnique` (valor de GROUP_TECHNIQUE_CATALOG) vem preenchido
     * quando o usuário pediu para combinar os selecionados num bloco
     * (bi-set, tri-set, superset…); undefined = exercícios avulsos.
     */
    onPickMany?: (
        items: ExerciseLibraryItem[],
        groupTechnique?: string,
    ) => void;
    /** Seleção ainda não adicionada ao treino (vazia ao desmontar): o pai a usa
     * para avisar antes de descartar quando o personal sai sem confirmar. */
    onSelectionChange?: (
        items: ExerciseLibraryItem[],
        groupTechnique?: string,
    ) => void;
    onClose: () => void;
}

/**
 * Buscador de exercícios (globais ou próprios) usado ao montar um treino
 * dentro do modal de mesociclo. Monta com estado limpo sempre que aberto
 * (o pai só o renderiza enquanto o picker de um treino específico está ativo).
 */
export default function ExercisePicker({
    onPick,
    onPickMany,
    onSelectionChange,
    onClose,
}: Props) {
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState<'all' | 'mine'>('all');
    const [muscle, setMuscle] = useState('');
    const [results, setResults] = useState<ExerciseLibraryItem[]>([]);
    const [loading, setLoading] = useState(false);
    // Map preserva a ordem de inserção: os exercícios entram no treino na
    // ordem em que foram marcados.
    const [selected, setSelected] = useState<Map<string, ExerciseLibraryItem>>(
        () => new Map(),
    );
    const [groupTechnique, setGroupTechnique] = useState('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const multi = !!onPickMany;
    // A escolha fica guardada, mas só vale enquanto couber na seleção atual:
    // marcar um 3º exercício com "Bi-set" escolhido desliga o agrupamento em
    // vez de gerar um bi-set de três.
    const effectiveGroup =
        groupTechnique &&
        isGroupTechniqueValidForSize(groupTechnique, selected.size)
            ? groupTechnique
            : '';

    const selectionCbRef = useRef(onSelectionChange);
    selectionCbRef.current = onSelectionChange;
    useEffect(() => {
        selectionCbRef.current?.(
            Array.from(selected.values()),
            effectiveGroup || undefined,
        );
    }, [selected, effectiveGroup]);
    useEffect(() => () => selectionCbRef.current?.([], undefined), []);

    const toggle = (item: ExerciseLibraryItem) =>
        setSelected((prev) => {
            const next = new Map(prev);
            if (next.has(item.id)) next.delete(item.id);
            else next.set(item.id, item);
            return next;
        });

    const allVisibleSelected =
        results.length > 0 && results.every((r) => selected.has(r.id));

    const toggleAllVisible = () =>
        setSelected((prev) => {
            const next = new Map(prev);
            if (allVisibleSelected) results.forEach((r) => next.delete(r.id));
            else results.forEach((r) => next.set(r.id, r));
            return next;
        });

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
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                        }}
                    >
                        {t === 'all' ? (
                            <>
                                <FiGlobe /> Globais
                            </>
                        ) : (
                            <>
                                <FiStar /> Meus exercícios
                            </>
                        )}
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
                        display: 'inline-flex',
                        alignItems: 'center',
                    }}
                >
                    <FiX />
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
                            {muscleGroupLabel(g)}
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
            {multi && !loading && results.length > 0 && (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginBottom: 8,
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                    }}
                >
                    <span>
                        {results.length}{' '}
                        {results.length === 1 ? 'resultado' : 'resultados'}
                    </span>
                    <button
                        type="button"
                        onClick={toggleAllVisible}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--mint)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '4px 0',
                        }}
                    >
                        {allVisibleSelected
                            ? 'Desmarcar todos'
                            : 'Selecionar todos'}
                    </button>
                </div>
            )}
            <div
                style={{
                    maxHeight: multi ? 340 : 280,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                }}
            >
                {results.map((item) => {
                    const checked = selected.has(item.id);
                    return (
                        <button
                            key={item.id}
                            type="button"
                            role={multi ? 'checkbox' : undefined}
                            aria-checked={multi ? checked : undefined}
                            onClick={() =>
                                multi ? toggle(item) : onPick?.(item)
                            }
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                background: checked
                                    ? 'var(--mint-glow)'
                                    : 'var(--surface-2, rgba(255,255,255,0.04))',
                                border: `1px solid ${
                                    checked
                                        ? 'var(--mint)'
                                        : 'var(--border-subtle)'
                                }`,
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
                                (e.currentTarget.style.borderColor = checked
                                    ? 'var(--mint)'
                                    : 'var(--border-subtle)')
                            }
                        >
                            {multi && (
                                <span
                                    aria-hidden="true"
                                    style={{
                                        width: 20,
                                        height: 20,
                                        flexShrink: 0,
                                        borderRadius: 5,
                                        border: `2px solid ${
                                            checked
                                                ? 'var(--mint)'
                                                : 'var(--text-muted)'
                                        }`,
                                        background: checked
                                            ? 'var(--mint)'
                                            : 'transparent',
                                        color: '#000',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.8rem',
                                    }}
                                >
                                    {checked && <FiCheck strokeWidth={3} />}
                                </span>
                            )}
                            <ExerciseThumbnail
                                name={item.name}
                                videoThumb={item.video_thumb}
                                videoUrl={item.video_url}
                                width={52}
                                height={38}
                                borderRadius={5}
                                captureFrame={false}
                                lazyCapture
                            />
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
                    );
                })}
            </div>

            {multi && (
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 12,
                        paddingTop: 12,
                        borderTop: '1px solid var(--border-subtle)',
                    }}
                >
                    <label
                        style={{
                            flex: '1 1 100%',
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: '0.78rem',
                            color: 'var(--text-muted)',
                        }}
                    >
                        Adicionar como
                        <select
                            value={effectiveGroup}
                            onChange={(e) => setGroupTechnique(e.target.value)}
                            disabled={selected.size < 2}
                            className="form-control form-control-sm"
                            style={{ flex: '1 1 180px', minWidth: 0 }}
                            aria-label="Adicionar os exercícios como"
                        >
                            <option value="">Exercícios separados</option>
                            {GROUP_TECHNIQUE_CATALOG.map((gt) => {
                                const fits = isGroupTechniqueValidForSize(
                                    gt.value,
                                    selected.size,
                                );
                                return (
                                    <option
                                        key={gt.value}
                                        value={gt.value}
                                        disabled={!fits}
                                    >
                                        {gt.label}
                                    </option>
                                );
                            })}
                        </select>
                    </label>
                    {selected.size < 2 && (
                        <span
                            style={{
                                flex: '1 1 100%',
                                marginTop: -4,
                                fontSize: '0.72rem',
                                color: 'var(--text-muted)',
                            }}
                        >
                            Marque 2 ou mais para combinar em bi-set, tri-set,
                            superset…
                        </span>
                    )}
                    <span
                        style={{
                            flex: '1 1 auto',
                            fontSize: '0.78rem',
                            color: 'var(--text-muted)',
                        }}
                    >
                        {selected.size === 0
                            ? 'Nenhum selecionado'
                            : `${selected.size} selecionado${selected.size === 1 ? '' : 's'}`}
                        {selected.size > 0 && (
                            <button
                                type="button"
                                onClick={() => setSelected(new Map())}
                                style={{
                                    marginLeft: 8,
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    textDecoration: 'underline',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    padding: 0,
                                }}
                            >
                                limpar
                            </button>
                        )}
                    </span>
                    <button
                        type="button"
                        disabled={selected.size === 0}
                        onClick={() =>
                            onPickMany?.(
                                Array.from(selected.values()),
                                effectiveGroup || undefined,
                            )
                        }
                        style={{
                            padding: '8px 16px',
                            borderRadius: 8,
                            border: 'none',
                            background: 'var(--mint)',
                            color: '#000',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor:
                                selected.size === 0 ? 'not-allowed' : 'pointer',
                            opacity: selected.size === 0 ? 0.45 : 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                        }}
                    >
                        <FiPlus />
                        {selected.size > 1
                            ? `Adicionar ${selected.size} exercícios`
                            : 'Adicionar exercício'}
                    </button>
                </div>
            )}
        </div>
    );
}
