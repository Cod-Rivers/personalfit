'use client';

import { useCallback, useEffect, useState } from 'react';
import { Api } from '@/libs/api';
import {
    getMyTemplates,
    applyTemplate,
    createNewTemplate,
    deleteTemplate,
    type MacrocycleResponse,
} from '@/libs/planningService';

export type TemplateModalMode =
    | null
    | 'tplApply'
    | 'tplCreate'
    | 'tplEdit'
    | 'tplDelete';

export interface TplFormData {
    name?: string;
    goal?: string;
    is_public?: boolean;
}

function extractErrorMessage(err: unknown, fallback: string): string {
    const data = (
        err as { response?: { data?: { error?: string; message?: string } } }
    )?.response?.data;
    return data?.error || data?.message || fallback;
}

async function fetchPublicTemplatesApi(): Promise<MacrocycleResponse[]> {
    const { data } = await Api.get<MacrocycleResponse[]>(
        '/planning/templates/public',
    );
    return data ?? [];
}

/**
 * Encapsula listagem e CRUD de ciclos (macrociclos-modelo) do personal logado,
 * tanto os próprios ("Ciclos Próprios") quanto os públicos de outros
 * personals ("Ciclos Públicos"). Cada instância representa uma única lista,
 * definida por `view`.
 */
export function usePersonalTemplates(view: 'own' | 'public') {
    const [templates, setTemplates] = useState<MacrocycleResponse[]>([]);
    const [tplLoading, setTplLoading] = useState(false);
    const [selectedTemplate, setSelectedTemplate] =
        useState<MacrocycleResponse | null>(null);
    const [modal, setModal] = useState<TemplateModalMode>(null);
    const [tplForm, setTplForm] = useState<TplFormData>({});
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const fetchTemplates = useCallback(async () => {
        setTplLoading(true);
        try {
            const list =
                view === 'public'
                    ? await fetchPublicTemplatesApi()
                    : await getMyTemplates();
            setTemplates(list ?? []);
        } catch {
            setTemplates([]);
        } finally {
            setTplLoading(false);
        }
    }, [view]);

    // Carrega ao montar (a aba só monta quando ativada).
    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const closeModal = useCallback(() => {
        setModal(null);
        setError('');
        setSelectedTemplate(null);
        setTplForm({});
    }, []);

    const openApply = useCallback((tpl: MacrocycleResponse) => {
        setSelectedTemplate(tpl);
        setError('');
        setModal('tplApply');
    }, []);

    const openCreate = useCallback(() => {
        setTplForm({});
        setError('');
        setModal('tplCreate');
    }, []);

    const openDelete = useCallback((tpl: MacrocycleResponse) => {
        setSelectedTemplate(tpl);
        setError('');
        setModal('tplDelete');
    }, []);

    const applyToStudent = useCallback(
        async (studentId: string) => {
            if (!selectedTemplate || !studentId) return;
            setSubmitting(true);
            setError('');
            try {
                await applyTemplate(studentId, selectedTemplate.id);
                closeModal();
                fetchTemplates();
            } catch (err: unknown) {
                setError(extractErrorMessage(err, 'Erro ao aplicar template.'));
            } finally {
                setSubmitting(false);
            }
        },
        [selectedTemplate, closeModal, fetchTemplates],
    );

    const handleTplCreateOrUpdate = useCallback(async () => {
        if (!tplForm.name?.trim()) return;
        setSubmitting(true);
        setError('');
        try {
            await createNewTemplate({
                name: tplForm.name,
                goal: tplForm.goal || '',
                is_public: tplForm.is_public === true,
            });
            closeModal();
            fetchTemplates();
        } catch (err: unknown) {
            setError(extractErrorMessage(err, 'Erro ao criar ciclo.'));
        } finally {
            setSubmitting(false);
        }
    }, [tplForm, closeModal, fetchTemplates]);

    const handleTplDelete = useCallback(async () => {
        if (!selectedTemplate) return;
        setSubmitting(true);
        setError('');
        try {
            await deleteTemplate(selectedTemplate.id);
            closeModal();
            fetchTemplates();
        } catch (err: unknown) {
            setError(extractErrorMessage(err, 'Erro ao remover template.'));
        } finally {
            setSubmitting(false);
        }
    }, [selectedTemplate, closeModal, fetchTemplates]);

    return {
        templates,
        tplLoading,
        selectedTemplate,
        modal,
        tplForm,
        setTplForm,
        setModal,
        submitting,
        error,
        openApply,
        openCreate,
        openDelete,
        closeModal,
        applyToStudent,
        handleTplCreateOrUpdate,
        handleTplDelete,
    };
}
