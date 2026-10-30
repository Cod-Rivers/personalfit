import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { AxiosError, AxiosHeaders } from 'axios';
import type { ReactNode } from 'react';
import {
    getMacrocycle,
    getStudentPlannings,
    type ExerciseResponse,
    type MacrocycleResponse,
} from '@/libs/planningService';
import {
    getStudentMicrocycleWorkoutLogs,
    type NewWorkoutLogResponse,
} from '@/libs/workoutLogService';
import { getCachedPersonalMacrocycle } from '@/libs/offline/personalCache';
import AcompanharTreinoPage from './page';

/* O treino do aluno na mão do personal quando a rede cai no meio do
 * atendimento. O cache do aparelho é o de verdade (personalCache.ts sobre
 * fake-indexeddb); só a API e as peças pesadas da tela são trocadas. */

const nav = vi.hoisted(() => ({
    studentId: 'aluno-1',
    searchParams: new URLSearchParams(),
}));
vi.mock('next/navigation', () => ({
    useParams: () => ({ id: nav.studentId }),
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
    useSearchParams: () => nav.searchParams,
}));

/** `readable: false` simula o aparelho sem cópia legível do plano (modo
 * privado, armazenamento cheio) — a gravação é melhor-esforço. */
const cache = vi.hoisted(() => ({ readable: true }));
vi.mock('@/libs/offline/personalCache', async (importOriginal) => {
    const real =
        await importOriginal<typeof import('@/libs/offline/personalCache')>();
    return {
        ...real,
        getCachedPersonalMacrocycle: (studentId: string, planningId: string) =>
            cache.readable
                ? real.getCachedPersonalMacrocycle(studentId, planningId)
                : Promise.resolve(null),
    };
});

vi.mock('@/libs/planningService', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/libs/planningService')>()),
    getStudentPlannings: vi.fn(),
    getMacrocycle: vi.fn(),
}));
vi.mock('@/libs/workoutLogService', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/libs/workoutLogService')>()),
    getStudentMicrocycleWorkoutLogs: vi.fn(),
}));
vi.mock('@/libs/loadHistoryService', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/libs/loadHistoryService')>()),
    getLoadHistorySummary: vi.fn(() => Promise.reject(new Error('sem rede'))),
}));
vi.mock('@/libs/api', async (importOriginal) => {
    const offline = () => Promise.reject(new Error('sem rede'));
    return {
        ...(await importOriginal<typeof import('@/libs/api')>()),
        // Só o nome do aluno sai direto pela API nesta tela.
        Api: { get: offline, post: offline, put: offline, delete: offline },
    };
});

vi.mock('@/components/features/PersonalAnamnesisQuickView', () => ({
    default: () => null,
}));
vi.mock('@/components/molecules/LastCommentBanner', () => ({
    default: () => null,
}));
vi.mock('@/components/features/WorkoutLogger', () => ({ default: () => null }));
vi.mock('@/components/features/WeekCompletionSummary', () => ({
    default: () => null,
}));
vi.mock('@/components/molecules/CircuitTimer', () => ({ default: () => null }));
vi.mock('@/app/personal/_shared/periodizacao/components/ExercisePicker', () => ({
    default: () => null,
}));
vi.mock(
    '@/app/personal/_shared/periodizacao/components/NewMacrocycleModal',
    () => ({ default: () => null }),
);
vi.mock(
    '@/app/personal/_shared/periodizacao/components/ExerciseInlineEditor',
    () => ({ default: () => null }),
);
vi.mock('@/components/system/SortableList', () => ({
    SortableList: ({ children }: { children: ReactNode }) => children,
    SortableItem: ({ children }: { children: ReactNode }) => children,
}));
// A linha vira só o nome do exercício: tocar abre o card, como na tela.
vi.mock('./StudentExerciseRow', async () => {
    const { createElement } = await import('react');
    return {
        default: ({
            exercise,
            onOpen,
        }: {
            exercise: ExerciseResponse;
            onOpen: () => void;
        }) =>
            createElement(
                'button',
                { type: 'button', onClick: onOpen },
                exercise.name,
            ),
    };
});
// O card só expõe o ajuste de carga. Sem rede a gravação vai para a fila e
// rejeita com PrescriptionQueuedOfflineError, que o card de verdade trata.
vi.mock('@/components/features/ExerciseDetailCard', async () => {
    const { createElement } = await import('react');
    return {
        default: ({
            exercise,
            onPrescribeWeight,
        }: {
            exercise: { name: string };
            onPrescribeWeight?: (kg: number) => Promise<void>;
        }) =>
            createElement(
                'div',
                { role: 'dialog', 'aria-label': `Card de ${exercise.name}` },
                createElement(
                    'button',
                    {
                        type: 'button',
                        onClick: () =>
                            void onPrescribeWeight?.(50).catch(() => {}),
                    },
                    'Prescrever 50 kg',
                ),
            ),
    };
});

