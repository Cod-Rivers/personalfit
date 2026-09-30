import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    EXERCISE_DONE_MAX_AGE_MS,
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
    afterEach(() => localStorage.clear());

    it('guarda e relê as marcações do treino', () => {
        writeExerciseDoneMarks('micro-1', 'A', ['ex-1', 'ex-2'], 1_000);
        expect(readExerciseDoneMarks('micro-1', 'A', 2_000)).toEqual(new Set(['ex-1', 'ex-2']));
    });

    it('separa por treino e por microciclo', () => {
        writeExerciseDoneMarks('micro-1', 'A', ['ex-1'], 1_000);
        expect(readExerciseDoneMarks('micro-1', 'B', 1_000).size).toBe(0);
        expect(readExerciseDoneMarks('micro-2', 'A', 1_000).size).toBe(0);
    });

    it('separa por usuário no mesmo aparelho', () => {
        writeExerciseDoneMarks('micro-1', 'A', ['ex-1'], 1_000);
        loginAs('aluno-2');
        expect(readExerciseDoneMarks('micro-1', 'A', 1_000).size).toBe(0);
    });

    it('vence depois do prazo e apaga a entrada velha', () => {
        writeExerciseDoneMarks('micro-1', 'A', ['ex-1'], 1_000);
        const later = 1_000 + EXERCISE_DONE_MAX_AGE_MS + 1;
        expect(readExerciseDoneMarks('micro-1', 'A', later).size).toBe(0);
        expect(readExerciseDoneMarks('micro-1', 'A', 1_000).size).toBe(0);
    });

    it('lista vazia e clear removem a entrada', () => {
        writeExerciseDoneMarks('micro-1', 'A', ['ex-1'], 1_000);
        writeExerciseDoneMarks('micro-1', 'A', [], 1_000);
        expect(localStorage.length).toBe(1); // só o usuário
        writeExerciseDoneMarks('micro-1', 'A', ['ex-1'], 1_000);
        clearExerciseDoneMarks('micro-1', 'A');
        expect(readExerciseDoneMarks('micro-1', 'A', 1_000).size).toBe(0);
    });

    it('JSON corrompido não derruba a leitura', () => {
        localStorage.setItem('vf_exercise_done:aluno-1:micro-1:A', '{nao-e-json');
        expect(readExerciseDoneMarks('micro-1', 'A', 1_000).size).toBe(0);
    });

    it('sem usuário na sessão não grava nada', () => {
        localStorage.removeItem('user');
        writeExerciseDoneMarks('micro-1', 'A', ['ex-1'], 1_000);
        expect(localStorage.length).toBe(0);
    });
});
