import { describe, it, expect } from 'vitest';
import {
    TECHNIQUE_CATALOG,
    TECHNIQUE_EXECUTION_GUIDE,
    techniqueExecutionHelp,
} from './trainingTechniques';

describe('techniqueExecutionHelp', () => {
    it('devolve null sem técnica, para o balão cair na ajuda geral', () => {
        expect(techniqueExecutionHelp(undefined)).toBeNull();
        expect(techniqueExecutionHelp('')).toBeNull();
        expect(techniqueExecutionHelp('tecnica_inexistente')).toBeNull();
    });

    it('toda técnica do catálogo tem passo a passo', () => {
        for (const key of Object.keys(TECHNIQUE_CATALOG)) {
            expect(TECHNIQUE_EXECUTION_GUIDE[key], key).toBeDefined();
            const help = techniqueExecutionHelp(key);
            expect(help?.title).toBe(TECHNIQUE_CATALOG[key].label);
            expect(help?.steps.length, key).toBeGreaterThan(2);
        }
    });

    it('usa os parâmetros prescritos nos passos', () => {
        const help = techniqueExecutionHelp('dropset', {
            rounds: 3,
            round_reduction_pct: 25,
        });
        const text = help?.steps.join(' ') ?? '';
        expect(text).toContain('25%');
        expect(text).toContain('3 vez');
    });

    it('Método 21 lista um passo por bloco prescrito, com o último completo', () => {
        for (const rounds of [2, 3, 4]) {
            const steps =
                techniqueExecutionHelp('method_21', { rounds, extra_reps: 5 })
                    ?.steps ?? [];
            const blocks = steps.filter((s) => s.startsWith('Bloco '));
            expect(blocks, `${rounds} blocos`).toHaveLength(rounds);
            expect(blocks[rounds - 1]).toContain('amplitude completa');
            expect(steps.join(' ')).toContain(`Os ${rounds} blocos`);
            expect(steps.join(' ')).toContain(`${rounds * 5} repetições no total`);
        }
    });

    it('sem parâmetro, usa a faixa usual em vez de deixar buraco', () => {
        const text = techniqueExecutionHelp('rest_pause')?.steps.join(' ') ?? '';
        expect(text).toContain('10–20 segundos');
        expect(text).not.toContain('undefined');
    });
});
