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

export type StudentModalMode = null | 'preregister' | 'edit' | 'unlink';

export interface EditFormData {
    name: string;
    phone: string;
    mobile_phone: string;
}

export interface PreRegisterFormData {
    name: string;
    email: string;
    birth_date: string;
    gender: string;
    cpf: string;
    phone: string;
}

const emptyEditForm: EditFormData = { name: '', phone: '', mobile_phone: '' };

const emptyPreRegisterForm: PreRegisterFormData = {
    name: '',
    email: '',
    birth_date: '',
    gender: '',
    cpf: '',
    phone: '',
};

function extractErrorMessage(err: unknown, fallback: string): string {
    const data = (
        err as { response?: { data?: { error?: string; message?: string } } }
    )?.response?.data;
    return data?.error || data?.message || fallback;
}

/**
 * Encapsula listagem, pré-cadastro e CRUD de alunos do personal logado.
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
    const [toggleBusyId, setToggleBusyId] = useState<string | null>(null);

    const [preRegisterForm, setPreRegisterForm] =
        useState<PreRegisterFormData>(emptyPreRegisterForm);
    const [preRegisterResult, setPreRegisterResult] = useState<{
        email: string;
        emailSent: boolean;
        linkRequested: boolean;
    } | null>(null);

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
        setPreRegisterForm(emptyPreRegisterForm);
        setPreRegisterResult(null);
    }, []);

    const openPreRegister = useCallback(() => {
        setError('');
        setPreRegisterForm(emptyPreRegisterForm);
        setPreRegisterResult(null);
        setModal('preregister');
    }, []);

    const handlePreRegisterInput = useCallback(
        (
            e: React.ChangeEvent<
                HTMLInputElement | HTMLSelectElement
            >,
        ) => {
            setPreRegisterForm((prev) => ({
                ...prev,
                [e.target.name]: e.target.value,
            }));
        },
        [],
    );

    const submitPreRegister = useCallback(async () => {
        setError('');
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Sessão expirada. Faça login novamente.');
            return;
        }
        setSubmitting(true);
        try {
            // O painel só coleta um campo de telefone; o mesmo valor é
            // enviado como telefone e celular (mesma prática do cadastro
            // geral, ver SignUp/index.tsx).
            const { data } = await Api.post<{
                email: string;
                email_sent?: boolean;
                link_requested?: boolean;
            }>(
                '/students',
                {
                    name: preRegisterForm.name,
                    email: preRegisterForm.email,
                    birth_date: preRegisterForm.birth_date,
                    gender: preRegisterForm.gender,
                    cpf: preRegisterForm.cpf,
                    phone: preRegisterForm.phone,
                    mobile_phone: preRegisterForm.phone,
                },
                { headers: { Authorization: token } },
            );
            setPreRegisterResult({
                email: data.email,
                emailSent: !!data.email_sent,
                linkRequested: !!data.link_requested,
            });
            await fetchStudents();
        } catch (err: unknown) {
            setError(extractErrorMessage(err, 'Erro ao cadastrar aluno.'));
        } finally {
            setSubmitting(false);
        }
    }, [preRegisterForm, fetchStudents]);

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
        preRegisterForm,
        preRegisterResult,
        openPreRegister,
        handlePreRegisterInput,
        submitPreRegister,
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
