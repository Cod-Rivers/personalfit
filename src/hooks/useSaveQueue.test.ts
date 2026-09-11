import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useSaveQueue } from './useSaveQueue';
import { useCardStack } from './useCardStack';

/** Promise que o teste resolve na hora que quiser — deixa a requisição "em
 * voo" enquanto novos saves são pedidos. */
function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

describe('useSaveQueue', () => {
    it('mantém uma requisição por vez e coalesce o que chega durante o voo', async () => {
        const first = deferred<string>();
        const second = deferred<string>();
        const persist = vi
            .fn<(p: string) => Promise<string>>()
            .mockReturnValueOnce(first.promise)
            .mockReturnValueOnce(second.promise);

        const { result } = renderHook(() => useSaveQueue({ persist }));

        act(() => result.current.save('payload-1'));
        expect(persist).toHaveBeenCalledTimes(1);

        // Três cards concluídos enquanto o primeiro save ainda está em voo:
        // só o estado MAIS NOVO precisa ir, os intermediários são o mesmo
        // mesociclo num estágio anterior.
        act(() => {
            result.current.save('payload-2');
            result.current.save('payload-3');
            result.current.save('payload-4');
        });
        expect(persist).toHaveBeenCalledTimes(1);

        await act(async () => {
            first.resolve('ok');
            await first.promise;
        });

        await waitFor(() => expect(persist).toHaveBeenCalledTimes(2));
        expect(persist).toHaveBeenLastCalledWith('payload-4');

        await act(async () => {
            second.resolve('ok');
            await second.promise;
        });
        await waitFor(() => expect(result.current.status).toBe('saved'));
        expect(result.current.pending).toBe(false);
    });

    it('expõe a mensagem do servidor e não fica tentando de novo sozinho', async () => {
        const persist = vi.fn().mockRejectedValue({
            response: { data: { error: 'fase inválida' } },
        });

        const { result } = renderHook(() => useSaveQueue({ persist }));

        await act(async () => {
            result.current.save('payload');
        });

        await waitFor(() => expect(result.current.status).toBe('error'));
        expect(result.current.errorMessage).toBe('fase inválida');
        // Reenfileirar sozinho viraria laço infinito contra um 400 de
        // validação, que nenhuma retentativa resolve.
        expect(persist).toHaveBeenCalledTimes(1);
    });

    it('cai numa mensagem de conexão quando o erro não tem corpo', async () => {
        const persist = vi.fn().mockRejectedValue(new Error('Network Error'));
        const { result } = renderHook(() => useSaveQueue({ persist }));

        await act(async () => {
            result.current.save('payload');
        });

        await waitFor(() => expect(result.current.status).toBe('error'));
        expect(result.current.errorMessage).toMatch(/conexão/i);
    });
});

describe('useCardStack', () => {
    it('empilha, volta e nunca some com o card raiz', () => {
        const { result } = renderHook(() =>
            useCardStack<string>('raiz'),
        );

        expect(result.current.current).toBe('raiz');
        expect(result.current.depth).toBe(0);

        act(() => result.current.push('treinos'));
        act(() => result.current.push('exercicio'));
        expect(result.current.current).toBe('exercicio');
        expect(result.current.depth).toBe(2);
        expect(result.current.trail).toEqual(['raiz', 'treinos', 'exercicio']);

        act(() => result.current.pop());
        expect(result.current.current).toBe('treinos');

        // Na raiz, pop não faz nada: quem fecha o modal é o chamador.
        act(() => result.current.pop());
        act(() => result.current.pop());
        expect(result.current.current).toBe('raiz');
        expect(result.current.depth).toBe(0);
    });

    it('replace troca o topo sem crescer a pilha', () => {
        const { result } = renderHook(() => useCardStack<string>('raiz'));

        act(() => result.current.push('aba-serie'));
        act(() => result.current.replace('aba-prescricao'));

        expect(result.current.depth).toBe(1);
        expect(result.current.current).toBe('aba-prescricao');
    });

    it('resetTo leva direto ao card pedido a partir da raiz', () => {
        const { result } = renderHook(() => useCardStack<string>('raiz'));

        act(() => result.current.push('treinos'));
        act(() => result.current.push('treino'));
        act(() => result.current.push('exercicio'));
        act(() => result.current.resetTo('raiz'));

        expect(result.current.depth).toBe(0);
        expect(result.current.trail).toEqual(['raiz']);
    });
});
