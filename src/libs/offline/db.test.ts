import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// jsdom não implementa IndexedDB — fake-indexeddb instala uma implementação
// em memória nos globais `indexedDB`/`IDBKeyRange`, exatamente como um
// navegador real faria. Sem isso `openDB()` (da lib `idb`) nunca resolveria
// em ambiente de teste.
import 'fake-indexeddb/auto';

// Espelha a constante privada `DB_NAME` de db.ts (não exportada). Usado só
// para abrir/apagar o banco "por fora", simulando o navegador entre testes.
const DB_NAME = 'venafit-offline';

function deleteDatabase(name: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase(name);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        req.onblocked = () => resolve();
    });
}

describe('offline/db', () => {
    beforeEach(() => {
        // `dbPromise` em db.ts é um singleton de módulo — sem resetar o
        // registro de módulos, o segundo teste reaproveitaria a conexão
        // (e a versão) aberta pelo primeiro, escondendo bugs de upgrade.
        vi.resetModules();
    });

    afterEach(async () => {
        await deleteDatabase(DB_NAME);
    });

    it('abre com sucesso e cria todas as stores esperadas', async () => {
        const { getOfflineDB } = await import('./db');
        const db = await getOfflineDB();

        expect(Array.from(db.objectStoreNames).sort()).toEqual(
            [
                'macrocycles',
                'meta',
                'pendingMedia',
                'pendingMutations',
                'pendingWorkoutLogIds',
            ].sort(),
        );

        db.close();
    });

    it('pendingWorkoutLogKey monta a chave "${microcycleId}:${trainingRef}"', async () => {
        const { pendingWorkoutLogKey } = await import('./db');

        expect(pendingWorkoutLogKey('micro-1', 'A')).toBe('micro-1:A');
        // Garante que não há normalização/trim escondida que mudaria a
        // chave usada pra achar o log pré-criado (pendingWorkoutLogIds).
        expect(pendingWorkoutLogKey('micro-2', 'treino-B')).toBe(
            'micro-2:treino-B',
        );
    });

    describe('countPendingMedia', () => {
        it('devolve 0 quando a store está vazia', async () => {
            const { getOfflineDB, countPendingMedia } = await import('./db');
            const db = await getOfflineDB();

            expect(await countPendingMedia()).toBe(0);

            db.close();
        });

        it('conta corretamente N documentos gravados na store', async () => {
            const { getOfflineDB, countPendingMedia } = await import('./db');
            const db = await getOfflineDB();

            // Sprint 4 (mediaQueue.ts): PendingMedia trocou `mutationId`
            // (referência a uma linha de pendingMutations que some quando a
            // mutação sincroniza) por `clientMutationId`/`logId` + os campos
            // de rota necessários para o upload da foto — ver comentário da
            // interface em db.ts.
            const base = {
                blob: new Blob(['a']),
                contentType: 'image/jpeg',
                createdAt: new Date().toISOString(),
                status: 'pending' as const,
                retryCount: 0,
                studentId: 's1',
                planningId: 'p1',
                mesocycleId: 'm1',
                microcycleId: 'mc1',
            };
            await db.add('pendingMedia', { ...base, logId: 'log-1' });
            await db.add('pendingMedia', { ...base, logId: 'log-2' });
            await db.add('pendingMedia', { ...base, clientMutationId: 'cmid-3' });

            expect(await countPendingMedia()).toBe(3);

            db.close();
        });
    });

    // Duas abas do Venafit abertas: a antiga segura o banco na v1 e o
    // upgrade para a v2 desta aba nunca acontece. O navegador dispara
    // `blocked` e NÃO rejeita nada — antes do prazo de abertura, `openDB`
    // ficava pendurado para sempre e o botão "Confirmar" do check-in girava
    // sem fim, sem mensagem nenhuma para o aluno.
    it('rejeita (em vez de pendurar) quando outra aba bloqueia o upgrade', async () => {
        const v1 = await new Promise<IDBDatabase>((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => {
                req.result.createObjectStore('meta');
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        // Só `setTimeout` é falsificado: fake-indexeddb depende dos outros
        // agendadores para as próprias transações andarem.
        vi.useFakeTimers({ toFake: ['setTimeout'] });
        try {
            const { getOfflineDB, OfflineDBUnavailableError } = await import('./db');
            const pending = getOfflineDB();
            const assertion = expect(pending).rejects.toSatisfy(
                (err: unknown) =>
                    err instanceof OfflineDBUnavailableError &&
                    /Tempo esgotado/.test(err.message),
            );

            await vi.advanceTimersByTimeAsync(15000);
            await assertion;
        } finally {
            vi.useRealTimers();
            v1.close();
        }
    });

    // Simula um aparelho que já tinha o app instalado antes desta sprint
    // (schema v1, sem `pendingMedia` e sem os campos novos de
    // `PendingMutation`). O bump pra v2 precisa criar a store nova SEM
    // mexer nas stores antigas — é a garantia de que ninguém perde a fila
    // que já tinha ao atualizar o app.
    it('migra de v1 para v2 preservando as stores antigas e criando pendingMedia', async () => {
        await new Promise<void>((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => {
                const rawDb = req.result;
                rawDb.createObjectStore('macrocycles', { keyPath: 'id' });
                rawDb.createObjectStore('pendingWorkoutLogIds', { keyPath: 'key' });
                rawDb.createObjectStore('pendingMutations', {
                    keyPath: 'id',
                    autoIncrement: true,
                });
                rawDb.createObjectStore('meta');
            };
            req.onsuccess = () => {
                req.result.close();
                resolve();
            };
            req.onerror = () => reject(req.error);
        });

        const { getOfflineDB } = await import('./db');
        const db = await getOfflineDB();

        expect(db.objectStoreNames.contains('pendingMedia')).toBe(true);
        // As stores da v1 continuam existindo depois do upgrade.
        expect(db.objectStoreNames.contains('macrocycles')).toBe(true);
        expect(db.objectStoreNames.contains('pendingWorkoutLogIds')).toBe(true);
        expect(db.objectStoreNames.contains('pendingMutations')).toBe(true);
        expect(db.objectStoreNames.contains('meta')).toBe(true);

        db.close();
    });
});
