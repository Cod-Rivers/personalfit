import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Api } from '@/libs/api';
import { isProPaymentConfirmed } from './paymentService';

vi.mock('@/libs/api', () => ({
    Api: { get: vi.fn(), post: vi.fn() },
}));

/** Responde /me e /personal/pro-trial com os dados informados. */
function mockApi(me: Record<string, unknown>, trial: Record<string, unknown> = {}) {
    vi.mocked(Api.get).mockImplementation(async (url: string) => ({
        data: url === '/me' ? me : trial,
    }));
}

describe('isProPaymentConfirmed', () => {
    beforeEach(() => {
        vi.mocked(Api.get).mockReset();
    });

    it('confirma quem saiu do free para o PRO', async () => {
        mockApi({ plan_type: 'pro' });
        expect(await isProPaymentConfirmed(false)).toBe(true);
    });

    it('não confirma enquanto o plano continua free', async () => {
        mockApi({ plan_type: 'free' });
        expect(await isProPaymentConfirmed(false)).toBe(false);
    });

    // Quem cancelou e assina de novo ainda está no PRO do período pago: sem
    // isso, o PIX aparecia como pago antes de o QR ser pago.
    it('não confirma no período pago de um cancelamento', async () => {
        mockApi({ plan_type: 'pro', pro_access_until: '2026-10-15T03:00:00Z' });
        expect(await isProPaymentConfirmed(false)).toBe(false);
    });

    it('no teste grátis, só confirma quando o teste é convertido', async () => {
        mockApi({ plan_type: 'pro' }, { plan_type: 'pro', pro_trial_active: true });
        expect(await isProPaymentConfirmed(true)).toBe(false);

        mockApi({ plan_type: 'pro' }, { plan_type: 'pro', pro_trial_active: false });
        expect(await isProPaymentConfirmed(true)).toBe(true);
    });
});
