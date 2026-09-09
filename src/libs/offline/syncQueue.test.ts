import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// jsdom não implementa IndexedDB — necessário pra `getOfflineDB()` (idb)
// conseguir abrir um banco de verdade dentro do teste.
import 'fake-indexeddb/auto';

import { getOfflineDB } from './db';
import type { PendingMutation } from './db';
import type { CompleteWorkoutLogRequest, WorkoutSessionRequest, NewWorkoutLogResponse } from '@/libs/workoutLogService';

vi.mock('@/libs/workoutLogService', () => ({
    completeNewWorkoutLog: vi.fn(),
    skipNewWorkoutLog: vi.fn(),
    completeWorkoutSession: vi.fn(),
    createNewWorkoutLog: vi.fn(),
}));

import {
    completeNewWorkoutLog,
    skipNewWorkoutLog,
    completeWorkoutSession,
    createNewWorkoutLog,
} from '@/libs/workoutLogService';

import * as syncQueue from './syncQueue';

/* ── Helpers de fixture ── */

function baseIds() {
    return {
        studentId: 'student-1',
        planningId: 'planning-1',
        mesocycleId: 'meso-1',
        microcycleId: 'micro-1',
    };
}

function makeCompleteBody(
    overrides: Partial<CompleteWorkoutLogRequest> = {},
): CompleteWorkoutLogRequest {
    return {
        exercises: [
            { exercise_id: 'ex-1', series: 3, reps: 10, load_kg: 40, rpe: 8 },
        ],
        ...overrides,
    };
}

function makeSessionBody(
    overrides: Partial<WorkoutSessionRequest> = {},
): WorkoutSessionRequest {
    return {
        client_mutation_id: 'body-level-cmid', // opaco pra syncQueue, só repassado ao backend
        client_completed_at: '2026-09-04T08:00:00-03:00',
        training_ref: 'A',
        planned_date: '2026-09-04',
        exercises: [
            {
                exercise_id: 'ex-1',
                name: 'Agachamento',
                series: 3,
                reps: 10,
                load_kg: 40,
                rpe: 8,
            },
        ],
        ...overrides,
    };
}

function fakeLogResponse(
    overrides: Partial<NewWorkoutLogResponse> = {},
): NewWorkoutLogResponse {
    return {
        id: 'log-id',
        macrocycle_id: 'macro-1',
        mesocycle_id: 'meso-1',
        microcycle_id: 'micro-1',
        student_id: 'student-1',
        training_ref: 'A',
        status: 'completed',
        planned_date: '2026-09-04',
        exercises: [],
        created_at: '2026-09-04T10:00:00Z',
        updated_at: '2026-09-04T10:00:00Z',
        ...overrides,
    };
}

/** Enfileira uma mutação de completar, sempre com `navigator.onLine=false`
 * no momento da chamada (garantido pelo beforeEach) — assim `enqueue()` não
 * dispara um `processQueue()` de fundo que atrapalharia o controle do
 * teste sobre quando e quantas vezes a fila é processada. */
async function enqueueTestCompletion(
    workoutLogId: string,
    overrides: Partial<CompleteWorkoutLogRequest> = {},
) {
    await syncQueue.enqueueCompletion({
        ...baseIds(),
        workoutLogId,
        completeBody: makeCompleteBody(overrides),
    });
}

async function enqueueTestSession(
    trainingRef: string,
    overrides: Partial<WorkoutSessionRequest> = {},
) {
    await syncQueue.enqueueSession({
        ...baseIds(),
        sessionBody: makeSessionBody({ training_ref: trainingRef, ...overrides }),
        trainingRef,
    });
}

/** Erro de axios construído à mão, como convenciona o projeto (ver outros
 * `.test.ts`/`.test.tsx`): `status` ausente = erro de rede puro (sem
 * `response`), `status` presente = resposta do servidor com aquele código. */
function axiosErr(status?: number, data?: unknown) {
    if (status === undefined) {
        return { isAxiosError: true, response: undefined };
    }
    return { isAxiosError: true, response: { status, data } };
}

function setOnline(value: boolean) {
    Object.defineProperty(navigator, 'onLine', { value, configurable: true });
}

