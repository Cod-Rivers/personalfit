/** Composição da IMAGEM que o aluno (ou o personal) compartilha nas redes.
 *
 *  Toda imagem que sai do Venafit para fora do app passa por aqui, e por um
 *  motivo só: ela é peça de marketing antes de ser recordação. Uma foto de
 *  check-in solta no Instagram não diz de onde veio; a mesma foto com a
 *  marca, os números do treino e o endereço do app faz quem vê perguntar o
 *  que é Venafit. Por isso a marca d'água NÃO é opcional nem configurável —
 *  quem não quiser a marca continua podendo postar a foto direto da galeria,
 *  e isso é escolha do usuário, não uma opção que o app oferece.
 *
 *  Formato 1080×1350 (4:5): é o maior retrato que o feed do Instagram e o do
 *  Facebook aceitam sem recortar, e ainda cabe inteiro num story (que corta
 *  as bordas de cima e de baixo — por isso nada essencial mora nos primeiros
 *  e nos últimos 8% da altura).
 *
 *  Tudo é desenhado em <canvas> no próprio aparelho: nenhuma foto de
 *  check-in sobe ao servidor para virar card (a foto já tem o caminho dela,
 *  a fila de mídia), e o compartilhamento precisa funcionar no avião — que é
 *  exatamente o cenário para o qual o registro offline existe.
 */

export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1350;

/** Prazo máximo de uma composição inteira. Mesmo espírito de
 *  COMPRESSION_TIMEOUT_MS em imageCompression.ts: um aparelho comum leva
 *  menos de um segundo, e este valor só existe para o caso patológico
 *  (decodificador travado, `toBlob` que nunca chama o callback) não virar
 *  espera eterna na tela de quem acabou de terminar o treino. */
const CARD_TIMEOUT_MS = 15000;

const FONT_STACK =
    "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

/** Paleta fixa do card, em hex literal e não em var(--mint).
 *  <canvas> não lê CSS custom properties, e mesmo que lesse: o card é a
 *  MARCA saindo do app, então ele não pode mudar de cara conforme o tema
 *  claro/escuro que cada aluno escolheu para si. */
const BRAND = {
    mint: '#0ffcbe',
    mintDim: '#0ac99a',
    ink: '#050c14',
    inkSoft: '#0b1929',
    white: '#ffffff',
    muted: 'rgba(255,255,255,0.72)',
} as const;

/** Endereço que aparece no rodapé do card. Vem do host atual para não
 *  prometer um domínio onde o app não está (preview, localhost) — quem
 *  compartilha de produção divulga produção. */
function brandUrlLabel(): string {
    if (typeof window === 'undefined') return 'venafit.codriverslabs.com';
    return window.location.host.replace(/^www\./, '');
}

export interface ShareCardStat {
    label: string;
    value: string;
}

export interface ShareCardInput {
    /** Foto do check-in (ou qualquer imagem de fundo). Sem ela o card sai só
     *  com o gradiente da marca — continua compartilhável, que é o caso de
     *  quem confirmou o treino sem tirar foto. */
    photo?: Blob | null;
    /** Chamada principal: "Treino concluído", "12 dias seguidos". */
    headline: string;
    /** Linha de apoio: nome do treino, data, nome do desafio. */
    subline?: string;
    /** Até três números de destaque. Acima disso a faixa fica ilegível no
     *  tamanho em que a imagem aparece no feed. */
    stats?: ShareCardStat[];
    /** Frase do rodapé, logo acima do endereço. */
    callToAction?: string;
}

/** Carrega uma imagem com prazo, resolvendo `null` em vez de rejeitar.
 *  Nada aqui pode derrubar a composição: um logo que não carregou (primeira
 *  abertura offline, cache limpo) vale um card sem o símbolo, nunca um card
 *  que não sai. */
function loadImage(
    src: string,
    revoke = false,
): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
        let settled = false;
        const finish = (img: HTMLImageElement | null) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (revoke) URL.revokeObjectURL(src);
            resolve(img);
        };
        const timer = setTimeout(() => finish(null), CARD_TIMEOUT_MS);
        const img = new Image();
        img.onload = () => finish(img);
        img.onerror = () => finish(null);
        try {
            img.src = src;
        } catch {
            finish(null);
        }
    });
}

/** Desenha `img` cobrindo a área toda (equivalente a object-fit: cover),
 *  centralizado — recorta o excesso do lado maior em vez de deformar a
 *  pessoa na foto. */
