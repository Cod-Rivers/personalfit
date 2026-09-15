import { isInsideNativeApp } from './androidApp';
import { hasHardenedNativeBridge } from './nativeBridge';

/**
 * Google AdSense é exibido só fora do escopo PRO. O critério é o plano
 * EFETIVO do usuário (ver effectivePlanType em BrandingContext, espelhando
 * ResolveEffectiveStudentPlanType no backend): para o personal é o próprio
 * plan_type; para o aluno é o plan_type do personal vinculado quando existe,
 * senão o próprio. Isso cobre tanto o personal em plano PRO quanto o aluno
 * vinculado a um personal PRO — nenhum dos dois vê anúncio.
 */

export const ADSENSE_CLIENT_ID = 'ca-pub-9935304322065680';

/**
 * ID da unidade de anúncio manual renderizada por GoogleAdSlot (painel do
 * AdSense → Anúncios → Por unidade de anúncio → Display). Vazio, o bloco
 * manual não é renderizado: um data-ad-slot inválido faz o adsbygoogle.js
 * lançar erro e deixa um espaço em branco na tela. Os anúncios automáticos
 * (Auto ads) não dependem disto — basta o script carregado pelo
 * GoogleAdsense e a opção ligada no painel.
 */
export const ADSENSE_SLOT_ID: string = '';

export function shouldShowAds(effectivePlanType: string | null): boolean {
    return effectivePlanType !== null && effectivePlanType !== 'pro';
}

/**
 * Anúncio do Google só roda onde script de terceiro não alcança as pontes
 * nativas. No navegador e no PWA não há ponte nenhuma. Dentro do app Android,
 * só com o canal restrito por origem: na interface antiga
 * (addJavascriptInterface) o objeto é injetado em todo iframe, e o script de
 * um anúncio poderia abrir a compra do Google Play com o accountId de outra
 * conta (ver libs/nativeBridge.ts). Versões antigas do app ficam sem anúncio
 * até atualizarem.
 *
 * Só chame no cliente, depois da montagem: depende de navigator e window.
 */
export function isAdEnvironmentSafe(): boolean {
    return !isInsideNativeApp() || hasHardenedNativeBridge();
}
