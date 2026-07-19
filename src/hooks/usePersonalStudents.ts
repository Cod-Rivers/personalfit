'use client';

import { useCallback, useEffect, useState } from 'react';
import { Api } from '@/libs/api';

export type LinkStatus = 'active' | 'pending' | 'inactive';

export interface Student {
    id: string;
    name: string;
    email: string;
    cpf: string;
    phone: string;
    mobile_phone: string;
    active: boolean;
    link_status: LinkStatus;
    created_at: string;
    avatar?: string;
}

export type StudentModalMode = null | 'invite' | 'edit' | 'unlink';

export interface EditFormData {
    name: string;
    phone: string;
    mobile_phone: string;
}

const emptyEditForm: EditFormData = { name: '', phone: '', mobile_phone: '' };

function extractErrorMessage(err: unknown, fallback: string): string {
    const data = (
        err as { response?: { data?: { error?: string; message?: string } } }
    )?.response?.data;
    return data?.error || data?.message || fallback;
}

/**
 * Encapsula listagem, convite e CRUD de alunos do personal logado.
 * Extraído para ser compartilhado entre a aba "Meus Alunos" e a aba
 * "Ciclos" (que precisa da lista de alunos para o modal de aplicar ciclo).
 */
export function usePersonalStudents(enabled: boolean) {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    const [modal, setModal] = useState<StudentModalMode>(null);
    const [editForm, setEditForm] = useState<EditFormData>(emptyEditForm);
    const [editId, setEditId] = useState<string | null>(null);
    const [unlinkTarget, setUnlinkTarget] = useState<Student | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [inviteLink, setInviteLink] = useState('');
    const [copied, setCopied] = useState(false);
    const [toggleBusyId, setToggleBusyId] = useState<string | null>(null);

    const fetchStudents = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const { data } = await Api.get<Student[]>('/students', {
                headers: { Authorization: token },
            });
            setStudents(data ?? []);
        } catch {
            setStudents([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (enabled) fetchStudents();
    }, [enabled, fetchStudents]);

    const closeModal = useCallback(() => {
        setModal(null);
        setEditId(null);
        setUnlinkTarget(null);
        setError('');
        setInviteLink('');
        setCopied(false);
    }, []);

    const openInvite = useCallback(async () => {
        setError('');
        setInviteLink('');
        setCopied(false);
        setSubmitting(true);
        setModal('invite');
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Sessão expirada. Faça login novamente.');
            setSubmitting(false);
            return;
        }
        try {
            const { data } = await Api.post<{ link: string }>(
                '/students/invite',
                {},
                { headers: { Authorization: token } },
            );
            setInviteLink(data.link);
        } catch (err: unknown) {
            setError(extractErrorMessage(err, 'Erro ao gerar convite.'));
        } finally {
            setSubmitting(false);
        }
    }, []);

    const retryInvite = useCallback(() => openInvite(), [openInvite]);

    const copyLink = useCallback(async () => {
        if (!inviteLink) return;
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setError('Não foi possível copiar o link. Copie manualmente.');
        }
    }, [inviteLink]);

    const openEdit = useCallback((st: Student) => {
        setEditForm({
            name: st.name,
            phone: st.phone,
            mobile_phone: st.mobile_phone,
        });
        setEditId(st.id);
        setError('');
        setModal('edit');
    }, []);

    const openUnlink = useCallback((st: Student) => {
        setUnlinkTarget(st);
        setError('');
        setModal('unlink');
    }, []);

    const handleEditInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setEditForm((prev) => ({
                ...prev,
                [e.target.name]: e.target.value,
            }));
        },
        [],
    );

    const handleUpdate = useCallback(async () => {
        if (!editId) return;
        setSubmitting(true);
        setError('');
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Sessão expirada. Faça login novamente.');
            setSubmitting(false);
            return;
        }
        try {
            await Api.put(
                `/students/${editId}`,
                {
                    name: editForm.name || undefined,
                    phone: editForm.phone || undefined,
                    mobile_phone: editForm.mobile_phone || undefined,
                },
                { headers: { Authorization: token } },
            );
            closeModal();
            fetchStudents();
        } catch (err: unknown) {
            setError(extractErrorMessage(err, 'Erro ao atualizar aluno.'));
        } finally {
            setSubmitting(false);
        }
    }, [editId, editForm, closeModal, fetchStudents]);

    const handleUnlink = useCallback(async () => {
        if (!unlinkTarget) return;
        setSubmitting(true);
        setError('');
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Sessão expirada. Faça login novamente.');
            setSubmitting(false);
            return;
        }
        try {
            await Api.delete(`/students/${unlinkTarget.id}`, {
                headers: { Authorization: token },
            });
            closeModal();
            fetchStudents();
        } catch (err: unknown) {
            setError(extractErrorMessage(err, 'Erro ao desvincular aluno.'));
        } finally {
            setSubmitting(false);
        }
    }, [unlinkTarget, closeModal, fetchStudents]);

    // Solicita a ativação do vínculo — o aluno precisa confirmar antes de
    // ficar realmente ativo (fica "pending" até lá).
    const requestActivation = useCallback(
        async (st: Student) => {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Sessão expirada. Faça login novamente.');
                return;
            }
            setError('');
            setToggleBusyId(st.id);
            try {
                await Api.post(
                    `/students/${st.id}/request-activation`,
                    {},
                    { headers: { Authorization: token } },
                );
                await fetchStudents();
            } catch (err: unknown) {
                setError(
                    extractErrorMessage(
                        err,
                        'Erro ao solicitar ativação do aluno.',
                    ),
                );
            } finally {
                setToggleBusyId(null);
            }
        },
        [fetchStudents],
    );

    // Desativa o vínculo — ação instantânea do personal, sem confirmação do aluno.
    const deactivate = useCallback(
        async (st: Student) => {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Sessão expirada. Faça login novamente.');
                return;
            }
            setError('');
            setToggleBusyId(st.id);
            try {
                await Api.put(
                    `/students/${st.id}`,
                    { active: false },
                    { headers: { Authorization: token } },
                );
                await fetchStudents();
            } catch (err: unknown) {
                setError(
                    extractErrorMessage(
                        err,
                        'Erro ao desativar o aluno.',
                    ),
                );
            } finally {
                setToggleBusyId(null);
            }
        },
        [fetchStudents],
    );

    return {
        students,
        loading,
        modal,
        editForm,
        unlinkTarget,
        submitting,
        error,
        inviteLink,
        copied,
        openInvite,
        retryInvite,
        copyLink,
        openEdit,
        openUnlink,
        closeModal,
        handleEditInput,
        handleUpdate,
        handleUnlink,
        requestActivation,
        deactivate,
        toggleBusyId,
    };
}
