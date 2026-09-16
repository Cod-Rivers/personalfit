import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// jsdom não implementa IndexedDB — necessário pra `getOfflineDB()` (idb)
// conseguir abrir um banco de verdade dentro do teste.
import 'fake-indexeddb/auto';

import { getOfflineDB } from './db';
import type { PendingPrescriptionPatch } from './db';
import type { MacrocycleResponse } from '@/libs/planningService';

vi.mock('@/libs/planningService', async () => {
    const actual = await vi.importActual<typeof import('@/libs/planningService')>(
        '@/libs/planningService',
    );
    return {
        ...actual,
        getMacrocycle: vi.fn(),
        updateMesocycle: vi.fn(),
    };
});

import { getMacrocycle, updateMesocycle } from '@/libs/planningService';

import * as prescriptionQueue from './prescriptionQueue';
import { PrescriptionQueuedOfflineError } from './prescriptionQueue';

/* ── Helpers de fixture ── */

function baseIds() {
    return {
        studentId: 'student-1',
        planningId: 'macro-1',
        mesocycleId: 'meso-1',
        trainingId: 'training-1',
        exerciseId: 'ex-1',
        exerciseName: 'Supino reto',
    };
}

/** Macrociclo com UMA fase/treino/exercício, casando com baseIds() — o
 * formato mínimo que mesoToRequest + o loop de processPrescriptionQueue
 * precisam para achar o alvo do patch. */
function fakeMacro(
    overrides: Partial<{ loadKg: number; mesoId: string }> = {},
): MacrocycleResponse {
    return {
        id: 'macro-1',
        personal_id: 'personal-1',
        student_id: 'student-1',
        name: 'Plano',
        goal: 'Hipertrofia',
        status: 'active',
        mesocycles: [
            {
                id: overrides.mesoId ?? 'meso-1',
                order: 1,
                name: 'Fase 1',
                phase: 'Base',
                duration_weeks: 1,
                methodology: 'Linear',
                trainings: [
                    {
                        id: 'training-1',
                        reference: 'A',
                        exercises: [
                            {
                                id: 'ex-1',
                                name: 'Supino reto',
                                series: [10, 10, 10],
                                variations: '',
                                video_url: '',
                                video_thumb: '',
                                timed: false,
                                load_kg: overrides.loadKg ?? 30,
                            },
                        ],
                    },
                ],
                microcycles: [],
            },
        ],
        created_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
    };
}

function axiosErr(status?: number, data?: unknown) {
    if (status === undefined) {
        return { isAxiosError: true, response: undefined };
    }
    return { isAxiosError: true, response: { status, data } };
}

function setOnline(value: boolean) {
    Object.defineProperty(navigator, 'onLine', { value, configurable: true });
}

async function enqueueTestPatch(
    overrides: Partial<PendingPrescriptionPatch['patch']> = { load_kg: 40 },
) {
    await prescriptionQueue.enqueuePrescriptionPatch({
        ...baseIds(),
        patch: overrides,
    });
}

