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

describe('origem da navegação (mural de resultados)', () => {
    beforeEach(() => window.localStorage.clear());

    it('guarda só "mural" ou "mural:<id>" e expira em 7 dias', async () => {
        const { saveStoreEntryPoint, readStoreEntryPoint } = await import('./storeSaleRef');
        const id = '0123456789abcdef01234567';
        saveStoreEntryPoint('instagram', 1000);
        expect(readStoreEntryPoint(1000)).toBeNull();
        saveStoreEntryPoint(`mural:${id}`, 1000);
        expect(readStoreEntryPoint(1000 + 6 * 86_400_000)).toBe(`mural:${id}`);
        expect(readStoreEntryPoint(1000 + 8 * 86_400_000)).toBeNull();
        saveStoreEntryPoint('mural', 1000);
        expect(readStoreEntryPoint(1000)).toBe('mural');
    });
});
