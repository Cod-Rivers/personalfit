'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { FiVideo } from 'react-icons/fi';
import VideoUploadModal from '@/components/features/VideoUploadModal';
import {
    createMyExercise,
    getMyExercises,
    MUSCLE_GROUPS,
    muscleGroupLabel,
    type ExerciseLibraryItem,
} from '@/libs/planningService';

/**
 * "Não achou? Criar exercício com meu vídeo" no buscador do editor
 * (Todo/PLANO_LOJA_DE_TREINOS.md §5.10): cria o exercício próprio já com o
 * nome digitado, abre o envio do vídeo e devolve o exercício pronto para
 * entrar no treino. Ele fica também em "Meus exercícios", para outros
 * programas e para os alunos do personal. Só para quem envia vídeo (PRO ou
 * autor da loja).
 */
export default function CreateOwnExercise({
    initialName,
    initialMuscle,
    onCreated,
}: {
    initialName: string;
    initialMuscle?: string;
    onCreated: (item: ExerciseLibraryItem) => void;
}) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [muscle, setMuscle] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [created, setCreated] = useState<ExerciseLibraryItem | null>(null);

    const start = () => {
        setName(initialName.trim());
        setMuscle(initialMuscle ?? '');
        setError('');
        setOpen(true);
    };

    const create = async () => {
        if (!name.trim() || !muscle) return;
        setBusy(true);
        setError('');
        try {
            setCreated(
                await createMyExercise({
                    name: name.trim(),
                    muscle_group: muscle,
                }),
            );
        } catch (err) {
            setError(
                (isAxiosError(err) &&
                    (err.response?.data as { error?: string })?.error) ||
                    'Não foi possível criar o exercício.',
            );
        } finally {
            setBusy(false);
        }
    };

    // Depois do envio, relê o exercício para trazer o vídeo e a miniatura.
    const finish = async () => {
        if (!created) return;
        const fresh = (await getMyExercises(created.name).catch(() => [])).find(
            (e) => e.id === created.id,
        );
        onCreated(fresh ?? created);
        setCreated(null);
        setOpen(false);
    };

    if (!open) {
        return (
            <button
                type="button"
                className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-2"
                onClick={start}
            >
                <FiVideo aria-hidden="true" /> Não achou? Criar exercício com
                meu vídeo
            </button>
        );
    }

    return (
        <div
            style={{
                border: '1px dashed var(--border-subtle)',
                borderRadius: 8,
                padding: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
            }}
        >
            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Nome do exercício
                <input
                    className="form-control form-control-sm"
                    value={name}
                    maxLength={80}
                    onChange={(e) => setName(e.target.value)}
                />
            </label>
            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Grupo muscular
                <select
                    className="form-select form-select-sm"
                    value={muscle}
                    onChange={(e) => setMuscle(e.target.value)}
                >
                    <option value="">Escolha</option>
                    {MUSCLE_GROUPS.map((g) => (
                        <option key={g} value={g}>
                            {muscleGroupLabel(g)}
                        </option>
                    ))}
                </select>
            </label>
            {error && (
                <p
                    style={{
                        margin: 0,
                        fontSize: '0.8rem',
                        color: 'var(--coral)',
                    }}
                >
                    {error}
                </p>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                    type="button"
                    className="btn btn-sm btn-success"
                    disabled={busy || !name.trim() || !muscle}
                    onClick={() => void create()}
                >
                    {busy ? 'Criando…' : 'Criar e enviar o vídeo'}
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setOpen(false)}
                >
                    Cancelar
                </button>
            </div>
            {created && (
                <VideoUploadModal
                    exerciseId={created.id}
                    mode="personal"
                    planType="pro"
                    onSuccess={() => void finish()}
                    onClose={() => void finish()}
                />
            )}
        </div>
    );
}
