import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { AxiosError, AxiosHeaders } from 'axios';

const DB_NAME = 'venafit-offline';

function deleteDatabase(name: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase(name);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        req.onblocked = () => resolve();
    });
}

/** Erro de axios SEM `response` — é assim que uma requisição que nunca chegou
 * a falar com o servidor (offline, DNS fora) chega no `catch`. */
function networkError(): AxiosError {
    return new AxiosError('Network Error', 'ERR_NETWORK', {
        headers: new AxiosHeaders(),
    });
}

/** Erro de axios COM resposta — o servidor respondeu e recusou. */
function httpError(status: number): AxiosError {
    const err = networkError();
    err.response = {
        status,
        statusText: '',
        data: {},
        headers: {},
        config: { headers: new AxiosHeaders() },
    };
    return err;
}

describe('offline/personalCache', () => {
    beforeEach(() => {
        vi.resetModules();
        // `isOfflineError` consulta navigator.onLine antes de olhar o erro;
        // o padrão do jsdom já é `true`, mas deixar explícito evita que um
        // teste que o sobrescreve vaze para o seguinte.
        vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        await deleteDatabase(DB_NAME);
    });

    describe('isOfflineError', () => {
        it('trata erro de axios sem resposta como falta de rede', async () => {
            const { isOfflineError } = await import('./personalCache');
            expect(isOfflineError(networkError())).toBe(true);
        });

        it('NÃO trata recusa do servidor como falta de rede', async () => {
            const { isOfflineError } = await import('./personalCache');
            // 403/404/500 têm resposta: cair no cache aqui esconderia a
            // mudança real (aluno desvinculado, plano apagado).
            expect(isOfflineError(httpError(403))).toBe(false);
            expect(isOfflineError(httpError(404))).toBe(false);
            expect(isOfflineError(httpError(500))).toBe(false);
        });

        it('confia em navigator.onLine=false mesmo para erro não-axios', async () => {
            vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
            const { isOfflineError } = await import('./personalCache');
            expect(isOfflineError(new Error('qualquer coisa'))).toBe(true);
        });
    });

    it('guarda e devolve a lista de alunos', async () => {
        const { cachePersonalStudents, getCachedPersonalStudents } =
            await import('./personalCache');

        expect(await getCachedPersonalStudents()).toBeNull();

        await cachePersonalStudents([{ id: 'a1', name: 'Ana' }]);
        expect(await getCachedPersonalStudents()).toEqual([
            { id: 'a1', name: 'Ana' },
        ]);
    });

    it('separa o cache de planos por aluno', async () => {
        const { cacheStudentPlannings, getCachedStudentPlannings } =
            await import('./personalCache');

        await cacheStudentPlannings('aluno-1', [
            { id: 'p1' },
        ] as never);

        expect(await getCachedStudentPlannings('aluno-1')).toHaveLength(1);
        // Sem o studentId na chave, o plano de um aluno apareceria na tela do
        // outro — o pior erro possível numa carteira de alunos.
        expect(await getCachedStudentPlannings('aluno-2')).toBeNull();
    });

    it('separa o macrociclo por aluno e por plano', async () => {
        const { cachePersonalMacrocycle, getCachedPersonalMacrocycle } =
            await import('./personalCache');

        await cachePersonalMacrocycle('aluno-1', {
            id: 'macro-1',
            name: 'Hipertrofia',
        } as never);

        expect(
            (await getCachedPersonalMacrocycle('aluno-1', 'macro-1'))?.name,
        ).toBe('Hipertrofia');
        expect(
            await getCachedPersonalMacrocycle('aluno-2', 'macro-1'),
        ).toBeNull();
        expect(
            await getCachedPersonalMacrocycle('aluno-1', 'macro-9'),
        ).toBeNull();
    });

    it('nunca lança quando o IndexedDB está indisponível', async () => {
        const { getOfflineDB } = await import('./db');
        void getOfflineDB;
        vi.doMock('./db', () => ({
            getOfflineDB: () => Promise.reject(new Error('modo privado')),
        }));

        const { cachePersonalStudents, getCachedPersonalStudents } =
            await import('./personalCache');

        // Cache é conveniência: uma falha aqui não pode derrubar a tela que o
        // consulta (modo privado, armazenamento bloqueado, outra aba travando
        // o banco).
        await expect(cachePersonalStudents([{ id: 'a1' }])).resolves
            .toBeUndefined();
        await expect(getCachedPersonalStudents()).resolves.toBeNull();
    });
});
