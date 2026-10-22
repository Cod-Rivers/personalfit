/**
 * Funil de vendas do personal (item -48): rótulos e regras puras, sem React
 * nem axios, para a página pública /p/[slug] e a caixa de interessados.
 *
 * As listas (objetivos, modalidades, etapas, motivos) estão em sincronia com
 * Personal-fit-Back/internal/domain/lead/lead.go.
 */

export type LeadStatus =
    | 'new'
    | 'contacted'
    | 'assessment'
    | 'proposal'
    | 'won'
    | 'lost';

export type LeadSource = 'page' | 'card' | 'challenge' | 'manual';

export type LostReason = 'price' | 'schedule' | 'no_reply' | 'other';

export const LEAD_GOALS: { value: string; label: string }[] = [
    { value: 'emagrecer', label: 'Emagrecer' },
    { value: 'hipertrofia', label: 'Ganhar massa' },
    { value: 'condicionamento', label: 'Condicionamento' },
    { value: 'saude', label: 'Saúde e bem-estar' },
    { value: 'performance', label: 'Performance no esporte' },
    { value: 'outro', label: 'Outro' },
];

export const LEAD_MODALITIES: { value: string; label: string }[] = [
    { value: 'presencial', label: 'Presencial' },
    { value: 'online', label: 'Online' },
    { value: 'tanto_faz', label: 'Tanto faz' },
];

/** Etapas na ordem do funil. */
export const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
    { value: 'new', label: 'Novo' },
    { value: 'contacted', label: 'Contatado' },
    { value: 'assessment', label: 'Avaliação marcada' },
    { value: 'proposal', label: 'Proposta' },
    { value: 'won', label: 'Fechou' },
    { value: 'lost', label: 'Perdeu' },
];

export const LOST_REASONS: { value: LostReason; label: string }[] = [
    { value: 'price', label: 'Preço' },
    { value: 'schedule', label: 'Horário' },
    { value: 'no_reply', label: 'Parou de responder' },
    { value: 'other', label: 'Outro motivo' },
];

function labelOf(list: { value: string; label: string }[], value?: string): string {
    return list.find((i) => i.value === value)?.label ?? '';
}

export const goalLabel = (v?: string) => labelOf(LEAD_GOALS, v);
export const modalityLabel = (v?: string) => labelOf(LEAD_MODALITIES, v);
export const statusLabel = (v?: string) => labelOf(LEAD_STATUSES, v);
export const lostReasonLabel = (v?: string) => labelOf(LOST_REASONS, v);

/** Etapas ainda em aberto (nem ganho nem perdido). */
export function isOpenStatus(s: LeadStatus): boolean {
    return s !== 'won' && s !== 'lost';
}

/** De onde veio, em português, para a etiqueta do cartão. */
export function sourceLabel(lead: {
    source: LeadSource;
    source_ref?: string;
    referrer_name?: string;
}): string {
    switch (lead.source) {
        case 'challenge':
            return lead.source_ref
                ? `Desafio "${lead.source_ref}"`
                : 'Desafio';
        case 'card':
            return lead.referrer_name
                ? `Indicação de ${lead.referrer_name}`
                : 'Card compartilhado';
        case 'manual':
            return 'Anotado por você';
        default:
            return lead.source_ref
                ? `Sua página (${lead.source_ref})`
                : 'Sua página';
    }
}

/** "5521999990000" → "(21) 99999-0000". Fora do formato, devolve como veio. */
export function formatPhoneBR(digits: string | undefined): string {
    const d = (digits ?? '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return digits ?? '';
}

function firstName(full: string | undefined): string {
    return (full ?? '').trim().split(/\s+/)[0] ?? '';
}

/** Primeira mensagem pronta para o personal mandar no WhatsApp. Cita o
 *  objetivo quando a pessoa disse, para não soar como mensagem em massa. */
export function leadWhatsappMessage(
    lead: { name: string; goal?: string; source: LeadSource; source_ref?: string },
    personalName: string | undefined,
): string {
    const who = firstName(lead.name);
    const me = firstName(personalName);
    const hello = me ? `Oi, ${who}! Aqui é ${me}, personal trainer.` : `Oi, ${who}! Tudo bem?`;
    const goal = goalLabel(lead.goal);
    let why: string;
    if (lead.source === 'challenge') {
        why = lead.source_ref
            ? `Vi sua inscrição no desafio "${lead.source_ref}".`
            : 'Vi sua inscrição no meu desafio.';
    } else if (goal && lead.goal !== 'outro') {
        why = `Vi que você quer ${goal.toLowerCase()} e pediu contato.`;
    } else {
        why = 'Vi que você pediu contato pela minha página.';
    }
    return `${hello} ${why} Posso te fazer umas perguntas rápidas para entender sua rotina?`;
}

/** Mesma forma canônica do backend (lead.NormalizeSlug): sem acento,
 *  minúsculas, espaço/sublinhado/ponto viram hífen. */
export function normalizeSlug(raw: string): string {
    const folded = raw
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
    let out = '';
    for (const ch of folded) {
        if (/[a-z0-9]/.test(ch)) out += ch;
        else if (/[-_ .]/.test(ch) && out && !out.endsWith('-')) out += '-';
    }
    return out.replace(/^-+|-+$/g, '');
}

/** "há 5 min", "há 3 h", "há 2 dias", "em 12/10". */
export function timeAgo(iso: string, now: Date = new Date()): string {
    const then = new Date(iso);
    const diffMin = Math.floor((now.getTime() - then.getTime()) / 60000);
    if (Number.isNaN(diffMin)) return '';
    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `há ${diffMin} min`;
    const h = Math.floor(diffMin / 60);
    if (h < 24) return `há ${h} h`;
    const d = Math.floor(h / 24);
    if (d < 7) return d === 1 ? 'há 1 dia' : `há ${d} dias`;
    return `em ${then.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
}

/** Endereço público da página, para mostrar e copiar. */
export function publicPageUrl(siteUrl: string, slug: string): string {
    return `${siteUrl.replace(/\/+$/, '')}/p/${slug}`;
}
