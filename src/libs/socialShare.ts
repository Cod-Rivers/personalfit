/** Entrega da imagem/texto composto às redes sociais (Instagram, Facebook,
 *  WhatsApp) a partir de qualquer um dos três ambientes em que este web app
 *  roda: navegador, PWA instalado e WebView do app Android.
 *
 *  Os três se comportam de formas diferentes, e é ISSO que este arquivo
 *  resolve:
 *
 *  1. Navegador/PWA de celular — `navigator.share` com arquivo abre a folha
 *     de compartilhamento do sistema, que lista Instagram e Facebook. É o
 *     caminho bom.
 *  2. WebView do app Android — `navigator.share` NÃO EXISTE (a WebView não
 *     implementa a Web Share API) e `setDownloadListener` do MainActivity só
 *     sabe repassar URL http para o navegador, então baixar um blob também
 *     não funciona. Sem uma ponte nativa, o compartilhamento simplesmente
 *     não acontece — silenciosamente, que é o pior jeito de falhar. Por isso
 *     existe o ShareBridge.kt, que recebe a imagem em base64 e dispara o
 *     Intent.ACTION_SEND nativo. O acesso a ele (canal restrito por origem ou
 *     interface antiga) está em libs/nativeBridge.ts.
 *  3. Desktop — quase nunca tem `navigator.canShare({files})`. Cai no
 *     download do arquivo, e a tela explica que é para publicar pelo celular.
 *
 *  Sobre o Instagram especificamente: não existe link web que "publique" uma
 *  foto no Instagram — nem no navegador, nem via intent documentada sem um
 *  App ID do Facebook. O único caminho honesto é entregar a imagem à folha
 *  de compartilhamento do sistema e deixar a pessoa escolher o Instagram.
 *  Qualquer botão "publicar no Instagram" que fugisse disso estaria mentindo.
 */

import { isInsideNativeApp } from './androidApp';
import {
    canShareImageNatively,
    canShareTextNatively,
    nativeShareImage,
    nativeShareText,
} from './nativeBridge';

export type ShareOutcome =
    /** Entregue ao sistema (folha de compartilhamento aberta). */
    | 'shared'
    /** A pessoa fechou a folha de compartilhamento sem escolher nada. */
    | 'dismissed'
    /** Sem folha de compartilhamento: o arquivo foi baixado para a galeria/
     *  pasta de downloads e cabe à tela explicar o próximo passo. */
    | 'downloaded'
    /** Dentro do app Android antigo (sem a ponte): não há como compartilhar
     *  nem baixar. A tela precisa pedir a atualização do app. */
    | 'unsupported'
    /** Falha inesperada. */
    | 'failed';

/** true quando a folha de compartilhamento do sistema aceita ARQUIVO.
 *  `navigator.share` sem `canShare({files})` existe em alguns navegadores e
 *  só compartilha texto — chamar com arquivo ali lança TypeError. */
function canShareFile(file: File): boolean {
    if (typeof navigator === 'undefined') return false;
    if (typeof navigator.share !== 'function') return false;
    if (typeof navigator.canShare !== 'function') return false;
    try {
        return navigator.canShare({ files: [file] });
    } catch {
        return false;
    }
}

function fileToBase64(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () =>
            reject(new Error('Não foi possível ler a imagem gerada.'));
        reader.onload = () => {
            const result = String(reader.result ?? '');
            const comma = result.indexOf(',');
            resolve(comma >= 0 ? result.slice(comma + 1) : result);
        };
        reader.readAsDataURL(file);
    });
}

/** Baixa o arquivo pelo truque do <a download>. Só serve fora da WebView do
 *  app — lá o download de blob não tem para onde ir (ver o cabeçalho). */
function downloadFile(file: File): ShareOutcome {
    try {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        // Revoga depois do clique: revogar na mesma volta do event loop
        // cancela o download em alguns navegadores.
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        return 'downloaded';
    } catch {
        return 'failed';
    }
}

/**
 * Entrega a imagem ao sistema. Nunca lança — devolve o desfecho para a tela
 * decidir o que dizer, porque cada desfecho tem uma instrução diferente para
 * a pessoa ("escolha o Instagram", "a imagem foi salva", "atualize o app").
 */
export async function shareImage(
    file: File,
    text: string,
): Promise<ShareOutcome> {
    if (canShareImageNatively()) {
        try {
            const base64 = await fileToBase64(file);
            return (await nativeShareImage(base64, file.type, text))
                ? 'shared'
                : 'failed';
        } catch {
            return 'failed';
        }
    }

    if (canShareFile(file)) {
        try {
            await navigator.share({ files: [file], text });
            return 'shared';
        } catch (err) {
            // AbortError = a pessoa fechou a folha. Não é erro, e tratar como
            // erro faria a tela acusar falha de algo que funcionou.
            if (err instanceof DOMException && err.name === 'AbortError') {
                return 'dismissed';
            }
            return 'failed';
        }
    }

    // Dentro do app Android sem a ponte (versão antiga instalada): baixar não
    // funciona, então é melhor dizer isso do que fingir que compartilhou.
    if (isInsideNativeApp()) return 'unsupported';

    return downloadFile(file);
}

/** Compartilha só texto + link (usado onde não há imagem, como o link
 *  público do desafio). Mesmo contrato de desfecho. */
export async function shareText(
    text: string,
    url?: string,
): Promise<ShareOutcome> {
    if (canShareTextNatively()) {
        const full = url ? `${text}\n${url}` : text;
        return (await nativeShareText(full)) ? 'shared' : 'failed';
    }

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
            await navigator.share({ text, url });
            return 'shared';
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                return 'dismissed';
            }
            return 'failed';
        }
    }

    try {
        await navigator.clipboard.writeText(url ? `${text}\n${url}` : text);
        return 'downloaded'; // "está com você" — a tela diz "copiado".
    } catch {
        return 'failed';
    }
}

/** Copia texto para a área de transferência, com o fallback do `prompt`
 *  usado no resto do app (ver copyLink em /personal/desafios). */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        try {
            window.prompt('Copie o texto:', text);
            return true;
        } catch {
            return false;
        }
    }
}

/** Legenda sugerida, já com as marcações que levam de volta ao app.
 *  Fica AQUI e não na tela porque a mesma legenda é usada no compartilhamento
 *  nativo (que a manda junto do arquivo) e no botão de copiar. */
export function buildCaption(lines: string[]): string {
    const host =
        typeof window !== 'undefined'
            ? window.location.host.replace(/^www\./, '')
            : 'venafit.codriverslabs.com';
    return [...lines.filter(Boolean), '', `Treine com o Venafit — ${host}`, '#venafit #treino']
        .join('\n')
        .trim();
}
