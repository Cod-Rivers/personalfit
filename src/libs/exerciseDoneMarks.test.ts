import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    clearExerciseDoneMarks,
    readExerciseDoneMarks,
    writeExerciseDoneMarks,
} from './exerciseDoneMarks';

function loginAs(id: string) {
    localStorage.setItem('user', JSON.stringify({ id, role: 'student' }));
}

describe('exerciseDoneMarks', () => {
    beforeEach(() => {
        localStorage.clear();
        loginAs('aluno-1');
    });
    afterEach(() => {
        localStorage.clear();
        vi.useRealTimers();
    });

    it('guarda e relê as marcações do treino', () => {
        writeExerciseDoneMarks('micro-1', 'A', ['ex-1', 'ex-2']);
        expect(readExerciseDoneMarks('micro-1', 'A')).toEqual(new Set(['ex-1', 'ex-2']));
    });

    it('separa por treino e por microciclo', () => {
        writeExerciseDoneMarks('micro-1', 'A', ['ex-1']);
        expect(readExerciseDoneMarks('micro-1', 'B').size).toBe(0);
        expect(readExerciseDoneMarks('micro-2', 'A').size).toBe(0);
    });

    it('separa por usuário no mesmo aparelho', () => {
        writeExerciseDoneMarks('micro-1', 'A', ['ex-1']);
        loginAs('aluno-2');
        expect(readExerciseDoneMarks('micro-1', 'A').size).toBe(0);
    });

    it('personal: separa por aluno acompanhado', () => {
        loginAs('personal-1');
        writeExerciseDoneMarks('micro-1', 'A', ['ex-1'], 'aluno-1');
        expect(readExerciseDoneMarks('micro-1', 'A', 'aluno-1')).toEqual(new Set(['ex-1']));
        expect(readExerciseDoneMarks('micro-1', 'A', 'aluno-2').size).toBe(0);
        clearExerciseDoneMarks('micro-1', 'A', 'aluno-1');
        expect(readExerciseDoneMarks('micro-1', 'A', 'aluno-1').size).toBe(0);
    });

    it('não vence com o tempo: só sai desmarcando ou finalizando', () => {
        vi.useFakeTimers();
        vi.setSystemTime(1_000);
        writeExerciseDoneMarks('micro-1', 'A', ['ex-1']);
        vi.setSystemTime(1_000 + 3 * 24 * 60 * 60 * 1000);
        expect(readExerciseDoneMarks('micro-1', 'A')).toEqual(new Set(['ex-1']));
    });

    it('lista vazia e clear removem a entrada', () => {
        writeExerciseDoneMarks('micro-1', 'A', ['ex-1']);
        writeExerciseDoneMarks('micro-1', 'A', []);
        expect(localStorage.length).toBe(1); // só o usuário
        writeExerciseDoneMarks('micro-1', 'A', ['ex-1']);
        clearExerciseDoneMarks('micro-1', 'A');
        expect(readExerciseDoneMarks('micro-1', 'A').size).toBe(0);
    });

    it('JSON corrompido não derruba a leitura', () => {
        localStorage.setItem('vf_exercise_done:aluno-1:micro-1:A', '{nao-e-json');
        expect(readExerciseDoneMarks('micro-1', 'A').size).toBe(0);
    });

    it('sem usuário na sessão não grava nada', () => {
        localStorage.removeItem('user');
        writeExerciseDoneMarks('micro-1', 'A', ['ex-1']);
        expect(localStorage.length).toBe(0);
    });
});
