import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Api } from '@/libs/api';
import {
    getCachedMyLogWindow,
    getMyLogWindow,
    isCheckInPhotoEnabled,
} from './logWindowService';

vi.mock('@/libs/api', () => ({
    Api: { get: vi.fn(), put: vi.fn() },
}));

describe('isCheckInPhotoEnabled', () => {
    it('esconde a foto só quando o servidor disse que ela está desligada', () => {
        expect(isCheckInPhotoEnabled({ photo_enabled: false })).toBe(false);
        expect(isCheckInPhotoEnabled({ photo_enabled: true })).toBe(true);
    });

    // Aparelho que nunca buscou a janela, ou backend anterior ao campo: a
    // foto continua aparecendo, como sempre apareceu.
    it('mantém a foto sem cache ou sem o campo', () => {
        expect(isCheckInPhotoEnabled(null)).toBe(true);
        expect(isCheckInPhotoEnabled({})).toBe(true);
    });
});

describe('getMyLogWindow', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.mocked(Api.get).mockReset();
    });

    // O check-in lê do cache, sem rede: se photo_enabled não for guardado, a
    // tela offline voltaria a oferecer a foto com a flag desligada.
    it('guarda photo_enabled no cache usado offline pelo check-in', async () => {
        vi.mocked(Api.get).mockResolvedValue({
            data: { log_window: '48h', is_default: true, photo_enabled: false },
        });

        await getMyLogWindow();

        const cached = getCachedMyLogWindow();
        expect(cached?.photo_enabled).toBe(false);
        expect(isCheckInPhotoEnabled(cached)).toBe(false);
    });
});
