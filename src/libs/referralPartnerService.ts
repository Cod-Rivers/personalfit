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
