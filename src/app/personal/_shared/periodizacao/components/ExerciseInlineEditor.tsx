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

/** Espera depois da última alteração antes de gravar: digitar "120" no
 * descanso não pode virar três gravações (1, 12, 120) da fase inteira. */
const AUTOSAVE_DELAY_MS = 800;

/**
 * Só os campos que ESTE editor mostra. Séries e carga ficam de fora de
 * propósito: são editadas no topo do card (ver ExerciseDetailCard), e mandar a
 * cópia do rascunho junto desfaria um ajuste de série feito lá enquanto uma
 * gravação daqui estava na fila. `id` também fica fora — não muda aqui.
 */
const NOT_OWNED = ['id', 'series', 'series_label', 'timed', 'load_kg'] as const;

function ownedFields(ex: LocalExercise): Partial<ExerciseRequest> {
    const fields: Partial<ExerciseRequest> = localExerciseToRequest(ex);
    for (const key of NOT_OWNED) delete fields[key];
    return fields;
}

/**
 * Edição COMPLETA de um exercício, embutida no card que o aluno vê
 * (ExerciseDetailCard) na tela do treino do aluno: descanso, RPE, técnica,
 * mídia e observações, nas mesmas abas do editor da fase (ExerciseCard).
 *
 * Salva sozinho, como o resto do card — uma regra só para aprender: mexeu,
 * está salvo. A gravação sai um instante depois da última alteração e, se o
 * card fechar antes disso, sai na hora (não há "alterações não salvas" para
 * perguntar).
 */
export default function ExerciseInlineEditor({
    exercise,
    onSave,
}: {
    exercise: ExerciseResponse;
    /** Grava os campos do exercício. Rejeita em erro; rejeitar com
     * PrescriptionQueuedOfflineError = guardado na fila offline. */
    onSave: (patch: Partial<ExerciseRequest>) => Promise<void>;
}) {
    const source = useMemo(() => exerciseToLocal(exercise), [exercise]);
    const sourceSig = JSON.stringify(ownedFields(source));

    const [draft, setDraft] = useState<LocalExercise>(source);
    const [tab, setTab] = useState<ExerciseTab>('prescricao');
    const [status, setStatus] = useState<
        'idle' | 'saving' | 'saved' | 'saved-offline' | 'error'
    >('idle');
    const [error, setError] = useState('');

    const draftSig = JSON.stringify(ownedFields(draft));
    /** Última assinatura enviada: evita regravar o que já foi mandado quando
     * a resposta do servidor volta e o rascunho é realinhado. */
    const sentSig = useRef(sourceSig);

    /* O exercício mudou por fora (resposta do servidor, ajuste no topo do
     * card). Sem gravação pendente, o rascunho acompanha. */
    const lastSourceSig = useRef(sourceSig);
    useEffect(() => {
        if (lastSourceSig.current === sourceSig) return;
        setDraft((prev) =>
            JSON.stringify(ownedFields(prev)) === sentSig.current ||
            JSON.stringify(ownedFields(prev)) === lastSourceSig.current
                ? source
                : prev,
        );
        lastSourceSig.current = sourceSig;
        sentSig.current = sourceSig;
    }, [source, sourceSig]);

    const save = async (next: LocalExercise) => {
        const patch = ownedFields(next);
        sentSig.current = JSON.stringify(patch);
        setStatus('saving');
        setError('');
        try {
            await onSave(patch);
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

    /* Gravação automática, um instante depois da última alteração. */
    const pending = draftSig !== sentSig.current;
    useEffect(() => {
        if (!pending) return;
        const timer = setTimeout(() => void save(draft), AUTOSAVE_DELAY_MS);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draftSig, pending]);

    /* Card fechado (ou trocado de exercício) antes do tempo: grava na hora.
     * Refs porque o cleanup de desmontagem enxerga só o primeiro render. */
    const latest = useRef({ draft, pending, onSave });
    latest.current = { draft, pending, onSave };
    useEffect(
        () => () => {
            const { draft: last, pending: hasPending, onSave: saveFn } =
                latest.current;
            // A tela mostra o resultado (toast); aqui o editor já sumiu.
            if (hasPending) void saveFn(ownedFields(last)).catch(() => {});
        },
        [],
    );

    const update = (
        field: keyof Omit<LocalExercise, '_id'>,
        value: string | boolean,
    ) => {
        setDraft((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <section aria-label="Editar exercício">
            <ExerciseCard
                exercise={draft}
                tab={tab}
                onTabChange={setTab}
                onUpdate={update}
                onSetVideo={(url, thumb) =>
                    setDraft((prev) => ({
                        ...prev,
                        video_url: url,
                        video_thumb: thumb,
                    }))
                }
                withoutQuickFields
            />

            <p
                role="status"
                style={{ margin: 'var(--space-3) 0 0', minHeight: '1.25rem' }}
            >
                {(pending || status === 'saving') && (
                    <span className={s.saveStatus}>
                        <FiLoader /> Salvando…
                    </span>
                )}
                {!pending && status === 'saved' && (
                    <span className={s.saveStatusOk}>
                        <FiCheck /> Salvo para o aluno
                    </span>
                )}
                {!pending && status === 'saved-offline' && (
                    <span className={s.saveStatus}>
                        Salvo neste aparelho — será enviado quando a internet
                        voltar
                    </span>
                )}
                {!pending && status === 'error' && (
                    <span className={s.saveStatusError} role="alert">
                        <FiAlertCircle /> {error}
                    </span>
                )}
            </p>
        </section>
    );
}
