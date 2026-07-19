'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    listPersonalAppointments,
    listAllRecurrences,
    createAppointment,
    updateAppointmentStatus,
    deleteAppointment,
    createRecurrence,
    deleteRecurrence,
    updateCancelAdvanceHours,
    createException,
    listExceptions,
    acceptException,
    rejectException,
    APPOINTMENT_TYPE_LABEL,
    APPOINTMENT_STATUS_LABEL,
    EXCEPTION_STATUS_LABEL,
    DAY_OF_WEEK_LABEL,
    type AppointmentResponse,
    type AppointmentStatus,
    type AppointmentType,
    type ExceptionStatus,
    type RecurrenceResponse,
    type RecurrenceExceptionResponse,
    type CreateAppointmentRequest,
    type CreateRecurrenceRequest,
} from '@/libs/appointmentService';
import { Api } from '@/libs/api';
import s from './agenda.module.css';

interface UserData {
    id: string;
    name: string;
    role: string;
    cancel_advance_hours?: number;
}
interface Student {
    id: string;
    name: string;
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

export default function AgendaPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserData | null>(null);
    const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
    const [recurrences, setRecurrences] = useState<RecurrenceResponse[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [cancelAdvanceHours, setCancelAdvanceHours] = useState(24);
    const [savingAdvanceHours, setSavingAdvanceHours] = useState(false);

    type Tab = 'appointments' | 'recurrences';
    const [tab, setTab] = useState<Tab>('appointments');

    // Filter
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

    // Modals
    const [showApptModal, setShowApptModal] = useState(false);
    const [showRecModal, setShowRecModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [apptForm, setApptForm] = useState<CreateAppointmentRequest>({
        student_id: '',
        type: 'presencial',
        start_at: '',
        end_at: '',
        meeting_link: '',
        notes: '',
    });
    const [recForm, setRecForm] = useState<CreateRecurrenceRequest>({
        student_id: '',
        type: 'presencial',
        days_of_week: [],
        start_time: '08:00',
        end_time: '09:00',
        meeting_link: '',
        notes: '',
        active_until: '',
    });

    // Exception state
    const [exceptions, setExceptions] = useState<
        Record<string, RecurrenceExceptionResponse[]>
    >({});
    const [showExcModal, setShowExcModal] = useState<string | null>(null); // recurrence ID or null
    const [excForm, setExcForm] = useState({
        original_date: '',
        new_day_of_week: undefined as number | undefined,
        new_start_time: '',
        new_end_time: '',
        reason: '',
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
        if (parsed.role !== 'personal') {
            router.replace('/app');
            return;
        }
        setUser(parsed);
        setCancelAdvanceHours(parsed.cancel_advance_hours ?? 24);
    }, [router]);

    /* ── Fetch students ── */
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        Api.get<Student[]>('/students', { headers: { Authorization: token } })
            .then((r) => setStudents(r.data))
            .catch(() => {});
    }, []);

