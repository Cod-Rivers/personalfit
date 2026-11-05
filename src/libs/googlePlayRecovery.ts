import { nativeBillingTakeRecovered, type RecoveredPurchase } from '@/libs/nativeBridge';
import { verifyGooglePlayPurchase } from '@/libs/paymentService';
import { getToken, getUser } from '@/libs/session';

/**
 * Compras do Google Play que o app Android acha na conta ao abrir
 * (BillingBridge.recoverPurchases): assinatura sem acknowledge e compra
 * avulsa não consumida. São compras pagas cujo verify não aconteceu — app
 * fechado no meio, rede caindo, pagamento pendente que foi aprovado depois.
 * Sem o verify, o Google estorna em 3 dias.
 *
 * O app as anuncia pelo CustomEvent 'venafit-billing-restored' e as guarda
 * até a página buscá-las (nativeBillingTakeRecovered). As duas vias passam
 * por aqui; o token só é verificado uma vez por carregamento da página.
 *
 * O verify da compra avulsa vai sem o programa: o servidor usa a intenção
 * gravada antes de abrir o Google Play (registerGooglePlayIntent).
 */

export const RESTORED_EVENT = 'venafit-billing-restored';

const handled = new Set<string>();

/** Só para os testes. */
export function resetGooglePlayRecovery(): void {
    handled.clear();
}

function isLoggedIn(): boolean {
    return !!getToken() && !!getUser()?.id;
}

/**
 * Verifica uma compra recuperada. Ignora a de outra conta Venafit (o mesmo
 * Google pode ter comprado por outra conta; o servidor também recusaria).
 * Devolve true quando o servidor confirmou.
 */
export async function verifyRecoveredPurchase(item: RecoveredPurchase): Promise<boolean> {
    const userId = getUser()?.id;
    if (!userId || !getToken()) return false;
    if (!item?.purchaseToken || !item.productId) return false;
    if (item.productType !== 'subs' && item.productType !== 'inapp') return false;
    if (item.accountId && item.accountId !== userId) return false;
    if (handled.has(item.purchaseToken)) return false;
    handled.add(item.purchaseToken);

    try {
        const res = await verifyGooglePlayPurchase(item.productId, item.purchaseToken, item.productType);
        if (!res.success) {
            console.warn('[google-play] compra recuperada não confirmada:', res.message);
        }
        return res.success;
    } catch (err) {
        // Falha de rede ou do servidor: pode tentar de novo na próxima vez.
        handled.delete(item.purchaseToken);
        console.warn('[google-play] verify da compra recuperada falhou:', err);
        return false;
    }
}

/** Busca no app as compras recuperadas e verifica cada uma. Só com sessão. */
export async function recoverGooglePlayPurchases(): Promise<void> {
    if (!isLoggedIn()) return;
    const list = await nativeBillingTakeRecovered();
    for (const item of list) {
        await verifyRecoveredPurchase(item);
    }
}

/**
 * Escuta o anúncio do app. Sem sessão, ignora: a compra continua guardada no
 * app e é buscada depois do login (recoverGooglePlayPurchases).
 */
export function listenForRecoveredPurchases(): () => void {
    if (typeof window === 'undefined') return () => undefined;
    const onEvent = (ev: Event) => {
        const detail = (ev as CustomEvent<RecoveredPurchase>).detail;
        if (detail && isLoggedIn()) void verifyRecoveredPurchase(detail);
    };
    window.addEventListener(RESTORED_EVENT, onEvent);
    return () => window.removeEventListener(RESTORED_EVENT, onEvent);
}
