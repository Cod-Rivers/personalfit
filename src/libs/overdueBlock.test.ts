import { describe, expect, it } from 'vitest';
import { AxiosError, type AxiosResponse } from 'axios';
import { isOverdueBlockError, OVERDUE_BLOCK_CODE } from './overdueBlock';

function httpError(status: number, data: unknown): AxiosError {
    return new AxiosError('falhou', String(status), undefined, undefined, {
        status,
        data,
    } as AxiosResponse);
}

describe('isOverdueBlockError', () => {
    it('reconhece o 403 do bloqueio por mensalidade vencida', () => {
        expect(
            isOverdueBlockError(httpError(403, { code: OVERDUE_BLOCK_CODE })),
        ).toBe(true);
    });

    // A evolução e o plano alimentar tratavam todo 403 como "precisa de PRO".
    it('não confunde com outro 403 (plano PRO, acesso negado)', () => {
        expect(isOverdueBlockError(httpError(403, { error: 'requer Pro' }))).toBe(
            false,
        );
    });

    it('ignora erro sem resposta (offline) e erro que não é do axios', () => {
        expect(isOverdueBlockError(new AxiosError('Network Error'))).toBe(false);
        expect(isOverdueBlockError(new Error('x'))).toBe(false);
    });
});
