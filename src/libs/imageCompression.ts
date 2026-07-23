/** Comprime uma imagem no client antes do upload (evolução do aluno: fotos
 *  retangulares de corpo inteiro, sem crop — diferente do AvatarUpload, que
 *  recorta em círculo fixo 400x400). Redimensiona mantendo proporção até
 *  `maxDimension` no maior lado e reexporta como JPEG.
 */
export function compressImageToBlob(
    file: File,
    { maxDimension = 1280, quality = 0.85 } = {},
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                const scale = Math.min(
                    1,
                    maxDimension / Math.max(img.naturalWidth, img.naturalHeight),
                );
                const w = Math.round(img.naturalWidth * scale);
                const h = Math.round(img.naturalHeight * scale);

                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas 2D não suportado'));
                    return;
                }
                ctx.drawImage(img, 0, 0, w, h);
                canvas.toBlob(
                    (blob) =>
                        blob
                            ? resolve(blob)
                            : reject(new Error('Falha ao comprimir imagem')),
                    'image/jpeg',
                    quality,
                );
            };
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    });
}
