import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nativeBillingTakeRecovered, type RecoveredPurchase } from '@/libs/nativeBridge';
import { verifyGooglePlayPurchase } from '@/libs/paymentService';
import { getToken, getUser } from '@/libs/session';
import {
    RESTORED_EVENT,
    listenForRecoveredPurchases,
    recoverGooglePlayPurchases,
    resetGooglePlayRecovery,
    verifyRecoveredPurchase,
} from './googlePlayRecovery';

/**
 * Compras do Google Play que o app acha na conta ao abrir e que ainda
 * precisam do verify (BillingBridge.recoverPurchases). Sem o verify, o Google
 * estorna em 3 dias uma compra paga.
 */

vi.mock('@/libs/nativeBridge', () => ({
    nativeBillingTakeRecovered: vi.fn(),
}));
vi.mock('@/libs/paymentService', () => ({
    verifyGooglePlayPurchase: vi.fn(),
}));
vi.mock('@/libs/session', () => ({
    getToken: vi.fn(),
    getUser: vi.fn(),
}));

const sub: RecoveredPurchase = {
    productId: 'pro_monthly',
    productType: 'subs',
    purchaseToken: 'tok-sub',
    accountId: 'conta-1',
};
const avulsa: RecoveredPurchase = {
    productId: 'program_4990',
    productType: 'inapp',
    purchaseToken: 'tok-avulsa',
};

function login(id = 'conta-1') {
    vi.mocked(getToken).mockReturnValue('jwt');
    vi.mocked(getUser).mockReturnValue({ id } as ReturnType<typeof getUser>);
}

describe('compras recuperadas do Google Play', () => {
    beforeEach(() => {
        resetGooglePlayRecovery();
        vi.mocked(verifyGooglePlayPurchase).mockReset();
        vi.mocked(verifyGooglePlayPurchase).mockResolvedValue({ success: true, message: 'ok' });
        vi.mocked(nativeBillingTakeRecovered).mockReset();
        vi.mocked(getToken).mockReset();
        vi.mocked(getUser).mockReset();
    });
    afterEach(() => vi.restoreAllMocks());

    it('verifica cada compra só com produto, token e tipo (a avulsa vai sem programa)', async () => {
        login();
        vi.mocked(nativeBillingTakeRecovered).mockResolvedValue([sub, avulsa]);

        await recoverGooglePlayPurchases();

        expect(verifyGooglePlayPurchase).toHaveBeenCalledTimes(2);
        expect(verifyGooglePlayPurchase).toHaveBeenCalledWith('pro_monthly', 'tok-sub', 'subs');
        expect(verifyGooglePlayPurchase).toHaveBeenCalledWith('program_4990', 'tok-avulsa', 'inapp');
    });

    it('sem sessão não busca no app (a compra fica guardada lá até o login)', async () => {
        vi.mocked(getToken).mockReturnValue(null);
        await recoverGooglePlayPurchases();
        expect(nativeBillingTakeRecovered).not.toHaveBeenCalled();
        expect(verifyGooglePlayPurchase).not.toHaveBeenCalled();
    });

    it('ignora a compra de outra conta Venafit no mesmo Google', async () => {
        login('conta-2');
        expect(await verifyRecoveredPurchase(sub)).toBe(false);
        expect(verifyGooglePlayPurchase).not.toHaveBeenCalled();
        // Sem a conta na compra, segue: o servidor confere o dono.
        expect(await verifyRecoveredPurchase(avulsa)).toBe(true);
    });

    it('o mesmo token é verificado uma vez (anúncio do app + busca)', async () => {
        login();
        await verifyRecoveredPurchase(sub);
        await verifyRecoveredPurchase({ ...sub });
        expect(verifyGooglePlayPurchase).toHaveBeenCalledTimes(1);
    });

    it('falha de rede libera o token para tentar de novo', async () => {
        login();
        vi.mocked(verifyGooglePlayPurchase).mockRejectedValueOnce(new Error('Network Error'));
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);

        expect(await verifyRecoveredPurchase(sub)).toBe(false);
        expect(await verifyRecoveredPurchase(sub)).toBe(true);
        expect(verifyGooglePlayPurchase).toHaveBeenCalledTimes(2);
    });

    it('recusa o que não é compra válida', async () => {
        login();
        const invalid = [
            { ...sub, purchaseToken: '' },
            { ...sub, productId: '' },
            { ...sub, productType: 'outro' as 'subs' },
        ];
        for (const item of invalid) expect(await verifyRecoveredPurchase(item)).toBe(false);
        expect(verifyGooglePlayPurchase).not.toHaveBeenCalled();
    });

    it('o anúncio do app (venafit-billing-restored) dispara o verify com sessão', async () => {
        login();
        const stop = listenForRecoveredPurchases();
        window.dispatchEvent(new CustomEvent(RESTORED_EVENT, { detail: avulsa }));
        await Promise.resolve();
        expect(verifyGooglePlayPurchase).toHaveBeenCalledWith('program_4990', 'tok-avulsa', 'inapp');

        stop();
        window.dispatchEvent(new CustomEvent(RESTORED_EVENT, { detail: sub }));
        await Promise.resolve();
        expect(verifyGooglePlayPurchase).toHaveBeenCalledTimes(1);
    });

    it('o anúncio sem sessão é ignorado', async () => {
        vi.mocked(getToken).mockReturnValue(null);
        const stop = listenForRecoveredPurchases();
        window.dispatchEvent(new CustomEvent(RESTORED_EVENT, { detail: sub }));
        await Promise.resolve();
        stop();
        expect(verifyGooglePlayPurchase).not.toHaveBeenCalled();
    });
});
