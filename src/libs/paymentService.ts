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
    /** Personal Plus: alunos ilimitados, marca e financeiro. Só mensal. */
    personal_plus: PlanCatalogItem;
    library_plan: PlanCatalogItem;
    student_plus: PlanCatalogItem;
}

/** Produtos de assinatura de PERSONAL aceitos por POST /user/subscribe.
 *  Ausente = 'pro', por compatibilidade com versões publicadas antes do Plus. */
export type PersonalPlanProduct = 'pro' | 'personal_plus';

/** Token da tela de escolha do Google Play (faturamento por escolha do
 *  usuário): presente quando, dentro do app Android, o usuário escolheu
 *  pagar pelo Asaas. O backend usa para informar a cobrança ao Google. */
function playChoice(externalTransactionToken?: string) {
    return externalTransactionToken
        ? { external_transaction_token: externalTransactionToken }
        : {};
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
    /** Status da ASSINATURA (ACTIVE | PENDING | ...). ACTIVE é o cartão
     *  validado, não o pagamento: não serve para dizer que o plano está ativo. */
    status: string;
    subscription_id?: string;
    /** Plano do personal: a cobrança foi paga e a conta já está no plano
     *  comprado. Ausente = aguardando a confirmação (ou backend anterior a
     *  este campo) — quem confirma é o /me. */
    plan_active?: boolean;
}

