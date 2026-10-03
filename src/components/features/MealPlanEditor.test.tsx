import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const current = {
    id: 'v1',
    meals: [{ name: 'Café da manhã', time: '07:00' }],
    created_by_role: 'personal',
    created_at: '2026-09-01T10:00:00Z',
};

let response: unknown = null;
let failWith: unknown = null;

vi.mock('@/libs/mealPlanService', () => ({
    getCurrentMealPlan: () =>
        failWith ? Promise.reject(failWith) : Promise.resolve(response),
    getMealPlanHistory: () => Promise.resolve([]),
    createMealPlanVersion: vi.fn(),
    setMealPlanPermission: vi.fn(),
    uploadMealPlanPdf: vi.fn(),
    deleteMealPlanVersion: vi.fn(),
    MAX_MEAL_PLAN_PDF_MB: 10,
    MAX_MEAL_PLAN_PDFS: 3,
}));
vi.mock('@/libs/overdueBlock', () => ({ isOverdueBlockError: () => false }));

import MealPlanEditor from './MealPlanEditor';

// Plano alimentar com o personal fora do PRO (2026-10-02): a leitura continua
// e o aviso depende de quem vê — aluno não assina PRO, então nunca recebe
// "Assine o Plano Pro".
describe('MealPlanEditor fora do PRO', () => {
    beforeEach(() => {
        response = null;
        failWith = null;
    });

    it('aluno com plano: vê o último plano e o aviso do personal, sem editar', async () => {
        response = {
            current,
            student_can_edit: true,
            can_edit: false,
            locked: true,
        };
        render(<MealPlanEditor />);

        expect(
            await screen.findByText(/faz parte do plano PRO do seu personal/),
        ).toBeTruthy();
        expect(screen.getByText('Café da manhã')).toBeTruthy();
        expect(screen.queryByText(/Assine o Plano Pro/)).toBeNull();
        expect(screen.queryByText('Nova versão do plano')).toBeNull();
    });

    it('aluno sem plano: só o aviso', async () => {
        response = {
            current: null,
            student_can_edit: false,
            can_edit: false,
            locked: true,
        };
        render(<MealPlanEditor />);

        expect(
            await screen.findByText(/Quando o seu personal ativar o PRO/),
        ).toBeTruthy();
        expect(screen.queryByText(/Nenhum plano registrado/)).toBeNull();
    });

    it('personal: vê o que enviou, sem a permissão de edição do aluno', async () => {
        response = {
            current,
            student_can_edit: false,
            can_edit: false,
            locked: true,
        };
        render(<MealPlanEditor studentId="s1" />);

        expect(
            await screen.findByText(
                /Para enviar uma nova versão, assine o Plano Pro/,
            ),
        ).toBeTruthy();
        expect(screen.getByText('Café da manhã')).toBeTruthy();
        expect(
            screen.queryByText(/Permitir que o aluno também edite/),
        ).toBeNull();
    });

    it('403 para o aluno: aviso do aluno, nunca "Assine o Plano Pro"', async () => {
        failWith = { response: { status: 403, data: {} } };
        render(<MealPlanEditor />);

        expect(
            await screen.findByText(/faz parte do plano PRO do seu personal/),
        ).toBeTruthy();
        expect(screen.queryByText(/Assine o Plano Pro/)).toBeNull();
    });
});
