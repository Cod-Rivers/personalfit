import { getOfflineDB } from './db';

/**
 * Cache de LEITURA do histórico de carga (aba "Cargas" da Evolução e o
 * "quanto peguei da última vez" do card), para as duas pontas:
 *  - aluno: na academia sem sinal, a última carga de cada exercício é
 *    justamente o que ele quer ver;
 *  - personal: mesmo motivo de personalCache.ts — sem cache, a tela abre
 *    vazia offline.
 *
 * Mesma decisão de personalCache.ts: fica na store `meta` (sem bump de
 * DB_VERSION) e some inteiro no `clearSession()` do logout, junto com o
 * resto do banco — é dado de treino do aluno (LGPD).
 */

const PREFIX = 'loadHistory:';

export interface CachedLoadHistory<T> {
    data: T;
    cachedAt: string;
}

/** `scope`: "me" (o próprio aluno) ou "student:<id>" (visão do personal).
 *  `view`: "summary" ou "detail:<chave do exercício>". */
function cacheKey(scope: string, view: string): string {
    return `${PREFIX}${scope}:${view}`;
}

export async function readLoadHistoryCache<T>(
    scope: string,
    view: string,
): Promise<CachedLoadHistory<T> | null> {
    try {
        const db = await getOfflineDB();
        const entry = (await db.get('meta', cacheKey(scope, view))) as
            | CachedLoadHistory<T>
            | undefined;
        return entry ?? null;
    } catch {
        // Modo privado, armazenamento bloqueado, banco travado por outra aba:
        // cache é conveniência, nunca pode derrubar a tela.
        return null;
    }
}

export async function writeLoadHistoryCache<T>(
    scope: string,
    view: string,
    data: T,
): Promise<void> {
    try {
        const db = await getOfflineDB();
        await db.put(
            'meta',
            { data, cachedAt: new Date().toISOString() },
            cacheKey(scope, view),
        );
    } catch {
        /* melhor-esforço — ver readLoadHistoryCache */
    }
}
