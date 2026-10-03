import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const students = [
    { id: 'a', name: 'Ana' },
    { id: 'b', name: 'Bruno' },
    { id: 'c', name: 'Carla' },
    { id: 'd', name: 'Davi' },
    { id: 'e', name: 'Eva' },
];

const pending = {
    open: true,
    pending_choice: true,
    limit: 3,
    deadline: '2026-12-03T10:00:00Z',
    kept_student_ids: [],
    standby_student_ids: [],
};
const chosen = {
    ...pending,
    pending_choice: false,
    kept_student_ids: ['a', 'b', 'c'],
    standby_student_ids: ['d', 'e'],
};

let status: unknown = pending;
const choose = vi.fn();

vi.mock('@/libs/studentOverflowService', () => ({
    getStudentOverflow: () => Promise.resolve(status),
    chooseStudentsToKeep: (ids: string[]) => choose(ids),
}));
vi.mock('@/libs/api', () => ({
    Api: { get: () => Promise.resolve({ data: students }) },
}));
vi.mock('next/navigation', () => ({
    usePathname: () => '/personal',
    useRouter: () => ({ push: vi.fn() }),
}));

import StudentOverflowGate from './StudentOverflowGate';

describe('StudentOverflowGate', () => {
    beforeEach(() => {
        localStorage.setItem('token', 't');
        status = pending;
        choose.mockReset();
        choose.mockResolvedValue(chosen);
    });

    it('escolha pendente: trava o painel até escolher exatamente 3', async () => {
        render(
            <StudentOverflowGate>
                <p>painel</p>
            </StudentOverflowGate>,
        );

        expect(
            await screen.findByText('Escolha os 3 alunos que continuam'),
        ).toBeTruthy();
        expect(screen.queryByText('painel')).toBeNull();

        const continuar = screen.getByText('Continuar') as HTMLButtonElement;
        for (const name of ['Ana', 'Bruno']) {
            fireEvent.click(await screen.findByLabelText(name));
        }
        expect(continuar.disabled).toBe(true);
        fireEvent.click(screen.getByLabelText('Carla'));
        expect(continuar.disabled).toBe(false);
        // O quarto não entra: o limite é 3.
        expect(
            (screen.getByLabelText('Davi') as HTMLInputElement).disabled,
        ).toBe(true);

        fireEvent.click(continuar);
        expect(screen.getByText(/Davi, Eva/)).toBeTruthy();
        fireEvent.click(screen.getByText('Confirmar escolha'));

        await waitFor(() =>
            expect(choose).toHaveBeenCalledWith(['a', 'b', 'c']),
        );
        expect(await screen.findByText('painel')).toBeTruthy();
        expect(screen.getByText(/2 alunos em espera/)).toBeTruthy();
    });

    it('sem ciclo: mostra o painel, sem aviso', async () => {
        status = {
            open: false,
            pending_choice: false,
            kept_student_ids: [],
            standby_student_ids: [],
        };
        render(
            <StudentOverflowGate>
                <p>painel</p>
            </StudentOverflowGate>,
        );
        expect(await screen.findByText('painel')).toBeTruthy();
        expect(screen.queryByText(/em espera/)).toBeNull();
    });
});
