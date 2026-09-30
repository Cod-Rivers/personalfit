'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    APPOINTMENT_TYPE_LABEL,
    listMyExceptions,
    listMyRecurrences,
    requestException,
    type ExceptionStatus,
    type RecurrenceExceptionResponse,
    type RecurrenceResponse,
} from '@/libs/appointmentService';
import Modal from '@/components/system/Modal';
import { useToast } from '@/components/system/Toast';
import s from '@/app/agendamentos/agendamentos.module.css';

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

const EXCEPTION_LABEL: Record<ExceptionStatus, string> = {
    pending: 'Aguardando o personal',
    accepted: 'Aceito',
    rejected: 'Recusado',
};

const EXCEPTION_COLOR: Record<ExceptionStatus, string> = {
    pending: 'statusPending',
    accepted: 'statusConfirmed',
    rejected: 'statusMissed',
};

function describeDays(days: number[]): string {
    const names = [...days].sort((a, b) => a - b).map((d) => WEEKDAYS[d]);
    if (names.length <= 1) return names.join('');
    return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

function formatDay(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

/** YYYY-MM-DD de hoje no fuso local (o input type=date também é local). */
function todayLocal(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type Mode = 'skip' | 'move';

/**
 * Aulas fixas do aluno em /agendamentos, com o pedido de alteração de UMA
 * data: faltar naquele dia ou remarcar para outro dia/horário. O personal
 * aceita ou recusa na Agenda dele e o aluno acompanha o status aqui.
 */
export default function MyRecurrencesSection() {
    const { showSuccess, ToastSlot } = useToast();
    const [recurrences, setRecurrences] = useState<RecurrenceResponse[]>([]);
    const [exceptions, setExceptions] = useState<Record<string, RecurrenceExceptionResponse[]>>({});
    const [target, setTarget] = useState<RecurrenceResponse | null>(null);
    const [date, setDate] = useState('');
    const [mode, setMode] = useState<Mode>('skip');
    const [newDay, setNewDay] = useState(1);
    const [newStart, setNewStart] = useState('');
    const [newEnd, setNewEnd] = useState('');
    const [reason, setReason] = useState('');
    const [sending, setSending] = useState(false);
    const [formError, setFormError] = useState('');

    const load = useCallback(async () => {
        try {
            const recs = await listMyRecurrences();
            setRecurrences(recs);
            const pairs = await Promise.all(
                recs.map(async (r) => [r.id, await listMyExceptions(r.id).catch(() => [])] as const),
            );
            setExceptions(Object.fromEntries(pairs));
        } catch {
            setRecurrences([]);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    if (recurrences.length === 0) return null;

    const openRequest = (r: RecurrenceResponse) => {
        setTarget(r);
        setDate('');
        setMode('skip');
        setNewDay(r.days_of_week[0] ?? 1);
        setNewStart(r.start_time);
        setNewEnd(r.end_time);
        setReason('');
        setFormError('');
    };

    const submit = async () => {
        if (!target) return;
        setFormError('');
        if (!date) {
            setFormError('Escolha a data da aula.');
            return;
        }
        // getDay de uma data "YYYY-MM-DD" lida como local, não UTC.
        const [y, m, d] = date.split('-').map(Number);
        const original = new Date(y, m - 1, d);
        if (!target.days_of_week.includes(original.getDay())) {
            setFormError(`Nessa data não há aula: ela acontece ${describeDays(target.days_of_week)}.`);
            return;
        }
        if (mode === 'move' && (!newStart || !newEnd || newEnd <= newStart)) {
            setFormError('Informe o novo horário (o fim precisa ser depois do início).');
            return;
        }
        const [hh, mm] = target.start_time.split(':').map(Number);
        original.setHours(hh, mm, 0, 0);

        setSending(true);
        try {
            await requestException(target.id, {
                original_date: original.toISOString(),
                ...(mode === 'move'
                    ? { new_day_of_week: newDay, new_start_time: newStart, new_end_time: newEnd }
                    : {}),
                reason: reason.trim() || undefined,
            });
            setTarget(null);
            showSuccess('Pedido enviado ao seu personal.');
            await load();
        } catch {
            setFormError('Não foi possível enviar o pedido. Tente de novo.');
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            <h2 className={s.headerTitle} style={{ fontSize: '1.1rem', margin: '1.5rem 0 0.75rem' }}>
                Aulas fixas
            </h2>
            <div className={s.apptList}>
                {recurrences.map((r) => {
                    const requests = exceptions[r.id] ?? [];
                    return (
                        <div key={r.id} className={s.apptCard}>
                            <div className={s.apptCardTop}>
                                <span className={s.typeBadge}>{APPOINTMENT_TYPE_LABEL[r.type]}</span>
                            </div>
                            <p className={s.apptTime}>
                                Toda {describeDays(r.days_of_week)}, das {r.start_time} às {r.end_time}
                            </p>
                            {r.notes && <p className={s.apptNotes}>{r.notes}</p>}

                            {requests.length > 0 && (
                                <ul className="list-unstyled mb-2" style={{ fontSize: '0.85rem' }}>
                                    {requests.map((e) => (
                                        <li key={e.id} className="d-flex flex-wrap align-items-center gap-2 mb-1">
                                            <span>
                                                {formatDay(e.original_date)}
                                                {e.new_day_of_week !== undefined && e.new_start_time
                                                    ? ` → ${WEEKDAYS[e.new_day_of_week]}, ${e.new_start_time}`
                                                    : ' · falta avisada'}
                                            </span>
                                            <span className={`${s.statusBadge} ${s[EXCEPTION_COLOR[e.status]]}`}>
                                                {EXCEPTION_LABEL[e.status]}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <div className={s.apptActions}>
                                <button className={s.btnSecondary} onClick={() => openRequest(r)}>
                                    Pedir alteração numa data
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <Modal
                open={!!target}
                onClose={() => !sending && setTarget(null)}
                title="Pedir alteração numa data"
            >
                {target && (
                    <div className={s.form}>
                        <label className={s.label}>
                            Data da aula
                            <input
                                type="date"
                                className={s.input}
                                min={todayLocal()}
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </label>

                        <fieldset className={s.label} style={{ border: 'none', padding: 0, margin: 0 }}>
                            <legend style={{ fontSize: 'inherit', marginBottom: '0.3rem' }}>O que você precisa?</legend>
                            <label className="d-flex align-items-center gap-2">
                                <input type="radio" checked={mode === 'skip'} onChange={() => setMode('skip')} />
                                Não vou nesta data
                            </label>
                            <label className="d-flex align-items-center gap-2">
                                <input type="radio" checked={mode === 'move'} onChange={() => setMode('move')} />
                                Remarcar para outro dia ou horário
                            </label>
                        </fieldset>

                        {mode === 'move' && (
                            <>
                                <label className={s.label}>
                                    Novo dia da semana
                                    <select className={s.input} value={newDay} onChange={(e) => setNewDay(Number(e.target.value))}>
                                        {WEEKDAYS.map((name, i) => (
                                            <option key={i} value={i}>
                                                {name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <div className="d-flex gap-2">
                                    <label className={s.label} style={{ flex: 1 }}>
                                        Início
                                        <input type="time" className={s.input} value={newStart} onChange={(e) => setNewStart(e.target.value)} />
                                    </label>
                                    <label className={s.label} style={{ flex: 1 }}>
                                        Fim
                                        <input type="time" className={s.input} value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
                                    </label>
                                </div>
                            </>
                        )}

                        <label className={s.label}>
                            Motivo (opcional)
                            <textarea
                                className={s.input}
                                rows={2}
                                maxLength={300}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </label>

                        {formError && <p className={s.errorMsg}>{formError}</p>}

                        <div className="d-flex gap-2 justify-content-end">
                            <button className={s.btnSecondary} onClick={() => setTarget(null)} disabled={sending}>
                                Voltar
                            </button>
                            <button className={s.btnPrimary} onClick={submit} disabled={sending}>
                                {sending ? 'Enviando...' : 'Enviar pedido'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
            {ToastSlot}
        </>
    );
}
