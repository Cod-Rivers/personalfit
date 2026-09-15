/**
 * Content-Security-Policy do app.
 *
 * As páginas recebem um nonce novo a cada requisição (gerado em
 * middleware.ts), e o `script-src` só confia em script que carregue esse
 * nonce — mais o que esses scripts carregarem depois (`'strict-dynamic'`).
 * Isso substitui o antigo `'unsafe-inline'`, que deixava executar QUALQUER
 * script inline e qualquer URI `javascript:`. Com o JWT em localStorage (ver
 * libs/session.ts), um XSS qualquer virava roubo de sessão.
 *
 * Por que nonce e não hash: o App Router injeta scripts inline com o payload
 * RSC de cada página (`self.__next_f.push(...)`), com conteúdo diferente por
 * página e por requisição. Não existe lista de hashes possível; o Next só
 * sabe aplicar nonce, que ele lê do header `Content-Security-Policy` da
 * requisição.
 *
 * Custo: nonce exige renderização dinâmica. Uma página pré-renderizada no
 * build teria o HTML congelado sem nonce, e os scripts dela seriam
 * bloqueados. Por isso o layout raiz lê `headers()`, o que torna todas as
 * rotas dinâmicas.
 */

/** 128 bits aleatórios em base64 — novo a cada requisição. */
export function generateNonce(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

interface PageCspOptions {
    nonce: string;
    isDev: boolean;
}

export function buildPageCsp({ nonce, isDev }: PageCspOptions): string {
    const scriptSrc = [
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        // Fallback para navegador sem suporte a CSP nível 3. Quem entende
        // `'strict-dynamic'` ignora `'self'` e `https:`; quem entende nonce
        // ignora `'unsafe-inline'`. Ou seja: em todo navegador atual
        // (Chromium, WebView do Android, Safari 15.4+, Firefox) estes três
        // não têm efeito nenhum. Só evitam que um navegador antigo bloqueie
        // o app inteiro. É a receita de "strict CSP" recomendada pelo Google.
        "'self'",
        'https:',
        "'unsafe-inline'",
        // Exigido pelos anúncios: é a política que o próprio Google recomenda
        // para as tags de anúncio (guia de CSP do Google Publisher Tag), que
        // avisa que "políticas mais restritas podem quebrar sem aviso". O
        // `next dev` também precisa dele (React Refresh). O que isso reabre é
        // pouco: eval só executa texto que um script JÁ confiável lhe passe, e
        // injetar o primeiro script continua exigindo o nonce.
        "'unsafe-eval'",
    ];

    return [
        "default-src 'self'",
        `script-src ${scriptSrc.join(' ')}`,
        // Estilo inline continua liberado: o React serializa `style={...}`
        // como atributo no HTML do SSR, e atributo não aceita nonce.
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://*.fontawesome.com",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data: https://*.fontawesome.com https://cdn.jsdelivr.net",
        // Fica aberto a https: de propósito. Fechar por host quebraria em
        // silêncio o upload presigned (R2), a mídia offline, o FCM e o
        // AdSense, e não impediria exfiltração: com script rodando, img-src
        // e navegação (location.href) continuam abertos. A defesa contra
        // exfiltração é o script não rodar, e isso é trabalho do script-src.
        // Sem wss: em produção porque o app não usa WebSocket; no `next dev`
        // o HMR usa, e o backend local responde em http puro.
        isDev
            ? "connect-src 'self' http: https: ws: wss:"
            : "connect-src 'self' https:",
        // Aberto a https: pelo AdSense. Cada anúncio é desenhado em iframes de
        // domínios do Google que mudam sem aviso (googlesyndication,
        // doubleclick, adtrafficquality…), e uma allowlist sumiria com os
        // anúncios em silêncio. Iframe de outra origem não lê nada desta
        // página; clickjacking é barrado por frame-ancestors, não por
        // frame-src. O iframe do anúncio próprio do personal (AdBanner) não
        // aceita URL arbitrária: só embed de YouTube, Vimeo ou TikTok.
        "frame-src 'self' https:",
        "media-src 'self' https: blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        // Em dev o backend local é http: reescrever para https quebraria o login.
        ...(isDev ? [] : ['upgrade-insecure-requests']),
    ].join('; ');
}

/**
 * CSP do service worker (/sw.js). Não pode ser a das páginas: num worker,
 * `importScripts` não carrega nonce, e com `'strict-dynamic'` a allowlist de
 * host é ignorada. O Firebase Messaging (importScripts de gstatic) seria
 * bloqueado e as notificações em segundo plano parariam.
 *
 * O connect-src precisa de https: inteiro porque o handler de fetch do SW
 * refaz pela rede toda requisição de imagem e vídeo da página, de qualquer
 * host, para guardar em cache.
 */
export function buildServiceWorkerCsp(isDev: boolean): string {
    return [
        "default-src 'self'",
        "script-src 'self' https://www.gstatic.com",
        isDev ? "connect-src 'self' http: https:" : "connect-src 'self' https:",
        "object-src 'none'",
        "base-uri 'self'",
    ].join('; ');
}
