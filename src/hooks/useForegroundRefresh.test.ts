import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
    FOREGROUND_REFRESH_MIN_MS,
    FOREGROUND_REFRESH_PERIOD_MS,
    useForegroundRefresh,
} from './useForegroundRefresh';

let visibility: DocumentVisibilityState = 'visible';

function setVisibility(state: DocumentVisibilityState) {
    visibility = state;
    document.dispatchEvent(new Event('visibilitychange'));
}

describe('useForegroundRefresh', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        visibility = 'visible';
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            get: () => visibility,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('ao voltar ao app depois do intervalo mínimo, atualiza uma vez', () => {
        const refresh = vi.fn();
        renderHook(() => useForegroundRefresh(refresh));

        // Voltar logo depois da carga inicial não repete a busca.
        setVisibility('hidden');
        setVisibility('visible');
        expect(refresh).not.toHaveBeenCalled();

        vi.advanceTimersByTime(FOREGROUND_REFRESH_MIN_MS + 1);
        setVisibility('hidden');
        setVisibility('visible');
        expect(refresh).toHaveBeenCalledTimes(1);

        // Volta de novo em seguida: dentro do intervalo, nada.
        setVisibility('hidden');
        setVisibility('visible');
        expect(refresh).toHaveBeenCalledTimes(1);
    });

    it('de reserva, atualiza periodicamente com o app visível', () => {
        const refresh = vi.fn();
        renderHook(() => useForegroundRefresh(refresh));

        vi.advanceTimersByTime(FOREGROUND_REFRESH_PERIOD_MS + 1);
        expect(refresh).toHaveBeenCalledTimes(1);
    });

    it('em segundo plano o temporizador não busca nada', () => {
        const refresh = vi.fn();
        renderHook(() => useForegroundRefresh(refresh));

        visibility = 'hidden';
        vi.advanceTimersByTime(3 * FOREGROUND_REFRESH_PERIOD_MS);
        expect(refresh).not.toHaveBeenCalled();
    });
});
