import { Api } from '@/libs/api';
import type {
    LoadHistoryResponse,
    PendingSessionInput,
} from '@/libs/loadHistory';
import { isOfflineError } from '@/libs/offline/personalCache';
import {
    readLoadHistoryCache,
    writeLoadHistoryCache,
} from '@/libs/offline/loadHistoryCache';
import { getPendingMutations } from '@/libs/offline/syncQueue';

/** studentId presente = visão do personal (/students/:id/load-history);
 * ausente = o próprio aluno (/me/load-history). Mesmo contrato de
 * evolutionService.ts. */
function basePath(studentId?: string) {
    return studentId ? `/students/${studentId}/load-history` : '/me/load-history';
}

function cacheScope(studentId?: string) {
    return studentId ? `student:${studentId}` : 'me';
}

export interface LoadHistoryResult {
    data: LoadHistoryResponse;
    /** true quando veio do cache offline (sem rede). */
    fromCache: boolean;
    cachedAt: string | null;
}

export interface LoadHistoryRange {
    from?: string;
    to?: string;
}

async function fetchWithCache(
    studentId: string | undefined,
    view: string,
    params: Record<string, string>,
): Promise<LoadHistoryResult> {
    // Consultas por período são pontuais (comparação entre avaliações): não
    // entram no cache, que guarda só o histórico inteiro.
    const cacheable = !params.from && !params.to;
    try {
        const { data } = await Api.get<LoadHistoryResponse>(basePath(studentId), { params });
        const normalized: LoadHistoryResponse = {
            exercises: data?.exercises ?? [],
            mesocycles: data?.mesocycles ?? [],
            aliases: data?.aliases ?? {},
        };
        if (cacheable) {
            void writeLoadHistoryCache(cacheScope(studentId), view, normalized);
        }
        return { data: normalized, fromCache: false, cachedAt: null };
    } catch (err) {
        // Só falta de rede cai no cache (rules/api-error-offline-vs-server):
        // um 403 de vínculo encerrado não pode ser mascarado por dado velho.
        if (cacheable && isOfflineError(err)) {
            const cached = await readLoadHistoryCache<LoadHistoryResponse>(
                cacheScope(studentId),
                view,
            );
            if (cached) {
                return { data: cached.data, fromCache: true, cachedAt: cached.cachedAt };
            }
        }
        throw err;
    }
}

/** Resumo de todos os exercícios (lista da aba Cargas). Com from/to, o
 * resumo de cada exercício é calculado só dentro do período. */
export function getLoadHistorySummary(
    studentId?: string,
    range: LoadHistoryRange = {},
): Promise<LoadHistoryResult> {
    const params: Record<string, string> = {};
    if (range.from) params.from = range.from;
    if (range.to) params.to = range.to;
    return fetchWithCache(studentId, 'summary', params);
}

/** Todas as sessões (com séries) de um exercício. */
export function getExerciseLoadHistory(
    exerciseKey: string,
    studentId?: string,
): Promise<LoadHistoryResult> {
    return fetchWithCache(studentId, `detail:${exerciseKey}`, {
        exercise_key: exerciseKey,
    });
}

/** Última cópia em cache do resumo, sem rede — usada pelo aviso de recorde
 * no fim do treino quando a tela ainda não tinha carregado nada. */
export async function getCachedLoadHistorySummary(
    studentId?: string,
): Promise<LoadHistoryResponse | null> {
    const cached = await readLoadHistoryCache<LoadHistoryResponse>(cacheScope(studentId), 'summary');
    return cached?.data ?? null;
}

/**
 * Treinos concluídos NESTE aparelho que ainda estão na fila offline — para a
 * linha do tempo mostrar "pendente de envio" em vez de fingir que o treino
 * não aconteceu. Aluno: as linhas dele mesmo; personal: as que ele concluiu
 * no atendimento presencial deste aluno (asPersonal).
 */
export async function getPendingLoadSessions(
    studentId?: string,
): Promise<PendingSessionInput[]> {
    try {
        const rows = await getPendingMutations();
        return rows
            .filter((r) => (studentId ? r.asPersonal && r.studentId === studentId : !r.asPersonal))
            .flatMap((r): PendingSessionInput[] => {
                if (r.type === 'session' && r.sessionBody) {
                    return [{ completedAt: r.sessionBody.client_completed_at, exercises: r.sessionBody.exercises }];
                }
                if (r.type === 'complete' && r.completeBody) {
                    return [{
                        completedAt: r.completeBody.client_completed_at ?? r.createdAt,
                        exercises: r.completeBody.exercises,
                    }];
                }
                return [];
            });
    } catch {
        return [];
    }
}