    /* ── Fetch appointments ── */
    const fetchAppointments = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listPersonalAppointments(filterFrom, filterTo);
            setAppointments(data ?? []);
        } catch {
            setError('Erro ao carregar agendamentos.');
        } finally {
            setLoading(false);
        }
    }, [filterFrom, filterTo]);

    /* ── Fetch recurrences ── */
    const fetchRecurrences = useCallback(async () => {
        try {
            const data = await listAllRecurrences();
            setRecurrences(data ?? []);
        } catch {
            setError('Erro ao carregar recorrências.');
        }
    }, []);

    useEffect(() => {
        if (!user) return;
        fetchAppointments();
        fetchRecurrences();
    }, [user, fetchAppointments, fetchRecurrences]);

    /* ── Handlers ── */
    async function handleCreateAppointment(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            await createAppointment({
                ...apptForm,
                start_at: new Date(apptForm.start_at).toISOString(),
                end_at: new Date(apptForm.end_at).toISOString(),
            });
            setShowApptModal(false);
            setApptForm({
                student_id: '',
                type: 'presencial',
                start_at: '',
                end_at: '',
                meeting_link: '',
                notes: '',
            });
            fetchAppointments();
        } catch {
            setError('Erro ao criar agendamento.');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleStatus(id: string, status: AppointmentStatus) {
        try {
            await updateAppointmentStatus(id, status);
            setAppointments((prev) =>
                prev.map((a) => (a.id === id ? { ...a, status } : a)),
            );
        } catch {
            setError('Erro ao atualizar status.');
        }
    }

    async function handleDeleteAppt(id: string) {
        if (!confirm('Remover este agendamento?')) return;
        try {
            await deleteAppointment(id);
            setAppointments((prev) => prev.filter((a) => a.id !== id));
        } catch {
            setError('Erro ao remover agendamento.');
        }
    }

    async function handleCreateRecurrence(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                ...recForm,
                active_until: recForm.active_until
                    ? new Date(recForm.active_until).toISOString()
                    : undefined,
            };
            await createRecurrence(recForm.student_id, payload);
            setShowRecModal(false);
            setRecForm({
                student_id: '',
                type: 'presencial',
                days_of_week: [],
                start_time: '08:00',
                end_time: '09:00',
                meeting_link: '',
                notes: '',
                active_until: '',
            });
            fetchRecurrences();
        } catch {
            setError('Erro ao criar recorrência.');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDeleteRec(id: string) {
        if (!confirm('Remover esta recorrência?')) return;
        try {
            await deleteRecurrence(id);
            setRecurrences((prev) => prev.filter((r) => r.id !== id));
        } catch {
            setError('Erro ao remover recorrência.');
        }
    }

    async function handleSaveAdvanceHours() {
        setSavingAdvanceHours(true);
        try {
            await updateCancelAdvanceHours(cancelAdvanceHours);
            // Atualizar localStorage para manter sincronia
            const stored = localStorage.getItem('user');
            if (stored) {
                const parsed = JSON.parse(stored);
                parsed.cancel_advance_hours = cancelAdvanceHours;
                localStorage.setItem('user', JSON.stringify(parsed));
            }
        } catch {
            setError('Erro ao salvar configuração.');
        } finally {
            setSavingAdvanceHours(false);
        }
    }

    async function fetchExceptions(recId: string) {
        try {
            const data = await listExceptions(recId);
            setExceptions((prev) => ({ ...prev, [recId]: data ?? [] }));
        } catch {
            /* silently ignore */
        }
    }

    async function handleCreateException(recId: string) {
        try {
            const payload = {
                original_date: new Date(excForm.original_date).toISOString(),
                new_day_of_week: excForm.new_day_of_week,
                new_start_time: excForm.new_start_time || undefined,
                new_end_time: excForm.new_end_time || undefined,
                reason: excForm.reason || undefined,
            };
            await createException(recId, payload);
            setShowExcModal(null);
            setExcForm({
                original_date: '',
                new_day_of_week: undefined,
                new_start_time: '',
                new_end_time: '',
                reason: '',
            });
            fetchExceptions(recId);
        } catch {
            setError('Erro ao criar exceção.');
        }
    }

    async function handleAcceptException(excId: string, recId: string) {
        try {
            await acceptException(excId);
            fetchExceptions(recId);
        } catch {
            setError('Erro ao aceitar exceção.');
        }
    }

    async function handleRejectException(excId: string, recId: string) {
        try {
            await rejectException(excId);
            fetchExceptions(recId);
        } catch {
            setError('Erro ao rejeitar exceção.');
        }
    }

    const studentName = (id: string) =>
        students.find((s) => s.id === id)?.name ?? id.slice(-6);

    if (!user) return null;

    return (
        <div className={s.page}>
            <div className={s.container}>
                {/* Header */}
                <div className={s.header}>
                    <div>
                        <h1 className={s.headerTitle}>Agenda</h1>
                        <p className={s.headerSub}>
                            Controle de agendamentos e presença
                        </p>
                    </div>
                    <button
                        className={s.btnBack}
                        onClick={() => router.push('/personal')}
                    >
                        ← Voltar
                    </button>
                </div>

                {error && <p className={s.errorMsg}>{error}</p>}

                {/* Tabs */}
                <div className={s.tabs}>
                    <button
                        className={`${s.tabBtn} ${tab === 'appointments' ? s.tabActive : ''}`}
                        onClick={() => setTab('appointments')}
                    >
                        Agendamentos
                    </button>
                    <button
                        className={`${s.tabBtn} ${tab === 'recurrences' ? s.tabActive : ''}`}
                        onClick={() => setTab('recurrences')}
                    >
                        Recorrências
                    </button>
                </div>

                {/* ── Configuração: antecedência para cancelamento ── */}
                <div className={s.advanceConfig}>
                    <span className={s.advanceConfigLabel}>
                        Antecedência mínima para cancelamento sem débito:
                    </span>
                    <input
                        type="number"
                        min={1}
                        max={720}
                        className={s.advanceConfigInput}
                        value={cancelAdvanceHours}
                        onChange={(e) =>
                            setCancelAdvanceHours(Number(e.target.value))
                        }
                    />
                    <span className={s.advanceConfigUnit}>horas</span>
                    <button
                        className={s.btnSaveAdvance}
                        onClick={handleSaveAdvanceHours}
                        disabled={savingAdvanceHours}
                    >
                        {savingAdvanceHours ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>

                {/* ── APPOINTMENTS TAB ── */}
                {tab === 'appointments' && (
                    <>
                        <div className={s.toolbar}>
                            <div className={s.dateRange}>
                                <label>
                                    De{' '}
                                    <input
                                        type="date"
                                        value={filterFrom}
                                        onChange={(e) =>
                                            setFilterFrom(e.target.value)
                                        }
                                        className={s.dateInput}
                                    />
                                </label>
                                <label>
                                    Até{' '}
                                    <input
                                        type="date"
                                        value={filterTo}
                                        onChange={(e) =>
                                            setFilterTo(e.target.value)
                                        }
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
                                onClick={() => setShowApptModal(true)}
                            >
                                + Agendar
                            </button>
                        </div>

                        {loading ? (
                            <p className={s.loadingMsg}>Carregando...</p>
                        ) : appointments.length === 0 ? (
                            <p className={s.emptyMsg}>
                                Nenhum agendamento no período.
                            </p>
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
                                            <span className={s.createdByBadge}>
                                                {a.created_by === 'student'
                                                    ? '(solicitado pelo aluno)'
                                                    : ''}
                                            </span>
                                        </div>
                                        <p className={s.apptStudent}>
                                            <strong>
                                                {studentName(a.student_id)}
                                            </strong>
                                        </p>
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
                                            <p className={s.apptNotes}>
                                                {a.notes}
                                            </p>
                                        )}

                                        <div className={s.apptActions}>
                                            <button
                                                className={s.btnAttended}
                                                onClick={() =>
                                                    handleStatus(
                                                        a.id,
                                                        'attended',
                                                    )
                                                }
                                            >
                                                ✓ Presente
                                            </button>
                                            <button
                                                className={s.btnMissed}
                                                onClick={() =>
                                                    handleStatus(a.id, 'missed')
                                                }
                                            >
                                                ✗ Faltou
                                            </button>
                                            <button
                                                className={s.btnConfirm}
                                                onClick={() =>
                                                    handleStatus(
                                                        a.id,
                                                        'confirmed',
                                                    )
                                                }
                                            >
                                                Confirmar
                                            </button>
                                            <button
                                                className={s.btnCancel}
                                                onClick={() =>
                                                    handleStatus(
                                                        a.id,
                                                        'cancelled',
                                                    )
                                                }
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                className={s.btnCancelAdvance}
                                                onClick={() =>
                                                    handleStatus(
                                                        a.id,
                                                        'cancelled_advance',
                                                    )
                                                }
                                                title="Cancelou com antecedência — aula não descontada"
                                            >
                                                ⏮ Antecipado
                                            </button>
                                            <button
                                                className={s.btnDelete}
                                                onClick={() =>
                                                    handleDeleteAppt(a.id)
                                                }
                                            >
                                                🗑
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ── RECURRENCES TAB ── */}
                {tab === 'recurrences' && (
                    <>
                        <div className={s.toolbar}>
                            <button
                                className={s.btnPrimary}
                                onClick={() => setShowRecModal(true)}
                            >
                                + Nova Recorrência
                            </button>
                        </div>

                        {recurrences.length === 0 ? (
                            <p className={s.emptyMsg}>
                                Nenhuma recorrência cadastrada.
                            </p>
                        ) : (
                            <div className={s.recList}>
                                {recurrences.map((r) => (
                                    <div key={r.id} className={s.recCard}>
                                        <div className={s.recCardTop}>
                                            <span
                                                className={`${s.typeBadge} ${s[TYPE_COLOR[r.type as AppointmentType]]}`}
                                            >
                                                {
                                                    APPOINTMENT_TYPE_LABEL[
                                                        r.type as AppointmentType
                                                    ]
                                                }
                                            </span>
                                            {(r.days_of_week ?? []).map((d) => (
                                                <span
                                                    key={d}
                                                    className={s.recDay}
                                                >
                                                    {DAY_OF_WEEK_LABEL[d]}
                                                </span>
                                            ))}
                                        </div>
                                        <p className={s.apptStudent}>
                                            <strong>
                                                {studentName(r.student_id)}
                                            </strong>
                                        </p>
                                        <p className={s.apptTime}>
                                            {r.start_time} – {r.end_time}
                                        </p>
                                        {r.active_until && (
                                            <p className={s.apptNotes}>
                                                Até{' '}
                                                {new Date(
                                                    r.active_until,
                                                ).toLocaleDateString('pt-BR')}
                                            </p>
                                        )}
                                        {r.meeting_link && (
                                            <a
                                                className={s.meetingLink}
                                                href={r.meeting_link}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                🔗 Link
                                            </a>
                                        )}

                                        {/* Exceptions */}
                                        <div className={s.exceptionList}>
                                            {!exceptions[r.id] ? (
                                                <button
                                                    className={s.btnSecondary}
                                                    onClick={() =>
                                                        fetchExceptions(r.id)
                                                    }
                                                    style={{
                                                        fontSize: '0.8rem',
                                                        padding:
                                                            '0.3rem 0.6rem',
                                                    }}
                                                >
                                                    Carregar exceções
                                                </button>
                                            ) : exceptions[r.id].length ===
                                              0 ? (
                                                <p
                                                    style={{
                                                        fontSize: '0.8rem',
                                                        color: 'var(--text-secondary)',
                                                    }}
                                                >
                                                    Nenhuma exceção
                                                </p>
                                            ) : (
                                                exceptions[r.id].map((exc) => (
                                                    <div
                                                        key={exc.id}
                                                        className={
                                                            s.exceptionCard
                                                        }
                                                    >
                                                        <div
                                                            className={
                                                                s.exceptionHeader
                                                            }
                                                        >
                                                            <span
                                                                className={
                                                                    s.exceptionDate
                                                                }
                                                            >
                                                                {new Date(
                                                                    exc.original_date,
                                                                ).toLocaleDateString(
                                                                    'pt-BR',
                                                                )}
                                                            </span>
                                                            <span
                                                                className={
                                                                    exc.status ===
                                                                    'accepted'
                                                                        ? s.statusAccepted
                                                                        : exc.status ===
                                                                            'rejected'
                                                                          ? s.statusRejected
                                                                          : s.statusPendingExc
                                                                }
                                                            >
                                                                {
                                                                    EXCEPTION_STATUS_LABEL[
                                                                        exc.status as ExceptionStatus
                                                                    ]
                                                                }
                                                            </span>
                                                            {exc.new_day_of_week !==
                                                                undefined &&
                                                                exc.new_day_of_week !==
                                                                    null && (
                                                                    <span
                                                                        style={{
                                                                            fontSize:
                                                                                '0.8rem',
                                                                            color: 'var(--text-secondary)',
                                                                        }}
                                                                    >
                                                                        →{' '}
                                                                        {
                                                                            DAY_OF_WEEK_LABEL[
                                                                                exc
                                                                                    .new_day_of_week
                                                                            ]
                                                                        }
                                                                    </span>
                                                                )}
                                                            {exc.new_start_time &&
                                                                exc.new_end_time && (
                                                                    <span
                                                                        style={{
                                                                            fontSize:
                                                                                '0.8rem',
                                                                            color: 'var(--text-secondary)',
                                                                        }}
                                                                    >
                                                                        {
                                                                            exc.new_start_time
                                                                        }
                                                                        –
                                                                        {
                                                                            exc.new_end_time
                                                                        }
                                                                    </span>
                                                                )}
                                                        </div>
                                                        {exc.reason && (
                                                            <p
                                                                className={
                                                                    s.exceptionReason
                                                                }
                                                            >
                                                                {exc.reason}
                                                            </p>
                                                        )}
                                                        {exc.status ===
                                                            'pending' && (
                                                            <div
                                                                className={
                                                                    s.exceptionActions
                                                                }
                                                            >
                                                                <button
                                                                    className={
                                                                        s.btnAccept
                                                                    }
                                                                    onClick={() =>
                                                                        handleAcceptException(
                                                                            exc.id,
                                                                            r.id,
                                                                        )
                                                                    }
                                                                >
                                                                    ✓ Aceitar
                                                                </button>
                                                                <button
                                                                    className={
                                                                        s.btnReject
                                                                    }
                                                                    onClick={() =>
                                                                        handleRejectException(
                                                                            exc.id,
                                                                            r.id,
                                                                        )
                                                                    }
                                                                >
                                                                    ✗ Rejeitar
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <div className={s.apptActions}>
                                            <button
                                                className={s.btnSecondary}
                                                onClick={() =>
                                                    setShowExcModal(r.id)
                                                }
                                                style={{ fontSize: '0.8rem' }}
                                            >
                                                + Exceção
                                            </button>
                                            <button
                                                className={s.btnDelete}
                                                onClick={() =>
                                                    handleDeleteRec(r.id)
                                                }
                                            >
                                                🗑 Remover
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Modal: Novo Agendamento ── */}
            {showApptModal && (
                <div
                    className={s.modalOverlay}
                    onClick={() => setShowApptModal(false)}
                >
                    <div
                        className={s.modalCard}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className={s.modalTitle}>Novo Agendamento</h2>
                        <form
                            onSubmit={handleCreateAppointment}
                            className={s.form}
                        >
                            <label className={s.label}>
                                Aluno
                                <select
                                    className={s.input}
                                    value={apptForm.student_id}
                                    onChange={(e) =>
                                        setApptForm((f) => ({
                                            ...f,
                                            student_id: e.target.value,
                                        }))
                                    }
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {students.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className={s.label}>
                                Tipo
                                <select
                                    className={s.input}
                                    value={apptForm.type}
                                    onChange={(e) =>
                                        setApptForm((f) => ({
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
                                Início
                                <input
                                    type="datetime-local"
                                    className={s.input}
                                    value={apptForm.start_at}
                                    onChange={(e) => {
                                        const start = e.target.value;
                                        setApptForm((f) => {
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
                                Fim
                                <input
                                    type="datetime-local"
                                    className={s.input}
                                    value={apptForm.end_at}
                                    min={apptForm.start_at || undefined}
                                    onChange={(e) =>
                                        setApptForm((f) => ({
                                            ...f,
                                            end_at: e.target.value,
                                        }))
                                    }
                                    required
                                />
                            </label>
                            {apptForm.type === 'online' && (
                                <label className={s.label}>
                                    Link da reunião
                                    <input
                                        type="url"
                                        className={s.input}
                                        placeholder="https://..."
                                        value={apptForm.meeting_link}
                                        onChange={(e) =>
                                            setApptForm((f) => ({
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
                                    value={apptForm.notes}
                                    onChange={(e) =>
                                        setApptForm((f) => ({
                                            ...f,
                                            notes: e.target.value,
                                        }))
                                    }
                                />
                            </label>
                            <div className={s.modalActions}>
                                <button
                                    type="button"
                                    className={s.btnSecondary}
                                    onClick={() => setShowApptModal(false)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className={s.btnPrimary}
                                    disabled={submitting}
                                >
                                    {submitting ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Modal: Nova Recorrência ── */}
            {showRecModal && (
                <div
                    className={s.modalOverlay}
                    onClick={() => setShowRecModal(false)}
                >
                    <div
                        className={s.modalCard}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className={s.modalTitle}>Nova Recorrência</h2>
                        <form
                            onSubmit={handleCreateRecurrence}
                            className={s.form}
                        >
                            <label className={s.label}>
                                Aluno
                                <select
                                    className={s.input}
                                    value={recForm.student_id}
                                    onChange={(e) =>
                                        setRecForm((f) => ({
                                            ...f,
                                            student_id: e.target.value,
                                        }))
                                    }
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {students.map((st) => (
                                        <option key={st.id} value={st.id}>
                                            {st.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className={s.label}>
                                Tipo
                                <select
                                    className={s.input}
                                    value={recForm.type}
                                    onChange={(e) =>
                                        setRecForm((f) => ({
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
                                Dias da semana
                                <div className={s.dayCheckboxes}>
                                    {DAY_OF_WEEK_LABEL.map((d, i) => {
                                        const active =
                                            recForm.days_of_week.includes(i);
                                        return (
                                            <label
                                                key={i}
                                                className={`${s.dayCheckbox} ${active ? s.dayCheckboxActive : ''}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={active}
                                                    onChange={() =>
                                                        setRecForm((f) => ({
                                                            ...f,
                                                            days_of_week: active
                                                                ? f.days_of_week.filter(
                                                                      (x) =>
                                                                          x !==
                                                                          i,
                                                                  )
                                                                : [
                                                                      ...f.days_of_week,
                                                                      i,
                                                                  ].sort(),
                                                        }))
                                                    }
                                                />
                                                {d}
                                            </label>
                                        );
                                    })}
                                </div>
                            </label>
                            <div className={s.row}>
                                <label className={s.label}>
                                    Início
                                    <input
                                        type="time"
                                        className={s.input}
                                        value={recForm.start_time}
                                        onChange={(e) =>
                                            setRecForm((f) => ({
                                                ...f,
                                                start_time: e.target.value,
                                            }))
                                        }
                                        required
                                    />
                                </label>
                                <label className={s.label}>
                                    Fim
                                    <input
                                        type="time"
                                        className={s.input}
                                        value={recForm.end_time}
                                        onChange={(e) =>
                                            setRecForm((f) => ({
                                                ...f,
                                                end_time: e.target.value,
                                            }))
                                        }
                                        required
                                    />
                                </label>
                            </div>
                            {recForm.type === 'online' && (
                                <label className={s.label}>
                                    Link da reunião
                                    <input
                                        type="url"
                                        className={s.input}
                                        placeholder="https://..."
                                        value={recForm.meeting_link}
                                        onChange={(e) =>
                                            setRecForm((f) => ({
                                                ...f,
                                                meeting_link: e.target.value,
                                            }))
                                        }
                                    />
                                </label>
                            )}
                            <label className={s.label}>
                                Ativo até (opcional)
                                <input
                                    type="date"
                                    className={s.input}
                                    value={recForm.active_until}
                                    onChange={(e) =>
                                        setRecForm((f) => ({
                                            ...f,
                                            active_until: e.target.value,
                                        }))
                                    }
                                />
                            </label>
                            <label className={s.label}>
                                Observações
                                <textarea
                                    className={s.input}
                                    rows={2}
                                    value={recForm.notes}
                                    onChange={(e) =>
                                        setRecForm((f) => ({
                                            ...f,
                                            notes: e.target.value,
                                        }))
                                    }
                                />
                            </label>
                            <div className={s.modalActions}>
                                <button
                                    type="button"
                                    className={s.btnSecondary}
                                    onClick={() => setShowRecModal(false)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className={s.btnPrimary}
                                    disabled={submitting}
                                >
                                    {submitting ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Modal: Nova Exceção ── */}
            {showExcModal && (
                <div
                    className={s.modalOverlay}
                    onClick={() => setShowExcModal(null)}
                >
                    <div
                        className={s.modalCard}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className={s.modalTitle}>Nova Exceção</h2>
                        <div className={s.form}>
                            <label className={s.label}>
                                Data original
                                <input
                                    type="date"
                                    className={s.input}
                                    value={excForm.original_date}
                                    onChange={(e) =>
                                        setExcForm((f) => ({
                                            ...f,
                                            original_date: e.target.value,
                                        }))
                                    }
                                    required
                                />
                            </label>
                            <label className={s.label}>
                                Novo dia (opcional)
                                <select
                                    className={s.input}
                                    value={excForm.new_day_of_week ?? ''}
                                    onChange={(e) =>
                                        setExcForm((f) => ({
                                            ...f,
                                            new_day_of_week: e.target.value
                                                ? Number(e.target.value)
                                                : undefined,
                                        }))
                                    }
                                >
                                    <option value="">Manter o mesmo</option>
                                    {DAY_OF_WEEK_LABEL.map((d, i) => (
                                        <option key={i} value={i}>
                                            {d}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <div className={s.row}>
                                <label className={s.label}>
                                    Novo início
                                    <input
                                        type="time"
                                        className={s.input}
                                        value={excForm.new_start_time}
                                        onChange={(e) =>
                                            setExcForm((f) => ({
                                                ...f,
                                                new_start_time: e.target.value,
                                            }))
                                        }
                                    />
                                </label>
                                <label className={s.label}>
                                    Novo fim
                                    <input
                                        type="time"
                                        className={s.input}
                                        value={excForm.new_end_time}
                                        onChange={(e) =>
                                            setExcForm((f) => ({
                                                ...f,
                                                new_end_time: e.target.value,
                                            }))
                                        }
                                    />
                                </label>
                            </div>
                            <label className={s.label}>
                                Motivo
                                <textarea
                                    className={s.input}
                                    rows={2}
                                    value={excForm.reason}
                                    onChange={(e) =>
                                        setExcForm((f) => ({
                                            ...f,
                                            reason: e.target.value,
                                        }))
                                    }
                                />
                            </label>
                            <div className={s.modalActions}>
                                <button
                                    type="button"
                                    className={s.btnSecondary}
                                    onClick={() => setShowExcModal(null)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className={s.btnPrimary}
                                    onClick={() =>
                                        handleCreateException(showExcModal)
                                    }
                                    disabled={!excForm.original_date}
                                >
                                    Criar Exceção
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
