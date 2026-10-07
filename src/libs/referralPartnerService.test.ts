import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, type AxiosResponse } from 'axios';
import { Api } from '@/libs/api';
import {
    DEFAULT_FIRST_COMMISSION,
    DEFAULT_RENEWAL_COMMISSION,
    checkReferralCode,
    describeCommission,
    normalizeReferralCode,
} from './referralPartnerService';

vi.mock('@/libs/api', () => ({ Api: { get: vi.fn() } }));

describe('normalizeReferralCode', () => {
    it('segue o NormalizeCode do backend: caixa e separadores não contam', () => {
        expect(normalizeReferralCode(' joao-10 ')).toBe('JOAO10');
        expect(normalizeReferralCode('maria_fit.br')).toBe('MARIAFITBR');
        expect(normalizeReferralCode(`k7m2${String.fromCharCode(0xa0)}qx9p`)).toBe('K7M2QX9P');
        expect(normalizeReferralCode('---')).toBe('');
    });
});

describe('checkReferralCode', () => {
    // Com chaves: devolver o mock faria o vitest chamá-lo como limpeza.
    beforeEach(() => {
        vi.mocked(Api.get).mockReset();
    });

    it('consulta a forma canônica e devolve o parceiro', async () => {
        vi.mocked(Api.get).mockResolvedValue({ data: { code: 'JOAO10', partner_name: 'João' } });
        await expect(checkReferralCode('joao-10')).resolves.toEqual({
            code: 'JOAO10',
            partner_name: 'João',
        });
        expect(Api.get).toHaveBeenCalledWith('/referral-codes/JOAO10');
    });

    it('404 é "não encontrado"; código vazio nem consulta', async () => {
        vi.mocked(Api.get).mockRejectedValue(
            new AxiosError('Not Found', 'ERR_BAD_REQUEST', undefined, undefined, {
                status: 404,
            } as unknown as AxiosResponse),
        );
        await expect(checkReferralCode('XPTO')).resolves.toBeNull();
        await expect(checkReferralCode('--')).resolves.toBeNull();
        expect(Api.get).toHaveBeenCalledTimes(1);
    });

    it('sem rede é erro, não "código não encontrado"', async () => {
        vi.mocked(Api.get).mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'));
        await expect(checkReferralCode('JOAO10')).rejects.toThrow('Network Error');
    });
});

describe('describeCommission', () => {
    it('regra padrão: 15% na 1ª compra e 10% nas renovações, sobre o líquido', () => {
        expect(
            describeCommission({
                commission_type: 'percentage',
                commission_value: DEFAULT_FIRST_COMMISSION,
                renewal_commission_value: DEFAULT_RENEWAL_COMMISSION,
                renewal_months: 0,
            }),
        ).toBe('15% na 1ª compra · 10% nas renovações do mensal · sobre o líquido');
    });

    it('prazo, base bruta e renovação zerada', () => {
        expect(
            describeCommission({
                commission_type: 'percentage',
                commission_value: 12.5,
                renewal_commission_value: 5,
                renewal_months: 12,
                commission_base: 'gross',
            }),
        ).toBe('12,5% na 1ª compra · 5% nas renovações do mensal por 12 meses · sobre o bruto');
        expect(
            describeCommission({
                commission_type: 'percentage',
                commission_value: 20,
                renewal_commission_value: 0,
                renewal_months: 0,
            }),
        ).toBe('20% na 1ª compra · sem comissão nas renovações · sobre o líquido');
    });

    it('valor fixo em reais, sem base', () => {
        expect(
            describeCommission({
                commission_type: 'fixed',
                commission_value: 20,
                renewal_commission_value: 5,
                renewal_months: 0,
            }).replace(/ /g, ' '),
        ).toBe('R$ 20,00 na 1ª compra · R$ 5,00 nas renovações do mensal');
    });
});