describe('offline/prescriptionQueue', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        setOnline(false);
        const db = await getOfflineDB();
        await db.clear('pendingPrescriptionPatches');
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('enqueuePrescriptionPatch grava a linha sem tentar sincronizar offline', async () => {
        await enqueueTestPatch();

        const rows = await prescriptionQueue.getPendingPrescriptionPatches();
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            studentId: 'student-1',
            planningId: 'macro-1',
            mesocycleId: 'meso-1',
            trainingId: 'training-1',
            exerciseId: 'ex-1',
            exerciseName: 'Supino reto',
            patch: { load_kg: 40 },
            status: 'pending',
            retryCount: 0,
        });
        expect(getMacrocycle).not.toHaveBeenCalled();
    });

    it('busca a fase ATUAL no servidor em vez de reenviar um retrato velho, e aplica o patch em cima dela', async () => {
        await enqueueTestPatch({ load_kg: 45 });

        // A fase mudou no servidor desde que o patch foi enfileirado (outro
        // card salvou uma carga diferente) — o patch precisa vencer só o
        // campo que ele mexe, preservando o resto do que está no servidor.
        vi.mocked(getMacrocycle).mockResolvedValueOnce(
            fakeMacro({ loadKg: 999 }),
        );
        vi.mocked(updateMesocycle).mockResolvedValueOnce(fakeMacro());

        setOnline(true);
        await prescriptionQueue.processPrescriptionQueue();

        expect(getMacrocycle).toHaveBeenCalledWith('student-1', 'macro-1');
        expect(updateMesocycle).toHaveBeenCalledTimes(1);
        const [, , , reqBody] = vi.mocked(updateMesocycle).mock.calls[0];
        const sentExercise = reqBody.trainings[0].exercises[0];
        expect(sentExercise.load_kg).toBe(45); // o patch venceu
        expect(sentExercise.id).toBe('ex-1'); // ID preservado (histórico do aluno)

        expect(await prescriptionQueue.getPendingPrescriptionPatches()).toHaveLength(0);
    });

    it('mesociclo apagado no servidor: marca failed com mensagem clara, não tenta reenviar sozinho', async () => {
        await enqueueTestPatch();
        vi.mocked(getMacrocycle).mockResolvedValueOnce({
            ...fakeMacro(),
            mesocycles: [],
        });

        setOnline(true);
        await prescriptionQueue.processPrescriptionQueue();

        const [row] = await prescriptionQueue.getPendingPrescriptionPatches();
        expect(row.status).toBe('failed');
        expect(row.lastError).toMatch(/fase.*não existe mais/i);
        expect(updateMesocycle).not.toHaveBeenCalled();
    });

    it('exercício apagado do treino: marca failed com mensagem clara', async () => {
        await enqueueTestPatch();
        const macro = fakeMacro();
        macro.mesocycles[0].trainings[0].exercises = [];
        vi.mocked(getMacrocycle).mockResolvedValueOnce(macro);

        setOnline(true);
        await prescriptionQueue.processPrescriptionQueue();

        const [row] = await prescriptionQueue.getPendingPrescriptionPatches();
        expect(row.status).toBe('failed');
        expect(row.lastError).toMatch(/exercício.*não existe mais/i);
    });

    it('sem rede ao sincronizar (erro sem response): mantém pending e não conta como falha', async () => {
        await enqueueTestPatch();
        vi.mocked(getMacrocycle).mockRejectedValueOnce(axiosErr());

        setOnline(true);
        await prescriptionQueue.processPrescriptionQueue();

        const [row] = await prescriptionQueue.getPendingPrescriptionPatches();
        expect(row.status).toBe('pending');
        expect(row.retryCount).toBe(0);
    });

    it('5xx: volta pending com backoff agendado, tenta de novo sozinho', async () => {
        await enqueueTestPatch();
        vi.mocked(getMacrocycle).mockResolvedValueOnce(fakeMacro());
        vi.mocked(updateMesocycle).mockRejectedValueOnce(axiosErr(503));

        setOnline(true);
        await prescriptionQueue.processPrescriptionQueue();

        const [row] = await prescriptionQueue.getPendingPrescriptionPatches();
        expect(row.status).toBe('pending');
        expect(row.retryCount).toBe(1);
        expect(row.nextAttemptAt).toBeDefined();
    });

    it('4xx de validação: marca failed (reenviar o mesmo corpo nunca resolve sozinho)', async () => {
        await enqueueTestPatch();
        vi.mocked(getMacrocycle).mockResolvedValueOnce(fakeMacro());
        vi.mocked(updateMesocycle).mockRejectedValueOnce(
            axiosErr(400, { message: 'carga inválida' }),
        );

        setOnline(true);
        await prescriptionQueue.processPrescriptionQueue();

        const [row] = await prescriptionQueue.getPendingPrescriptionPatches();
        expect(row.status).toBe('failed');
        expect(row.firstFailedAt).toBeDefined();
    });

    it('discardPrescriptionPatch remove a linha e notifica a fila', async () => {
        await enqueueTestPatch();
        const [row] = await prescriptionQueue.getPendingPrescriptionPatches();
        const cb = vi.fn();
        const unsubscribe = prescriptionQueue.onPrescriptionQueueChanged(cb);

        await prescriptionQueue.discardPrescriptionPatch(row.id as number);

        expect(await prescriptionQueue.getPendingPrescriptionPatches()).toHaveLength(0);
        expect(cb).toHaveBeenCalled();
        unsubscribe();
    });

    it('uma linha problemática não bloqueia as seguintes na mesma passada', async () => {
        await enqueueTestPatch({ load_kg: 10 });
        await enqueueTestPatch({ load_kg: 20 });

        // Primeira falha por validação (400), segunda sincroniza normal.
        vi.mocked(getMacrocycle)
            .mockResolvedValueOnce(fakeMacro())
            .mockResolvedValueOnce(fakeMacro());
        vi.mocked(updateMesocycle)
            .mockRejectedValueOnce(axiosErr(400))
            .mockResolvedValueOnce(fakeMacro());

        setOnline(true);
        await prescriptionQueue.processPrescriptionQueue();

        const rows = await prescriptionQueue.getPendingPrescriptionPatches();
        expect(rows).toHaveLength(1);
        expect(rows[0].status).toBe('failed');
    });

    describe('expiração de linhas "failed" com 45 dias ou mais (RN-40, mesma política de pendingMutations)', () => {
        async function seedFailedRow(daysAgo: number): Promise<void> {
            await enqueueTestPatch();
            const db = await getOfflineDB();
            const [seed] = await db.getAll('pendingPrescriptionPatches');
            const firstFailedAt = new Date(
                Date.now() - daysAgo * 24 * 60 * 60 * 1000,
            ).toISOString();
            await db.put('pendingPrescriptionPatches', {
                ...seed,
                status: 'failed',
                firstFailedAt,
            });
        }

        it('remove silenciosamente uma linha failed com 45 dias ou mais, na leitura', async () => {
            await seedFailedRow(46);
            expect(await prescriptionQueue.getPendingPrescriptionPatches()).toHaveLength(0);
        });

        it('preserva uma linha failed com menos de 45 dias', async () => {
            await seedFailedRow(44);
            expect(await prescriptionQueue.getPendingPrescriptionPatches()).toHaveLength(1);
        });
    });

    it('PrescriptionQueuedOfflineError tem mensagem padrão amigável', () => {
        const err = new PrescriptionQueuedOfflineError();
        expect(err.message).toMatch(/sem conexão/i);
        expect(err.name).toBe('PrescriptionQueuedOfflineError');
    });
});
