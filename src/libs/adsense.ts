/**
 * Google AdSense é exibido só fora do escopo PRO. O critério é o plano
 * EFETIVO do usuário (ver effectivePlanType em BrandingContext, espelhando
 * ResolveEffectiveStudentPlanType no backend): para o personal é o próprio
 * plan_type; para o aluno é o plan_type do personal vinculado quando existe,
 * senão o próprio. Isso cobre tanto o personal em plano PRO quanto o aluno
 * vinculado a um personal PRO — nenhum dos dois vê anúncio.
 */

export const ADSENSE_CLIENT_ID = 'ca-pub-9935304322065680';

export function shouldShowAds(effectivePlanType: string | null): boolean {
    return effectivePlanType !== null && effectivePlanType !== 'pro';
}
