import { Api } from '@/libs/api';

export type AdType = 'image' | 'video';
export type AdPlacement = 'top' | 'bottom';

export interface Advertisement {
    id: string;
    type: AdType;
    url: string;
    title: string;
    description?: string;
    link?: string;
    personal_id?: string;
    created_by: string;
    placement: AdPlacement;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface AdsForDisplayResponse {
    advertisements: Advertisement[];
    can_show_ads: boolean;
}

export interface CreateAdvertisementRequest {
    type: AdType;
    url: string;
    title: string;
    description?: string;
    link?: string;
    placement: AdPlacement;
    is_active: boolean;
}


/** Retorna anúncios para exibição ao usuário atual (com flag canShowAds) */
export async function getAdsForDisplay(): Promise<AdsForDisplayResponse> {
    const res = await Api.get<AdsForDisplayResponse>(
        '/advertisements/for-display',
    );
    return res.data;
}

/** Admin: lista todos os anúncios ativos */
export async function getAllAdvertisements(): Promise<Advertisement[]> {
    const res = await Api.get<Advertisement[]>('/advertisements');
    return res.data;
}

/** Admin: cria anúncio global */
export async function createAdvertisement(data: CreateAdvertisementRequest): Promise<Advertisement> {
    const res = await Api.post<Advertisement>('/advertisements', data);
    return res.data;
}

/** Admin ou dono: atualiza anúncio */
export async function updateAdvertisement(id: string, data: CreateAdvertisementRequest): Promise<Advertisement> {
    const res = await Api.put<Advertisement>(`/advertisements/${id}`, data);
    return res.data;
}

/** Admin ou dono: deleta anúncio */
export async function deleteAdvertisement(id: string): Promise<void> {
    await Api.delete(`/advertisements/${id}`);
}

/** Personal PRO: lista seus próprios anúncios */
export async function getMyAdvertisements(): Promise<Advertisement[]> {
    const res = await Api.get<Advertisement[]>('/personal/advertisements');
    return res.data;
}

/** Personal PRO: cria anúncio próprio */
export async function createMyAdvertisement(data: CreateAdvertisementRequest): Promise<Advertisement> {
    const res = await Api.post<Advertisement>('/personal/advertisements', data);
    return res.data;
}
