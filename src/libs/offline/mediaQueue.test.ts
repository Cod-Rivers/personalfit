import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// jsdom não implementa IndexedDB — necessário pra `getOfflineDB()` (idb)
// conseguir abrir um banco de verdade dentro do teste. Mesmo setup de
// syncQueue.test.ts/db.test.ts.
import 'fake-indexeddb/auto';

import {
    getOfflineDB,
    getResolvedSessionLogId,
    setResolvedSessionLogId,
    type PendingMutation,
} from './db';
import type { CheckInPhotoUploadURLResponse, NewWorkoutLogResponse } from '@/libs/workoutLogService';

vi.mock('@/libs/workoutLogService', () => ({
    requestCheckInPhotoUploadUrl: vi.fn(),
    confirmCheckInPhoto: vi.fn(),
    // syncQueue.ts (importado transitivamente por mediaQueue.ts, para
    // reaproveitar computeNextAttemptAt/isEligibleNow/onQueueChanged/
    // FAILED_EXPIRATION_DAYS) também chama estas — precisam existir no mock
    // mesmo que não sejam exercitadas por nenhum teste deste arquivo.
    completeNewWorkoutLog: vi.fn(),
    skipNewWorkoutLog: vi.fn(),
    completeWorkoutSession: vi.fn(),
    createNewWorkoutLog: vi.fn(),
}));

vi.mock('@/libs/imageCompression', () => ({
    compressImageToBlob: vi.fn(),
}));

import {
    requestCheckInPhotoUploadUrl,
    confirmCheckInPhoto,
} from '@/libs/workoutLogService';
import { compressImageToBlob } from '@/libs/imageCompression';

import * as mediaQueue from './mediaQueue';
import * as syncQueue from './syncQueue';

/* ── Helpers de fixture (espelha syncQueue.test.ts) ── */

function baseIds() {
    return {
        studentId: 'student-1',
        planningId: 'planning-1',
        mesocycleId: 'meso-1',
        microcycleId: 'micro-1',
    };
}

function fakePhotoFile(): File {
    return new File(['fake-bytes'], 'foto.jpg', { type: 'image/jpeg' });
}

