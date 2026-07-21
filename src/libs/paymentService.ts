import { Api } from '@/libs/api';

/**
 * Serviço de pagamentos: catálogo de planos, assinatura Pro via Asaas
 * (PIX/cartão), compra de nova anamnese (PIX) e verificação de compras do
 * Google Play (fluxo nativo via bridge window.VenafitBilling).
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
    early_anamnesis: PlanCatalogItem;
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

export async function subscribeProPix(cycle: string): Promise<SubscribePixResponse> {
    const res = await Api.post<SubscribePixResponse>('/user/subscribe', {
        payment_method: 'PIX',
        plan_cycle: cycle,
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
): Promise<SubscribeCardResponse> {
    const res = await Api.post<SubscribeCardResponse>('/user/subscribe', {
        payment_method: 'CREDIT_CARD',
        plan_cycle: cycle,
        ...card,
    });
    return res.data;
}

export async function cancelSubscription(): Promise<void> {
    await Api.post('/user/cancel-subscribe');
}

/* ── Nova anamnese (aluno free) via PIX ── */

export interface EarlyAnamnesisPixResponse {
    success: boolean;
    message: string;
    payment_id?: string;
    qr_image_url?: string;
    qr_code_payload?: string;
    expires_at?: string;
    value?: number;
}

export async function purchaseEarlyAnamnesisPix(): Promise<EarlyAnamnesisPixResponse> {
    const res = await Api.post<EarlyAnamnesisPixResponse>('/user/anamnesis/purchase-early', {
        payment_method: 'PIX',
    });
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
): Promise<GooglePlayVerifyResponse> {
    const res = await Api.post<GooglePlayVerifyResponse>('/billing/google/verify', {
        product_id: productId,
        purchase_token: purchaseToken,
        product_type: productType,
    });
    return res.data;
}

/** Interface exposta pelo wrapper Android via addJavascriptInterface. */
interface VenafitBillingBridge {
    isAvailable(): boolean;
    /** Inicia o fluxo de compra nativo. accountId = ID do usuário (obfuscatedAccountId). */
    purchase(productId: string, productType: 'subs' | 'inapp', accountId: string): void;
}

declare global {
    interface Window {
        VenafitBilling?: VenafitBillingBridge;
    }
}

/** true quando rodando dentro do app Android com a bridge de billing ativa. */
export function isGooglePlayBillingAvailable(): boolean {
    try {
        return typeof window !== 'undefined' && !!window.VenafitBilling?.isAvailable();
    } catch {
        return false;
    }
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
        const bridge = window.VenafitBilling;
        if (!bridge) {
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
            bridge.purchase(productId, productType, accountId);
        } catch (err) {
            clearTimeout(timer);
            window.removeEventListener('venafit-billing', onEvent as EventListener);
            reject(err instanceof Error ? err : new Error('Erro ao iniciar compra'));
        }
    });
}
