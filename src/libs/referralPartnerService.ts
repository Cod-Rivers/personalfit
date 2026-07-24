import { Api } from '@/libs/api';

export type CommissionType = 'percentage' | 'fixed';

export interface ReferralPartner {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    code: string;
    commission_type: CommissionType;
    commission_value: number;
    notes?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateReferralPartnerRequest {
    name: string;
    email?: string;
    phone?: string;
    code: string;
    commission_type: CommissionType;
    commission_value: number;
    notes?: string;
    is_active: boolean;
}

/** Admin: lista todos os parceiros de indicação */
export async function getAllReferralPartners(): Promise<ReferralPartner[]> {
    const res = await Api.get<ReferralPartner[]>('/referral-partners');
    return res.data;
}

export interface ReferralPartnerPublic {
    id: string;
    name: string;
    code: string;
}

/**
 * Qualquer usuário autenticado: lista enxuta (id/name/code) dos parceiros de
 * indicação ATIVOS, usada no seletor de indicação da tela de checkout
 * (/pagamento). Não requer role admin — endpoint separado do CRUD completo.
 */
export async function getActiveReferralPartners(): Promise<ReferralPartnerPublic[]> {
    const res = await Api.get<ReferralPartnerPublic[]>('/referral-partners/active');
    return res.data;
}

export interface IndicationBucketCounts {
    today: number;
    week: number;
    month: number;
    year: number;
    total: number;
}

export interface IndicationStatEntry {
    key: string;
    label: string;
    counts: IndicationBucketCounts;
}

/** Admin: estatísticas de indicação (contagens aninhadas por parceiro/canal). */
export async function getIndicationStats(): Promise<IndicationStatEntry[]> {
    const res = await Api.get<{ entries: IndicationStatEntry[] }>(
        '/referral-partners/stats',
    );
    return res.data.entries ?? [];
}

/** Admin: cria parceiro de indicação */
export async function createReferralPartner(
    data: CreateReferralPartnerRequest,
): Promise<ReferralPartner> {
    const res = await Api.post<ReferralPartner>('/referral-partners', data);
    return res.data;
}

/** Admin: atualiza parceiro de indicação */
export async function updateReferralPartner(
    id: string,
    data: CreateReferralPartnerRequest,
): Promise<ReferralPartner> {
    const res = await Api.put<ReferralPartner>(`/referral-partners/${id}`, data);
    return res.data;
}

/** Admin: exclui parceiro de indicação */
export async function deleteReferralPartner(id: string): Promise<void> {
    await Api.delete(`/referral-partners/${id}`);
}
