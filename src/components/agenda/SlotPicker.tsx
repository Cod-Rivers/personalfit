'use client';
import { useMemo, useState } from 'react';
import {
    SLOT_REASON_LABEL,
    DAY_LABEL_SHORT,
    type DaySlots,
    type Slot,
} from '@/libs/availabilityService';
import s from './SlotPicker.module.css';

interface SlotPickerProps {
    daySlots: DaySlots[];
    selectedSlot: Slot | null;
    onSelect: (slot: Slot) => void;
}

const MONTH_LABEL = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Extrai "HH:MM" diretamente da string RFC3339 — evita conversão para o
 *  fuso do navegador, que poderia mostrar um horário diferente do que o
 *  personal configurou. */
function hhmm(iso: string): string {
    return iso.slice(11, 16);
}

function parseYMD(ymd: string): { y: number; m: number; d: number } {
    const [y, m, d] = ymd.split('-').map(Number);
    return { y, m, d };
}

function formatDateBR(ymd: string): string {
    const { y, m, d } = parseYMD(ymd);
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

export default function SlotPicker({ daySlots, selectedSlot, onSelect }: SlotPickerProps) {
    const byDate = useMemo(() => {
        const map: Record<string, DaySlots> = {};
        for (const d of daySlots) map[d.date] = d;
        return map;
    }, [daySlots]);

    const minDate = daySlots[0]?.date;
    const maxDate = daySlots[daySlots.length - 1]?.date;

    const initialMonth = minDate ? parseYMD(minDate) : parseYMD(new Date().toISOString().slice(0, 10));
    const [visibleYear, setVisibleYear] = useState(initialMonth.y);
    const [visibleMonth, setVisibleMonth] = useState(initialMonth.m - 1); // 0-based

    const firstAvailableDate = useMemo(
        () => daySlots.find((d) => d.available > 0)?.date,
        [daySlots],
    );
    const [selectedDate, setSelectedDate] = useState<string | null>(
        firstAvailableDate ?? null,
    );

    const monthStart = new Date(visibleYear, visibleMonth, 1);
    const daysInMonth = new Date(visibleYear, visibleMonth + 1, 0).getDate();
    const leadingBlanks = monthStart.getDay(); // 0=Dom

    const cells: (string | null)[] = [
        ...Array.from({ length: leadingBlanks }, () => null),
        ...Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            return `${visibleYear}-${String(visibleMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }),
    ];

    const canGoPrev = !minDate || `${visibleYear}-${String(visibleMonth + 1).padStart(2, '0')}` > minDate.slice(0, 7);
    const canGoNext = !maxDate || `${visibleYear}-${String(visibleMonth + 1).padStart(2, '0')}` < maxDate.slice(0, 7);

    function goPrevMonth() {
        if (visibleMonth === 0) {
            setVisibleYear((y) => y - 1);
            setVisibleMonth(11);
        } else {
            setVisibleMonth((m) => m - 1);
        }
    }
    function goNextMonth() {
        if (visibleMonth === 11) {
            setVisibleYear((y) => y + 1);
            setVisibleMonth(0);
        } else {
            setVisibleMonth((m) => m + 1);
        }
    }

    const selectedDaySlots = selectedDate ? byDate[selectedDate] : undefined;

    return (
        <div className={s.wrap}>
            <div className={s.calHeader}>
                <button
                    type="button"
                    className={s.navBtn}
                    onClick={goPrevMonth}
                    disabled={!canGoPrev}
                    aria-label="Mês anterior"
                >
                    ‹
                </button>
                <span className={s.monthLabel}>
                    {MONTH_LABEL[visibleMonth]} {visibleYear}
                </span>
                <button
                    type="button"
                    className={s.navBtn}
                    onClick={goNextMonth}
                    disabled={!canGoNext}
                    aria-label="Próximo mês"
                >
                    ›
                </button>
            </div>

            <div className={s.weekLabels}>
                {DAY_LABEL_SHORT.map((d) => (
                    <span key={d} className={s.weekLabel}>{d}</span>
                ))}
            </div>

            <div className={s.calGrid}>
                {cells.map((date, i) => {
                    if (!date) return <span key={`blank-${i}`} className={s.dayCellBlank} />;
                    const info = byDate[date];
                    const hasSlots = !!info && info.available > 0;
                    const isSelected = date === selectedDate;
                    const dayNum = Number(date.slice(8, 10));
                    return (
                        <button
                            key={date}
                            type="button"
                            className={`${s.dayCell} ${hasSlots ? s.dayCellAvailable : s.dayCellUnavailable} ${isSelected ? s.dayCellSelected : ''}`}
                            disabled={!hasSlots}
                            onClick={() => setSelectedDate(date)}
                        >
                            {dayNum}
                        </button>
                    );
                })}
            </div>

            {selectedDate && (
                <div className={s.slotsSection}>
                    <p className={s.slotsTitle}>Horários de {formatDateBR(selectedDate)}</p>
                    {!selectedDaySlots || selectedDaySlots.slots.length === 0 ? (
                        <p className={s.emptyMsg}>Nenhum horário configurado para este dia.</p>
                    ) : (
                        <div className={s.slotsGrid}>
                            {selectedDaySlots.slots.map((slot) => {
                                const isChosen =
                                    selectedSlot?.start_at === slot.start_at;
                                return (
                                    <button
                                        key={slot.start_at}
                                        type="button"
                                        className={`${s.slotChip} ${isChosen ? s.slotChipSelected : ''} ${!slot.available ? s.slotChipDisabled : ''}`}
                                        disabled={!slot.available}
                                        title={
                                            slot.reason
                                                ? SLOT_REASON_LABEL[slot.reason]
                                                : undefined
                                        }
                                        aria-label={
                                            slot.reason
                                                ? `${hhmm(slot.start_at)} — ${SLOT_REASON_LABEL[slot.reason]}`
                                                : hhmm(slot.start_at)
                                        }
                                        onClick={() => onSelect(slot)}
                                    >
                                        {hhmm(slot.start_at)}
                                        {slot.available && slot.remaining > 1 && (
                                            <span className={s.slotRemaining}>
                                                {slot.remaining} vagas
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
