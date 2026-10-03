import {
    hasNativeBilling,
    nativeBillingAvailable,
    nativeBillingPurchase,
} from '@/libs/nativeBridge';
import { Api } from '@/libs/api';

/**
 * Serviço de pagamentos: catálogo de planos, assinatura Pro via Asaas
 * (PIX/cartão), compras avulsas e verificação de compras do
 * Google Play (fluxo nativo via ponte do app Android — ver libs/nativeBridge.ts).
 *
 * Os PREÇOS vêm sempre do backend (GET /plans) — o cliente nunca envia valor.
 */

export interface PlanCatalogItem {
    cycle?: string;
    value: number;
    play_product_id: string;
}

export interface PlanCatalog {
    pro: PlanCatalogItem[];
    library_plan: PlanCatalogItem;
    student_plus: PlanCatalogItem;
}

export async function getPlans(): Promise<PlanCatalog> {
    const res = await Api.get<PlanCatalog>('/plans');
    return res.data;
}

/* ── Assinatura Pro via Asaas ── */

export interface SubscribePixResponse {
    payment_id: string;
    qr_image_url: string;
    qr_code_payload: string;
    expires_at: string;
    status: string;
    message: string;
}

export interface SubscribeCardResponse {
    message: string;
    status: string; // ACTIVE | PENDING | ...
    subscription_id?: string;
}

export async function subscribeProPix(
    cycle: string,
    indicationReceiver?: string,
): Promise<SubscribePixResponse> {
    const res = await Api.post<SubscribePixResponse>('/user/subscribe', {
        payment_method: 'PIX',
        plan_cycle: cycle,
        ...(indicationReceiver ? { indication_receiver: indicationReceiver } : {}),
    });
    return res.data;
}

export interface CardSubscriptionForm {
    card_holder_name: string;
    card_number: string;
    card_expiry_month: string;
    card_expiry_year: string;
    card_ccv: string;
    holder_name: string;
    holder_email: string;
    holder_cpf: string;
    holder_postal_code: string;
    holder_address_num: string;
    holder_phone: string;
}

export async function subscribeProCard(
    cycle: string,
    card: CardSubscriptionForm,
    indicationReceiver?: string,
): Promise<SubscribeCardResponse> {
    const res = await Api.post<SubscribeCardResponse>('/user/subscribe', {
        payment_method: 'CREDIT_CARD',
        plan_cycle: cycle,
        ...(indicationReceiver ? { indication_receiver: indicationReceiver } : {}),
        ...card,
    });
    return res.data;
}

/** Cancela o PRO no cartão. As cobranças param na hora; `access_until`
 *  (ISO) é até quando o período já pago continua valendo. */
export async function cancelSubscription(): Promise<{ access_until?: string }> {
    const { data } = await Api.post<{ access_until?: string }>('/user/cancel-subscribe');
    return data ?? {};
}

/** Situação do PRO do personal, lida de GET /me. */
export interface ProPlanStatus {
    plan_type?: string;
    has_active_subscription?: boolean;
    subscription_cycle?: string;
    /** ISO: PRO cancelado que ainda vale até esta data. */
    pro_access_until?: string;
}

export async function getProPlanStatus(): Promise<ProPlanStatus> {
    const { data } = await Api.get<ProPlanStatus>('/me');
    return data;
}

/** O PRO que acabou de ser comprado já foi pago? Olhar só `plan_type` não
 *  basta: quem compra pode já estar no PRO — no período pago de um
 *  cancelamento (`pro_access_until`) ou no teste grátis —, e o polling
 *  confirmaria antes de o PIX ser pago. O pagamento desfaz o cancelamento e
 *  converte o teste, então é isso que se espera. */
export async function isProPaymentConfirmed(wasOnTrial: boolean): Promise<boolean> {
    const status = await getProPlanStatus();
    if (status.plan_type !== 'pro' || status.pro_access_until) return false;
    if (!wasOnTrial) return true;
    return !(await getProTrialStatus()).pro_trial_active;
}

