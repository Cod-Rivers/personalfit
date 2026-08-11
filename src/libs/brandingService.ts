import { Api } from '@/libs/api';

export interface PersonalBranding {
    logo_base64?: string;
    /** Paleta escolhida entre o conjunto fechado (ver libs/showcaseThemes.ts). */
    theme_id?: string;
    /** Derivadas de `theme_id` pelo servidor — somente leitura no cliente. */
    primary_color?: string;
    secondary_color?: string;
    welcome_banner?: string;
}

/** Campos que o personal de fato edita; as cores vêm da paleta. */
export interface UpdateBrandingPayload {
    logo_base64?: string;
    theme_id: string;
    welcome_banner?: string;
}

/** Atualiza o branding do personal autenticado (plano pro). */
export async function updateBranding(
    data: UpdateBrandingPayload,
): Promise<PersonalBranding> {
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

/**
 * Retorna o branding (e nome) do personal vinculado ao usuário autenticado
 * (para alunos), junto do plano efetivo (ver ResolveEffectiveStudentPlanType
 * no backend): o do personal vinculado quando existe, senão o próprio plano
 * do usuário.
 */
export async function getPersonalBranding(): Promise<{
    branding: PersonalBranding | null;
    personalName: string | null;
    effectivePlanType: string | null;
}> {
    const res = await Api.get<{
        branding: PersonalBranding | null;
        personal_name?: string;
        effective_plan_type?: string;
    }>('/branding');
    return {
        branding: res.data.branding,
        personalName: res.data.personal_name ?? null,
        effectivePlanType: res.data.effective_plan_type ?? null,
    };
}