function drawCover(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    w: number,
    h: number,
) {
    const scale = Math.max(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/** Quebra o texto em linhas que cabem em `maxWidth`, com teto de linhas.
 *  A última linha estourada termina em reticências: nome de desafio é texto
 *  livre digitado pelo personal e não tem limite visual garantido. */
export function wrapLines(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    maxLines: number,
): string[] {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (ctx.measureText(candidate).width <= maxWidth || !current) {
            current = candidate;
            continue;
        }
        lines.push(current);
        current = word;
        if (lines.length === maxLines) break;
    }
    if (lines.length < maxLines && current) lines.push(current);

    const overflowed = lines.length === maxLines && current !== lines[maxLines - 1];
    if (overflowed) {
        let last = lines[maxLines - 1];
        while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
            last = last.slice(0, -1);
        }
        lines[maxLines - 1] = `${last}…`;
    }
    return lines;
}

/** Marca d'água em diagonal, repetida e de baixíssimo contraste.
 *  Existe para o print do print: quem salva a imagem de um amigo e reposta
 *  leva a marca junto, mesmo que corte o rodapé. Opacidade baixa de
 *  propósito — marca d'água que atrapalha a foto faz o aluno não
 *  compartilhar, e aí não há marketing nenhum. */
function drawWatermarkPattern(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = BRAND.white;
    ctx.font = `700 34px ${FONT_STACK}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.translate(SHARE_CARD_WIDTH / 2, SHARE_CARD_HEIGHT / 2);
    ctx.rotate(-Math.PI / 6);
    for (let y = -SHARE_CARD_HEIGHT; y < SHARE_CARD_HEIGHT; y += 150) {
        for (let x = -SHARE_CARD_WIDTH; x < SHARE_CARD_WIDTH; x += 260) {
            ctx.fillText('VENAFIT', x, y);
        }
    }
    ctx.restore();
}

/** Selo da marca no topo: pílula escura translúcida com o símbolo (quando
 *  ele carregou) e o nome. É a parte legível da assinatura — a diagonal
 *  acima é só teimosia contra recorte. */
function drawBrandChip(
    ctx: CanvasRenderingContext2D,
    logo: HTMLImageElement | null,
) {
    const x = 56;
    const y = 120;
    const h = 92;
    ctx.save();
    ctx.font = `800 44px ${FONT_STACK}`;
    const textWidth = ctx.measureText('VENAFIT').width;
    const logoSize = logo ? 60 : 0;
    const w = 40 + logoSize + (logo ? 20 : 0) + textWidth + 40;

    ctx.fillStyle = 'rgba(5,12,20,0.55)';
    ctx.beginPath();
    // roundRect não existe em navegador antigo: sem ele, cai no retângulo
    // reto, que é feio mas continua legível — nunca uma exceção.
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, h / 2);
    } else {
        ctx.rect(x, y, w, h);
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(15,252,190,0.55)';
    ctx.lineWidth = 3;
    ctx.stroke();

    let cursor = x + 40;
    if (logo) {
        ctx.drawImage(logo, cursor, y + (h - logoSize) / 2, logoSize, logoSize);
        cursor += logoSize + 20;
    }
    const gradient = ctx.createLinearGradient(cursor, 0, cursor + textWidth, 0);
    gradient.addColorStop(0, BRAND.mint);
    gradient.addColorStop(1, BRAND.mintDim);
    ctx.fillStyle = gradient;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('VENAFIT', cursor, y + h / 2 + 2);
    ctx.restore();
}

/** Compõe o card e devolve um File pronto para `navigator.share`.
 *
 *  Qualquer falha de decodificação da foto vira card sem foto (só a marca),
 *  nunca uma Promise pendurada: este passo roda DEPOIS de o treino já estar
 *  registrado, e travar aqui seria travar a tela de quem já terminou o que
 *  tinha para fazer.
 */
export async function buildShareCard(input: ShareCardInput): Promise<File> {
    const canvas = document.createElement('canvas');
    canvas.width = SHARE_CARD_WIDTH;
    canvas.height = SHARE_CARD_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Este aparelho não conseguiu montar a imagem.');

    const [photo, logo] = await Promise.all([
        input.photo
            ? loadImage(URL.createObjectURL(input.photo), true)
            : Promise.resolve(null),
        loadImage('/assets/images/logo.png'),
    ]);

    // Fundo: a foto, ou o gradiente da marca quando não há foto.
    if (photo) {
        drawCover(ctx, photo, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT);
    } else {
        const bg = ctx.createLinearGradient(
            0,
            0,
            SHARE_CARD_WIDTH,
            SHARE_CARD_HEIGHT,
        );
        bg.addColorStop(0, BRAND.inkSoft);
        bg.addColorStop(1, BRAND.ink);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT);

        const glow = ctx.createRadialGradient(
            SHARE_CARD_WIDTH * 0.75,
            SHARE_CARD_HEIGHT * 0.22,
            0,
            SHARE_CARD_WIDTH * 0.75,
            SHARE_CARD_HEIGHT * 0.22,
            SHARE_CARD_WIDTH * 0.8,
        );
        glow.addColorStop(0, 'rgba(15,252,190,0.28)');
        glow.addColorStop(1, 'rgba(15,252,190,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT);
    }

    drawWatermarkPattern(ctx);

    // Véu de cima e de baixo: garantem contraste do texto sobre QUALQUER
    // foto (roupa clara, academia estourada de luz) sem escurecer o meio,
    // que é onde a pessoa costuma estar.
    const topVeil = ctx.createLinearGradient(0, 0, 0, 360);
    topVeil.addColorStop(0, 'rgba(5,12,20,0.75)');
    topVeil.addColorStop(1, 'rgba(5,12,20,0)');
    ctx.fillStyle = topVeil;
    ctx.fillRect(0, 0, SHARE_CARD_WIDTH, 360);

    const bottomVeil = ctx.createLinearGradient(
        0,
        SHARE_CARD_HEIGHT - 620,
        0,
        SHARE_CARD_HEIGHT,
    );
    bottomVeil.addColorStop(0, 'rgba(5,12,20,0)');
    bottomVeil.addColorStop(0.45, 'rgba(5,12,20,0.72)');
    bottomVeil.addColorStop(1, 'rgba(5,12,20,0.94)');
    ctx.fillStyle = bottomVeil;
    ctx.fillRect(0, SHARE_CARD_HEIGHT - 620, SHARE_CARD_WIDTH, 620);

    drawBrandChip(ctx, logo);

    // ── Bloco de baixo, montado de baixo para cima ──
    const marginX = 72;
    const maxTextWidth = SHARE_CARD_WIDTH - marginX * 2;
    let cursorY = SHARE_CARD_HEIGHT - 104; // folga que o story corta

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    ctx.font = `700 34px ${FONT_STACK}`;
    ctx.fillStyle = BRAND.mint;
    ctx.fillText(brandUrlLabel(), marginX, cursorY);
    cursorY -= 46;

    if (input.callToAction) {
        ctx.font = `500 32px ${FONT_STACK}`;
        ctx.fillStyle = BRAND.muted;
        const ctaLines = wrapLines(ctx, input.callToAction, maxTextWidth, 2);
        for (let i = ctaLines.length - 1; i >= 0; i--) {
            ctx.fillText(ctaLines[i], marginX, cursorY);
            cursorY -= 42;
        }
        cursorY -= 14;
    }

    const stats = (input.stats ?? []).filter((s) => s.value).slice(0, 3);
    if (stats.length) {
        let statX = marginX;
        for (const stat of stats) {
            ctx.font = `800 46px ${FONT_STACK}`;
            const valueWidth = ctx.measureText(stat.value).width;
            ctx.font = `600 26px ${FONT_STACK}`;
            const labelWidth = ctx.measureText(stat.label.toUpperCase()).width;
            const blockWidth = Math.max(valueWidth, labelWidth);
            if (statX + blockWidth > SHARE_CARD_WIDTH - marginX) break;

            ctx.font = `600 26px ${FONT_STACK}`;
            ctx.fillStyle = BRAND.muted;
            ctx.fillText(stat.label.toUpperCase(), statX, cursorY);
            ctx.font = `800 46px ${FONT_STACK}`;
            ctx.fillStyle = BRAND.white;
            ctx.fillText(stat.value, statX, cursorY - 36);

            statX += blockWidth + 64;
        }
        cursorY -= 110;
    }

    if (input.subline) {
        ctx.font = `500 38px ${FONT_STACK}`;
        ctx.fillStyle = BRAND.muted;
        const lines = wrapLines(ctx, input.subline, maxTextWidth, 2);
        for (let i = lines.length - 1; i >= 0; i--) {
            ctx.fillText(lines[i], marginX, cursorY);
            cursorY -= 50;
        }
        cursorY -= 10;
    }

    ctx.font = `800 76px ${FONT_STACK}`;
    ctx.fillStyle = BRAND.white;
    const headlineLines = wrapLines(ctx, input.headline, maxTextWidth, 3);
    for (let i = headlineLines.length - 1; i >= 0; i--) {
        ctx.fillText(headlineLines[i], marginX, cursorY);
        cursorY -= 86;
    }

    // Filete mint acima do título: separa o texto da foto e amarra o card à
    // identidade mesmo quando a imagem de fundo já tem muito verde.
    ctx.fillStyle = BRAND.mint;
    ctx.fillRect(marginX, cursorY - 6, 120, 8);

    const blob = await new Promise<Blob | null>((resolve) => {
        const timer = setTimeout(() => resolve(null), CARD_TIMEOUT_MS);
        canvas.toBlob(
            (result) => {
                clearTimeout(timer);
                resolve(result);
            },
            'image/jpeg',
            0.92,
        );
    });
    if (!blob) {
        throw new Error('Não foi possível gerar a imagem para compartilhar.');
    }

    return new File([blob], 'venafit.jpg', { type: 'image/jpeg' });
}
