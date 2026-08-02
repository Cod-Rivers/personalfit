import { Api } from '@/libs/api';
import type { AppointmentType } from '@/libs/appointmentService';

export interface AvailabilityWindow {
    start_time: string; // "HH:MM"
    end_time: string;
}

export interface DayAvailability {
    day_of_week: number; // 0=Dom … 6=Sáb
    windows: AvailabilityWindow[];
}

export interface PersonalAvailability {
    timezone: string;
    weekly: DayAvailability[];
    slot_duration_min: number;
    buffer_min: number;
    min_notice_hours: number;
    max_advance_days: number;
    capacity: number;
    allowed_types: AppointmentType[];
    active: boolean;
}

export type SlotReason = 'booked' | 'blocked' | 'past' | 'notice' | 'too_far';

export interface Slot {
    start_at: string;
    end_at: string;
    available: boolean;
    remaining: number;
    reason?: SlotReason;
}

export interface DaySlots {
    date: string; // "2026-08-12"
    slots: Slot[];
    available: number;
}

export interface AvailabilityOverride {
    id: string;
    date: string; // "2026-08-12"
    closed: boolean;
    windows: AvailabilityWindow[];
    reason?: string;
}

export interface AvailabilityBlock {
    id: string;
    start_at: string;
    end_at: string;
    reason?: string;
}

// ── Personal API ──

export async function getAvailability(): Promise<PersonalAvailability> {
    const res = await Api.get<PersonalAvailability>('/availability');
    return res.data;
}

export async function saveAvailability(data: PersonalAvailability): Promise<PersonalAvailability> {
    const res = await Api.put<PersonalAvailability>('/availability', data);
    return res.data;
}

export async function listOverrides(from: string, to: string): Promise<AvailabilityOverride[]> {
    const res = await Api.get<AvailabilityOverride[]>('/availability/overrides', { params: { from, to } });
    return res.data;
}

export async function saveOverride(data: Omit<AvailabilityOverride, 'id'>): Promise<AvailabilityOverride> {
    const res = await Api.post<AvailabilityOverride>('/availability/overrides', data);
    return res.data;
}

export async function deleteOverride(id: string): Promise<void> {
    await Api.delete(`/availability/overrides/${id}`);
}

export async function listBlocks(from: string, to: string): Promise<AvailabilityBlock[]> {
    const res = await Api.get<AvailabilityBlock[]>('/availability/blocks', { params: { from, to } });
    return res.data;
}

export async function createBlock(data: Omit<AvailabilityBlock, 'id'>): Promise<AvailabilityBlock> {
    const res = await Api.post<AvailabilityBlock>('/availability/blocks', data);
    return res.data;
}

export async function deleteBlock(id: string): Promise<void> {
    await Api.delete(`/availability/blocks/${id}`);
}

export async function getPersonalSlots(from: string, to: string, type?: AppointmentType): Promise<DaySlots[]> {
    const params: Record<string, string> = { from, to };
    if (type) params.type = type;
    const res = await Api.get<DaySlots[]>('/availability/slots', { params });
    return res.data;
}

// ── Aluno API ──

/** Devolvida quando o personal vinculado ainda não ativou a disponibilidade
 *  (ou não é PRO) — o frontend cai no formulário livre antigo. */
export interface AvailabilityDisabled {
    enabled: false;
    message: string;
}

export type MyAvailabilityResult = DaySlots[] | AvailabilityDisabled;

export function isAvailabilityDisabled(
    r: MyAvailabilityResult,
): r is AvailabilityDisabled {
    return !Array.isArray(r) && r.enabled === false;
}

export async function getMyPersonalAvailability(
    from: string,
    to: string,
    type?: AppointmentType,
): Promise<MyAvailabilityResult> {
    const params: Record<string, string> = { from, to };
    if (type) params.type = type;
    const res = await Api.get<MyAvailabilityResult>('/my-personal/availability', { params });
    return res.data;
}

export type MyDaySlotsResult = Slot[] | AvailabilityDisabled;

export function isDaySlotsDisabled(r: MyDaySlotsResult): r is AvailabilityDisabled {
    return !Array.isArray(r) && r.enabled === false;
}

export async function getMyPersonalDaySlots(
    date: string,
    type?: AppointmentType,
): Promise<MyDaySlotsResult> {
    const params: Record<string, string> = { date };
    if (type) params.type = type;
    const res = await Api.get<MyDaySlotsResult>('/my-personal/availability/slots', { params });
    return res.data;
}

// ── Labels ──

export const SLOT_REASON_LABEL: Record<SlotReason, string> = {
    booked: 'Horário já reservado',
    blocked: 'Indisponível',
    past: 'Horário já passou',
    notice: 'Fora do prazo mínimo de antecedência',
    too_far: 'Ainda não é possível agendar essa data',
};

export const DAY_LABEL_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