const OFFLINE_NOTICE = /mostrando a última versão deste plano/;
const NEVER_OPENED = /ainda não foi aberto neste aparelho/;

function exercise(id: string, name: string): ExerciseResponse {
    return {
        id,
        name,
        series: [12, 10, 8],
        variations: '',
        video_url: '',
        video_thumb: '',
        timed: false,
        load_kg: 40,
    };
}

function plan(): MacrocycleResponse {
    return {
        id: 'plan-1',
        personal_id: 'personal-1',
        student_id: nav.studentId,
        name: 'Hipertrofia',
        goal: 'hipertrofia',
        status: 'active',
        mesocycles: [
            {
                id: 'meso-1',
                order: 1,
                name: 'Fase 1',
                phase: 'accumulation',
                duration_weeks: 4,
                methodology: 'linear',
                trainings: [
                    {
                        id: 'tr-a',
                        reference: 'A',
                        exercises: [exercise('ex-a1', 'Supino reto')],
                    },
                    {
                        id: 'tr-b',
                        reference: 'B',
                        exercises: [exercise('ex-b1', 'Agachamento livre')],
                    },
                ],
                microcycles: [
                    { id: 'micro-1', week_number: 1, status: 'in_progress' },
                ],
            },
        ],
        created_at: '2026-01-05T00:00:00Z',
        updated_at: '2026-01-05T00:00:00Z',
    };
}

/** Treino concluído agora, nesta semana. */
function doneLog(trainingRef: string): NewWorkoutLogResponse {
    const now = new Date().toISOString();
    return {
        id: `log-${trainingRef}`,
        macrocycle_id: 'plan-1',
        mesocycle_id: 'meso-1',
        microcycle_id: 'micro-1',
        student_id: nav.studentId,
        training_ref: trainingRef,
        status: 'completed',
        planned_date: now.slice(0, 10),
        client_completed_at: now,
        exercises: [],
        created_at: now,
        updated_at: now,
    };
}

/** Erro de axios SEM resposta: a requisição nunca falou com o servidor. */
function networkError(): AxiosError {
    return new AxiosError('Network Error', 'ERR_NETWORK', {
        headers: new AxiosHeaders(),
    });
}

let onLine = true;

function serverAnswers(logs: NewWorkoutLogResponse[] = []) {
    vi.mocked(getStudentPlannings).mockResolvedValue([plan()]);
    vi.mocked(getMacrocycle).mockResolvedValue(plan());
    vi.mocked(getStudentMicrocycleWorkoutLogs).mockResolvedValue(logs);
}

/** Toda chamada morre sem resposta — com ou sem o aparelho perceber. */
function requestsFail({ deviceKnows }: { deviceKnows: boolean }) {
    onLine = !deviceKnows;
    vi.mocked(getStudentPlannings).mockRejectedValue(networkError());
    vi.mocked(getMacrocycle).mockRejectedValue(networkError());
    vi.mocked(getStudentMicrocycleWorkoutLogs).mockRejectedValue(
        networkError(),
    );
}

