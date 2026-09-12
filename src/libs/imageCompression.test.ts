import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compressImageToBlob } from './imageCompression';

/**
 * O que estes testes protegem: `compressImageToBlob` é awaited pelo botão
 * "Confirmar" do check-in de treino (WorkoutLogger -> mediaQueue.enqueuePhoto).
 * Uma Promise que nunca termina aqui não vira erro na tela — vira spinner
 * eterno, com o aluno sem conseguir registrar o treino. Então o contrato
 * testado é sempre o mesmo: TERMINAR, mesmo quando o navegador se comporta mal.
 */

interface FakeImage {
    onload: (() => void) | null;
    onerror: (() => void) | null;
    src: string;
    naturalWidth: number;
    naturalHeight: number;
}

let lastImage: FakeImage;
let drawImage: ReturnType<typeof vi.fn>;
let toBlob: ((cb: (b: Blob | null) => void) => void) | undefined;
let revoked: string[];
let realCreateElement: typeof document.createElement;

function makeCanvas() {
    const canvas: Record<string, unknown> = {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage }),
    };
    // Navegador sem toBlob: a propriedade nem existe, e é isso que a
    // guarda no código de produção verifica.
    if (toBlob) canvas.toBlob = (cb: (b: Blob | null) => void) => toBlob?.(cb);
    return canvas as unknown as HTMLCanvasElement;
}

beforeEach(() => {
    revoked = [];
    drawImage = vi.fn();
    toBlob = (cb) => cb(new Blob(['x'], { type: 'image/jpeg' }));

    vi.stubGlobal(
        'Image',
        class {
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            naturalWidth = 800;
            naturalHeight = 600;
            private _src = '';
            constructor() {
                lastImage = this as unknown as FakeImage;
            }
            get src() {
                return this._src;
            }
            set src(value: string) {
                this._src = value;
            }
        },
    );
    vi.stubGlobal('URL', {
        createObjectURL: () => 'blob:fake-url',
        revokeObjectURL: (url: string) => revoked.push(url),
    });

    realCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) =>
        tag === 'canvas' ? makeCanvas() : realCreateElement(tag),
    );
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe('compressImageToBlob', () => {
    it('devolve o blob comprimido e libera o object URL', async () => {
        const promise = compressImageToBlob(new Blob(['foto']));
        lastImage.onload?.();

        const blob = await promise;
        expect(blob.type).toBe('image/jpeg');
        expect(revoked).toEqual(['blob:fake-url']);
    });

    it('rejeita (em vez de pendurar) quando a imagem carrega sem dimensões', async () => {
        const promise = compressImageToBlob(new Blob(['svg sem width']));
        lastImage.naturalWidth = 0;
        lastImage.naturalHeight = 0;
        lastImage.onload?.();

        await expect(promise).rejects.toThrow(/dimensões/);
        expect(drawImage).not.toHaveBeenCalled();
    });

    it('rejeita quando drawImage lança dentro do onload', async () => {
        drawImage.mockImplementation(() => {
            throw new DOMException('InvalidStateError');
        });
        const promise = compressImageToBlob(new Blob(['foto']));
        lastImage.onload?.();

        await expect(promise).rejects.toThrow();
    });

    it('rejeita quando o navegador não tem canvas.toBlob', async () => {
        toBlob = undefined;
        const promise = compressImageToBlob(new Blob(['foto']));
        lastImage.onload?.();

        await expect(promise).rejects.toThrow(/toBlob/);
    });

    it('rejeita quando a imagem não carrega', async () => {
        const promise = compressImageToBlob(new Blob(['heic']));
        lastImage.onerror?.();

        await expect(promise).rejects.toThrow(/não foi possível ler/i);
    });

    it('rejeita por tempo esgotado quando nenhum evento chega', async () => {
        vi.useFakeTimers();
        const promise = compressImageToBlob(new Blob(['foto']));
        const assertion = expect(promise).rejects.toThrow(/tempo esgotado/i);

        await vi.advanceTimersByTimeAsync(20000);
        await assertion;
    });

    it('ignora o callback atrasado depois do tempo esgotado', async () => {
        vi.useFakeTimers();
        const promise = compressImageToBlob(new Blob(['foto']));
        const assertion = expect(promise).rejects.toThrow(/tempo esgotado/i);
        await vi.advanceTimersByTimeAsync(20000);
        await assertion;

        // Decodificador que acorda tarde: não pode lançar nem trocar o
        // resultado já entregue a quem chamou.
        expect(() => lastImage.onload?.()).not.toThrow();
    });
});
