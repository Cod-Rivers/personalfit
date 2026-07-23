'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    listMyAppointments,
    requestAppointment,
    isPendingProResponse,
    confirmMyAppointment,
    cancelMyAppointment,
    cancelMyAppointmentAdvance,
    APPOINTMENT_TYPE_LABEL,
    APPOINTMENT_STATUS_LABEL,
    type AppointmentResponse,
    type AppointmentStatus,
    type AppointmentType,
    type StudentCreateAppointmentRequest,
} from '@/libs/appointmentService';
import Modal from '@/components/system/Modal';
import s from './agendamentos.module.css';

interface UserData {
    id: string;
    name: string;
    role: string;
    has_personal?: boolean;
}

const STATUS_COLOR: Record<AppointmentStatus, string> = {
    pending: 'statusPending',
    confirmed: 'statusConfirmed',
    attended: 'statusAttended',
    missed: 'statusMissed',
    cancelled: 'statusCancelled',
    cancelled_advance: 'statusCancelledAdvance',
};

const TYPE_COLOR: Record<AppointmentType, string> = {
    presencial: 'typePresencial',
    online: 'typeOnline',
    consultoria: 'typeConsultoria',
};

function formatDate(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function AgendamentosPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserData | null>(null);
    const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const [filterFrom, setFilterFrom] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().slice(0, 10);
    });
    const [filterTo, setFilterTo] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().slice(0, 10);
    });

    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [actionId, setActionId] = useState<string | null>(null);
    const [form, setForm] = useState<StudentCreateAppointmentRequest>({
        type: 'presencial',
        start_at: '',
        end_at: '',
        meeting_link: '',
        notes: '',
    });

    /* ── Auth guard ── */
    useEffect(() => {
        const token = localStorage.getItem('token');
        const stored = localStorage.getItem('user');
        if (!token || !stored) {
            router.replace('/');
            return;
        }
        const parsed: UserData = JSON.parse(stored);
        // Uma conta admin/personal que também é aluna (has_personal) pode
        // acessar seus próprios agendamentos, mesmo sem role=student.
        if (parsed.role !== 'student' && !parsed.has_personal) {
            router.replace('/app');
            return;
        }
        setUser(parsed);
    }, [router]);

    /* ── Fetch ── */
    const fetchAppointments = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listMyAppointments(filterFrom, filterTo);
            setAppointments(data ?? []);
        } catch {
            setError('Erro ao carregar agendamentos.');
        } finally {
            setLoading(false);
        }
    }, [filterFrom, filterTo]);

    useEffect(() => {
        if (!user) return;
        fetchAppointments();
    }, [user, fetchAppointments]);

    /* ── Handlers ── */
    async function handleRequest(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        setNotice('');
        try {
            const result = await requestAppointment({
                ...form,
                start_at: new Date(form.start_at).toISOString(),
                end_at: new Date(form.end_at).toISOString(),
            });
            setShowModal(false);
            setForm({
                type: 'presencial',
                start_at: '',
                end_at: '',
                meeting_link: '',
                notes: '',
            });
            // Personal ainda não é PRO: nenhum agendamento foi criado, mas ele
            // foi avisado do interesse. Informamos o aluno em vez de recarregar.
            if (isPendingProResponse(result)) {
                setNotice(result.message);
            } else {
                fetchAppointments();
            }
        } catch {
            setError('Erro ao solicitar agendamento.');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleConfirm(id: string) {
        if (actionId) return;
        setActionId(id);
        try {
            await confirmMyAppointment(id);
            setAppointments((prev) =>
                prev.map((a) =>
                    a.id === id ? { ...a, status: 'confirmed' } : a,
                ),
            );
        } catch {
            setError('Erro ao confirmar.');
        } finally {
            setActionId(null);
        }
    }

    async function handleCancel(id: string) {
        if (actionId) return;
        if (!confirm('Cancelar este agendamento?')) return;
        setActionId(id);
        try {
            await cancelMyAppointment(id);
            setAppointments((prev) =>
                prev.map((a) =>
                    a.id === id ? { ...a, status: 'cancelled' } : a,
                ),
            );
        } catch {
            setError('Erro ao cancelar.');
        } finally {
            setActionId(null);
        }
    }

    async function handleCancelAdvance(id: string) {
        if (actionId) return;
        if (
            !confirm(
                'Cancelar com antecedência? A aula não será descontada do seu plano.',
            )
        )
            return;
        setActionId(id);
        try {
            await cancelMyAppointmentAdvance(id);
            setAppointments((prev) =>
                prev.map((a) =>
                    a.id === id ? { ...a, status: 'cancelled_advance' } : a,
                ),
            );
        } catch (err: unknown) {
            // Tratar erro 422 com mensagem específica do backend
            const axiosErr = err as {
                response?: {
                    status?: number;
                    data?: { error?: string; required_hours?: number };
                };
            };
            if (axiosErr?.response?.status === 422) {
                const reqHours = axiosErr.response.data?.required_hours;
                setError(
                    reqHours
                        ? `Cancelamento antecipado requer pelo menos ${reqHours}h de aviso. Fora do prazo.`
                        : (axiosErr.response.data?.error ??
                              'Fora do prazo para cancelamento antecipado.'),
                );
            } else {
                setError('Erro ao cancelar.');
            }
        } finally {
            setActionId(null);
        }
    }

    if (!user) return null;

    return (
        <div className={s.page}>
            <div className={s.container}>
                <div className={s.header}>
                    <div>
                        <h1 className={s.headerTitle}>Meus Agendamentos</h1>
                        <p className={s.headerSub}>
                            Consultas e sessões com seu personal
                        </p>
                    </div>
                    <button
                        className={s.btnBack}
                        onClick={() => router.push('/app')}
                    >
                        ← Voltar
                    </button>
                </div>

                {error && <p className={s.errorMsg}>{error}</p>}
                {notice && (
                    <div className="alert alert-info" role="status">
                        {notice}
                    </div>
                )}

                <div className={s.toolbar}>
                    <div className={s.dateRange}>
                        <label>
                            De{' '}
                            <input
                                type="date"
                                value={filterFrom}
                                onChange={(e) => setFilterFrom(e.target.value)}
                                className={s.dateInput}
                            />
                        </label>
                        <label>
                            Até{' '}
                            <input
                                type="date"
                                value={filterTo}
                                onChange={(e) => setFilterTo(e.target.value)}
                                className={s.dateInput}
                            />
                        </label>
                        <button
                            className={s.btnFilter}
                            onClick={fetchAppointments}
                        >
                            Filtrar
                        </button>
                    </div>
                    <button
                        className={s.btnPrimary}
                        onClick={() => setShowModal(true)}
                    >
                        + Solicitar Agendamento
                    </button>
                </div>

                {loading ? (
                    <p className={s.loadingMsg}>Carregando...</p>
                ) : appointments.length === 0 ? (
                    <p className={s.emptyMsg}>Nenhum agendamento no período.</p>
                ) : (
                    <div className={s.apptList}>
                        {appointments.map((a) => (
                            <div key={a.id} className={s.apptCard}>
                                <div className={s.apptCardTop}>
                                    <span
                                        className={`${s.typeBadge} ${s[TYPE_COLOR[a.type as AppointmentType]]}`}
                                    >
                                        {
                                            APPOINTMENT_TYPE_LABEL[
                                                a.type as AppointmentType
                                            ]
                                        }
                                    </span>
                                    <span
                                        className={`${s.statusBadge} ${s[STATUS_COLOR[a.status as AppointmentStatus]]}`}
                                    >
                                        {
                                            APPOINTMENT_STATUS_LABEL[
                                                a.status as AppointmentStatus
                                            ]
                                        }
                                    </span>
                                </div>
                                <p className={s.apptTime}>
                                    {formatDate(a.start_at)} →{' '}
                                    {formatDate(a.end_at)}
                                </p>
                                {a.meeting_link && (
                                    <a
                                        className={s.meetingLink}
                                        href={a.meeting_link}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        🔗 Entrar na reunião
                                    </a>
                                )}
                                {a.notes && (
                                    <p className={s.apptNotes}>{a.notes}</p>
                                )}

                                <div className={s.apptActions}>
                                    {a.status === 'pending' && (
                                        <button
                                            className={s.btnConfirm}
                                            onClick={() => handleConfirm(a.id)}
                                            disabled={actionId !== null}
                                        >
                                            {actionId === a.id
                                                ? 'Confirmando...'
                                                : '✓ Confirmar presença'}
                                        </button>
                                    )}
                                    {(a.status === 'pending' ||
                                        a.status === 'confirmed') && (
                                        <button
                                            className={s.btnCancel}
                                            onClick={() => handleCancel(a.id)}
                                            disabled={actionId !== null}
                                        >
                                            {actionId === a.id
                                                ? 'Cancelando...'
                                                : 'Cancelar'}
                                        </button>
                                    )}
                                    {(a.status === 'pending' ||
                                        a.status === 'confirmed') && (
                                        <button
                                            className={s.btnCancelAdvance}
                                            onClick={() =>
                                                handleCancelAdvance(a.id)
                                            }
                                            disabled={actionId !== null}
                                            title="Cancelar com antecedência — aula não descontada"
                                        >
                                            {actionId === a.id
                                                ? 'Cancelando...'
                                                : '⏮ Cancelar c/ antecedência'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal: Solicitar Agendamento */}
            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                title="Solicitar Agendamento"
                footer={
                    <>
                        <button
                            type="button"
                            className={s.btnSecondary}
                            onClick={() => setShowModal(false)}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="solicitar-agendamento-form"
                            className={s.btnPrimary}
                            disabled={submitting}
                        >
                            {submitting ? 'Enviando...' : 'Solicitar'}
                        </button>
                    </>
                }
            >
                        <form
                            id="solicitar-agendamento-form"
                            onSubmit={handleRequest}
                            className={s.form}
                        >
                            <label className={s.label}>
                                Tipo
                                <select
                                    className={s.input}
                                    value={form.type}
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...f,
                                            type: e.target
                                                .value as AppointmentType,
                                        }))
                                    }
                                    required
                                >
                                    <option value="presencial">
                                        Presencial
                                    </option>
                                    <option value="online">Online</option>
                                    <option value="consultoria">
                                        Consultoria
                                    </option>
                                </select>
                            </label>
                            <label className={s.label}>
                                Data e hora de início
                                <input
                                    type="datetime-local"
                                    className={s.input}
                                    value={form.start_at}
                                    onChange={(e) => {
                                        const start = e.target.value;
                                        setForm((f) => {
                                            let end = f.end_at;
                                            if (start) {
                                                const d = new Date(start);
                                                d.setHours(d.getHours() + 1);
                                                const pad = (n: number) =>
                                                    String(n).padStart(2, '0');
                                                end = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                                            }
                                            return {
                                                ...f,
                                                start_at: start,
                                                end_at: end,
                                            };
                                        });
                                    }}
                                    required
                                />
                            </label>
                            <label className={s.label}>
                                Data e hora de fim
                                <input
                                    type="datetime-local"
                                    className={s.input}
                                    value={form.end_at}
                                    min={form.start_at || undefined}
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...f,
                                            end_at: e.target.value,
                                        }))
                                    }
                                    required
                                />
                            </label>
                            {form.type === 'online' && (
                                <label className={s.label}>
                                    Link da reunião (opcional)
                                    <input
                                        type="url"
                                        className={s.input}
                                        placeholder="https://..."
                                        value={form.meeting_link}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                meeting_link: e.target.value,
                                            }))
                                        }
                                    />
                                </label>
                            )}
                            <label className={s.label}>
                                Observações
                                <textarea
                                    className={s.input}
                                    rows={2}
                                    value={form.notes}
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...f,
                                            notes: e.target.value,
                                        }))
                                    }
                                />
                            </label>
                        </form>
            </Modal>
        </div>
    );
}