/** Deixa assentar o que ficou pendente (rejeições, setState). */
async function settle() {
    await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
    });
}

describe('/personal/aluno/[id]/acompanhar sem rede', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        onLine = true;
        cache.readable = true;
        vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => onLine);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('aberto com rede, guarda o plano: sem rede, reabre do aparelho em vez do erro', async () => {
        // Entrada pelo "Treino" do cartão do aluno, sem passar pela
        // periodização — até 30/10 só ela gravava o plano no aparelho.
        nav.studentId = 'aluno-cartao';
        serverAnswers();
        const first = render(<AcompanharTreinoPage />);
        await screen.findByRole('button', { name: 'Supino reto' });
        // A gravação é melhor-esforço e não segura a tela: espera ela
        // terminar antes de "perder a rede".
        await waitFor(async () =>
            expect(
                await getCachedPersonalMacrocycle('aluno-cartao', 'plan-1'),
            ).not.toBeNull(),
        );
        first.unmount();

        requestsFail({ deviceKnows: true });
        render(<AcompanharTreinoPage />);

        expect(await screen.findByText(OFFLINE_NOTICE)).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Supino reto' }),
        ).toBeInTheDocument();
        expect(screen.queryByText(NEVER_OPENED)).not.toBeInTheDocument();
    });

    it('conexão instável: a recarga sem resposta mantém o plano e o treino da semana na tela', async () => {
        nav.studentId = 'aluno-instavel';
        serverAnswers([doneLog('A')]);
        render(<AcompanharTreinoPage />);
        // O A já foi feito nesta semana: a tela abre no B.
        await screen.findByRole('button', { name: 'Agachamento livre' });

        // O `online` dispara, mas a rede cai de novo antes de a recarga
        // responder — e o aparelho não tem cópia legível do plano.
        cache.readable = false;
        requestsFail({ deviceKnows: false });
        act(() => {
            window.dispatchEvent(new Event('online'));
        });

        expect(await screen.findByText(OFFLINE_NOTICE)).toBeInTheDocument();
        await settle();
        expect(screen.queryByText(NEVER_OPENED)).not.toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Agachamento livre' }),
        ).toBeInTheDocument();
        expect(screen.getByText(/Feito nesta semana/)).toBeInTheDocument();
    });

    it('ajuste de carga sem rede com o card aberto: não troca de treino nem fecha o card', async () => {
        nav.studentId = 'aluno-ajuste';
        serverAnswers([doneLog('A')]);
        render(<AcompanharTreinoPage />);
        fireEvent.click(
            await screen.findByRole('button', { name: 'Agachamento livre' }),
        );
        expect(
            screen.getByRole('dialog', { name: 'Card de Agachamento livre' }),
        ).toBeInTheDocument();

        requestsFail({ deviceKnows: true });
        const fetchesBefore = vi.mocked(getStudentMicrocycleWorkoutLogs).mock
            .calls.length;
        fireEvent.click(
            screen.getByRole('button', { name: 'Prescrever 50 kg' }),
        );

        // O ajuste entrou na fila e trocou o plano em memória — o que refaz a
        // busca dos registros da semana, que falha sem rede.
        await waitFor(() =>
            expect(
                vi.mocked(getStudentMicrocycleWorkoutLogs).mock.calls.length,
            ).toBeGreaterThan(fetchesBefore),
        );
        await settle();
        expect(
            screen.getByRole('dialog', { name: 'Card de Agachamento livre' }),
        ).toBeInTheDocument();
        expect(screen.getByText(/Feito nesta semana/)).toBeInTheDocument();
    });

    it('nunca aberto neste aparelho e sem rede: pede para abrir uma vez com internet', async () => {
        nav.studentId = 'aluno-nunca-aberto';
        requestsFail({ deviceKnows: true });
        render(<AcompanharTreinoPage />);

        expect(await screen.findByText(NEVER_OPENED)).toBeInTheDocument();
    });
});
