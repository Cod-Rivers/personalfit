import { describe, expect, it } from 'vitest';

import type { ProPlanStatus } from '@/libs/paymentService';
import { personalPlanPurchaseConflict, replacedSubscriptionNotice } from './personalPlanPurchase';

const plusOnCard: ProPlanStatus = {
    plan_type: 'plus',
    has_active_subscription: true,
    subscription_status: 'ACTIVE',
    subscription_tier: 'plus',
    subscription_cycle: 'MONTHLY',
    subscription_billing_type: 'CREDIT_CARD',
};

const proOnPlay: ProPlanStatus = {
    plan_type: 'pro',
    has_active_subscription: true,
    subscription_status: 'ACTIVE',
    subscription_tier: 'pro',
    subscription_cycle: 'MONTHLY',
    subscription_billing_type: 'GOOGLE_PLAY',
};

describe('personalPlanPurchaseConflict', () => {
    it('subir do Plus para o PRO pode', () => {
        expect(personalPlanPurchaseConflict(plusOnCard, 'pro', 'MONTHLY')).toBe('');
    });

    it('assinar de novo o mesmo plano e período não pode', () => {
        expect(personalPlanPurchaseConflict(plusOnCard, 'plus', 'MONTHLY')).toMatch(
            'Você já assina o Plus',
        );
    });

    it('trocar o período do PRO pode', () => {
        expect(personalPlanPurchaseConflict(proOnPlay, 'pro', 'YEARLY')).toBe('');
    });

    it('descer do PRO do Google Play pelo checkout não pode, e diz o caminho', () => {
        expect(personalPlanPurchaseConflict(proOnPlay, 'plus', 'MONTHLY')).toMatch('Play Store');
    });

    it('assinatura em atraso não bloqueia: assinar de novo é a saída', () => {
        const overdue = { ...plusOnCard, has_active_subscription: false, subscription_status: 'SUSPENDED' };
        expect(personalPlanPurchaseConflict(overdue, 'plus', 'MONTHLY')).toBe('');
    });

    it('o Plus durante o PIX do PRO não pode', () => {
        const prepaid: ProPlanStatus = {
            plan_type: 'pro',
            prepaid_tier: 'pro',
            prepaid_until: '2026-12-15T15:00:00Z',
        };
        expect(personalPlanPurchaseConflict(prepaid, 'plus', 'MONTHLY')).toMatch(
            'pago por PIX até 15/12/2026',
        );
        expect(personalPlanPurchaseConflict(prepaid, 'pro', 'MONTHLY')).toBe('');
    });

    it('sem a situação do plano, não bloqueia (o servidor confere)', () => {
        expect(personalPlanPurchaseConflict(null, 'plus', 'MONTHLY')).toBe('');
    });
});

describe('replacedSubscriptionNotice', () => {
    it('avisa que a assinatura atual é encerrada', () => {
        expect(replacedSubscriptionNotice(plusOnCard)).toBe(
            'Quando este pagamento for confirmado, sua assinatura atual do Plus no cartão é encerrada: você não paga as duas.',
        );
        expect(replacedSubscriptionNotice(proOnPlay)).toMatch('do PRO no Google Play');
    });

    it('sem assinatura, nada a avisar', () => {
        expect(replacedSubscriptionNotice({ plan_type: 'free' })).toBe('');
    });
});
