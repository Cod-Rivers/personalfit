'use client';
import { useEffect, useState, useCallback } from 'react';
import { FiX, FiTrash2 } from 'react-icons/fi';
import {
    getAvailability,
    saveAvailability,
    listOverrides,
    saveOverride,
    deleteOverride,
    listBlocks,
    createBlock,
    deleteBlock,
    DAY_LABEL_SHORT,
    type PersonalAvailability,
    type AvailabilityWindow,
    type AvailabilityOverride,
    type AvailabilityBlock,
} from '@/libs/availabilityService';
import type { AppointmentType } from '@/libs/appointmentService';
import Modal from '@/components/system/Modal';
import { useToast } from '@/components/system/Toast';
import s from './AvailabilityEditor.module.css';

const TIMEZONES = [
    { value: 'America/Sao_Paulo', label: 'Brasília (UTC-3)' },
    { value: 'America/Manaus', label: 'Manaus (UTC-4)' },
    { value: 'America/Cuiaba', label: 'Cuiabá (UTC-4)' },
    { value: 'America/Rio_Branco', label: 'Rio Branco (UTC-5)' },
    { value: 'America/Noronha', label: 'Fernando de Noronha (UTC-2)' },
];

const SLOT_DURATIONS = [30, 45, 60, 90];
const BUFFERS = [0, 5, 10, 15, 30];
const TYPE_OPTIONS: { value: AppointmentType; label: string }[] = [
    { value: 'presencial', label: 'Presencial' },
    { value: 'online', label: 'Online' },
    { value: 'consultoria', label: 'Consultoria' },
];