/* ── Aluno Plus: assinatura do aluno sem personal ──
 * Sem anúncios + Substituição Inteligente de Exercícios + links do Instagram
 * e do TikTok + mais importações de PDF. No site, só cartão (PIX no Asaas é
 * cobrança única, não assinatura recorrente); dentro do app Android, só
 * Google Play (política de pagamentos da loja). */

export interface StudentPlusStatus {
    active: boolean;
    /** Status cru da última assinatura (ACTIVE, SUSPENDED, CANCELED...). */
    status?: string;
    billing_type?: string;
    /** Só aluno sem personal vinculado pode assinar. */
    eligible: boolean;
    price: number;
    cycle: string;
    /** Conta antiga de aluno com Pro próprio: já tem os benefícios. */
    own_pro: boolean;
}

export async function getStudentPlusStatus(): Promise<StudentPlusStatus> {
    const res = await Api.get<StudentPlusStatus>('/me/student-plus');
    return res.data;
}

export async function subscribeStudentPlusCard(
    card: CardSubscriptionForm,
): Promise<SubscribeCardResponse> {
    const res = await Api.post<SubscribeCardResponse>('/me/student-plus/subscribe', card);
    return res.data;
}

export async function cancelStudentPlus(): Promise<void> {
    await Api.post('/me/student-plus/cancel');
}

/* ── Teste grátis de 14 dias do PRO (personal) ── */

export interface ProTrialStatus {
    plan_type: string;
    pro_trial_eligible: boolean;
    pro_trial_active: boolean;
    pro_trial_ends_at?: string;
}

export async function getProTrialStatus(): Promise<ProTrialStatus> {
    const res = await Api.get<ProTrialStatus>('/personal/pro-trial');
    return res.data;
}

export async function startProTrial(): Promise<ProTrialStatus> {
    const res = await Api.post<ProTrialStatus>('/personal/pro-trial');
    return res.data;
}

/** Dias inteiros que faltam até `endsAt` (arredonda para cima; mínimo 0). */
export function daysUntil(endsAt: string | undefined, now = Date.now()): number {
    if (!endsAt) return 0;
    const ms = new Date(endsAt).getTime() - now;
    return ms > 0 ? Math.ceil(ms / 86_400_000) : 0;
}

/* ── Compra avulsa de um plano da biblioteca "estilo-famosos" ── */

export interface PurchaseLibraryPlanResponse {
    success: boolean;
    message: string;
    method: string; // PIX | CREDIT_CARD
    applied: boolean; // true quando o cartão já aprovou e o plano foi aplicado
    macrocycle_id?: string;
    payment_id?: string;
    qr_image_url?: string;
    qr_code_payload?: string;
    expires_at?: string;
    value?: number;
}

/** Compra um plano da biblioteca via PIX. O plano é aplicado no webhook. */
export async function purchaseLibraryPlanPix(
    templateId: string,
): Promise<PurchaseLibraryPlanResponse> {
    const res = await Api.post<PurchaseLibraryPlanResponse>(
        `/my-planning/celebrity-templates/${templateId}/purchase`,
        { payment_method: 'PIX' },
    );
    return res.data;
}

/** Compra um plano da biblioteca via cartão (síncrono). Se aprovado, applied=true. */
export async function purchaseLibraryPlanCard(
    templateId: string,
    card: CardSubscriptionForm,
): Promise<PurchaseLibraryPlanResponse> {
    const res = await Api.post<PurchaseLibraryPlanResponse>(
        `/my-planning/celebrity-templates/${templateId}/purchase`,
        { payment_method: 'CREDIT_CARD', ...card },
    );
    return res.data;
}

/**
 * Compra para manter o plano que o personal montou e que ficou bloqueado
 * quando o aluno foi desvinculado no fim da espera do plano gratuito. Mesmo
 * produto e preço do plano avulso; PIX confirma pelo webhook.
 */