export async function subscribeProPix(
    cycle: string,
    indicationReceiver?: string,
    product: PersonalPlanProduct = 'pro',
    externalTransactionToken?: string,
): Promise<SubscribePixResponse> {
    const res = await Api.post<SubscribePixResponse>('/user/subscribe', {
        payment_method: 'PIX',
        plan_cycle: cycle,
        product,
        ...(indicationReceiver ? { indication_receiver: indicationReceiver } : {}),
        ...playChoice(externalTransactionToken),
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
    product: PersonalPlanProduct = 'pro',
    externalTransactionToken?: string,
): Promise<SubscribeCardResponse> {
    const res = await Api.post<SubscribeCardResponse>('/user/subscribe', {
        payment_method: 'CREDIT_CARD',
        plan_cycle: cycle,
        product,
        ...(indicationReceiver ? { indication_receiver: indicationReceiver } : {}),
        ...card,
        ...playChoice(externalTransactionToken),
    });
    return res.data;
}

/** Oferta de retenção: desce do PRO para o Personal Plus sem novo checkout.
 *  A assinatura do Asaas só tem o valor trocado — o cartão segue o mesmo —, e
 *  `effective_at` (ISO) é quando o Plus passa a valer: o PRO vale até lá. */
export interface SwitchToPlusResponse {
    message: string;
    effective_at: string;
    new_value: number;
}

export async function switchToPersonalPlus(): Promise<SwitchToPlusResponse> {
    const { data } = await Api.post<SwitchToPlusResponse>('/user/subscription/switch-to-plus');
    return data;
}

/** Cancela o PRO no cartão. As cobranças param na hora; `access_until`
 *  (ISO) é até quando o período já pago continua valendo. */
export async function cancelSubscription(): Promise<{ access_until?: string }> {
    const { data } = await Api.post<{ access_until?: string }>('/user/cancel-subscribe');
    return data ?? {};
}

/** Situação do plano do personal, lida de GET /me. */
export interface ProPlanStatus {
    /** Plano EFETIVO: 'free' | 'plus' | 'pro'. Nunca comparar com 'pro' para
     *  decidir acesso — use `is_plus` / `is_pro`, que o backend já calcula
     *  pela escada (ver domain/user/plan-tier.go). */
    plan_type?: string;
    /** Tem Plus ou PRO: alunos ilimitados, marca, financeiro, sem anúncio. */
    is_plus?: boolean;
    /** Tem o PRO completo: IA, upload de vídeo nativo e agenda. */
    is_pro?: boolean;
    has_active_subscription?: boolean;
    subscription_cycle?: string;
    /** 'GOOGLE_PLAY' quando a assinatura foi feita pela loja: cancelar e trocar
     *  de plano só pela Play Store (o backend recusa os dois). */
    subscription_billing_type?: string;
    /** ISO: plano (PRO ou Plus) cancelado que ainda vale até esta data. */
    pro_access_until?: string;
    /** Troca de plano agendada (hoje só 'plus'): o plano muda em
     *  `plan_change_at` e até lá o atual continua valendo. */
    plan_change_to?: string;
    plan_change_at?: string;
    /** Plano pago por PIX: cobrança única que compra um período e NÃO
     *  renova sozinha. `prepaid_until` (ISO) é o fim do período pago;
     *  ausentes sem período PIX valendo. */
    prepaid_tier?: string;
    prepaid_until?: string;
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
    return isPersonalPlanPaymentConfirmed('pro', wasOnTrial);
}

/** Versão da confirmação acima para qualquer plano de personal.
 *
 *  O Plus precisa de uma checagem própria porque comprar o Plus durante o
 *  teste grátis (ou no período pago de um PRO cancelado) NÃO muda
 *  `plan_type`: a conta segue "pro" até a data, de propósito — quem pagou o
 *  PRO tem direito a ele até o fim. Nesses casos o sinal da compra é o
 *  backend passar a reconhecer uma assinatura ativa. */
export async function isPersonalPlanPaymentConfirmed(
    tier: 'plus' | 'pro',
    wasOnTrial: boolean,
): Promise<boolean> {
    const status = await getProPlanStatus();
    if (tier === 'pro') {
        if (status.plan_type !== 'pro' || status.pro_access_until) return false;
        if (!wasOnTrial) return true;
        return !(await getProTrialStatus()).pro_trial_active;
    }
    // Plus: ou o plano efetivo já é 'plus', ou a conta segue num PRO
    // emprestado e o que confirma é a assinatura nova ter sido reconhecida.
    if (status.plan_type === 'plus') return true;
    return !!status.has_active_subscription && !!status.is_plus;
}

/** O PIX de plano do personal foi pago? O PIX compra um período, então o
 *  sinal é o /me mostrar um período desse nível com data DIFERENTE da de
 *  antes do QR Code (`prepaidUntilBefore`, '' se não havia). Olhar o
 *  `plan_type`, como no cartão, confirmaria na hora a renovação de quem já
 *  está no plano — antes de pagar. Devolve o status quando confirmado. */
export async function pixPlanPaymentConfirmed(
    tier: 'plus' | 'pro',
    prepaidUntilBefore: string,
): Promise<ProPlanStatus | null> {
    const status = await getProPlanStatus();
    const paid =
        status.prepaid_tier === tier &&
        !!status.prepaid_until &&
        status.prepaid_until !== prepaidUntilBefore;
    return paid ? status : null;
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
    externalTransactionToken?: string,
): Promise<SubscribeCardResponse> {
    const res = await Api.post<SubscribeCardResponse>('/me/student-plus/subscribe', {
        ...card,
        ...playChoice(externalTransactionToken),
    });
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
    externalTransactionToken?: string,
): Promise<PurchaseLibraryPlanResponse> {
    const res = await Api.post<PurchaseLibraryPlanResponse>(
        `/my-planning/celebrity-templates/${templateId}/purchase`,
        { payment_method: 'PIX', ...playChoice(externalTransactionToken) },
    );
    return res.data;
}

/** Compra um plano da biblioteca via cartão (síncrono). Se aprovado, applied=true. */
export async function purchaseLibraryPlanCard(
    templateId: string,
    card: CardSubscriptionForm,
    externalTransactionToken?: string,
): Promise<PurchaseLibraryPlanResponse> {
    const res = await Api.post<PurchaseLibraryPlanResponse>(
        `/my-planning/celebrity-templates/${templateId}/purchase`,
        { payment_method: 'CREDIT_CARD', ...card, ...playChoice(externalTransactionToken) },
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
    externalTransactionToken?: string,
): Promise<PurchaseLibraryPlanResponse> {
    const res = await Api.post<PurchaseLibraryPlanResponse>(
        `/my-planning/locked/${planId}/purchase`,
        { payment_method: 'PIX', ...playChoice(externalTransactionToken) },
    );
    return res.data;
}

/** Manter o plano bloqueado pagando no cartão (síncrono). */
export async function purchaseLockedPlanCard(
    planId: string,
    card: CardSubscriptionForm,
    externalTransactionToken?: string,
): Promise<PurchaseLibraryPlanResponse> {
    const res = await Api.post<PurchaseLibraryPlanResponse>(
        `/my-planning/locked/${planId}/purchase`,
        { payment_method: 'CREDIT_CARD', ...card, ...playChoice(externalTransactionToken) },
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
    /** "Como você conheceu", nos planos do personal (mesmo valor do PIX/cartão). */
    indicationReceiver?: string,
): Promise<GooglePlayVerifyResponse> {
    const res = await Api.post<GooglePlayVerifyResponse>('/billing/google/verify', {
        product_id: productId,
        purchase_token: purchaseToken,
        product_type: productType,
        ...(templateId ? { template_id: templateId } : {}),
        ...(lockedPlanId ? { locked_plan_id: lockedPlanId } : {}),
        ...(indicationReceiver ? { indication_receiver: indicationReceiver } : {}),
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
    /** 'alternative': na tela de escolha do Google, o usuário escolheu pagar
     *  pelo Asaas — nada foi cobrado; segue para PIX/cartão com o token. */
    status: 'success' | 'alternative' | 'canceled' | 'error';
    productId?: string;
    productType?: 'subs' | 'inapp';
    purchaseToken?: string;
    externalTransactionToken?: string;
    message?: string;
}

/**
 * Dispara a compra nativa e resolve quando o app devolver o resultado via
 * CustomEvent 'venafit-billing': compra no Google Play (status 'success') ou
 * escolha do Asaas na tela do Google ('alternative'). Rejeita em
 * cancelamento/erro/timeout.
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
            if (
                (detail?.status === 'success' && detail.purchaseToken) ||
                (detail?.status === 'alternative' && detail.externalTransactionToken)
            ) {
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
