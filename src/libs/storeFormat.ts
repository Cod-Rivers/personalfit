/** Formatação da loja de programas, sem React (testável). */

export function formatBRL(value: number): string {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
}

/** "Iniciante · 3x por semana · 8 semanas · Academia" — o que estiver
 *  preenchido, na ordem. */
export function programFacts(f: {
    level?: string;
    days?: number;
    weeks?: number;
    equipment?: string;
}): string {
    const parts: string[] = [];
    if (f.level) parts.push(f.level);
    if (f.days && f.days > 0) parts.push(`${f.days}x por semana`);
    if (f.weeks && f.weeks > 0) {
        parts.push(`${f.weeks} ${f.weeks === 1 ? 'semana' : 'semanas'}`);
    }
    if (f.equipment) parts.push(f.equipment);
    return parts.join(' · ');
}

/** O texto curto que a loja mostra antes de pagar (§5.6 do plano). */
export const STORE_HEALTH_NOTICE =
    'O programa é genérico: não substitui uma avaliação individual. Se você tem alguma condição de saúde, procure um médico antes de começar.';
