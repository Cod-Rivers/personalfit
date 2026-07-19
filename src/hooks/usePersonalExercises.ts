'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    getMyExercises,
    createMyExercise,
    updateMyExercise,
    deleteMyExercise,
    type ExerciseLibraryItem,
    type CreatePersonalExerciseRequest,
} from '@/libs/planningService';

export type ExerciseModalMode = null | 'exCreate' | 'exEdit' | 'exDelete';

function extractErrorMessage(err: unknown, fallback: string): string {
    const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
    return msg || fallback;
}

const emptyExForm: CreatePersonalExerciseRequest = {
    name: '',
    muscle_group: '',
};

/**
 * Encapsula listagem, busca e CRUD dos exercícios personalizados do
 * personal logado (aba "Meus Exercícios" do dashboard).
 */
export function usePersonalExercises() {
    const [myExercises, setMyExercises] = useState<ExerciseLibraryItem[]>([]);
    const [exLoading, setExLoading] = useState(false);
    const [exSearch, setExSearch] = useState('');
    const [exMuscle, setExMuscle] = useState('');
    const exDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);

    const [modal, setModal] = useState<ExerciseModalMode>(null);
    const [exForm, setExForm] =
        useState<CreatePersonalExerciseRequest>(emptyExForm);
    const [exEditId, setExEditId] = useState<string | null>(null);
    const [exDeleteTarget, setExDeleteTarget] =
        useState<ExerciseLibraryItem | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const fetchMyExercises = useCallback(async (srch: string, mg: string) => {
        setExLoading(true);
        try {
            const list = await getMyExercises(
                srch || undefined,
                mg || undefined,
            );
            setMyExercises(list);
        } catch {
            setMyExercises([]);
        } finally {
            setExLoading(false);
        }
    }, []);

    // Carrega ao montar (a aba só monta quando ativada).
    useEffect(() => {
        fetchMyExercises(exSearch, exMuscle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const closeModal = useCallback(() => {
        setModal(null);
        setExEditId(null);
        setExDeleteTarget(null);
        setError('');
    }, []);

    const handleExSearchChange = useCallback(
        (val: string) => {
            setExSearch(val);
            if (exDebounce.current) clearTimeout(exDebounce.current);
            exDebounce.current = setTimeout(
                () => fetchMyExercises(val, exMuscle),
                300,
            );
        },
        [exMuscle, fetchMyExercises],
    );

    const handleExMuscleChange = useCallback(
        (val: string) => {
            setExMuscle(val);
            fetchMyExercises(exSearch, val);
        },
        [exSearch, fetchMyExercises],
    );

    const openExCreate = useCallback(() => {
        setExForm({ name: '', muscle_group: '' });
        setError('');
        setModal('exCreate');
    }, []);

    const openExEdit = useCallback((ex: ExerciseLibraryItem) => {
        setExForm({
            name: ex.name,
            muscle_group: ex.muscle_group,
            category: ex.category || undefined,
            video_url: ex.video_url || undefined,
            description: ex.description || undefined,
        });
        setExEditId(ex.id);
        setError('');
        setModal('exEdit');
    }, []);

    const openExDelete = useCallback((ex: ExerciseLibraryItem) => {
        setExDeleteTarget(ex);
        setError('');
        setModal('exDelete');
    }, []);

    const handleExCreate = useCallback(async () => {
        if (!exForm.name.trim() || !exForm.muscle_group) return;
        setSubmitting(true);
        setError('');
        try {
            await createMyExercise(exForm);
            closeModal();
            fetchMyExercises(exSearch, exMuscle);
        } catch (err: unknown) {
            setError(extractErrorMessage(err, 'Erro ao criar exercício.'));
        } finally {
            setSubmitting(false);
        }
    }, [exForm, closeModal, fetchMyExercises, exSearch, exMuscle]);

    const handleExUpdate = useCallback(async () => {
        if (!exEditId || !exForm.name.trim() || !exForm.muscle_group) return;
        setSubmitting(true);
        setError('');
        try {
            await updateMyExercise(exEditId, exForm);
            closeModal();
            fetchMyExercises(exSearch, exMuscle);
        } catch (err: unknown) {
            setError(
                extractErrorMessage(err, 'Erro ao atualizar exercício.'),
            );
        } finally {
            setSubmitting(false);
        }
    }, [exEditId, exForm, closeModal, fetchMyExercises, exSearch, exMuscle]);

    const refetchExercises = useCallback(() => {
        fetchMyExercises(exSearch, exMuscle);
    }, [fetchMyExercises, exSearch, exMuscle]);

    const handleExDelete = useCallback(async () => {
        if (!exDeleteTarget) return;
        setSubmitting(true);
        setError('');
        try {
            await deleteMyExercise(exDeleteTarget.id);
            closeModal();
            fetchMyExercises(exSearch, exMuscle);
        } catch (err: unknown) {
            setError(extractErrorMessage(err, 'Erro ao remover exercício.'));
        } finally {
            setSubmitting(false);
        }
    }, [exDeleteTarget, closeModal, fetchMyExercises, exSearch, exMuscle]);

    return {
        myExercises,
        exLoading,
        exSearch,
        exMuscle,
        modal,
        exForm,
        setExForm,
        exDeleteTarget,
        submitting,
        error,
        closeModal,
        handleExSearchChange,
        handleExMuscleChange,
        openExCreate,
        openExEdit,
        openExDelete,
        handleExCreate,
        handleExUpdate,
        handleExDelete,
        refetchExercises,
    };
}