function fakeUploadUrlResponse(
    overrides: Partial<CheckInPhotoUploadURLResponse> = {},
): CheckInPhotoUploadURLResponse {
    return {
        photo_key: 'checkins/log-1/photo.jpg',
        upload_url: 'https://r2.example.com/upload?sig=abc',
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

/** Erro de axios construído à mão, como convenciona o projeto — `status`
 * ausente = erro de rede puro (sem `response`). NÃO é instância de `Error`
 * de propósito (mesmo padrão de syncQueue.test.ts): `axios.isAxiosError`
 * só olha para a propriedade `isAxiosError`, então isso já exercita
 * corretamente `err instanceof Error === false` -> lastError genérico. */
function axiosErr(status?: number, data?: unknown) {
    if (status === undefined) {
        return { isAxiosError: true, response: undefined };
    }
    return { isAxiosError: true, response: { status, data } };
}

/** Variante que É uma instância real de `Error`, para os testes em que a
 * mensagem específica do backend precisa sobreviver até `lastError`. */
function axiosErrorWithMessage(status: number, message: string, data?: unknown) {
    return Object.assign(new Error(message), {
        isAxiosError: true,
        response: { status, data },
    });
}

function setOnline(value: boolean) {
    Object.defineProperty(navigator, 'onLine', { value, configurable: true });
}

/** Enfileira uma sessão na fila principal (sem processá-la) só para gerar um
 * `clientMutationId` de verdade e/ou popular `pendingMutations`, sempre com
 * `navigator.onLine=false` no momento da chamada — mesmo cuidado de
 * syncQueue.test.ts para não disparar processamento de fundo. */
async function enqueueTestSession(trainingRef = 'A'): Promise<string> {
    return syncQueue.enqueueSession({
        ...baseIds(),
        trainingRef,
        sessionBody: {
            client_mutation_id: 'body-level-cmid',
            client_completed_at: '2026-09-04T08:00:00-03:00',
            training_ref: trainingRef,
            planned_date: '2026-09-04',
            exercises: [
                { exercise_id: 'ex-1', name: 'Agachamento', series: 3, reps: 10, load_kg: 40, rpe: 8 },
            ],
        },
    });
}

async function enqueuePhotoWithLogId(logId: string, overrides: Partial<Parameters<typeof mediaQueue.enqueuePhoto>[0]> = {}) {
    return mediaQueue.enqueuePhoto({
        ...baseIds(),
        target: { logId },
        file: fakePhotoFile(),
        ...overrides,
    });
}

async function enqueuePhotoWithClientMutationId(
    clientMutationId: string,
    overrides: Partial<Parameters<typeof mediaQueue.enqueuePhoto>[0]> = {},
) {
    return mediaQueue.enqueuePhoto({
        ...baseIds(),
        target: { clientMutationId },
        file: fakePhotoFile(),
        ...overrides,
    });
}

describe('offline/mediaQueue', () => {
    beforeEach(async () => {
        vi.resetAllMocks();
        setOnline(false);
        vi.mocked(compressImageToBlob).mockResolvedValue(
            new Blob(['compressed'], { type: 'image/jpeg' }),
        );
        const db = await getOfflineDB();
        await db.clear('pendingMedia');
        await db.clear('pendingMutations');
        await db.clear('meta');
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    describe('S-1/fluxo feliz: target clientMutationId', () => {
        it('fica esperando (displayStatus waiting_workout_sync) sem tentar rede enquanto o logId real não é resolvido', async () => {
            await enqueuePhotoWithClientMutationId('cmid-1');

            const [view] = await mediaQueue.getPendingMedia();
            expect(view.displayStatus).toBe('waiting_workout_sync');
            expect(view.status).toBe('pending');

            setOnline(true);
            await mediaQueue.processMediaQueue();

            expect(requestCheckInPhotoUploadUrl).not.toHaveBeenCalled();
            expect(confirmCheckInPhoto).not.toHaveBeenCalled();
            expect(global.fetch).not.toHaveBeenCalled();
            // A linha continua na fila, intacta.
            const [after] = await mediaQueue.getPendingMedia();
            expect(after.status).toBe('pending');
        });

        it('depois que setResolvedSessionLogId resolve o logId, processMediaQueue sobe a foto e só então apaga o blob local', async () => {
            await enqueuePhotoWithClientMutationId('cmid-2');

            const db = await getOfflineDB();
            await setResolvedSessionLogId(db, 'cmid-2', 'log-real-1');

            vi.mocked(requestCheckInPhotoUploadUrl).mockResolvedValueOnce(
                fakeUploadUrlResponse(),
            );
            vi.mocked(global.fetch).mockResolvedValueOnce(
                new Response(null, { status: 200 }),
            );
            vi.mocked(confirmCheckInPhoto).mockResolvedValueOnce(fakeLogResponse());

            setOnline(true);
            await mediaQueue.processMediaQueue();

            expect(requestCheckInPhotoUploadUrl).toHaveBeenCalledWith(
                'student-1',
                'planning-1',
                'meso-1',
                'micro-1',
                'log-real-1',
                'image/jpeg',
            );
            expect(global.fetch).toHaveBeenCalledWith(
                fakeUploadUrlResponse().upload_url,
                expect.objectContaining({ method: 'PUT' }),
            );
            expect(confirmCheckInPhoto).toHaveBeenCalledWith(
                'student-1',
                'planning-1',
                'meso-1',
                'micro-1',
                'log-real-1',
                fakeUploadUrlResponse().photo_key,
            );

            // Blob apagado só depois de PUT+PATCH confirmados.
            expect(await mediaQueue.getPendingMedia()).toHaveLength(0);
            // Mapeamento clientMutationId -> logId também é limpo (best-effort).
            expect(await getResolvedSessionLogId(db, 'cmid-2')).toBeUndefined();
        });

        it('ordem das chamadas é photo-url -> PUT -> confirm -> só então apaga o blob', async () => {
            await enqueuePhotoWithClientMutationId('cmid-order');
            const db = await getOfflineDB();
            await setResolvedSessionLogId(db, 'cmid-order', 'log-order');

            const calls: string[] = [];
            vi.mocked(requestCheckInPhotoUploadUrl).mockImplementationOnce(async () => {
                calls.push('photo-url');
                return fakeUploadUrlResponse();
            });
            vi.mocked(global.fetch).mockImplementationOnce(async () => {
                calls.push('put');
                return new Response(null, { status: 200 });
            });
            vi.mocked(confirmCheckInPhoto).mockImplementationOnce(async () => {
                calls.push('confirm');
                return fakeLogResponse();
            });

            setOnline(true);
            await mediaQueue.processMediaQueue();

            expect(calls).toEqual(['photo-url', 'put', 'confirm']);
        });
    });

    describe('S-8/target logId direto (log já existia fora do fluxo de fila principal)', () => {
        it('não espera nenhuma resolução — tenta subir direto', async () => {
            await enqueuePhotoWithLogId('log-preexistente');

            const [view] = await mediaQueue.getPendingMedia();
            expect(view.displayStatus).toBe('pending');

            vi.mocked(requestCheckInPhotoUploadUrl).mockResolvedValueOnce(
                fakeUploadUrlResponse(),
            );
            vi.mocked(global.fetch).mockResolvedValueOnce(new Response(null, { status: 200 }));
            vi.mocked(confirmCheckInPhoto).mockResolvedValueOnce(fakeLogResponse());

            setOnline(true);
            await mediaQueue.processMediaQueue();

            expect(requestCheckInPhotoUploadUrl).toHaveBeenCalledWith(
                'student-1',
                'planning-1',
                'meso-1',
                'micro-1',
                'log-preexistente',
                'image/jpeg',
            );
            expect(await mediaQueue.getPendingMedia()).toHaveLength(0);
        });

        it('registro continua completed / check-in não é revertido quando a foto falha (S-8): a fila de mídia não toca pendingMutations nem reverte nada além de si mesma', async () => {
            await enqueuePhotoWithLogId('log-ja-sincronizado');

            vi.mocked(requestCheckInPhotoUploadUrl).mockRejectedValueOnce(axiosErr(500));

            setOnline(true);
            await mediaQueue.processMediaQueue();

            const [row] = await mediaQueue.getPendingMedia();
            // Falha na foto vira 'pending' (5xx, passageiro) — em nenhum
            // caminho de mediaQueue.ts há escrita em pendingMutations ou
            // qualquer chamada que reverta o registro já sincronizado.
            expect(row.status).toBe('pending');
            expect(row.retryCount).toBe(1);
            expect(confirmCheckInPhoto).not.toHaveBeenCalled();
        });
    });

    describe('nunca bloqueia (spec P-5/P-6)', () => {
        it('uma foto que falha em definitivo (4xx) não impede a próxima foto de processar na mesma passada', async () => {
            await enqueuePhotoWithLogId('log-A');
            await enqueuePhotoWithLogId('log-B');

            vi.mocked(requestCheckInPhotoUploadUrl)
                .mockRejectedValueOnce(axiosErr(400))
                .mockResolvedValueOnce(fakeUploadUrlResponse());
            vi.mocked(global.fetch).mockResolvedValue(new Response(null, { status: 200 }));
            vi.mocked(confirmCheckInPhoto).mockResolvedValueOnce(fakeLogResponse());

            setOnline(true);
            await mediaQueue.processMediaQueue();

            expect(requestCheckInPhotoUploadUrl).toHaveBeenCalledTimes(2);
            const rows = await mediaQueue.getPendingMedia();
            expect(rows).toHaveLength(1);
            expect(rows[0].logId).toBe('log-A');
            expect(rows[0].status).toBe('failed');
        });

        it('uma foto falhando/pendente não impede a fila principal (syncQueue) de sincronizar outras mutações', async () => {
            const clientMutationId = await enqueueTestSession('A');
            await enqueuePhotoWithLogId('log-outra-mutacao');

            vi.mocked(requestCheckInPhotoUploadUrl).mockRejectedValueOnce(axiosErr(400));
            const { completeWorkoutSession } = await import('@/libs/workoutLogService');
            vi.mocked(completeWorkoutSession).mockResolvedValueOnce(
                fakeLogResponse({ id: 'log-da-sessao' }),
            );

            setOnline(true);
            await Promise.all([mediaQueue.processMediaQueue(), syncQueue.processQueue()]);

            // A mutação principal sincronizou normalmente, apesar da foto ter falhado.
            expect(await syncQueue.getPendingMutations()).toHaveLength(0);
            const db = await getOfflineDB();
            expect(await getResolvedSessionLogId(db, clientMutationId)).toBe('log-da-sessao');

            // E a foto realmente registrou a falha (não sumiu silenciosamente).
            const [photoRow] = await mediaQueue.getPendingMedia();
            expect(photoRow.status).toBe('failed');
        });
    });

    describe('erro sem resposta HTTP (rede caiu) — RN-16/RN-14 reaproveitado', () => {
        it('requestCheckInPhotoUploadUrl sem response: mantém pending, não incrementa retryCount, limpa nextAttemptAt', async () => {
            await enqueuePhotoWithLogId('log-rede-caiu');
            const db = await getOfflineDB();
            const [seed] = await db.getAll('pendingMedia');
            await db.put('pendingMedia', { ...seed, nextAttemptAt: new Date().toISOString() });

            vi.mocked(requestCheckInPhotoUploadUrl).mockRejectedValueOnce(axiosErr(undefined));

            setOnline(true);
            await mediaQueue.processMediaQueue();

            const [row] = await mediaQueue.getPendingMedia();
            expect(row.status).toBe('pending');
            expect(row.retryCount).toBe(0);
            expect(row.nextAttemptAt).toBeUndefined();
        });

        it('interrompe a passada: a próxima foto nem é tentada quando a rede caiu na primeira', async () => {
            await enqueuePhotoWithLogId('log-1');
            await enqueuePhotoWithLogId('log-2');

            vi.mocked(requestCheckInPhotoUploadUrl).mockRejectedValueOnce(axiosErr(undefined));

            setOnline(true);
            await mediaQueue.processMediaQueue();

            expect(requestCheckInPhotoUploadUrl).toHaveBeenCalledTimes(1);
        });

        it('TypeError do fetch (PUT ao R2 falhou por queda de rede) também conta como falha de rede, não como falha definitiva', async () => {
            await enqueuePhotoWithLogId('log-put-falha-rede');

            vi.mocked(requestCheckInPhotoUploadUrl).mockResolvedValueOnce(
                fakeUploadUrlResponse(),
            );
            vi.mocked(global.fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));

            setOnline(true);
            await mediaQueue.processMediaQueue();

            const [row] = await mediaQueue.getPendingMedia();
            expect(row.status).toBe('pending');
            expect(row.retryCount).toBe(0);
            expect(confirmCheckInPhoto).not.toHaveBeenCalled();
        });
    });

    describe('backoff exponencial com jitter (reaproveitado de syncQueue.ts)', () => {
        it('5xx agenda nextAttemptAt dentro da janela de computeNextAttemptAt e a foto não é retentada antes disso', async () => {
            vi.useFakeTimers({ toFake: ['Date'] });
            vi.setSystemTime(new Date('2026-09-04T10:00:00.000Z'));

            await enqueuePhotoWithLogId('log-backoff');
            vi.mocked(requestCheckInPhotoUploadUrl).mockRejectedValueOnce(axiosErr(503));

            setOnline(true);
            const before = Date.now();
            await mediaQueue.processMediaQueue();

            const [row] = await mediaQueue.getPendingMedia();
            expect(row.status).toBe('pending');
            expect(row.retryCount).toBe(1);
            const deltaMinutes = (new Date(row.nextAttemptAt!).getTime() - before) / 60_000;
            // retryCount=1 -> baseMinutes = 2^1 = 2, jitter 0.8-1.2x.
            expect(deltaMinutes).toBeGreaterThanOrEqual(2 * 0.8 - 0.001);
            expect(deltaMinutes).toBeLessThanOrEqual(2 * 1.2 + 0.001);

            // Ainda dentro do backoff: uma nova passada não deve nem tentar.
            vi.mocked(requestCheckInPhotoUploadUrl).mockClear();
            await mediaQueue.processMediaQueue();
            expect(requestCheckInPhotoUploadUrl).not.toHaveBeenCalled();

            // Depois do backoff: tenta de novo.
            vi.setSystemTime(new Date(row.nextAttemptAt!).getTime() + 1_000);
            vi.mocked(requestCheckInPhotoUploadUrl).mockResolvedValueOnce(
                fakeUploadUrlResponse(),
            );
            vi.mocked(global.fetch).mockResolvedValueOnce(new Response(null, { status: 200 }));
            vi.mocked(confirmCheckInPhoto).mockResolvedValueOnce(fakeLogResponse());
            await mediaQueue.processMediaQueue();
            expect(requestCheckInPhotoUploadUrl).toHaveBeenCalledTimes(1);
        });
    });

    describe('expiração em 45 dias (RN-40 reaproveitada para pendingMedia)', () => {
        async function seedFailedRow(daysAgo: number): Promise<void> {
            await enqueuePhotoWithLogId('log-old');
            const db = await getOfflineDB();
            const [seed] = await db.getAll('pendingMedia');
            const firstFailedAt = new Date(
                Date.now() - daysAgo * 24 * 60 * 60 * 1000,
            ).toISOString();
            await db.put('pendingMedia', { ...seed, status: 'failed', firstFailedAt });
        }

        it('descarta silenciosamente uma foto failed com 45 dias ou mais', async () => {
            await seedFailedRow(46);
            expect(await mediaQueue.getPendingMedia()).toHaveLength(0);
        });

        it('preserva uma foto failed com menos de 45 dias', async () => {
            await seedFailedRow(30);
            expect(await mediaQueue.getPendingMedia()).toHaveLength(1);
        });
    });

    describe('P-8: mutação principal reescrita de session -> complete', () => {
        it('marca a foto correspondente como failed com mensagem explicativa em vez de esperar para sempre', async () => {
            await enqueuePhotoWithClientMutationId('cmid-p8');

            // Simula o estado da fila principal DEPOIS que
            // rewriteSessionAsCreateThenComplete (syncQueue.ts) já rodou:
            // mesma linha, agora type:'complete', clientMutationId preservado.
            const db = await getOfflineDB();
            const rewritten: PendingMutation = {
                type: 'complete',
                createdAt: new Date().toISOString(),
                studentId: 'student-1',
                planningId: 'planning-1',
                mesocycleId: 'meso-1',
                microcycleId: 'micro-1',
                workoutLogId: 'new-log-id',
                completeBody: { exercises: [] },
                clientMutationId: 'cmid-p8',
                status: 'pending',
                retryCount: 0,
            };
            await db.add('pendingMutations', rewritten);

            setOnline(true);
            await mediaQueue.processMediaQueue();

            const [row] = await mediaQueue.getPendingMedia();
            expect(row.status).toBe('failed');
            expect(row.lastError).toMatch(/não p(oude|ôde) ser anexada|não foi confirmado/i);
            expect(requestCheckInPhotoUploadUrl).not.toHaveBeenCalled();
        });
    });

    describe('discardPendingPhoto', () => {
        it('remove a entrada e não deixa lixo (mapeamento clientMutationId->logId incluso não é criado sem sincronizar)', async () => {
            const id = await enqueuePhotoWithClientMutationId('cmid-discard');
            expect(id).not.toBeNull();

            await mediaQueue.discardPendingPhoto(id as number);

            expect(await mediaQueue.getPendingMedia()).toHaveLength(0);
            expect(requestCheckInPhotoUploadUrl).not.toHaveBeenCalled();
        });
    });

    describe('onMediaQueueChanged', () => {
        it('dispara quando uma foto é enfileirada e quando é descartada; unsubscribe para de notificar', async () => {
            const cb = vi.fn();
            const unsubscribe = mediaQueue.onMediaQueueChanged(cb);

            const id = await enqueuePhotoWithLogId('log-evento');
            expect(cb).toHaveBeenCalledTimes(1);

            await mediaQueue.discardPendingPhoto(id as number);
            expect(cb).toHaveBeenCalledTimes(2);

            unsubscribe();
            await enqueuePhotoWithLogId('log-evento-2');
            expect(cb).toHaveBeenCalledTimes(2);
        });
    });

    describe('cota de armazenamento estourada (S-10) — enqueuePhoto nunca lança', () => {
        it('devolve null quando db.add falha (simulado) e não derruba o chamador', async () => {
            const db = await getOfflineDB();
            const addSpy = vi.spyOn(db, 'add').mockRejectedValueOnce(
                new DOMException('QuotaExceededError', 'QuotaExceededError'),
            );

            const result = await mediaQueue.enqueuePhoto({
                ...baseIds(),
                target: { logId: 'log-cota' },
                file: fakePhotoFile(),
            });

            expect(result).toBeNull();
            addSpy.mockRestore();
        });

        it('devolve null quando a compressão falha, sem lançar', async () => {
            vi.mocked(compressImageToBlob).mockRejectedValueOnce(new Error('canvas indisponível'));

            const result = await mediaQueue.enqueuePhoto({
                ...baseIds(),
                target: { logId: 'log-compressao' },
                file: fakePhotoFile(),
            });

            expect(result).toBeNull();
        });
    });

    describe('tamanho estourado / MIME rejeitado pelo backend (check_in_photo_too_large)', () => {
        it('marca a foto failed com a mensagem do backend, sem afetar outras fotos nem lançar', async () => {
            await enqueuePhotoWithLogId('log-grande');
            await enqueuePhotoWithLogId('log-normal');

            vi.mocked(requestCheckInPhotoUploadUrl).mockResolvedValue(fakeUploadUrlResponse());
            vi.mocked(global.fetch).mockResolvedValue(new Response(null, { status: 200 }));
            vi.mocked(confirmCheckInPhoto)
                .mockRejectedValueOnce(
                    axiosErrorWithMessage(400, 'check_in_photo_too_large', {
                        code: 'check_in_photo_too_large',
                    }),
                )
                .mockResolvedValueOnce(fakeLogResponse());

            setOnline(true);
            await mediaQueue.processMediaQueue();

            const rows = await mediaQueue.getPendingMedia();
            expect(rows).toHaveLength(1);
            expect(rows[0].logId).toBe('log-grande');
            expect(rows[0].status).toBe('failed');
            expect(rows[0].lastError).toBe('check_in_photo_too_large');

            // A segunda foto processou normalmente apesar da primeira ter falhado.
            expect(confirmCheckInPhoto).toHaveBeenCalledTimes(2);
        });
    });
});
