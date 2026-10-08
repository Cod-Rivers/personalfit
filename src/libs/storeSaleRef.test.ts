import { beforeEach, describe, expect, it } from 'vitest';
import { readStoreSaleRef, saveStoreSaleRef } from './storeSaleRef';

const DAY = 24 * 60 * 60 * 1000;

describe('storeSaleRef', () => {
    beforeEach(() => window.localStorage.clear());

    it('guarda o último link de programa aberto', () => {
        saveStoreSaleRef('CARLA', 1000);
        saveStoreSaleRef(' BRUNO ', 2000);
        expect(readStoreSaleRef(3000)).toBe('BRUNO');
    });

    it('vale por 30 dias', () => {
        saveStoreSaleRef('CARLA', 0);
        expect(readStoreSaleRef(29 * DAY)).toBe('CARLA');
        expect(readStoreSaleRef(31 * DAY)).toBeNull();
        // e some do storage depois de vencer
        expect(readStoreSaleRef(1)).toBeNull();
    });

    it('ignora vazio e código longo demais', () => {
        saveStoreSaleRef('CARLA', 0);
        saveStoreSaleRef('', 1);
        saveStoreSaleRef(null, 2);
        saveStoreSaleRef('x'.repeat(41), 3);
        expect(readStoreSaleRef(4)).toBe('CARLA');
    });
});