describe('offline/syncQueue', () => {
    beforeEach(async () => {
        vi.resetAllMocks();
        setOnline(false);
        const db = await getOfflineDB();
        await db.clear('pendingMutations');
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('backoff exponencial (spec §4.3)', () => {
        it('nextAttemptAt cresce ~2^retryCount minutos (± jitter 0.8-1.2x) a cada falha 5xx sucessiva', async () => {
            // Só `Date` é falsificado — `setTimeout` real precisa continuar
            // funcionando, porque fake-indexeddb usa timers internos pra
            // resolver as transações; fake-los travaria toda leitura/escrita.
            vi.useFakeTimers({ toFake: ['Date'] });
            vi.setSystemTime(new Date('2026-09-04T10:00:00.000Z'));

            await enqueueTestCompletion('wl-1');
            setOnline(true);
            vi.mocked(completeNewWorkoutLog).mockRejectedValue(axiosErr(500));

            // retryCount após cada falha: 1, 2, 3 -> baseMinutes: 2, 4, 8.
            for (const retryCountAfter of [1, 2, 3]) {
                const before = Date.now();
                await syncQueue.processQueue();

                const [row] = await syncQueue.getPendingMutations();
                expect(row.retryCount).toBe(retryCountAfter);
                expect(row.status).toBe('pending');

                const expectedBaseMinutes = Math.min(2 ** retryCountAfter, 60);
                const deltaMinutes = (new Date(row.nextAttemptAt!).getTime() - before) / 60_000;
                expect(deltaMinutes).toBeGreaterThanOrEqual(expectedBaseMinutes * 0.8 - 0.001);
                expect(deltaMinutes).toBeLessThanOrEqual(expectedBaseMinutes * 1.2 + 0.001);

                // Avança o relógio pra além do backoff agendado — senão a
                // próxima chamada pularia a linha por ainda estar "em espera"
                // (isEligibleNow), e o teste nunca veria a 2ª/3ª falha.
                vi.setSystemTime(new Date(row.nextAttemptAt!).getTime() + 1_000);
            }
        });

        it('aplica o teto de 60 minutos quando 2^retryCount ultrapassaria isso', async () => {
            await enqueueTestCompletion('wl-1');
            const db = await getOfflineDB();
            const [seed] = await db.getAll('pendingMutations');
            // Simula uma mutação que já falhou muitas vezes (2^11 = 2048min).
            await db.put('pendingMutations', { ...seed, retryCount: 10 });

            setOnline(true);
            vi.mocked(completeNewWorkoutLog).mockRejectedValueOnce(axiosErr(500));

            const before = Date.now();
            await syncQueue.processQueue();

            const [row] = await syncQueue.getPendingMutations();
            expect(row.retryCount).toBe(11);
            const deltaMinutes = (new Date(row.nextAttemptAt!).getTime() - before) / 60_000;
            expect(deltaMinutes).toBeGreaterThanOrEqual(60 * 0.8);
            expect(deltaMinutes).toBeLessThanOrEqual(60 * 1.2 + 0.01);
        });
    });

    it('erro de rede sem `response` não incrementa retryCount e limpa nextAttemptAt', async () => {
        // RN-14: falta de conexão não é falha do aluno nem do payload — não
        // pode consumir uma "tentativa" da mutação.
        await enqueueTestCompletion('wl-1');
        setOnline(true);
        vi.mocked(completeNewWorkoutLog).mockRejectedValueOnce(axiosErr(undefined));

        await syncQueue.processQueue();

        const [row] = await syncQueue.getPendingMutations();
        expect(row.retryCount).toBe(0);
        expect(row.status).toBe('pending');
        expect(row.nextAttemptAt).toBeUndefined();
    });

    it('processa a fila em ordem de id crescente (mais antiga primeiro)', async () => {
        await enqueueTestCompletion('wl-1');
        await enqueueTestCompletion('wl-2');
        await enqueueTestCompletion('wl-3');

        const order: string[] = [];
        vi.mocked(completeNewWorkoutLog).mockImplementation(
            async (_s, _p, _m, _mi, workoutLogId) => {
                order.push(workoutLogId);
                return fakeLogResponse({ id: workoutLogId });
            },
        );

        setOnline(true);
        await syncQueue.processQueue();

        expect(order).toEqual(['wl-1', 'wl-2', 'wl-3']);
        expect(await syncQueue.getPendingMutations()).toHaveLength(0);
    });

    it('RN-16: uma falha terminal (4xx não-409) não bloqueia as mutações seguintes na mesma passada', async () => {
        // O bug antigo usava `break` neste ponto, que pararia a fila
        // inteira no primeiro erro — este teste existe para travar a volta
        // dessa regressão.
        await enqueueTestCompletion('wl-A');
        await enqueueTestCompletion('wl-B');

        vi.mocked(completeNewWorkoutLog)
            .mockRejectedValueOnce(axiosErr(400))
            .mockResolvedValueOnce(fakeLogResponse({ id: 'wl-B' }));

        setOnline(true);
        await syncQueue.processQueue();

        expect(completeNewWorkoutLog).toHaveBeenCalledTimes(2);
        const rows = await syncQueue.getPendingMutations();
        expect(rows).toHaveLength(1);
        expect(rows[0].workoutLogId).toBe('wl-A');
        expect(rows[0].status).toBe('failed');
    });

    describe('409 é sucesso terminal idempotente — remove da fila', () => {
        it('no endpoint legado (.../complete)', async () => {
            await enqueueTestCompletion('wl-1');
            vi.mocked(completeNewWorkoutLog).mockRejectedValueOnce(axiosErr(409));

            setOnline(true);
            await syncQueue.processQueue();

            expect(await syncQueue.getPendingMutations()).toHaveLength(0);
        });

        it('no endpoint novo .../session (code: workout_log_already_completed)', async () => {
            await enqueueTestSession('A');
            vi.mocked(completeWorkoutSession).mockRejectedValueOnce(
                axiosErr(409, {
                    error: 'já concluído',
                    code: 'workout_log_already_completed',
                    workout_log: fakeLogResponse(),
                }),
            );

            setOnline(true);
            await syncQueue.processQueue();

            expect(await syncQueue.getPendingMutations()).toHaveLength(0);
        });
    });

    it('erro de rede sem `response` interrompe a passada — a mutação seguinte nem é tentada', async () => {
        // Sem rede, tentar a próxima mutação seria desperdício de bateria
        // garantido (spec §4.4) — diferente do `continue` de RN-16 acima,
        // que trata de um erro específico daquele registro.
        await enqueueTestCompletion('wl-A');
        await enqueueTestCompletion('wl-B');

        vi.mocked(completeNewWorkoutLog).mockRejectedValueOnce(axiosErr(undefined));

        setOnline(true);
        await syncQueue.processQueue();

        expect(completeNewWorkoutLog).toHaveBeenCalledTimes(1);
        const rows = await syncQueue.getPendingMutations();
        expect(rows).toHaveLength(2);
        expect(rows.every((r) => r.status === 'pending')).toBe(true);
    });

    describe('5xx (passageiro) vs 4xx não-terminal (permanente) — a distinção mais citada pelo spec', () => {
        it('5xx mantém status "pending" com backoff agendado — a fila insiste sozinha', async () => {
            await enqueueTestCompletion('wl-1');
            vi.mocked(completeNewWorkoutLog).mockRejectedValueOnce(axiosErr(503));

            setOnline(true);
            await syncQueue.processQueue();

            const [row] = await syncQueue.getPendingMutations();
            expect(row.status).toBe('pending');
            expect(row.retryCount).toBe(1);
            expect(row.nextAttemptAt).toBeDefined();
        });

        it('4xx não-terminal (ex: 400 de validação) marca "failed" — exige discardMutation manual', async () => {
            await enqueueTestCompletion('wl-1');
            vi.mocked(completeNewWorkoutLog).mockRejectedValueOnce(axiosErr(400));

            setOnline(true);
            await syncQueue.processQueue();

            const [row] = await syncQueue.getPendingMutations();
            expect(row.status).toBe('failed');
            expect(row.retryCount).toBe(1);
        });
    });

    it('P-8: 404 no endpoint de sessão reescreve a mesma linha para create+complete, preservando client_completed_at', async () => {
        await enqueueTestSession('A', { client_completed_at: '2026-09-04T08:00:00-03:00' });

        vi.mocked(completeWorkoutSession).mockRejectedValueOnce(axiosErr(404));
        vi.mocked(createNewWorkoutLog).mockResolvedValueOnce(
            fakeLogResponse({ id: 'new-log-id' }),
        );

        setOnline(true);
        await syncQueue.processQueue();

        const rows = await syncQueue.getPendingMutations();
        // Mesma linha reescrita, não uma segunda mutação nova.
        expect(rows).toHaveLength(1);
        const row = rows[0];
        expect(row.type).toBe('complete');
        expect(row.status).toBe('pending');
        expect(row.workoutLogId).toBe('new-log-id');
        expect(row.completeBody?.client_completed_at).toBe('2026-09-04T08:00:00-03:00');
        expect(row.sessionBody).toBeUndefined();
    });

    it('mutação com nextAttemptAt no futuro é pulada sem contar como erro (backoff em andamento)', async () => {
        await enqueueTestCompletion('wl-1');
        const db = await getOfflineDB();
        const [seed] = await db.getAll('pendingMutations');
        const future = new Date(Date.now() + 5 * 60_000).toISOString();
        await db.put('pendingMutations', { ...seed, nextAttemptAt: future, retryCount: 2 });

        setOnline(true);
        await syncQueue.processQueue();

        expect(completeNewWorkoutLog).not.toHaveBeenCalled();
        const [row] = await syncQueue.getPendingMutations();
        expect(row.retryCount).toBe(2);
        expect(row.nextAttemptAt).toBe(future);
    });

    it('discardMutation remove a linha sem tentar reenviá-la', async () => {
        await enqueueTestCompletion('wl-1');
        const [row] = await syncQueue.getPendingMutations();

        await syncQueue.discardMutation(row.id!);

        expect(await syncQueue.getPendingMutations()).toHaveLength(0);
        expect(completeNewWorkoutLog).not.toHaveBeenCalled();
    });

    it('enqueueSession gera um clientMutationId (idempotência) e nunca o regenera num retry', async () => {
        await enqueueTestSession('A');

        const [row] = await syncQueue.getPendingMutations();
        expect(row.clientMutationId).toBeDefined();
        // Formato de UUID v4 gerado por crypto.randomUUID().
        expect(row.clientMutationId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );
        const firstClientMutationId = row.clientMutationId;

        // Uma passada que falha (5xx, tentativa passageira) não pode gerar
        // um client_mutation_id novo — regenerar a cada retry criaria um
        // registro duplicado no servidor, exatamente o bug que essa chave
        // existe para impedir.
        vi.mocked(completeWorkoutSession).mockRejectedValueOnce(axiosErr(500));
        setOnline(true);
        await syncQueue.processQueue();

        const [after] = await syncQueue.getPendingMutations();
        expect(after.clientMutationId).toBe(firstClientMutationId);
    });

    it('enqueueSkip envia o motivo do skip e some da fila em caso de sucesso', async () => {
        await syncQueue.enqueueSkip({
            ...baseIds(),
            workoutLogId: 'wl-skip-1',
            skipReason: 'lesão',
        });

        vi.mocked(skipNewWorkoutLog).mockResolvedValueOnce(
            fakeLogResponse({ id: 'wl-skip-1', status: 'skipped' }),
        );

        setOnline(true);
        await syncQueue.processQueue();

        expect(skipNewWorkoutLog).toHaveBeenCalledWith(
            'student-1',
            'planning-1',
            'meso-1',
            'micro-1',
            'wl-skip-1',
            'lesão',
        );
        expect(await syncQueue.getPendingMutations()).toHaveLength(0);
    });

    describe('RN-40: expiração de mutações "failed" com mais de 45 dias', () => {
        /** Enfileira e reescreve a linha como se tivesse falhado `daysAgo`
         * dias atrás — mais direto que fazer `processQueue` falhar 45 vezes
         * em sequência para chegar no mesmo estado. */
        async function seedFailedRow(
            daysAgo: number,
            status: PendingMutation['status'] = 'failed',
        ): Promise<void> {
            await enqueueTestCompletion('wl-old');
            const db = await getOfflineDB();
            const [seed] = await db.getAll('pendingMutations');
            const firstFailedAt = new Date(
                Date.now() - daysAgo * 24 * 60 * 60 * 1000,
            ).toISOString();
            await db.put('pendingMutations', { ...seed, status, firstFailedAt });
        }

        it('remove silenciosamente uma mutação failed com 45 dias ou mais', async () => {
            await seedFailedRow(46);
            expect(await syncQueue.getPendingMutations()).toHaveLength(0);
        });

        it('preserva uma mutação failed com menos de 45 dias', async () => {
            await seedFailedRow(44);
            expect(await syncQueue.getPendingMutations()).toHaveLength(1);
        });

        it('nunca expira uma mutação "pending", mesmo com firstFailedAt antigo (defensivo — não deveria acontecer, mas pending não pode ter prazo)', async () => {
            await seedFailedRow(200, 'pending');
            expect(await syncQueue.getPendingMutations()).toHaveLength(1);
        });

        it('a remoção por expiração notifica onQueueChanged, mesmo sem processQueue rodar', async () => {
            await seedFailedRow(46);
            const cb = vi.fn();
            const unsubscribe = syncQueue.onQueueChanged(cb);

            await syncQueue.getPendingMutations();

            expect(cb).toHaveBeenCalledTimes(1);
            unsubscribe();
        });

        it('firstFailedAt é gravado só na primeira falha definitiva e preservado nas seguintes (a expiração conta da 1ª, não da mais recente)', async () => {
            vi.useFakeTimers({ toFake: ['Date'] });
            vi.setSystemTime(new Date('2026-09-04T10:00:00.000Z'));

            await enqueueTestCompletion('wl-1');
            setOnline(true);
            vi.mocked(completeNewWorkoutLog).mockRejectedValueOnce(axiosErr(400));
            await syncQueue.processQueue();

            const [first] = await syncQueue.getPendingMutations();
            expect(first.status).toBe('failed');
            expect(first.firstFailedAt).toBe('2026-09-04T10:00:00.000Z');

            vi.setSystemTime(new Date('2026-09-05T10:00:00.000Z'));
            vi.mocked(completeNewWorkoutLog).mockRejectedValueOnce(axiosErr(400));
            await syncQueue.processQueue();

            const [second] = await syncQueue.getPendingMutations();
            expect(second.retryCount).toBe(2);
            expect(second.firstFailedAt).toBe('2026-09-04T10:00:00.000Z');
        });
    });

    describe('daysUntilExpiration (RN-40, função pura — janela de aviso a partir do dia 38)', () => {
        function failedMutation(
            daysAgo: number,
            status: PendingMutation['status'] = 'failed',
        ): PendingMutation {
            return {
                type: 'complete',
                createdAt: new Date().toISOString(),
                studentId: 's',
                planningId: 'p',
                mesocycleId: 'm',
                microcycleId: 'mc',
                workoutLogId: 'wl',
                status,
                retryCount: 1,
                firstFailedAt: new Date(
                    Date.now() - daysAgo * 24 * 60 * 60 * 1000,
                ).toISOString(),
            };
        }

        it('retorna null antes do dia 38 (aviso ainda não deve aparecer)', () => {
            expect(syncQueue.daysUntilExpiration(failedMutation(10))).toBeNull();
        });

        it('retorna os dias restantes a partir do dia 38 (janela de aviso)', () => {
            expect(syncQueue.daysUntilExpiration(failedMutation(38))).toBe(7);
            expect(syncQueue.daysUntilExpiration(failedMutation(44))).toBe(1);
            expect(syncQueue.daysUntilExpiration(failedMutation(45))).toBe(0);
        });

        it('retorna null quando já passou dos 45 dias (getPendingMutations já teria removido a linha)', () => {
            expect(syncQueue.daysUntilExpiration(failedMutation(46))).toBeNull();
        });

        it('retorna null para mutação que não está "failed"', () => {
            expect(
                syncQueue.daysUntilExpiration(failedMutation(40, 'pending')),
            ).toBeNull();
        });
    });

    it('onQueueChanged notifica quando uma mutação é enfileirada e quando é descartada', async () => {
        const cb = vi.fn();
        const unsubscribe = syncQueue.onQueueChanged(cb);

        await enqueueTestCompletion('wl-1');
        expect(cb).toHaveBeenCalledTimes(1);

        const [row] = await syncQueue.getPendingMutations();
        await syncQueue.discardMutation(row.id!);
        expect(cb).toHaveBeenCalledTimes(2);

        unsubscribe();
        await enqueueTestCompletion('wl-2');
        // Depois do unsubscribe, callback não é mais chamado.
        expect(cb).toHaveBeenCalledTimes(2);
    });
});
