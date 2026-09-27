import { describe, expect, it } from 'vitest';
import {
    labelPartsOf,
    normalizeLabelParts,
    toggleLabelPart,
    trainingDisplayLabel,
} from './trainingLabel';

describe('trainingDisplayLabel', () => {
    const t = { reference: 'A', weekday: 1, name: 'Peito e Tríceps' };

    it('combina as três partes na ordem canônica', () => {
        expect(trainingDisplayLabel(t, 0, ['weekday', 'letter', 'name'])).toBe(
            'Segunda · Treino A · Peito e Tríceps',
        );
    });

    it('número vem da posição', () => {
        expect(trainingDisplayLabel(t, 2, ['number', 'name'])).toBe(
            'Treino 3 · Peito e Tríceps',
        );
    });

    it('pula parte vazia e cai em Treino N quando nada sobra', () => {
        expect(trainingDisplayLabel({ reference: 'B' }, 1, ['weekday', 'letter'])).toBe(
            'Treino B',
        );
        expect(trainingDisplayLabel({}, 1, ['weekday', 'name'])).toBe('Treino 2');
    });

    it('domingo (0) não é tratado como vazio', () => {
        expect(trainingDisplayLabel({ weekday: 0 }, 0, ['weekday'])).toBe('Domingo');
    });
});

describe('partes do rótulo', () => {
    it('normaliza ordem e letra × número', () => {
        expect(normalizeLabelParts(['name', 'number', 'letter', 'x'])).toEqual([
            'letter',
            'name',
        ]);
    });

    it('ligar número desliga letra', () => {
        expect(toggleLabelPart(['weekday', 'letter'], 'number')).toEqual([
            'weekday',
            'number',
        ]);
        expect(toggleLabelPart(['weekday', 'letter'], 'letter')).toEqual(['weekday']);
    });

    it('planos antigos seguem o legado', () => {
        expect(labelPartsOf({ planning_mode: 'periodized' })).toEqual(['letter']);
        expect(labelPartsOf({ planning_mode: 'simple' })).toEqual(['weekday']);
        expect(
            labelPartsOf({ planning_mode: 'simple', simple_day_label: 'number' }),
        ).toEqual(['number']);
        expect(
            labelPartsOf({ planning_mode: 'simple', training_label_parts: ['name'] }),
        ).toEqual(['name']);
    });
});
