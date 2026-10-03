import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    CIRCUIT_SOUND_FILES,
    circuitSoundSequence,
    type CircuitSoundEvent,
} from './circuitSounds';

const count = (n: 1 | 2 | 3, ready = false): CircuitSoundEvent => ({
    kind: 'count',
    n,
    ready,
});
const transition = (
    cue?: 'go' | 'recover' | 'rest' | 'done',
    roundCall?: { round: number; final: boolean },
): CircuitSoundEvent => ({ kind: 'transition', cue, roundCall });

describe('circuitSoundSequence — voz', () => {
    const voice = (e: CircuitSoundEvent) => circuitSoundSequence(e, 'voice');

    it('contagem fala o número; no "1" antes de exercício emenda "Ready"', () => {
        expect(voice(count(3))).toEqual(['3']);
        expect(voice(count(1))).toEqual(['1']);
        expect(voice(count(1, true))).toEqual(['1', 'ready']);
    });

    it('rodada: "Round" + número; a última, "Final round"', () => {
        expect(
            voice(transition(undefined, { round: 1, final: false })),
        ).toEqual(['round', '1']);
        expect(voice(transition(undefined, { round: 4, final: true }))).toEqual(
            ['final_round'],
        );
        // Só há número gravado até 10.
        expect(
            voice(transition(undefined, { round: 11, final: false })),
        ).toEqual(['round']);
    });

    it('cada transição com a sua frase', () => {
        expect(voice(transition('go'))).toEqual(['go']);
        expect(voice(transition('recover'))).toEqual(['time_over']);
        expect(voice(transition('rest', { round: 2, final: false }))).toEqual([
            'level_up',
            'round',
            '2',
        ]);
        expect(voice(transition('rest', { round: 3, final: true }))).toEqual([
            'level_up',
            'final_round',
        ]);
        expect(voice(transition('done'))).toEqual([
            'time_over',
            'congratulations',
            'you_win',
        ]);
    });

    it('sem descanso entre as rodadas, a rodada vem antes do "Go!"', () => {
        expect(voice(transition('go', { round: 2, final: false }))).toEqual([
            'round',
            '2',
            'go',
        ]);
    });
});

describe('circuitSoundSequence — bipe', () => {
    const beep = (e: CircuitSoundEvent) => circuitSoundSequence(e, 'beep');

    it('igual ao de antes: um bip por segundo e um som por transição', () => {
        expect(beep(count(3))).toEqual(['tick']);
        expect(beep(count(1, true))).toEqual(['tick']);
        expect(beep(transition('go', { round: 2, final: true }))).toEqual([
            'go',
        ]);
        expect(beep(transition('recover'))).toEqual(['recover']);
        expect(beep(transition('rest', { round: 2, final: false }))).toEqual([
            'rest',
        ]);
        expect(beep(transition('done'))).toEqual(['done']);
    });

    it('anúncio de rodada sozinho não bipa', () => {
        expect(beep(transition(undefined, { round: 1, final: false }))).toEqual(
            [],
        );
    });
});

describe('arquivos de som', () => {
    it('toda fala de qualquer sequência tem arquivo no pacote', () => {
        const events: CircuitSoundEvent[] = [
            count(1, true),
            count(2),
            count(3),
            transition('go', { round: 10, final: false }),
            transition('recover'),
            transition('rest', { round: 9, final: true }),
            transition('done'),
            ...Array.from({ length: 10 }, (_, i) =>
                transition(undefined, { round: i + 1, final: false }),
            ),
        ];
        for (const style of ['voice', 'beep'] as const) {
            const ext = style === 'voice' ? 'mp3' : 'wav';
            const dir = style === 'voice' ? '/sounds/voice/' : '/sounds/';
            for (const e of events) {
                for (const clip of circuitSoundSequence(e, style)) {
                    expect(CIRCUIT_SOUND_FILES).toContain(
                        `${dir}${clip}.${ext}`,
                    );
                }
            }
        }
    });

    it('existem em public/ e o service worker baixa todos para o offline', () => {
        const root = process.cwd();
        const sw = readFileSync(resolve(root, 'public/sw.js'), 'utf8');
        const block = sw.match(/const SOUND_FILES = \[([\s\S]*?)\];/);
        expect(block).not.toBeNull();
        const precached = [...block![1].matchAll(/'([^']+)'/g)].map(
            (m) => m[1],
        );
        expect([...precached].sort()).toEqual([...CIRCUIT_SOUND_FILES].sort());
        for (const file of CIRCUIT_SOUND_FILES) {
            expect(() =>
                readFileSync(resolve(root, 'public', `.${file}`)),
            ).not.toThrow();
        }
    });
});
