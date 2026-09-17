import axios from 'axios';
import type { MacrocycleResponse } from '@/libs/planningService';
import { getOfflineDB } from './db';

/**
 * Cache de LEITURA das telas do PERSONAL, para que elas continuem abrindo sem
 * rede.
 *
 * Por que existe: o service worker (public/sw.js) deliberadamente NÃO cacheia
 * chamadas de dados (`request.destination === 'empty'` passa direto pela rede),
 * e a API vive em outra origem. Resultado: offline, o app shell do personal
 * carregava normalmente — mas TODA tela vinha vazia, porque cada `Api.get`
 * rejeitava e os `catch` da UI caíam em lista vazia ou mensagem de erro. Na
 * prática o personal via "Nenhum aluno cadastrado" no avião, e como nunca
 * conseguia abrir a periodização de um aluno, a fila offline de prescrição
 * (prescriptionQueue.ts) era inalcançável — o que fazia parecer que o app
 * também "não salvava offline".
 *
 * Fica na store `meta` (chave/valor livre, já existente) em vez de stores
 * novas: evita um bump de DB_VERSION e mantém UM único ponto de descarte —
 * `clearSession()` apaga o banco inteiro no logout, então nenhum dado de aluno
 * (LGPD) sobrevive à troca de conta no aparelho.
 *
 * Não confundir com `macrocycles` em downloadManager.ts: aquela store é o
 * download EXPLÍCITO do ALUNO ("Baixar para offline") e alimenta a lista de
 * planos offline de /meus-treinos. Misturar os planos que o personal apenas
 * visitou faria aparecer plano de aluno alheio naquela lista.
 */

const PREFIX = 'personalCache:';

interface CachedEntry<T> {
    data: T;
    cachedAt: string;
}

async function readCache<T>(key: string): Promise<T | null> {
    try {
        const db = await getOfflineDB();
        const entry = (await db.get('meta', `${PREFIX}${key}`)) as
            | CachedEntry<T>
            | undefined;
        return entry?.data ?? null;
    } catch {
        // Modo privado, armazenamento bloqueado, banco travado por outra aba:
        // cache é conveniência, nunca pode derrubar a tela que o consulta.
        return null;
    }
}

async function writeCache<T>(key: string, data: T): Promise<void> {
    try {
        const db = await getOfflineDB();
        await db.put(
            'meta',
            { data, cachedAt: new Date().toISOString() },
            `${PREFIX}${key}`,
        );
    } catch {
        /* melhor-esforço — ver readCache */
    }
}

/**
 * A falha veio de falta de rede (e não de uma recusa do servidor)?
 *
 * `!err.response` é o sinal que o axios dá quando a requisição nunca chegou a
 * receber resposta — offline, DNS fora, servidor inalcançável. Um 403/404/500
 * TEM resposta e não deve cair no cache: mostrar dado velho como se fosse o
 * atual esconderia, por exemplo, um aluno que acabou de ser desvinculado.
 * `navigator.onLine` entra como reforço porque ele mente para menos (diz
 * `true` em wifi de hotel sem saída), nunca para mais.
 */
export function isOfflineError(err: unknown): boolean {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
    return axios.isAxiosError(err) && !err.response;
}

/* ── Lista de alunos do personal ── */

export interface CachedStudentsResult<T> {
    students: T[];
    cachedAt: string | null;
}

export async function cachePersonalStudents<T>(students: T[]): Promise<void> {
    await writeCache('students', students);
}

export async function getCachedPersonalStudents<T>(): Promise<T[] | null> {
    return readCache<T[]>('students');
}

/* ── Lista de macrociclos de um aluno (/personal/aluno/:id/periodizacao) ── */

export async function cacheStudentPlannings(
    studentId: string,
    plannings: MacrocycleResponse[],
): Promise<void> {
    await writeCache(`plannings:${studentId}`, plannings);
}

export async function getCachedStudentPlannings(
    studentId: string,
): Promise<MacrocycleResponse[] | null> {
    return readCache<MacrocycleResponse[]>(`plannings:${studentId}`);
}

/* ── Macrociclo aberto no editor de periodização ── */

export async function cachePersonalMacrocycle(
    studentId: string,
    macro: MacrocycleResponse,
): Promise<void> {
    await writeCache(`macro:${studentId}:${macro.id}`, macro);
}

export async function getCachedPersonalMacrocycle(
    studentId: string,
    planningId: string,
): Promise<MacrocycleResponse | null> {
    return readCache<MacrocycleResponse>(`macro:${studentId}:${planningId}`);
}