export async function purchaseLockedPlanPix(
    planId: string,
): Promise<PurchaseLibraryPlanResponse> {
    const res = await Api.post<PurchaseLibraryPlanResponse>(
        `/my-planning/locked/${planId}/purchase`,
        { payment_method: 'PIX' },
    );
    return res.data;
}

/** Manter o plano bloqueado pagando no cartão (síncrono). */
export async function purchaseLockedPlanCard(
    planId: string,
    card: CardSubscriptionForm,
): Promise<PurchaseLibraryPlanResponse> {
    const res = await Api.post<PurchaseLibraryPlanResponse>(
        `/my-planning/locked/${planId}/purchase`,
        { payment_method: 'CREDIT_CARD', ...card },
    );
    return res.data;
}

/* ── Google Play Billing (bridge nativa do app Android) ── */

export interface GooglePlayVerifyResponse {
    success: boolean;
    message: string;
    status?: string;
}

export async function verifyGooglePlayPurchase(
    productId: string,
    purchaseToken: string,
    productType: 'subs' | 'inapp',
    templateId?: string,
    /** Manter o plano bloqueado (mesmo produto do plano avulso). */
    lockedPlanId?: string,
): Promise<GooglePlayVerifyResponse> {
    const res = await Api.post<GooglePlayVerifyResponse>('/billing/google/verify', {
        product_id: productId,
        purchase_token: purchaseToken,
        product_type: productType,
        ...(templateId ? { template_id: templateId } : {}),
        ...(lockedPlanId ? { locked_plan_id: lockedPlanId } : {}),
    });
    return res.data;
}

/**
 * true quando rodando dentro do app Android com o Google Play Billing pronto.
 * Assíncrono porque, no canal restrito por origem do app atual, a pergunta
 * vira uma mensagem ao Android e a resposta chega depois.
 */
export function isGooglePlayBillingAvailable(): Promise<boolean> {
    return nativeBillingAvailable();
}

export interface BillingBridgeEvent {
    status: 'success' | 'canceled' | 'error';
    productId?: string;
    productType?: 'subs' | 'inapp';
    purchaseToken?: string;
    message?: string;
}

/**
 * Dispara a compra nativa e resolve quando o app devolver o resultado via
 * CustomEvent 'venafit-billing'. Rejeita em cancelamento/erro/timeout.
 */
export function launchGooglePlayPurchase(
    productId: string,
    productType: 'subs' | 'inapp',
    accountId: string,
    timeoutMs = 5 * 60 * 1000,
): Promise<BillingBridgeEvent> {
    return new Promise((resolve, reject) => {
        if (!hasNativeBilling()) {
            reject(new Error('Google Play Billing indisponível neste dispositivo'));
            return;
        }

        const timer = setTimeout(() => {
            window.removeEventListener('venafit-billing', onEvent as EventListener);
            reject(new Error('Tempo esgotado aguardando o Google Play'));
        }, timeoutMs);

        const onEvent = (ev: CustomEvent<BillingBridgeEvent>) => {
            const detail = ev.detail;
            if (detail?.productId && detail.productId !== productId) return; // outro produto
            clearTimeout(timer);
            window.removeEventListener('venafit-billing', onEvent as EventListener);
            if (detail?.status === 'success' && detail.purchaseToken) {
                resolve(detail);
            } else if (detail?.status === 'canceled') {
                reject(new Error('Compra cancelada'));
            } else {
                reject(new Error(detail?.message || 'Falha na compra pelo Google Play'));
            }
        };

        window.addEventListener('venafit-billing', onEvent as EventListener);
        try {
            nativeBillingPurchase(productId, productType, accountId);
        } catch (err) {
            clearTimeout(timer);
            window.removeEventListener('venafit-billing', onEvent as EventListener);
            reject(err instanceof Error ? err : new Error('Erro ao iniciar compra'));
        }
    });
}
