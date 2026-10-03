import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import type { MacrocycleResponse } from '@/libs/planningService';
import {
    cacheMacrocycleForOffline,
    getAllOfflineMacrocycles,
    pruneOfflineMacrocycles,
} from './downloadManager';

function macro(id: string): MacrocycleResponse {
    return {
        id,
        personal_id: 'p',
        student_id: 's',
        name: `Plano ${id}`,
        goal: '',
        status: 'active',
        updated_at: '2026-10-03T00:00:00Z',
    } as unknown as MacrocycleResponse;
}

describe('pruneOfflineMacrocycles', () => {
    it('apaga do aparelho os planos que o servidor não devolve mais', async () => {
        await cacheMacrocycleForOffline(macro('a'));
        await cacheMacrocycleForOffline(macro('b'));
        await cacheMacrocycleForOffline(macro('c'));

        // O servidor devolveu só "b": "a" e "c" foram excluídos ou bloqueados.
        await pruneOfflineMacrocycles(['b']);

        const left = (await getAllOfflineMacrocycles()).map((s) => s.id);
        expect(left).toEqual(['b']);
    });

    it('lista vazia do servidor apaga todos', async () => {
        await cacheMacrocycleForOffline(macro('x'));
        await pruneOfflineMacrocycles([]);
        expect(await getAllOfflineMacrocycles()).toEqual([]);
    });
});
