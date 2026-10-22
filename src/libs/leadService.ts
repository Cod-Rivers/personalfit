import { Api } from '@/libs/api';
import type { LeadSource, LeadStatus, LostReason } from '@/libs/leadFunnel';
import type { Showcase } from '@/libs/showcaseService';

/** Funil de vendas do personal (item -48): página pública, interessados e o
 *  link do card. Rotas em Personal-fit-Back/.../funnel-controller.go. */

// ── Página: o lado do personal ──────────────────────────────────────────────

export interface PersonalPageData {
    slug: string;
    enabled: boolean;
    whatsapp: string;
    headline: string;
    about: string;
    show_showcase: boolean;
}

export interface MyPersonalPage {
    page: PersonalPageData;
    saved: boolean;
    visits_7d: number;
    visits_30d: number;
    new_leads: number;
    show_badge: boolean;
    has_showcase: boolean;
}

export async function getMyPage(): Promise<MyPersonalPage> {
    const { data } = await Api.get<MyPersonalPage>('/personal/page');
    return data;
}

export async function saveMyPage(page: PersonalPageData): Promise<PersonalPageData> {
    const { data } = await Api.put<PersonalPageData>('/personal/page', page);
    return data;
}

export interface SlugAvailability {
    slug: string;
    available: boolean;
    reason?: string;
}

export async function checkSlug(slug: string): Promise<SlugAvailability> {
    const { data } = await Api.get<SlugAvailability>('/personal/page/slug-availability', {
        params: { slug },
    });
    return data;
}

// ── Página: o lado público ──────────────────────────────────────────────────

export interface PublicPage {
    slug: string;
    personal_name: string;
    avatar_url: string;
    headline: string;
    about: string;
    whatsapp: string;
    show_badge: boolean;
    theme_id: string;
    showcase: Showcase | null;
    challenge: { name: string; token: string; end_date: string } | null;
    consent_version: string;
}

export async function getPublicPage(slug: string): Promise<PublicPage> {
    const { data } = await Api.get<PublicPage>(`/pages/${encodeURIComponent(slug)}`);
    return data;
}

/** Uma visita por sessão do navegador (o servidor só conta). */
export async function recordPageVisit(slug: string): Promise<void> {
    await Api.post(`/pages/${encodeURIComponent(slug)}/visit`);
}

export interface LeadForm {
    name: string;
    phone: string;
    email?: string;
    goal?: string;
    modality?: string;
    availability?: string;
    message?: string;
    consent: boolean;
    ref?: string;
    /** Campo-isca contra robô: sempre vazio para quem é gente. */
    website?: string;
}

export async function submitLead(slug: string, form: LeadForm): Promise<void> {
    await Api.post(`/pages/${encodeURIComponent(slug)}/leads`, form);
}

// ── Interessados ────────────────────────────────────────────────────────────

export interface Lead {
    id: string;
    name: string;
    phone: string;
    email?: string;
    goal?: string;
    modality?: string;
    availability?: string;
    message?: string;
    source: LeadSource;
    source_ref?: string;
    referrer_name?: string;
    status: LeadStatus;
    lost_reason?: LostReason;
    note?: string;
    created_at: string;
    last_request_at: string;
    contacted_at?: string;
    status_at: string;
}

export interface LeadInbox {
    leads: Lead[];
    /** Guardados que o free não vê (ficam para o Plus). */
    locked: number;
    /** O plano libera a caixa inteira. */
    full: boolean;
}

export async function listLeads(): Promise<LeadInbox> {
    const { data } = await Api.get<LeadInbox>('/personal/leads');
    return data;
}

export interface ManualLead {
    name: string;
    phone?: string;
    email?: string;
    goal?: string;
    modality?: string;
    availability?: string;
    message?: string;
    note?: string;
}

export async function createLead(lead: ManualLead): Promise<Lead> {
    const { data } = await Api.post<Lead>('/personal/leads', lead);
    return data;
}

export interface LeadUpdate {
    status?: LeadStatus;
    lost_reason?: LostReason;
    note?: string;
}

export async function updateLead(id: string, patch: LeadUpdate): Promise<Lead> {
    const { data } = await Api.patch<Lead>(`/personal/leads/${id}`, patch);
    return data;
}

export async function deleteLead(id: string): Promise<void> {
    await Api.delete(`/personal/leads/${id}`);
}

// ── Card compartilhado ──────────────────────────────────────────────────────

let shareLinkCache: Promise<string> | null = null;

/** Caminho da página do personal para a legenda do card ("" = sem página;
 *  a legenda usa o site do app). Guardado durante a sessão da aba: o card é
 *  montado várias vezes seguidas e o link não muda. */
export function getShareLinkPath(): Promise<string> {
    if (!shareLinkCache) {
        shareLinkCache = Api.get<{ path: string }>('/me/share-link')
            .then(({ data }) => data.path || '')
            .catch(() => {
                shareLinkCache = null;
                return '';
            });
    }
    return shareLinkCache;
}
