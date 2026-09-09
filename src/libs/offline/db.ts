import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { MacrocycleResponse } from '@/libs/planningService';
import { CompleteWorkoutLogRequest, WorkoutSessionRequest } from '@/libs/workoutLogService';

const DB_NAME = 'venafit-offline';
// v1 -> v2: acrescenta a store `pendingMedia` (Sprint 4 vai escrever nela;
// aqui só o schema) e os campos novos de `pendingMutations` (idempotência,
// backoff, corpo de sessão). Nenhuma store existente é recriada — o guard
// `if (!db.objectStoreNames.contains(...))` por store já torna o bump
// idempotente e preserva os dados de quem atualiza o app com a fila cheia.
const DB_VERSION = 2;

export interface StoredMacrocycle {
    id: string;
    data: MacrocycleResponse;
    serverUpdatedAt: string;
    downloadedAt: string;
}

/** Log de treino "pending" pré-criado online, para permitir completar/pular
 * offline sem precisar de um create-then-complete em duas chamadas. */
export interface PendingWorkoutLogId {
    key: string; // `${microcycleId}:${trainingRef}`
    microcycleId: string;
    trainingRef: string;
    logId: string;
}

export type PendingMutationType = 'complete' | 'skip' | 'session';

export interface PendingMutation {
    id?: number;
    type: PendingMutationType;
    createdAt: string;
    studentId: string;
    planningId: string;
    mesocycleId: string;
    microcycleId: string;
    workoutLogId: string;
    completeBody?: CompleteWorkoutLogRequest;
    skipReason?: string;
    /** UUID v4 gerado com `crypto.randomUUID()` no momento em que a mutação é
     *  criada, e NUNCA regenerado num retry — é a chave de idempotência que o
     *  servidor usa em `client_mutation_id` para reconhecer o reenvio de uma
     *  resposta perdida (C-1) sem duplicar o registro. Opcional só para não
     *  quebrar o tipo de mutações 'complete'/'skip' já gravadas antes desta
     *  sprint, que nunca tiveram esse campo. */
    clientMutationId?: string;
    /** Corpo completo de POST .../workout-log/session, para type 'session'.
     *  Análogo a `completeBody` acima, mas para o endpoint novo que
     *  cria-ou-conclui numa chamada só (sem depender de log pré-criado). */
    sessionBody?: WorkoutSessionRequest;
    status: 'pending' | 'syncing' | 'failed';
    retryCount: number;
    /** ISO. A fila só tenta reenviar esta linha quando `Date.now()` já passou
     *  deste instante — implementa o backoff exponencial (spec §4.3).
     *  Ausente/vazio = elegível imediatamente. */
    nextAttemptAt?: string;
    /** Referência do treino (A/B/C/D), só para exibição na UI de pendências —
     *  existe porque `workoutLogId` pode não existir ainda para type
     *  'session' na primeira tentativa (o log só é criado no servidor). */
    trainingRef?: string;
    lastError?: string;
    /** ISO da primeira vez que esta linha virou `status:'failed'` (RN-40).
     *  Preservado entre retentativas que falham de novo — a expiração de
     *  45 dias conta a partir daqui, nunca da falha mais recente. */
    firstFailedAt?: string;
}

/** Mídia (foto de check-in) pendente de upload, ligada a uma
 * `PendingMutation` por `mutationId`. Ninguém escreve nem lê esta store
 * ainda — ela só existe para a Sprint 4 (fila de mídia) poder usá-la sem
 * precisar de mais um bump de versão do banco. */
export interface PendingMedia {
    id?: number;
    mutationId: number;
    blob: Blob;
    createdAt: string;
}

interface VenafitOfflineDB extends DBSchema {
    macrocycles: {
        key: string;
        value: StoredMacrocycle;
    };
    pendingWorkoutLogIds: {
        key: string;
        value: PendingWorkoutLogId;
    };
    pendingMutations: {
        key: number;
        value: PendingMutation;
    };
    pendingMedia: {
        key: number;
        value: PendingMedia;
    };
    meta: {
        key: string;
        value: unknown;
    };
}

let dbPromise: Promise<IDBPDatabase<VenafitOfflineDB>> | null = null;

export function getOfflineDB(): Promise<IDBPDatabase<VenafitOfflineDB>> {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('IndexedDB só está disponível no client.'));
    }
    if (!dbPromise) {
        dbPromise = openDB<VenafitOfflineDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('macrocycles')) {
                    db.createObjectStore('macrocycles', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('pendingWorkoutLogIds')) {
                    db.createObjectStore('pendingWorkoutLogIds', { keyPath: 'key' });
                }
                if (!db.objectStoreNames.contains('pendingMutations')) {
                    db.createObjectStore('pendingMutations', {
                        keyPath: 'id',
                        autoIncrement: true,
                    });
                }
                // Nova em v2 (Sprint 3). A guarda de existência é a mesma
                // usada pelas stores acima — quem já está na v1 ganha só esta
                // store nova ao abrir a v2; ninguém perde dado.
                if (!db.objectStoreNames.contains('pendingMedia')) {
                    db.createObjectStore('pendingMedia', {
                        keyPath: 'id',
                        autoIncrement: true,
                    });
                }
                if (!db.objectStoreNames.contains('meta')) {
                    db.createObjectStore('meta');
                }
            },
        });
    }
    return dbPromise;
}

export function pendingWorkoutLogKey(microcycleId: string, trainingRef: string): string {
    return `${microcycleId}:${trainingRef}`;
}

/** Conta os registros em `pendingMedia`. Usado pelo flush final de
 * `clearSession()` (S3.4) para decidir se vale a pena tentar sincronizar
 * antes de apagar o banco — mídia ainda não é escrita por ninguém nesta
 * sprint, então hoje sempre devolve 0, mas o helper já existe para a
 * Sprint 4 não precisar mexer em `session.ts` de novo. */
export async function countPendingMedia(): Promise<number> {
    const db = await getOfflineDB();
    return db.count('pendingMedia');
}
