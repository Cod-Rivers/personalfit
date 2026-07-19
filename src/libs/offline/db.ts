import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { MacrocycleResponse } from '@/libs/planningService';
import { CompleteWorkoutLogRequest } from '@/libs/workoutLogService';

const DB_NAME = 'venafit-offline';
const DB_VERSION = 1;

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

export type PendingMutationType = 'complete' | 'skip';

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
    status: 'pending' | 'syncing' | 'failed';
    retryCount: number;
    lastError?: string;
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
