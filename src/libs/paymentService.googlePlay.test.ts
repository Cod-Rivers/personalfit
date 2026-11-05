import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Api } from '@/libs/api';
import { hasNativeBilling, nativeBillingPurchase } from '@/libs/nativeBridge';
import { readStoreEntryPoint } from '@/libs/storeSaleRef';
import {
    launchGooglePlayPurchase,
    verifyGooglePlayPurchase,
    type BillingBridgeEvent,
} from './paymentService';

/**
 * Compra pelo Google Play no lado web: o app Android devolve o resultado da
 * compra pelo CustomEvent 'venafit-billing', e o purchaseToken segue para
 * POST /billing/google/verify. Um evento mal casado aqui é compra paga que
 * nunca chega ao backend (sem acknowledge, o Google estorna em 3 dias).
 */

vi.mock('@/libs/api', () => ({
    Api: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('@/libs/nativeBridge', () => ({
    hasNativeBilling: vi.fn(),
    nativeBillingAvailable: vi.fn(),
    nativeBillingPurchase: vi.fn(),
}));

vi.mock('@/libs/storeSaleRef', () => ({
    readStoreEntryPoint: vi.fn(() => null),
}));

function emit(detail: Partial<BillingBridgeEvent>) {
    window.dispatchEvent(new CustomEvent('venafit-billing', { detail }));
}

/** Estado de uma promessa sem esperar por ela. */
async function settled<T>(p: Promise<T>): Promise<'pending' | 'resolved' | 'rejected'> {
    let state: 'pending' | 'resolved' | 'rejected' = 'pending';
    p.then(
        () => (state = 'resolved'),
        () => (state = 'rejected'),
    );
    await Promise.resolve();
    await Promise.resolve();
    return state;
}

describe('launchGooglePlayPurchase', () => {
    beforeEach(() => {
        vi.mocked(hasNativeBilling).mockReturnValue(true);
        vi.mocked(nativeBillingPurchase).mockReset();
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('resolve com o evento de sucesso e manda produto, tipo e conta à ponte', async () => {
        const p = launchGooglePlayPurchase('pro_monthly', 'subs', 'conta-1');
        expect(nativeBillingPurchase).toHaveBeenCalledWith('pro_monthly', 'subs', 'conta-1');

        emit({ status: 'success', productId: 'pro_monthly', productType: 'subs', purchaseToken: 'tok-1' });

        await expect(p).resolves.toMatchObject({ status: 'success', purchaseToken: 'tok-1' });
    });

    it('ignora o evento de outro productId e espera o seu', async () => {
        const p = launchGooglePlayPurchase('pro_monthly', 'subs', 'conta-1');

        emit({ status: 'success', productId: 'library_plan', purchaseToken: 'tok-de-outro' });
        emit({ status: 'canceled', productId: 'aluno_plus_monthly' });
        expect(await settled(p)).toBe('pending');

        emit({ status: 'success', productId: 'pro_monthly', purchaseToken: 'tok-certo' });
        await expect(p).resolves.toMatchObject({ purchaseToken: 'tok-certo' });
    });

    it('rejeita no cancelamento', async () => {
        const p = launchGooglePlayPurchase('pro_monthly', 'subs', 'conta-1');
        emit({ status: 'canceled', productId: 'pro_monthly' });
        await expect(p).rejects.toThrow('Compra cancelada');
    });

    it('rejeita no erro com a mensagem da ponte, ou com a padrão', async () => {
        const p1 = launchGooglePlayPurchase('pro_monthly', 'subs', 'conta-1');
        emit({ status: 'error', productId: 'pro_monthly', message: 'Item já adquirido' });
        await expect(p1).rejects.toThrow('Item já adquirido');

        const p2 = launchGooglePlayPurchase('pro_monthly', 'subs', 'conta-1');
        emit({ status: 'error', productId: 'pro_monthly' });
        await expect(p2).rejects.toThrow('Falha na compra pelo Google Play');
    });

    it('rejeita sucesso sem purchaseToken (não há o que verificar)', async () => {
        const p = launchGooglePlayPurchase('pro_monthly', 'subs', 'conta-1');
        emit({ status: 'success', productId: 'pro_monthly' });
        await expect(p).rejects.toThrow('Falha na compra pelo Google Play');
    });

    it('alternative (escolheu o Asaas na tela do Google) resolve com o token externo; sem token rejeita', async () => {
        const p1 = launchGooglePlayPurchase('pro_monthly', 'subs', 'conta-1');
        emit({ status: 'alternative', productId: 'pro_monthly', externalTransactionToken: 'ext-1' });
        await expect(p1).resolves.toMatchObject({ status: 'alternative', externalTransactionToken: 'ext-1' });

        const p2 = launchGooglePlayPurchase('pro_monthly', 'subs', 'conta-1');
        emit({ status: 'alternative', productId: 'pro_monthly' });
        await expect(p2).rejects.toThrow();
    });

    it('rejeita no tempo esgotado e deixa de ouvir', async () => {
        vi.useFakeTimers();
        const removeSpy = vi.spyOn(window, 'removeEventListener');
        const p = launchGooglePlayPurchase('pro_monthly', 'subs', 'conta-1', 1_000);
        const assertion = expect(p).rejects.toThrow('Tempo esgotado aguardando o Google Play');

        await vi.advanceTimersByTimeAsync(1_000);
        await assertion;
        expect(removeSpy).toHaveBeenCalledWith('venafit-billing', expect.any(Function));
    });

    it('usa 5 minutos de prazo por padrão', async () => {
        vi.useFakeTimers();
        const p = launchGooglePlayPurchase('pro_monthly', 'subs', 'conta-1');
        await vi.advanceTimersByTimeAsync(5 * 60 * 1000 - 1);
        expect(await settled(p)).toBe('pending');
        const assertion = expect(p).rejects.toThrow('Tempo esgotado');
        await vi.advanceTimersByTimeAsync(1);
        await assertion;
    });

    it('sem a ponte nativa rejeita sem tentar comprar', async () => {
        vi.mocked(hasNativeBilling).mockReturnValue(false);
        await expect(launchGooglePlayPurchase('pro_monthly', 'subs', 'conta-1')).rejects.toThrow(
            'Google Play Billing indisponível neste dispositivo',
        );
        expect(nativeBillingPurchase).not.toHaveBeenCalled();
    });

    it('a ponte que lança na hora rejeita, remove o ouvinte e cancela o timer', async () => {
        vi.useFakeTimers();
        vi.mocked(nativeBillingPurchase).mockImplementation(() => {
            throw new Error('BillingClient desconectado');
        });
        const removeSpy = vi.spyOn(window, 'removeEventListener');

        await expect(launchGooglePlayPurchase('pro_monthly', 'subs', 'conta-1')).rejects.toThrow('BillingClient desconectado');
        expect(removeSpy).toHaveBeenCalledWith('venafit-billing', expect.any(Function));
        expect(vi.getTimerCount()).toBe(0);
    });

    it('depois de resolver, remove o ouvinte e o timer: um 2º evento não afeta nada', async () => {
        vi.useFakeTimers();
        const addSpy = vi.spyOn(window, 'addEventListener');
        const removeSpy = vi.spyOn(window, 'removeEventListener');

        const p = launchGooglePlayPurchase('pro_monthly', 'subs', 'conta-1');
        const listener = addSpy.mock.calls.find(([type]) => type === 'venafit-billing')?.[1];
        emit({ status: 'success', productId: 'pro_monthly', purchaseToken: 'tok-1' });
        await expect(p).resolves.toMatchObject({ purchaseToken: 'tok-1' });

        expect(removeSpy).toHaveBeenCalledWith('venafit-billing', listener);
        expect(vi.getTimerCount()).toBe(0);
        // Uma compra seguinte do mesmo produto não recebe o evento antigo.
        const next = launchGooglePlayPurchase('pro_monthly', 'subs', 'conta-1');
        expect(await settled(next)).toBe('pending');
        emit({ status: 'canceled', productId: 'pro_monthly' });
        await expect(next).rejects.toThrow('Compra cancelada');
    });

    // Caracterização: evento sem productId é tomado como resposta desta compra.
    it('aceita evento sem productId como resposta da compra em curso', async () => {
        const p = launchGooglePlayPurchase('pro_monthly', 'subs', 'conta-1');
        emit({ status: 'canceled' });
        await expect(p).rejects.toThrow('Compra cancelada');
    });

    // Caracterização: o sucesso que chega DEPOIS do prazo (cartão com
    // autenticação demorada, pagamento pendente que conclui depois) não chega
    // a ninguém — o verify não é chamado por este caminho. A recuperação
    // depende do app Android reprocessar compras pendentes (fora deste teste).
    it('sucesso depois do tempo esgotado é descartado', async () => {
        vi.useFakeTimers();
        const addSpy = vi.spyOn(window, 'addEventListener');
        const removeSpy = vi.spyOn(window, 'removeEventListener');
        const p = launchGooglePlayPurchase('pro_monthly', 'subs', 'conta-1', 1_000);
        const listener = addSpy.mock.calls.find(([type]) => type === 'venafit-billing')?.[1];
        const assertion = expect(p).rejects.toThrow('Tempo esgotado');
        await vi.advanceTimersByTimeAsync(1_000);
        await assertion;

        // Ninguém mais ouve: o purchaseToken tardio não vira verify.
        expect(removeSpy).toHaveBeenCalledWith('venafit-billing', listener);
        emit({ status: 'success', productId: 'pro_monthly', purchaseToken: 'tok-tardio' });
        await expect(p).rejects.toThrow('Tempo esgotado');
    });
});

describe('verifyGooglePlayPurchase', () => {
    beforeEach(() => {
        vi.mocked(Api.post).mockReset();
        vi.mocked(Api.post).mockResolvedValue({ data: { success: true, message: 'ok', status: 'SUBSCRIPTION_STATE_ACTIVE' } } as never);
        vi.mocked(readStoreEntryPoint).mockReturnValue(null);
    });

    function sentBody() {
        expect(Api.post).toHaveBeenCalledTimes(1);
        const [url, body] = vi.mocked(Api.post).mock.calls[0];
        expect(url).toBe('/billing/google/verify');
        return body as Record<string, unknown>;
    }

    it('manda só produto, token e product_type quando não há extras', async () => {
        const res = await verifyGooglePlayPurchase('pro_monthly', 'tok-1', 'subs');
        expect(sentBody()).toEqual({ product_id: 'pro_monthly', purchase_token: 'tok-1', product_type: 'subs' });
        expect(res).toEqual({ success: true, message: 'ok', status: 'SUBSCRIPTION_STATE_ACTIVE' });
    });

    it('manda product_type inapp e os campos opcionais quando preenchidos', async () => {
        await verifyGooglePlayPurchase('library_plan', 'tok-2', 'inapp', 'tmpl-1', 'locked-1', 'instagram');
        expect(sentBody()).toEqual({
            product_id: 'library_plan',
            purchase_token: 'tok-2',
            product_type: 'inapp',
            template_id: 'tmpl-1',
            locked_plan_id: 'locked-1',
            indication_receiver: 'instagram',
        });
    });

    it('omite campos opcionais vazios', async () => {
        await verifyGooglePlayPurchase('pro_monthly', 'tok-3', 'subs', '', '', '', { programId: '', ref: '' });
        expect(sentBody()).toEqual({ product_id: 'pro_monthly', purchase_token: 'tok-3', product_type: 'subs' });
    });

    // Caracterização: ref não depende de program_id aqui — quem só o passa
    // com programa é a página (handleGooglePlay).
    it('ref vai sempre que informado, mesmo sem program_id', async () => {
        await verifyGooglePlayPurchase('pro_monthly', 'tok-3b', 'subs', undefined, undefined, undefined, { programId: '', ref: 'CARLA' });
        expect(sentBody()).toEqual({ product_id: 'pro_monthly', purchase_token: 'tok-3b', product_type: 'subs', ref: 'CARLA' });
    });

    it('program_id e ref só com programa; ref nulo fica de fora', async () => {
        await verifyGooglePlayPurchase('program_4990', 'tok-4', 'inapp', undefined, undefined, undefined, {
            programId: 'prog-1',
            ref: null,
        });
        expect(sentBody()).toEqual({
            product_id: 'program_4990',
            purchase_token: 'tok-4',
            product_type: 'inapp',
            program_id: 'prog-1',
        });

        vi.mocked(Api.post).mockClear();
        await verifyGooglePlayPurchase('program_4990', 'tok-5', 'inapp', undefined, undefined, undefined, {
            programId: 'prog-1',
            ref: 'CARLA',
        });
        expect(sentBody()).toMatchObject({ program_id: 'prog-1', ref: 'CARLA' });
    });

    it('entry_point só vai com programa da loja', async () => {
        vi.mocked(readStoreEntryPoint).mockReturnValue('mural');
        await verifyGooglePlayPurchase('pro_monthly', 'tok-6', 'subs', undefined, undefined, 'none');
        expect(sentBody()).not.toHaveProperty('entry_point');

        vi.mocked(Api.post).mockClear();
        await verifyGooglePlayPurchase('program_4990', 'tok-7', 'inapp', undefined, undefined, undefined, { programId: 'prog-1' });
        expect(sentBody()).toMatchObject({ program_id: 'prog-1', entry_point: 'mural' });
    });

    it('propaga a falha do servidor (o checkout mostra o erro)', async () => {
        vi.mocked(Api.post).mockRejectedValue({ isAxiosError: true, response: { status: 400, data: { error: 'pertence a outra conta' } } });
        await expect(verifyGooglePlayPurchase('pro_monthly', 'tok-8', 'subs')).rejects.toMatchObject({ response: { status: 400 } });
    });

    it('devolve success=false do servidor sem lançar (estado sem direito)', async () => {
        vi.mocked(Api.post).mockResolvedValue({
            data: { success: false, message: 'Assinatura não está ativa no Google Play.', status: 'SUBSCRIPTION_STATE_PENDING' },
        } as never);
        await expect(verifyGooglePlayPurchase('pro_monthly', 'tok-9', 'subs')).resolves.toMatchObject({
            success: false,
            status: 'SUBSCRIPTION_STATE_PENDING',
        });
    });
});