function todayStr(): string {
    return new Date().toISOString().slice(0, 10);
}
function addDaysStr(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

function windowsOverlap(windows: AvailabilityWindow[]): boolean {
    const spans = windows
        .map((w) => [w.start_time, w.end_time])
        .filter(([a, b]) => a && b)
        .sort((a, b) => a[0].localeCompare(b[0]));
    for (let i = 0; i < spans.length; i++) {
        if (spans[i][1] <= spans[i][0]) return true; // fim <= início
        if (i > 0 && spans[i][0] < spans[i - 1][1]) return true;
    }
    return false;
}

export default function AvailabilityEditor() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const { showSuccess, showError, ToastSlot } = useToast();

    const [active, setActive] = useState(false);
    const [timezone, setTimezone] = useState('America/Sao_Paulo');
    const [weekly, setWeekly] = useState<AvailabilityWindow[][]>(
        Array.from({ length: 7 }, () => []),
    );
    const [slotDurationMin, setSlotDurationMin] = useState(60);
    const [bufferMin, setBufferMin] = useState(0);
    const [minNoticeHours, setMinNoticeHours] = useState(12);
    const [maxAdvanceDays, setMaxAdvanceDays] = useState(30);
    const [capacity, setCapacity] = useState(1);
    const [allowedTypes, setAllowedTypes] = useState<Set<AppointmentType>>(
        new Set(['presencial', 'online', 'consultoria']),
    );

    const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
    const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [showBlockModal, setShowBlockModal] = useState(false);
    const [ovrForm, setOvrForm] = useState({
        date: '',
        closed: true,
        windows: [] as AvailabilityWindow[],
        reason: '',
    });
    const [blockForm, setBlockForm] = useState({
        start_at: '',
        end_at: '',
        reason: '',
    });

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const cfg = await getAvailability();
            applyConfig(cfg);
            const from = todayStr();
            const to = addDaysStr(90);
            const [ovrs, blks] = await Promise.all([
                listOverrides(from, to),
                listBlocks(from, to),
            ]);
            setOverrides(ovrs ?? []);
            setBlocks(blks ?? []);
        } catch {
            setError('Erro ao carregar disponibilidade.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    function applyConfig(cfg: PersonalAvailability) {
        setActive(cfg.active);
        setTimezone(cfg.timezone || 'America/Sao_Paulo');
        const next: AvailabilityWindow[][] = Array.from({ length: 7 }, () => []);
        for (const d of cfg.weekly ?? []) {
            if (d.day_of_week >= 0 && d.day_of_week <= 6) {
                next[d.day_of_week] = d.windows ?? [];
            }
        }
        setWeekly(next);
        setSlotDurationMin(cfg.slot_duration_min || 60);
        setBufferMin(cfg.buffer_min ?? 0);
        setMinNoticeHours(cfg.min_notice_hours ?? 12);
        setMaxAdvanceDays(cfg.max_advance_days || 30);
        setCapacity(cfg.capacity || 1);
        setAllowedTypes(
            new Set(
                (cfg.allowed_types?.length
                    ? cfg.allowed_types
                    : ['presencial', 'online', 'consultoria']) as AppointmentType[],
            ),
        );
    }

    /* ── Grade semanal ── */

    function toggleDay(day: number) {
        setWeekly((prev) => {
            const next = [...prev];
            next[day] = next[day].length > 0
                ? []
                : [{ start_time: '08:00', end_time: '18:00' }];
            return next;
        });
    }

    function addWindow(day: number) {
        setWeekly((prev) => {
            const next = [...prev];
            next[day] = [...next[day], { start_time: '08:00', end_time: '18:00' }];
            return next;
        });
    }

    function removeWindow(day: number, idx: number) {
        setWeekly((prev) => {
            const next = [...prev];
            next[day] = next[day].filter((_, i) => i !== idx);
            return next;
        });
    }

    function updateWindow(
        day: number,
        idx: number,
        field: 'start_time' | 'end_time',
        value: string,
    ) {
        setWeekly((prev) => {
            const next = [...prev];
            next[day] = next[day].map((w, i) =>
                i === idx ? { ...w, [field]: value } : w,
            );
            return next;
        });
    }

    function copyToWeekdays(fromDay: number) {
        setWeekly((prev) => {
            const next = [...prev];
            for (let d = 1; d <= 5; d++) {
                if (d !== fromDay) next[d] = prev[fromDay].map((w) => ({ ...w }));
            }
            return next;
        });
    }

    function copyToAll(fromDay: number) {
        setWeekly((prev) => {
            const next = [...prev];
            for (let d = 0; d <= 6; d++) {
                if (d !== fromDay) next[d] = prev[fromDay].map((w) => ({ ...w }));
            }
            return next;
        });
    }

    function toggleType(t: AppointmentType) {
        setAllowedTypes((prev) => {
            const next = new Set(prev);
            if (next.has(t)) next.delete(t);
            else next.add(t);
            return next;
        });
    }

    async function handleSave() {
        setError('');
        for (let d = 0; d < 7; d++) {
            if (windowsOverlap(weekly[d])) {
                setError(
                    `Horários de ${DAY_LABEL_SHORT[d]} têm sobreposição ou fim antes do início.`,
                );
                return;
            }
        }
        if (allowedTypes.size === 0) {
            setError('Selecione ao menos um tipo de agendamento permitido.');
            return;
        }
        setSaving(true);
        try {
            const cfg: PersonalAvailability = {
                timezone,
                weekly: weekly.map((windows, day_of_week) => ({ day_of_week, windows })),
                slot_duration_min: slotDurationMin,
                buffer_min: bufferMin,
                min_notice_hours: minNoticeHours,
                max_advance_days: maxAdvanceDays,
                capacity,
                allowed_types: Array.from(allowedTypes),
                active,
            };
            const saved = await saveAvailability(cfg);
            applyConfig(saved);
            showSuccess('Disponibilidade salva.');
        } catch {
            showError('Erro ao salvar disponibilidade.');
        } finally {
            setSaving(false);
        }
    }

    /* ── Exceções pontuais (overrides) ── */

    async function handleSaveOverride() {
        try {
            const created = await saveOverride({
                date: ovrForm.date,
                closed: ovrForm.closed,
                windows: ovrForm.closed ? [] : ovrForm.windows,
                reason: ovrForm.reason,
            });
            setOverrides((prev) => [
                ...prev.filter((o) => o.date !== created.date),
                created,
            ].sort((a, b) => a.date.localeCompare(b.date)));
            setShowOverrideModal(false);
            setOvrForm({ date: '', closed: true, windows: [], reason: '' });
        } catch {
            showError('Erro ao salvar exceção de data.');
        }
    }

    async function handleDeleteOverride(id: string) {
        if (!confirm('Remover esta exceção de data?')) return;
        try {
            await deleteOverride(id);
            setOverrides((prev) => prev.filter((o) => o.id !== id));
        } catch {
            showError('Erro ao remover exceção.');
        }
    }

    /* ── Bloqueios ── */

    async function handleCreateBlock() {
        try {
            const created = await createBlock({
                start_at: new Date(blockForm.start_at).toISOString(),
                end_at: new Date(blockForm.end_at).toISOString(),
                reason: blockForm.reason,
            });
            setBlocks((prev) =>
                [...prev, created].sort((a, b) => a.start_at.localeCompare(b.start_at)),
            );
            setShowBlockModal(false);
            setBlockForm({ start_at: '', end_at: '', reason: '' });
        } catch {
            showError('Erro ao criar bloqueio.');
        }
    }

    async function handleDeleteBlock(id: string) {
        if (!confirm('Remover este bloqueio?')) return;
        try {
            await deleteBlock(id);
            setBlocks((prev) => prev.filter((b) => b.id !== id));
        } catch {
            showError('Erro ao remover bloqueio.');
        }
    }

    if (loading) return <p className={s.loadingMsg}>Carregando disponibilidade...</p>;

    return (
        <div className={s.wrap}>
            {error && <p className={s.errorMsg}>{error}</p>}

            {/* ── Bloco A: grade semanal ── */}
            <div className={s.card}>
                <label className={s.activeToggle}>
                    <input
                        type="checkbox"
                        checked={active}
                        onChange={(e) => setActive(e.target.checked)}
                    />
                    Deixar o aluno escolher o horário na minha grade
                </label>
                <p className={s.cardHint}>
                    Quando desativado, o aluno continua digitando o horário livremente
                    ao solicitar um agendamento.
                </p>

                <div className={s.weekGrid}>
                    {DAY_LABEL_SHORT.map((label, day) => {
                        const isOpen = weekly[day].length > 0;
                        return (
                            <div key={day} className={s.dayRow}>
                                <label className={s.dayCheckboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={isOpen}
                                        onChange={() => toggleDay(day)}
                                    />
                                    <span className={s.dayName}>{label}</span>
                                </label>

                                {isOpen && (
                                    <div className={s.windowsList}>
                                        {weekly[day].map((w, idx) => (
                                            <div key={idx} className={s.windowRow}>
                                                <input
                                                    type="time"
                                                    className={s.timeInput}
                                                    value={w.start_time}
                                                    onChange={(e) =>
                                                        updateWindow(day, idx, 'start_time', e.target.value)
                                                    }
                                                />
                                                <span className={s.arrow}>→</span>
                                                <input
                                                    type="time"
                                                    className={s.timeInput}
                                                    value={w.end_time}
                                                    onChange={(e) =>
                                                        updateWindow(day, idx, 'end_time', e.target.value)
                                                    }
                                                />
                                                <button
                                                    type="button"
                                                    className={s.btnIconRemove}
                                                    onClick={() => removeWindow(day, idx)}
                                                    aria-label="Remover janela"
                                                >
                                                    <FiX />
                                                </button>
                                            </div>
                                        ))}
                                        <div className={s.windowRowActions}>
                                            <button
                                                type="button"
                                                className={s.btnAddWindow}
                                                onClick={() => addWindow(day)}
                                            >
                                                + janela
                                            </button>
                                            <button
                                                type="button"
                                                className={s.btnCopy}
                                                onClick={() => copyToWeekdays(day)}
                                                title="Copiar para os dias úteis (Seg–Sex)"
                                            >
                                                ⧉ dias úteis
                                            </button>
                                            <button
                                                type="button"
                                                className={s.btnCopy}
                                                onClick={() => copyToAll(day)}
                                                title="Copiar para todos os dias"
                                            >
                                                ⧉ todos
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Bloco B: regras ── */}
            <div className={s.card}>
                <h3 className={s.cardTitle}>Regras de agendamento</h3>
                <div className={s.rulesGrid}>
                    <label className={s.ruleLabel}>
                        Duração do atendimento
                        <select
                            className={s.select}
                            value={slotDurationMin}
                            onChange={(e) => setSlotDurationMin(Number(e.target.value))}
                        >
                            {SLOT_DURATIONS.map((m) => (
                                <option key={m} value={m}>{m} min</option>
                            ))}
                        </select>
                    </label>
                    <label className={s.ruleLabel}>
                        Intervalo entre atendimentos
                        <select
                            className={s.select}
                            value={bufferMin}
                            onChange={(e) => setBufferMin(Number(e.target.value))}
                        >
                            {BUFFERS.map((m) => (
                                <option key={m} value={m}>{m === 0 ? 'Sem intervalo' : `${m} min`}</option>
                            ))}
                        </select>
                    </label>
                    <label className={s.ruleLabel}>
                        Antecedência mínima (horas)
                        <input
                            type="number"
                            min={0}
                            max={720}
                            className={s.select}
                            value={minNoticeHours}
                            onChange={(e) => setMinNoticeHours(Number(e.target.value))}
                        />
                    </label>
                    <label className={s.ruleLabel}>
                        Agendar com até (dias)
                        <input
                            type="number"
                            min={1}
                            max={365}
                            className={s.select}
                            value={maxAdvanceDays}
                            onChange={(e) => setMaxAdvanceDays(Number(e.target.value))}
                        />
                    </label>
                    <label className={s.ruleLabel}>
                        Alunos por horário
                        <input
                            type="number"
                            min={1}
                            max={20}
                            className={s.select}
                            value={capacity}
                            onChange={(e) => setCapacity(Number(e.target.value))}
                        />
                    </label>
                    <label className={s.ruleLabel}>
                        Fuso horário
                        <select
                            className={s.select}
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                        >
                            {TIMEZONES.map((tz) => (
                                <option key={tz.value} value={tz.value}>{tz.label}</option>
                            ))}
                        </select>
                    </label>
                </div>
                {capacity > 1 && (
                    <p className={s.cardHint}>
                        Use um valor maior que 1 para treino em dupla ou turma.
                    </p>
                )}

                <p className={s.rulesSubtitle}>Tipos que o aluno pode solicitar</p>
                <div className={s.typeCheckboxes}>
                    {TYPE_OPTIONS.map((opt) => (
                        <label
                            key={opt.value}
                            className={`${s.typeCheckbox} ${allowedTypes.has(opt.value) ? s.typeCheckboxActive : ''}`}
                        >
                            <input
                                type="checkbox"
                                checked={allowedTypes.has(opt.value)}
                                onChange={() => toggleType(opt.value)}
                            />
                            {opt.label}
                        </label>
                    ))}
                </div>
                <p className={s.cardHint}>
                    Avaliação física não aparece aqui — só o personal marca esse tipo de sessão.
                </p>
            </div>

            <button
                type="button"
                className={s.btnSave}
                onClick={handleSave}
                disabled={saving}
            >
                {saving ? 'Salvando...' : 'Salvar disponibilidade'}
            </button>

            {/* ── Bloco C: exceções pontuais ── */}
            <div className={s.exceptionsGrid}>
                <div className={s.card}>
                    <div className={s.cardHeaderRow}>
                        <h3 className={s.cardTitle}>Datas especiais</h3>
                        <button
                            type="button"
                            className={s.btnAddSmall}
                            onClick={() => setShowOverrideModal(true)}
                        >
                            + Data
                        </button>
                    </div>
                    {overrides.length === 0 ? (
                        <p className={s.emptyMsg}>Nenhuma data especial nos próximos 90 dias.</p>
                    ) : (
                        <ul className={s.itemList}>
                            {overrides.map((o) => (
                                <li key={o.id} className={s.itemRow}>
                                    <div>
                                        <strong>{formatDateBR(o.date)}</strong> —{' '}
                                        {o.closed
                                            ? 'Fechado'
                                            : o.windows.map((w) => `${w.start_time}-${w.end_time}`).join(', ')}
                                        {o.reason && <div className={s.itemReason}>{o.reason}</div>}
                                    </div>
                                    <button
                                        type="button"
                                        className={s.btnIconRemove}
                                        onClick={() => handleDeleteOverride(o.id)}
                                        aria-label="Remover"
                                    >
                                        <FiTrash2 />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className={s.card}>
                    <div className={s.cardHeaderRow}>
                        <h3 className={s.cardTitle}>Bloqueios</h3>
                        <button
                            type="button"
                            className={s.btnAddSmall}
                            onClick={() => setShowBlockModal(true)}
                        >
                            + Bloqueio
                        </button>
                    </div>
                    {blocks.length === 0 ? (
                        <p className={s.emptyMsg}>Nenhum bloqueio nos próximos 90 dias.</p>
                    ) : (
                        <ul className={s.itemList}>
                            {blocks.map((b) => (
                                <li key={b.id} className={s.itemRow}>
                                    <div>
                                        <strong>{formatDateTimeBR(b.start_at)}</strong>
                                        {' → '}
                                        {formatDateTimeBR(b.end_at)}
                                        {b.reason && <div className={s.itemReason}>{b.reason}</div>}
                                    </div>
                                    <button
                                        type="button"
                                        className={s.btnIconRemove}
                                        onClick={() => handleDeleteBlock(b.id)}
                                        aria-label="Remover"
                                    >
                                        <FiTrash2 />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* ── Modal: nova exceção de data ── */}
            <Modal
                open={showOverrideModal}
                onClose={() => setShowOverrideModal(false)}
                title="Nova exceção de data"
                footer={
                    <>
                        <button
                            type="button"
                            className={s.btnSecondary}
                            onClick={() => setShowOverrideModal(false)}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className={s.btnPrimary}
                            onClick={handleSaveOverride}
                            disabled={!ovrForm.date}
                        >
                            Salvar
                        </button>
                    </>
                }
            >
                <div className={s.form}>
                    <label className={s.label}>
                        Data
                        <input
                            type="date"
                            className={s.input}
                            value={ovrForm.date}
                            onChange={(e) => setOvrForm((f) => ({ ...f, date: e.target.value }))}
                        />
                    </label>
                    <div className={s.radioRow}>
                        <label className={s.radioLabel}>
                            <input
                                type="radio"
                                checked={ovrForm.closed}
                                onChange={() => setOvrForm((f) => ({ ...f, closed: true }))}
                            />
                            Fechado o dia todo
                        </label>
                        <label className={s.radioLabel}>
                            <input
                                type="radio"
                                checked={!ovrForm.closed}
                                onChange={() =>
                                    setOvrForm((f) => ({
                                        ...f,
                                        closed: false,
                                        windows: f.windows.length
                                            ? f.windows
                                            : [{ start_time: '08:00', end_time: '18:00' }],
                                    }))
                                }
                            />
                            Horário diferente
                        </label>
                    </div>
                    {!ovrForm.closed &&
                        ovrForm.windows.map((w, idx) => (
                            <div key={idx} className={s.windowRow}>
                                <input
                                    type="time"
                                    className={s.timeInput}
                                    value={w.start_time}
                                    onChange={(e) =>
                                        setOvrForm((f) => ({
                                            ...f,
                                            windows: f.windows.map((win, i) =>
                                                i === idx ? { ...win, start_time: e.target.value } : win,
                                            ),
                                        }))
                                    }
                                />
                                <span className={s.arrow}>→</span>
                                <input
                                    type="time"
                                    className={s.timeInput}
                                    value={w.end_time}
                                    onChange={(e) =>
                                        setOvrForm((f) => ({
                                            ...f,
                                            windows: f.windows.map((win, i) =>
                                                i === idx ? { ...win, end_time: e.target.value } : win,
                                            ),
                                        }))
                                    }
                                />
                            </div>
                        ))}
                    <label className={s.label}>
                        Motivo (opcional)
                        <input
                            type="text"
                            className={s.input}
                            value={ovrForm.reason}
                            onChange={(e) => setOvrForm((f) => ({ ...f, reason: e.target.value }))}
                            placeholder="Ex.: feriado, viagem..."
                        />
                    </label>
                </div>
            </Modal>

            {/* ── Modal: novo bloqueio ── */}
            <Modal
                open={showBlockModal}
                onClose={() => setShowBlockModal(false)}
                title="Novo bloqueio"
                footer={
                    <>
                        <button
                            type="button"
                            className={s.btnSecondary}
                            onClick={() => setShowBlockModal(false)}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className={s.btnPrimary}
                            onClick={handleCreateBlock}
                            disabled={!blockForm.start_at || !blockForm.end_at}
                        >
                            Criar bloqueio
                        </button>
                    </>
                }
            >
                <div className={s.form}>
                    <label className={s.label}>
                        Início
                        <input
                            type="datetime-local"
                            className={s.input}
                            value={blockForm.start_at}
                            onChange={(e) =>
                                setBlockForm((f) => ({ ...f, start_at: e.target.value }))
                            }
                        />
                    </label>
                    <label className={s.label}>
                        Fim
                        <input
                            type="datetime-local"
                            className={s.input}
                            value={blockForm.end_at}
                            min={blockForm.start_at || undefined}
                            onChange={(e) =>
                                setBlockForm((f) => ({ ...f, end_at: e.target.value }))
                            }
                        />
                    </label>
                    <label className={s.label}>
                        Motivo (opcional)
                        <input
                            type="text"
                            className={s.input}
                            value={blockForm.reason}
                            onChange={(e) => setBlockForm((f) => ({ ...f, reason: e.target.value }))}
                            placeholder="Ex.: consulta médica..."
                        />
                    </label>
                </div>
            </Modal>

            {ToastSlot}
        </div>
    );
}

function formatDateBR(ymd: string): string {
    const [y, m, d] = ymd.split('-');
    return `${d}/${m}/${y}`;
}

function formatDateTimeBR(iso: string): string {
    return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}
