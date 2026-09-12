/** Comprime uma imagem no client antes do upload (evolução do aluno: fotos
 *  retangulares de corpo inteiro, sem crop — diferente do AvatarUpload, que
 *  recorta em círculo fixo 400x400). Redimensiona mantendo proporção até
 *  `maxDimension` no maior lado e reexporta como JPEG.
 *
 *  Aceita `Blob` além de `File` (todo `File` já é um `Blob`) — reaproveitado
 *  por mediaQueue.ts (foto de check-in, Sprint 4) para blobs capturados
 *  diretamente de câmera/canvas, que nem sempre chegam como `File`.
 *
 *  CONTRATO: esta Promise SEMPRE termina — ou com o blob, ou rejeitada. Quem
 *  chama (mediaQueue.enqueuePhoto, e por tabela o botão "Confirmar" do
 *  check-in) fica bloqueado esperando por ela, então uma promessa pendurada
 *  aqui vira spinner infinito na tela do aluno. Por isso todo callback de
 *  evento abaixo está dentro de try/catch e há um prazo máximo: uma exceção
 *  lançada dentro de `img.onload` NÃO rejeita a Promise que a contém (o
 *  executor já retornou há muito tempo) — ela vira erro não tratado na
 *  janela e a Promise nunca mais termina.
 */

/** Prazo máximo de uma compressão. Um celular comum leva menos de um segundo;
 *  este valor só existe para o caso patológico (decodificador travado,
 *  `toBlob` que nunca chama o callback) não virar espera eterna. */
const COMPRESSION_TIMEOUT_MS = 15000;

export function compressImageToBlob(
    file: File | Blob,
    { maxDimension = 1280, quality = 0.85 } = {},
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        let settled = false;
        let objectUrl: string | null = null;

        const cleanup = () => {
            clearTimeout(timer);
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
                objectUrl = null;
            }
        };
        const done = (blob: Blob) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(blob);
        };
        const fail = (err: unknown) => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(err instanceof Error ? err : new Error(String(err)));
        };

        const timer = setTimeout(
            () => fail(new Error('Tempo esgotado ao comprimir a imagem')),
            COMPRESSION_TIMEOUT_MS,
        );

        const img = new Image();
        img.onerror = () =>
            fail(new Error('Não foi possível ler a imagem escolhida'));
        img.onload = () => {
            try {
                // Uma imagem pode carregar e ainda assim não ter dimensão
                // intrínseca (SVG sem width/height, arquivo corrompido que o
                // decodificador aceita). Sem esta guarda o canvas fica 0x0 e
                // `drawImage` lança InvalidStateError de dentro deste
                // callback — o caso exato que pendurava a Promise.
                const sourceW = img.naturalWidth;
                const sourceH = img.naturalHeight;
                if (!sourceW || !sourceH) {
                    fail(new Error('Imagem sem dimensões legíveis'));
                    return;
                }

                const scale = Math.min(1, maxDimension / Math.max(sourceW, sourceH));
                const w = Math.max(1, Math.round(sourceW * scale));
                const h = Math.max(1, Math.round(sourceH * scale));

                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    fail(new Error('Canvas 2D não suportado'));
                    return;
                }
                ctx.drawImage(img, 0, 0, w, h);

                if (typeof canvas.toBlob !== 'function') {
                    fail(new Error('canvas.toBlob não suportado neste navegador'));
                    return;
                }
                canvas.toBlob(
                    (blob) =>
                        blob
                            ? done(blob)
                            : fail(new Error('Falha ao comprimir imagem')),
                    'image/jpeg',
                    quality,
                );
            } catch (err) {
                fail(err);
            }
        };

        try {
            // Object URL em vez de `FileReader.readAsDataURL`: a data URL de
            // uma foto de celular passa de vários megabytes em base64, e há
            // navegador que simplesmente não dispara nem `load` nem `error`
            // para um `img.src` desse tamanho — outra forma de nunca
            // terminar. O object URL também evita a cópia em base64 inteira
            // na memória.
            objectUrl = URL.createObjectURL(file);
            img.src = objectUrl;
        } catch (err) {
            fail(err);
        }
    });
}
