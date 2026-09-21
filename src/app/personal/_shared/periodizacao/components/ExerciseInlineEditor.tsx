'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FiAlertCircle, FiCheck, FiLoader } from 'react-icons/fi';
import type { ExerciseRequest, ExerciseResponse } from '@/libs/planningService';
import { PrescriptionQueuedOfflineError } from '@/libs/offline/prescriptionQueue';
import ExerciseCard from './cards/ExerciseCard';
import type { ExerciseTab } from '../lib/editorNavigation';
import {
    exerciseToLocal,
    localExerciseToRequest,
    type LocalExercise,
} from '../lib/mesocycleTransforms';
import s from '../builder.module.css';

/** O que muda de fato no exercício — `id` e o `_id` local ficam de fora, um
 * não muda aqui e o outro é gerado a cada conversão. */
function signature(ex: LocalExercise): string {
    return JSON.stringify({ ...localExerciseToRequest(ex), id: undefined });
}

/**
 * Edição COMPLETA de um exercício, embutida no card que o aluno vê
 * (ExerciseDetailCard) na tela do treino do aluno.
 *
 * Antes o card só ajustava séries e carga; o resto (descanso, RPE, técnica,
 * mídia, observações) exigia fechar o card, abrir "Editar treino", achar o
 * exercício e só então chegar às abas. Aqui as mesmas abas do editor da fase
 * (ExerciseCard) ficam dentro do card — um toque no exercício e está tudo lá.
 *
 * Grava por botão, e não a cada tecla: cada gravação reenvia a fase inteira
 * do aluno. O rascunho acompanha o exercício enquanto não houver edição
 * pendente — um ajuste rápido de séries ou carga feito no topo do card
 * aparece aqui na hora, em vez de ser desfeito pelo próximo "Salvar".
 */
export default function ExerciseInlineEditor({
    exercise,
    onSave,
    onReplace,
    onDirtyChange,
}: {
    exercise: ExerciseResponse;
    /** Grava o exercício inteiro. Rejeita em erro; rejeitar com
     * PrescriptionQueuedOfflineError = guardado na fila offline. */
    onSave: (patch: ExerciseRequest) => Promise<void>;
    /** Abre a biblioteca para trocar este exercício por outro. */
    onReplace?: () => void;
    /** Avisa o dono do card, que pergunta antes de fechar com edição pendente. */
    onDirtyChange?: (dirty: boolean) => void;
}) {
    const source = useMemo(() => exerciseToLocal(exercise), [exercise]);
    const sourceSig = useMemo(() => signature(source), [source]);

    const [draft, setDraft] = useState<LocalExercise>(source);
    const [tab, setTab] = useState<ExerciseTab>('serie');
    const [status, setStatus] = useState<
        'idle' | 'saving' | 'saved' | 'saved-offline' | 'error'
    >('idle');
    const [error, setError] = useState('');

    const draftSig = signature(draft);
    const dirty = draftSig !== sourceSig;

    /* O exercício mudou por fora (ajuste rápido, resposta do servidor). Se o
     * rascunho estava igual à versão anterior, ele acompanha; se havia edição
     * em andamento, ela é mantida — sobrescrever apagaria o que o personal
     * está digitando. */
    const lastSourceSig = useRef(sourceSig);
    useEffect(() => {
        if (lastSourceSig.current === sourceSig) return;
        setDraft((prev) =>
            signature(prev) === lastSourceSig.current ? source : prev,
        );
        lastSourceSig.current = sourceSig;
    }, [source, sourceSig]);

    useEffect(() => {
        onDirtyChange?.(dirty);
    }, [dirty, onDirtyChange]);

    const update = (field: keyof Omit<LocalExercise, '_id'>, value: string | boolean) => {
        setStatus('idle');
        setDraft((prev) => ({ ...prev, [field]: value }));
    };

    const save = async () => {
        setStatus('saving');
        setError('');
        try {
            await onSave(localExerciseToRequest(draft));
            setStatus('saved');
        } catch (err) {
            if (err instanceof PrescriptionQueuedOfflineError) {
                setStatus('saved-offline');
                return;
            }
            setStatus('error');
            setError(
                err instanceof Error && err.message
                    ? err.message
                    : 'Não foi possível salvar. Tente novamente.',
            );
        }
    };

    return (
        <section aria-label="Editar exercício">
            <ExerciseCard
                exercise={draft}
                tab={tab}
                onTabChange={setTab}
                onUpdate={update}
                onSetVideo={(url, thumb) => {
                    setStatus('idle');
                    setDraft((prev) => ({
                        ...prev,
                        video_url: url,
                        video_thumb: thumb,
                    }));
                }}
                onReplace={onReplace}
            />

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    flexWrap: 'wrap',
                    marginTop: 'var(--space-3)',
                }}
            >
                <button
                    type="button"
                    className={s.btnEdit}
                    onClick={() => void save()}
                    disabled={!dirty || status === 'saving'}
                >
                    Salvar alterações
                </button>
                {dirty && status !== 'saving' && (
                    <button
                        type="button"
                        className={s.btnSmall}
                        onClick={() => {
                            setDraft(source);
                            setStatus('idle');
                        }}
                    >
                        Descartar
                    </button>
                )}
                <span role="status">
                    {status === 'saving' && (
                        <span className={s.saveStatus}>
                            <FiLoader /> Salvando…
                        </span>
                    )}
                    {status === 'saved' && !dirty && (
                        <span className={s.saveStatusOk}>
                            <FiCheck /> Salvo para o aluno
                        </span>
                    )}
                    {status === 'saved-offline' && (
                        <span className={s.saveStatus}>
                            Salvo neste aparelho — será enviado quando a
                            internet voltar
                        </span>
                    )}
                    {status === 'idle' && dirty && (
                        <span className={s.saveStatus}>
                            Alterações ainda não salvas
                        </span>
                    )}
                </span>
                {status === 'error' && (
                    <span className={s.saveStatusError} role="alert">
                        <FiAlertCircle /> {error}
                    </span>
                )}
            </div>
        </section>
    );
}
