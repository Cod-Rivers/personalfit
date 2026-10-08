import { describe, expect, it } from 'vitest';
import { programFacts } from './storeFormat';

describe('programFacts', () => {
    it('junta o que está preenchido, na ordem', () => {
        expect(
            programFacts({
                level: 'Iniciante',
                days: 3,
                weeks: 8,
                equipment: 'Academia',
            }),
        ).toBe('Iniciante · 3x por semana · 8 semanas · Academia');
    });

    it('omite o que falta e usa o singular', () => {
        expect(programFacts({ days: 0, weeks: 1 })).toBe('1 semana');
        expect(programFacts({})).toBe('');
    });
});
