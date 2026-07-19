import { Api } from '@/libs/api';

export interface PersonalBranding {
    logo_base64?: string;
    primary_color?: string;
    secondary_color?: string;
    welcome_banner?: string;
}


/** Atualiza o branding do personal autenticado (plano pro). */
export async function updateBranding(data: PersonalBranding): Promise<PersonalBranding> {
    const res = await Api.put<{ branding: PersonalBranding }>(
        '/personal/branding',
        data,
    );
    return res.data.branding;
}

/** Retorna o branding configurado pelo personal autenticado. */
export async function getMyBranding(): Promise<{ branding: PersonalBranding | null; plan_type: string }> {
    const res = await Api.get<{ branding: PersonalBranding | null; plan_type: string }>(
        '/personal/branding',
    );
    return res.data;
}

/** Retorna o branding (e nome) do personal vinculado ao usuário autenticado (para alunos). */
export async function getPersonalBranding(): Promise<{
    branding: PersonalBranding | null;
    personalName: string | null;
}> {
    const res = await Api.get<{
        branding: PersonalBranding | null;
        personal_name?: string;
    }>('/branding');
    return {
        branding: res.data.branding,
        personalName: res.data.personal_name ?? null,
    };
}
